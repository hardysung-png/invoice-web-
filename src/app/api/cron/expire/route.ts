/**
 * 만료 크론 엔드포인트
 *
 * 하루 1회 실행되어 두 가지 작업을 수행합니다:
 * 1. 오늘 만료 예정 견적서를 expired 상태로 전이
 * 2. 내일 만료 예정 견적서에 Slack D-1 알림 전송
 *
 * 인증: Authorization 헤더의 Bearer 토큰이 CRON_SECRET과 일치해야 합니다.
 * Vercel Cron에서 호출 시 자동으로 CRON_SECRET을 헤더에 포함합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import {
  findExpiringAt,
  findExpiredBefore,
} from '@/lib/services/invoice.service'
import { expireInvoice } from '@/lib/services/invoice-status.service'
import { sendSlackMessage } from '@/lib/services/slack.service'
import { buildExpiringMessage } from '@/lib/services/slack-messages'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/** 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환 */
function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** 내일 날짜를 "YYYY-MM-DD" 형식으로 반환 */
function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  // CRON_SECRET 인증 검사
  const cronSecret = env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET이 설정되지 않았습니다.' },
      { status: 401 }
    )
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token !== cronSecret) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const todayStr = today()
  const tomorrowStr = tomorrow()
  const results = {
    expired: { processed: 0, errors: 0 },
    expiring: { notified: 0, errors: 0 },
  }

  // 1. 오늘 이전 만료 대상 → expired 전이
  try {
    const toExpire = await findExpiredBefore(todayStr)
    logger.info('만료 처리 대상 조회', {
      count: toExpire.length,
      date: todayStr,
    })

    for (const invoice of toExpire) {
      try {
        await expireInvoice(invoice.id, invoice.status, {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          totalAmount: invoice.totalAmount,
        })
        results.expired.processed++
      } catch (err) {
        logger.error('만료 전이 실패', {
          invoiceId: invoice.id,
          error: err instanceof Error ? err.message : String(err),
        })
        results.expired.errors++
      }
    }
  } catch (err) {
    logger.error('만료 대상 조회 실패', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // 2. 내일 만료 예정 → Slack D-1 알림
  try {
    const expiringSoon = await findExpiringAt(tomorrowStr)
    logger.info('D-1 알림 대상 조회', {
      count: expiringSoon.length,
      date: tomorrowStr,
    })

    for (const invoice of expiringSoon) {
      try {
        await sendSlackMessage(buildExpiringMessage(invoice, tomorrowStr))
        results.expiring.notified++
      } catch (err) {
        logger.error('D-1 Slack 알림 실패', {
          invoiceId: invoice.id,
          error: err instanceof Error ? err.message : String(err),
        })
        results.expiring.errors++
      }
    }
  } catch (err) {
    logger.error('D-1 대상 조회 실패', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  logger.info('크론 만료 처리 완료', { date: todayStr, results })

  return NextResponse.json({
    ok: true,
    date: todayStr,
    results,
  })
}
