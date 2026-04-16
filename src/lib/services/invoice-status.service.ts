/**
 * 견적서 상태 전이 서비스
 * 허용된 상태 전이 검증 및 Notion 업데이트를 담당합니다.
 */

import { revalidateInvoiceCache } from '@/lib/cache'
import {
  DEFAULT_MAX_NEGO_ROUNDS,
  STATUS_TO_KOREAN_MAP,
  VALID_STATUS_TRANSITIONS,
} from '@/lib/constants'
import { InvalidTransitionError } from '@/lib/errors'
import { updateNotionPage } from '@/lib/notion'
import { INVOICES_PROPS } from '@/lib/constants/notion-schema'
import type { Invoice, InvoiceStatus, InvoiceStatusV2 } from '@/types/invoice'
import { dispatchInvoiceEvent } from './invoice-events'

/** Slack 이벤트 전송에 필요한 최소 견적서 스냅샷 */
type InvoiceSnapshot = Pick<
  Invoice,
  'id' | 'invoiceNumber' | 'clientName' | 'totalAmount'
>

export { InvalidTransitionError }

/**
 * 상태 전이가 허용된 전이인지 검증
 * @param from - 현재 상태
 * @param to - 전이할 상태
 * @throws {InvalidTransitionError} 허용되지 않은 전이일 경우
 */
export function assertValidTransition(
  from: InvoiceStatus,
  to: InvoiceStatusV2
): void {
  const allowed =
    VALID_STATUS_TRANSITIONS[from as keyof typeof VALID_STATUS_TRANSITIONS]

  if (!allowed || !(allowed as readonly string[]).includes(to)) {
    throw new InvalidTransitionError(from, to)
  }
}

/**
 * 견적서 상태를 업데이트합니다.
 * - 전이 규칙 검증 후 Notion 업데이트
 * - 성공 시 캐시 무효화 + Slack 이벤트 디스패치 (fire-and-forget)
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param newStatus - 변경할 상태
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 * @throws {InvalidTransitionError} 허용되지 않은 상태 전이
 * @throws {NotionUpdateError} Notion API 업데이트 실패
 */
export async function transitionInvoiceStatus(
  pageId: string,
  currentStatus: InvoiceStatus,
  newStatus: InvoiceStatusV2,
  invoice?: InvoiceSnapshot
): Promise<void> {
  // 상태 전이 규칙 검증
  assertValidTransition(currentStatus, newStatus)

  const koreanStatus = STATUS_TO_KOREAN_MAP[newStatus]

  // Notion 페이지 업데이트
  await updateNotionPage(pageId, {
    [INVOICES_PROPS.STATUS]: {
      select: { name: koreanStatus },
    },
  })

  // 캐시 무효화
  revalidateInvoiceCache()

  // Slack 이벤트 디스패치 (fire-and-forget, 실패 swallow)
  if (invoice) {
    dispatchInvoiceEvent(invoice, newStatus)
  }
}

/**
 * 견적서를 수락 처리합니다.
 * viewed 또는 negotiating → accepted 전이
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 */
export async function acceptInvoice(
  pageId: string,
  currentStatus: InvoiceStatus,
  invoice?: InvoiceSnapshot
): Promise<void> {
  await transitionInvoiceStatus(pageId, currentStatus, 'accepted', invoice)
}

/**
 * 견적서를 거절 처리합니다.
 * viewed 또는 negotiating → rejected 전이
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param reason - 거절 사유 (선택)
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 */
export async function rejectInvoice(
  pageId: string,
  currentStatus: InvoiceStatus,
  reason?: string,
  invoice?: InvoiceSnapshot
): Promise<void> {
  assertValidTransition(currentStatus, 'rejected')

  const properties: Record<string, unknown> = {
    [INVOICES_PROPS.STATUS]: {
      select: { name: STATUS_TO_KOREAN_MAP['rejected'] },
    },
  }

  if (reason) {
    properties[INVOICES_PROPS.REJECT_REASON] = {
      rich_text: [{ text: { content: reason } }],
    }
  }

  await updateNotionPage(
    pageId,
    properties as Parameters<typeof updateNotionPage>[1]
  )

  revalidateInvoiceCache()

  if (invoice) {
    dispatchInvoiceEvent(invoice, 'rejected', { reason })
  }
}

