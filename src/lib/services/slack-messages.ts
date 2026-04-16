/**
 * Slack 알림 메시지 포맷터
 * 이벤트별 Block Kit 메시지를 생성합니다.
 */

import type { Invoice } from '@/types/invoice'
import type { SlackPayload } from './slack.service'
import { formatCurrency } from '@/lib/format'

/** 공통 견적서 정보 필드 */
function buildInvoiceFields(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>
) {
  return [
    {
      type: 'mrkdwn' as const,
      text: `*견적서 번호*\n${invoice.invoiceNumber}`,
    },
    {
      type: 'mrkdwn' as const,
      text: `*클라이언트*\n${invoice.clientName}`,
    },
    {
      type: 'mrkdwn' as const,
      text: `*총액*\n${formatCurrency(invoice.totalAmount)}`,
    },
  ]
}

/** 수신자 링크 섹션 */
function buildLinkSection(invoiceUrl: string) {
  return {
    type: 'section' as const,
    text: {
      type: 'mrkdwn' as const,
      text: `*수신자 링크*\n<${invoiceUrl}|견적서 열기>`,
    },
  }
}

/**
 * "발송됨" 메시지 — 어드민이 견적서 링크를 발송한 시점
 */
export function buildSentMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>,
  invoiceUrl: string
): SlackPayload {
  return {
    text: `📤 견적서 발송됨: ${invoice.invoiceNumber} (${invoice.clientName})`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📤 견적서 발송됨', emoji: true },
      },
      {
        type: 'section',
        fields: buildInvoiceFields(invoice),
      },
      buildLinkSection(invoiceUrl),
      { type: 'divider' },
    ],
  }
}

/**
 * "검토중" 메시지 — 수신자가 최초 열람한 시점
 */
export function buildViewedMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>
): SlackPayload {
  return {
    text: `👀 견적서 열람됨: ${invoice.invoiceNumber} (${invoice.clientName})`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '👀 견적서 열람됨', emoji: true },
      },
      {
        type: 'section',
        fields: buildInvoiceFields(invoice),
      },
      { type: 'divider' },
    ],
  }
}

/**
 * "수락" 메시지 — 수신자가 견적서를 수락한 시점
 */
export function buildAcceptedMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>
): SlackPayload {
  return {
    text: `✅ 견적서 수락됨: ${invoice.invoiceNumber} (${invoice.clientName})`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '✅ 견적서 수락됨', emoji: true },
      },
      {
        type: 'section',
        fields: buildInvoiceFields(invoice),
      },
      { type: 'divider' },
    ],
  }
}

/**
 * "거절" 메시지 — 수신자가 견적서를 거절한 시점
 */
export function buildRejectedMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>,
  reason?: string
): SlackPayload {
  const blocks: NonNullable<SlackPayload['blocks']> = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '❌ 견적서 거절됨', emoji: true },
    },
    {
      type: 'section',
      fields: buildInvoiceFields(invoice),
    },
  ]

  if (reason) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*거절 사유*\n> ${reason}`,
      },
    })
  }

  blocks.push({ type: 'divider' })

  return {
    text: `❌ 견적서 거절됨: ${invoice.invoiceNumber} (${invoice.clientName})${reason ? ` — ${reason}` : ''}`,
    blocks,
  }
}

/**
 * "네고 요청" 메시지 — 수신자가 네고를 요청한 시점
 */
export function buildNegoMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>,
  memo?: string
): SlackPayload {
  const blocks: NonNullable<SlackPayload['blocks']> = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '💬 네고 요청 도착',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: buildInvoiceFields(invoice),
    },
  ]

  if (memo) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*네고 메모*\n> ${memo}`,
      },
    })
  }

  blocks.push({ type: 'divider' })

  return {
    text: `💬 네고 요청: ${invoice.invoiceNumber} (${invoice.clientName})`,
    blocks,
  }
}

/**
 * "만료 D-1" 메시지 — 만료 하루 전 크론 알림
 */
export function buildExpiringMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>,
  expiresAt: string
): SlackPayload {
  return {
    text: `⏰ 견적서 만료 D-1: ${invoice.invoiceNumber} (${invoice.clientName}) — ${expiresAt}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⏰ 견적서 만료 예정 (D-1)',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          ...buildInvoiceFields(invoice),
          {
            type: 'mrkdwn' as const,
            text: `*만료 예정일*\n${expiresAt}`,
          },
        ],
      },
      { type: 'divider' },
    ],
  }
}

/**
 * "만료됨" 메시지 — 만료 처리된 시점
 */
export function buildExpiredMessage(
  invoice: Pick<Invoice, 'invoiceNumber' | 'clientName' | 'totalAmount'>
): SlackPayload {
  return {
    text: `🔴 견적서 만료됨: ${invoice.invoiceNumber} (${invoice.clientName})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔴 견적서 만료됨',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: buildInvoiceFields(invoice),
      },
      { type: 'divider' },
    ],
  }
}
