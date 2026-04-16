'use server'

/**
 * 어드민 견적서 상세 페이지 Server Actions
 * 발송, 상태 전이 등의 서버 액션을 제공합니다.
 */

import { revalidatePath } from 'next/cache'
import { getOptimizedInvoice } from '@/lib/services/invoice.service'
import { markInvoiceAsSent } from '@/lib/services/invoice-status.service'

export interface SendInvoiceResult {
  success: boolean
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
