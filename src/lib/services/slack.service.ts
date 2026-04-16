/**
 * Slack Webhook 클라이언트 서비스
 * - SLACK_WEBHOOK_URL 미설정 시 경고 로그만 출력하고 no-op 반환
 * - 전송 실패 시 throw 금지 — 로깅 후 { ok: false } 반환
 */

import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

/** Slack Block Kit 텍스트 객체 */
export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

/** Slack Block Kit 섹션 블록 (text 또는 fields 중 하나 이상 필요) */
export interface SlackSectionBlock {
  type: 'section'
  text?: SlackTextObject
  fields?: SlackTextObject[]
}

/** Slack Block Kit 구분선 블록 */
export interface SlackDividerBlock {
  type: 'divider'
}

/** Slack Block Kit 헤더 블록 */
export interface SlackHeaderBlock {
  type: 'header'
  text: SlackTextObject
}

/** Slack Block Kit 컨텍스트 블록 */
export interface SlackContextBlock {
  type: 'context'
  elements: SlackTextObject[]
}

/** Slack Block Kit 블록 유니온 */
export type SlackBlock =
  | SlackSectionBlock
  | SlackDividerBlock
  | SlackHeaderBlock
  | SlackContextBlock

/** Slack Webhook 페이로드 */
export interface SlackPayload {
  /** 폴백 텍스트 (알림에서 표시) */
  text: string
  /** Block Kit 블록 배열 */
  blocks?: SlackBlock[]
}

/** sendSlackMessage 반환값 */
export interface SlackResult {
  ok: boolean
  error?: string
}

/**
 * Slack Incoming Webhook으로 메시지를 전송합니다.
 * SLACK_WEBHOOK_URL이 없거나 전송에 실패해도 throw하지 않습니다.
 */
export async function sendSlackMessage(
  payload: SlackPayload
): Promise<SlackResult> {
  if (!env.SLACK_WEBHOOK_URL) {
    logger.warn('SLACK_WEBHOOK_URL이 설정되지 않아 Slack 알림을 건너뜁니다.')
    return { ok: false, error: 'SLACK_WEBHOOK_URL 미설정' }
  }

  try {
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = await response.text()
      logger.error('Slack 메시지 전송 실패', {
        status: response.status,
        body,
      })
      return { ok: false, error: `HTTP ${response.status}: ${body}` }
    }

    return { ok: true }
  } catch (err) {
    logger.error('Slack 메시지 전송 중 예외 발생', { error: err })
    return { ok: false, error: String(err) }
  }
}
