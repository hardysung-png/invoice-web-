/**
 * 네고 트리(자식 견적서) 서비스
 * 부모-자식 관계의 네고 견적서 생성 및 체인 탐색을 담당합니다.
 */

import { notion, createNotionPage } from '@/lib/notion'
import { getInvoiceFromNotion } from '@/lib/services/invoice.service'
import { requestNegotiation } from '@/lib/services/invoice-status.service'
import { revalidateInvoiceCache } from '@/lib/cache'
import { FloorPriceViolationError, NegoRoundsLimitError } from '@/lib/errors'
import { INVOICES_PROPS, ITEMS_PROPS } from '@/lib/constants/notion-schema'
import { STATUS_TO_KOREAN_MAP } from '@/lib/constants'
import { env } from '@/lib/env'
import type { Invoice, InvoiceItem } from '@/types/invoice'

export { FloorPriceViolationError, NegoRoundsLimitError }

/** 순환 참조 방지를 위한 최대 네고 깊이 */
const MAX_NEGO_DEPTH = 50

/**
 * 자식 견적서 생성 패치 데이터
 */
export interface ChildInvoicePatch {
  /** 변경할 항목 목록 */
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    floorPrice?: number
    /** originalUnitPrice 미설정 시 부모의 unitPrice가 자동으로 보존됩니다 */
    originalUnitPrice?: number
  }>
  /** 수신자 네고 메모 */
  negoMemo?: string
  /** 자식 견적서 초기 상태 (기본: 'sent') */
  status?: 'sent' | 'negotiating'
}

// ─────────────────────────────────────────────────────────
// 검증 함수
// ─────────────────────────────────────────────────────────

/**
 * floor_price 검증 — 제안 단가가 부모 항목의 최소 허용 단가 이상인지 확인
 *
 * @param parentItems - 부모 견적서 항목 (floor_price 기준값 보유)
 * @param proposedItems - 제안된 항목 목록 (unitPrice 검증 대상)
 * @throws {FloorPriceViolationError} 바닥가 미만 단가 발견 시
 */
export function assertFloorPrice(
  parentItems: InvoiceItem[],
  proposedItems: Array<{ description: string; unitPrice: number }>
): void {
  for (const proposed of proposedItems) {
    const parent = parentItems.find(
      item => item.description === proposed.description
    )
    if (!parent?.floorPrice) continue

    if (proposed.unitPrice < parent.floorPrice) {
      throw new FloorPriceViolationError(
        proposed.description,
        proposed.unitPrice,
        parent.floorPrice
      )
    }
  }
}

/**
 * 네고 횟수 한도 검증
 *
 * @param rootInvoice - 루트(최초) 견적서 (maxNegoRounds 기준값 보유)
 * @param nextDepth - 생성하려는 자식의 깊이 (1-indexed)
 * @throws {NegoRoundsLimitError} 최대 횟수 초과 시
 */
export function assertNegoRoundsLimit(
  rootInvoice: Invoice,
  nextDepth: number
): void {
  const maxRounds = rootInvoice.maxNegoRounds ?? 3
  if (nextDepth > maxRounds) {
    throw new NegoRoundsLimitError(maxRounds)
  }
}

// ─────────────────────────────────────────────────────────
// Items DB ID 지연 초기화
// ─────────────────────────────────────────────────────────

let cachedItemsDatabaseId: string | null = null

/**
 * Items DB ID를 런타임에 lazy 조회
 * 기존 항목 페이지의 parent.database_id를 읽어 캐싱합니다.
 */
async function getItemsDatabaseId(invoice: Invoice): Promise<string> {
  if (cachedItemsDatabaseId) return cachedItemsDatabaseId

  const firstItemId = invoice.items[0]?.id
  if (!firstItemId) {
    throw new Error(
      'Items DB ID를 확인하기 위한 기준 항목이 없습니다. 부모 견적서에 항목이 하나 이상 있어야 합니다.'
    )
  }

  const page = await notion.pages.retrieve({ page_id: firstItemId })

  // PartialPageObjectResponse는 'parent' 필드가 없으므로 타입 가드로 걸러냅니다
  if (!('parent' in page)) {
    throw new Error('항목 페이지를 완전히 조회할 수 없습니다.')
  }
  if (page.parent.type !== 'database_id') {
    throw new Error('항목 페이지의 부모가 데이터베이스가 아닙니다.')
  }

  cachedItemsDatabaseId = page.parent.database_id
  return cachedItemsDatabaseId
}

// ─────────────────────────────────────────────────────────
// 체인 탐색 헬퍼
// ─────────────────────────────────────────────────────────

/**
 * 현재 노드의 체인 깊이 계산 (루트에서 현재 노드까지 홉 수)
 * 루트는 0, 루트의 직계 자식은 1, ...
 */
async function getChainDepth(invoiceId: string): Promise<number> {
  let depth = 0
  let currentId: string | undefined = invoiceId
  const visited = new Set<string>()

  while (currentId && depth < MAX_NEGO_DEPTH) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    const invoice = await getInvoiceFromNotion(currentId)
    if (!invoice.parentInvoiceId) break

    currentId = invoice.parentInvoiceId
    depth++
  }

  return depth
}

// ─────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────

/**
 * 최신 자식(leaf) 견적서 ID 조회
 * 루트 → 자식 → 손자 ... 순서로 leaf까지 탐색합니다.
 * 순환 참조 방지를 위해 방문 집합 + 최대 깊이(50) 가드를 사용합니다.
 *
 * @param rootId - 탐색을 시작할 견적서 ID (루트가 아니어도 동작)
 * @returns leaf 견적서 ID (자식이 없으면 rootId 자체 반환)
 */