/**
 * 견적서를 네고중 상태로 전이하고 네고 메모를 저장합니다.
 * viewed → negotiating 또는 negotiating → negotiating 전이
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param memo - 수신자 네고 메모
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 */
export async function requestNegotiation(
  pageId: string,
  currentStatus: InvoiceStatus,
  memo: string,
  invoice?: InvoiceSnapshot
): Promise<void> {
  assertValidTransition(currentStatus, 'negotiating')

  await updateNotionPage(pageId, {
    [INVOICES_PROPS.STATUS]: {
      select: { name: STATUS_TO_KOREAN_MAP['negotiating'] },
    },
    [INVOICES_PROPS.NEGO_MEMO]: {
      rich_text: [{ text: { content: memo } }],
    },
  } as Parameters<typeof updateNotionPage>[1])

  revalidateInvoiceCache()

  if (invoice) {
    dispatchInvoiceEvent(invoice, 'negotiating', { memo })
  }
}

/**
 * 견적서를 만료 처리합니다.
 * sent, viewed, negotiating → expired 전이
 * 주로 크론 잡에서 호출됩니다.
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 */
export async function expireInvoice(
  pageId: string,
  currentStatus: InvoiceStatus,
  invoice?: InvoiceSnapshot
): Promise<void> {
  await transitionInvoiceStatus(pageId, currentStatus, 'expired', invoice)
}

/**
 * 견적서를 발송됨 상태로 마킹합니다.
 * 어드민이 링크를 클라이언트에게 공유할 때 호출합니다.
 * pending → sent 전이
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param expiresAt - 만료일 (ISO 8601 형식, 선택)
 * @param maxNegoRounds - 최대 네고 횟수 (기본 3)
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 */
export async function markInvoiceAsSent(
  pageId: string,
  currentStatus: InvoiceStatus,
  expiresAt?: string,
  maxNegoRounds: number = DEFAULT_MAX_NEGO_ROUNDS,
  invoice?: InvoiceSnapshot
): Promise<void> {
  assertValidTransition(currentStatus, 'sent')

  const properties: Record<string, unknown> = {
    [INVOICES_PROPS.STATUS]: {
      select: { name: STATUS_TO_KOREAN_MAP['sent'] },
    },
    [INVOICES_PROPS.MAX_NEGO_ROUNDS]: {
      number: maxNegoRounds,
    },
  }

  if (expiresAt) {
    properties[INVOICES_PROPS.EXPIRES_AT] = {
      date: { start: expiresAt },
    }
  }

  await updateNotionPage(
    pageId,
    properties as Parameters<typeof updateNotionPage>[1]
  )

  revalidateInvoiceCache()

  if (invoice) {
    dispatchInvoiceEvent(invoice, 'sent')
  }
}

/**
 * 수신자가 견적서를 최초 열람했을 때 viewed 상태로 전이합니다.
 * sent → viewed 전이
 *
 * @param pageId - 견적서 Notion 페이지 ID
 * @param currentStatus - 현재 견적서 상태
 * @param invoice - Slack 알림용 견적서 스냅샷 (선택)
 */
export async function markInvoiceAsViewed(
  pageId: string,
  currentStatus: InvoiceStatus,
  invoice?: InvoiceSnapshot
): Promise<void> {
  // 이미 viewed 이상 상태라면 전이하지 않음 (멱등성 보장)
  if (currentStatus !== 'sent') {
    return
  }

  await transitionInvoiceStatus(pageId, currentStatus, 'viewed', invoice)
}
