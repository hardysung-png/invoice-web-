'use server'

/**
 * 어드민 견적서 상세 페이지 Server Actions
 * 발송, 역제안(counterPropose), 상태 전이 등의 서버 액션을 제공합니다.
 */

import { revalidatePath } from 'next/cache'
import { getOptimizedInvoice } from '@/lib/services/invoice.service'
import { markInvoiceAsSent } from '@/lib/services/invoice-status.service'
import { createChildInvoice } from '@/lib/services/invoice-nego.service'
import type { ChildInvoicePatch } from '@/lib/services/invoice-nego.service'
import {
  InvalidTransitionError,
  FloorPriceViolationError,
  NegoRoundsLimitError,
} from '@/lib/errors'

export interface SendInvoiceResult {
  success: boolean
  error?: string
}

export interface CounterProposeResult {
  success: boolean
  /** 생성된 자식 견적서 ID (성공 시 redirect에 사용) */
  childId?: string
  error?: string
}

/**
 * 견적서 발송 Server Action
 * - 현재 상태를 `sent`로 전이합니다.
 * - Slack 알림을 fire-and-forget으로 전송합니다.
 * - 발송 후 어드민 상세 페이지 캐시를 무효화합니다.
 *
 * @param invoiceId - 발송할 견적서 ID
 * @param expiresAt - 만료일 (ISO 8601 형식, 선택)
 */
export async function sendInvoiceAction(
  invoiceId: string,
  expiresAt?: string
): Promise<SendInvoiceResult> {
  try {
    const invoice = await getOptimizedInvoice(invoiceId)

    await markInvoiceAsSent(invoice.id, invoice.status, expiresAt, undefined, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      totalAmount: invoice.totalAmount,
    })

    // 어드민 상세 페이지 캐시 무효화
    revalidatePath(`/admin/invoices/${invoiceId}`)
    revalidatePath('/admin/invoices')

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * 어드민 역제안 Server Action
 * 수신자 네고에 대해 어드민이 새 단가를 제안합니다.
 * 자식 견적서를 생성하고 부모를 negotiating으로 전이합니다.
 *
 * @param invoiceId - 역제안 대상 부모 견적서 ID
 * @param items - 제안 항목 목록
 * @param memo - 어드민 역제안 메모 (선택)
 */
export async function counterProposeAction(
  invoiceId: string,
  items: ChildInvoicePatch['items'],
  memo?: string
): Promise<CounterProposeResult> {
  try {
    const childId = await createChildInvoice(invoiceId, {
      items,
      negoMemo: memo,
      status: 'sent',
    })

    revalidatePath(`/admin/invoices/${invoiceId}`)
    revalidatePath('/admin/invoices')
    revalidatePath(`/invoice/${invoiceId}`)

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