export async function getLatestDescendant(rootId: string): Promise<string> {
  let currentId = rootId
  const visited = new Set<string>()
  let depth = 0

  while (depth < MAX_NEGO_DEPTH) {
    if (visited.has(currentId)) {
      // 순환 참조 감지 — 최선 노력으로 현재 노드 반환
      break
    }
    visited.add(currentId)

    const invoice = await getInvoiceFromNotion(currentId)
    const children = invoice.childInvoiceIds

    if (!children || children.length === 0) {
      // leaf 노드 도달
      break
    }

    // 여러 자식이 있는 경우 마지막 자식을 최신으로 취급
    currentId = children[children.length - 1]
    depth++
  }

  return currentId
}

/**
 * 자식 견적서 생성
 *
 * 수행 순서:
 * 1. 부모 견적서 조회
 * 2. floor_price 검증
 * 3. 루트 조회 및 네고 횟수 한도 검증
 * 4. Items DB에 새 항목 페이지 생성 (originalUnitPrice 자동 보존)
 * 5. Invoices DB에 자식 견적서 페이지 생성 (parent_invoice Relation 설정)
 * 6. 부모 상태 → negotiating 전이 + Slack 이벤트 발송
 * 7. 캐시 무효화
 *
 * @param parentId - 부모 견적서 Notion 페이지 ID
 * @param patch - 자식 견적서에 적용할 변경사항
 * @returns 생성된 자식 견적서 ID
 * @throws {FloorPriceViolationError} 바닥가 미만 단가
 * @throws {NegoRoundsLimitError} 네고 횟수 한도 초과
 */
export async function createChildInvoice(
  parentId: string,
  patch: ChildInvoicePatch
): Promise<string> {
  // 1. 부모 견적서 조회
  const parent = await getInvoiceFromNotion(parentId)

  // 2. floor_price 검증
  assertFloorPrice(parent.items, patch.items)

  // 3. 루트 조회 및 네고 횟수 한도 검증
  const rootId = parent.parentInvoiceId ?? parentId
  const root = rootId !== parentId ? await getInvoiceFromNotion(rootId) : parent
  const currentDepth = await getChainDepth(parentId)
  assertNegoRoundsLimit(root, currentDepth + 1)

  // 4. Items DB ID 조회 (lazy, cached)
  const itemsDatabaseId = await getItemsDatabaseId(parent)

  // 5. 자식 항목 생성 (originalUnitPrice = 부모의 unitPrice 보존)
  const itemPageIds: string[] = []
  for (const patchItem of patch.items) {
    const parentItem = parent.items.find(
      i => i.description === patchItem.description
    )
    const originalUnitPrice =
      patchItem.originalUnitPrice ??
      parentItem?.unitPrice ??
      patchItem.unitPrice

    const itemProperties: Record<string, unknown> = {
      [ITEMS_PROPS.NAME]: {
        title: [{ text: { content: patchItem.description } }],
      },
      [ITEMS_PROPS.QUANTITY]: { number: patchItem.quantity },
      [ITEMS_PROPS.UNIT_PRICE]: { number: patchItem.unitPrice },
      [ITEMS_PROPS.ORIGINAL_UNIT_PRICE]: { number: originalUnitPrice },
    }

    if (patchItem.floorPrice !== undefined) {
      itemProperties[ITEMS_PROPS.FLOOR_PRICE] = { number: patchItem.floorPrice }
    }

    const itemId = await createNotionPage(
      itemsDatabaseId,
      itemProperties as Parameters<typeof createNotionPage>[1]
    )
    itemPageIds.push(itemId)
  }

  // 6. 자식 견적서 생성
  const childStatus = patch.status ?? 'sent'
  const koreanStatus = STATUS_TO_KOREAN_MAP[childStatus]
  const negoRound = currentDepth + 1

  const childProperties: Record<string, unknown> = {
    [INVOICES_PROPS.INVOICE_NUMBER]: {
      title: [
        {
          text: {
            content: `${parent.invoiceNumber}-N${negoRound}`,
          },
        },
      ],
    },
    [INVOICES_PROPS.CLIENT_NAME]: {
      rich_text: [{ text: { content: parent.clientName } }],
    },
    [INVOICES_PROPS.ISSUE_DATE]: {
      date: { start: new Date().toISOString().split('T')[0] },
    },
    [INVOICES_PROPS.VALID_UNTIL]: {
      date: { start: parent.validUntil },
    },
    [INVOICES_PROPS.STATUS]: {
      select: { name: koreanStatus },
    },
    [INVOICES_PROPS.ITEMS]: {
      relation: itemPageIds.map(id => ({ id })),
    },
    [INVOICES_PROPS.PARENT_INVOICE]: {
      relation: [{ id: parentId }],
    },
  }

  if (parent.maxNegoRounds !== undefined) {
    childProperties[INVOICES_PROPS.MAX_NEGO_ROUNDS] = {
      number: parent.maxNegoRounds,
    }
  }

  if (parent.expiresAt) {
    childProperties[INVOICES_PROPS.EXPIRES_AT] = {
      date: { start: parent.expiresAt },
    }
  }

  if (patch.negoMemo) {
    childProperties[INVOICES_PROPS.NEGO_MEMO] = {
      rich_text: [{ text: { content: patch.negoMemo } }],
    }
  }

  const childId = await createNotionPage(
    env.NOTION_DATABASE_ID,
    childProperties as Parameters<typeof createNotionPage>[1]
  )

  // 7. 부모 상태 → negotiating 전이 + Slack 네고 이벤트
  await requestNegotiation(parentId, parent.status, patch.negoMemo ?? '', {
    id: parent.id,
    invoiceNumber: parent.invoiceNumber,
    clientName: parent.clientName,
    totalAmount: parent.totalAmount,
  })

  // 8. 캐시 무효화
  revalidateInvoiceCache()

  return childId
}
