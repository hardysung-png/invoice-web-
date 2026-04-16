'use server'

/**
 * 수신자 견적서 페이지 Server Actions
 * - 수락, 거절 액션 (Task 033, 034에서 구현)
 */

export interface InvoiceActionResult {
  success: boolean
  error?: string
}

/**
 * 견적서 수락 Server Action (Task 033에서 구현)
 * @param invoiceId - 수락할 견적서 ID
 */
export async function acceptInvoiceAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invoiceId: string
): Promise<InvoiceActionResult> {
  // Task 033에서 구현 예정
  return { success: false, error: 'Task 033에서 구현 예정' }
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
