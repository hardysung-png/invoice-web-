/**
 * 견적서 이벤트 → Slack 메시지 디스패처
 * 상태 전이 완료 후 fire-and-forget으로 Slack 알림을 전송합니다.
 * Slack 전송 실패는 절대 상위 로직에 throw하지 않습니다.
 */

import type { Invoice } from '@/types/invoice'
import type { InvoiceStatusV2 } from '@/types/invoice'
import { sendSlackMessage } from './slack.service'
import {
  buildSentMessage,
  buildViewedMessage,
  buildAcceptedMessage,
  buildRejectedMessage,
  buildNegoMessage,
  buildExpiredMessage,
} from './slack-messages'
import { generateInvoiceUrl } from '@/lib/utils/link-generator'

type InvoiceSnapshot = Pick<
  Invoice,
  'id' | 'invoiceNumber' | 'clientName' | 'totalAmount'
>

/**
 * 상태 전이 이벤트를 Slack에 비동기 전송합니다 (fire-and-forget).
 * 실패해도 throw하지 않습니다.
 *
 * @param invoice - 견적서 스냅샷 (최소 필드)
 * @param newStatus - 전이된 새 상태
 * @param extras - 상태별 추가 데이터 (거절 사유, 네고 메모 등)
 */
export function dispatchInvoiceEvent(
  invoice: InvoiceSnapshot,
  newStatus: InvoiceStatusV2,
  extras?: { reason?: string; memo?: string }
): void {
  // fire-and-forget: Promise 결과를 기다리지 않음
  void (async () => {
    const invoiceUrl = generateInvoiceUrl(invoice.id)

    switch (newStatus) {
      case 'sent':
        await sendSlackMessage(buildSentMessage(invoice, invoiceUrl))
        break
      case 'viewed':
        await sendSlackMessage(buildViewedMessage(invoice))
        break
      case 'accepted':
        await sendSlackMessage(buildAcceptedMessage(invoice))
        break
      case 'rejected':
        await sendSlackMessage(buildRejectedMessage(invoice, extras?.reason))
        break
      case 'negotiating':
        await sendSlackMessage(buildNegoMessage(invoice, extras?.memo))
        break
      case 'expired':
        await sendSlackMessage(buildExpiredMessage(invoice))
        break
      default:
        // 알림이 필요 없는 상태 전이
        break
    }
  })()
}
