'use server'

/**
 * 수신자 견적서 페이지 Server Actions
 */

import { revalidatePath } from 'next/cache'
import { getOptimizedInvoice } from '@/lib/services/invoice.service'
import {
  acceptInvoice,
  rejectInvoice,
} from '@/lib/services/invoice-status.service'
import { createChildInvoice } from '@/lib/services/invoice-nego.service'
import type { ChildInvoicePatch } from '@/lib/services/invoice-nego.service'
import {
  InvalidTransitionError,
  FloorPriceViolationError,
  NegoRoundsLimitError,
} from '@/lib/errors'

export interface InvoiceActionResult {
  success: boolean
  error?: string
}

export interface NegotiationActionResult {
  success: boolean
  /** 생성된 자식 견적서 ID (성공 시 클라이언트 redirect에 사용) */
  childId?: string
  error?: string
}

/**
 * 견적서 수락 Server Action
 * viewed 또는 negotiating → accepted 전이 + Slack 알림
 *
 * @param invoiceId - 수락할 견적서 ID
 */
export async function acceptInvoiceAction(
  invoiceId: string
): Promise<InvoiceActionResult> {
  try {
    const invoice = await getOptimizedInvoice(invoiceId)

    await acceptInvoice(invoice.id, invoice.status, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      totalAmount: invoice.totalAmount,
    })

    revalidatePath(`/invoice/${invoiceId}`)
    revalidatePath(`/admin/invoices/${invoiceId}`)

    return { success: true }
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { success: false, error: `상태 전이 불가: ${err.message}` }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * 견적서 거절 Server Action
 * viewed 또는 negotiating → rejected 전이 + 사유 저장 + Slack 알림
 *
 * @param invoiceId - 거절할 견적서 ID
 * @param reason - 거절 사유
 */
export async function rejectInvoiceAction(
  invoiceId: string,
  reason: string
): Promise<InvoiceActionResult> {
  try {
    const invoice = await getOptimizedInvoice(invoiceId)

    await rejectInvoice(invoice.id, invoice.status, reason, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      totalAmount: invoice.totalAmount,
    })

    revalidatePath(`/invoice/${invoiceId}`)
    revalidatePath(`/admin/invoices/${invoiceId}`)

    return { success: true }
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { success: false, error: `상태 전이 불가: ${err.message}` }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * 수신자 네고 제안 Server Action
 * 자식 견적서 생성 + 부모 negotiating 전이 + Slack 네고 이벤트
 *
 * @param invoiceId - 부모 견적서 ID
 * @param items - 제안 항목 목록 (품목별 단가 수정)
 * @param memo - 네고 메모 (선택)
 */
export async function proposeNegotiationAction(
  invoiceId: string,
  items: ChildInvoicePatch['items'],
  memo?: string
): Promise<NegotiationActionResult> {
  try {
    const childId = await createChildInvoice(invoiceId, {
      items,
      negoMemo: memo,
    })

    revalidatePath(`/invoice/${invoiceId}`)
    revalidatePath(`/admin/invoices/${invoiceId}`)

    return { success: true, childId }
  } catch (err) {
    if (
      err instanceof FloorPriceViolationError ||
      err instanceof NegoRoundsLimitError ||
      err instanceof InvalidTransitionError
    ) {
      return { success: false, error: err.message }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
