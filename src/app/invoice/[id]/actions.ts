'use server'

/**
 * 수신자 견적서 페이지 Server Actions
 */

import { revalidatePath } from 'next/cache'
import { getOptimizedInvoice } from '@/lib/services/invoice.service'
import { acceptInvoice } from '@/lib/services/invoice-status.service'
import { InvalidTransitionError } from '@/lib/errors'

export interface InvoiceActionResult {
  success: boolean
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
 * 견적서 거절 Server Action (Task 034에서 구현)
 * @param invoiceId - 거절할 견적서 ID
 * @param reason - 거절 사유
 */
export async function rejectInvoiceAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invoiceId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason: string
): Promise<InvoiceActionResult> {
  // Task 034에서 구현 예정
  return { success: false, error: 'Task 034에서 구현 예정' }
}
