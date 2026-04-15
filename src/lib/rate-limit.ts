/**
 * Rate Limiting 유틸리티
 *
 * ⚠️ 중요: 이 구현은 in-memory Map을 사용합니다.
 * Vercel 서버리스/Edge 환경에서는 인스턴스 간 상태가 공유되지 않으므로
 * 완전한 Rate Limiting 보장은 어렵습니다. (MVP/소규모 트래픽에서는 허용 가능)
 *
 * 프로덕션 대규모 서비스에서는 @upstash/ratelimit + @upstash/redis 사용을 권장합니다:
 * https://github.com/upstash/ratelimit
 */

/**
 * Rate Limit 기록 인터페이스
 */
interface RateLimitRecord {
  /** 현재 윈도우에서의 요청 횟수 */
  count: number
  /** 윈도우 초기화 시간 (타임스탬프) */
  resetTime: number
}

/**
 * IP별 요청 기록을 저장하는 Map
 * Key: IP 주소 (또는 식별자)
 * Value: RateLimitRecord
 */
const requestMap = new Map<string, RateLimitRecord>()

/**
 * 만료된 항목 지연 정리
 * setInterval 대신 요청 시점에 주기적으로 정리하여
 * Edge Runtime 환경에서의 타이머 부작용을 방지합니다.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, record] of requestMap.entries()) {
    if (now > record.resetTime) {
      requestMap.delete(key)
    }
  }
}

/** 정리 주기 추적 (매 100번째 요청마다 정리) */
let requestCounter = 0
const CLEANUP_INTERVAL = 100

/**
 * Rate Limit 검사 결과 인터페이스
 */
export interface RateLimitResult {
  /** 요청 허용 여부 */
  allowed: boolean
  /** 남은 요청 횟수 */
  remaining: number
  /** 거부 시 재시도 가능 시간 (초) */
  retryAfter?: number
}

/**
 * Rate Limiting 검사
 *
 * @param identifier - 식별자 (주로 IP 주소)
 * @param limit - 최대 요청 횟수 (기본값: 10)
 * @param windowMs - 시간 윈도우 (밀리초, 기본값: 60000 = 1분)
 * @returns RateLimitResult 객체
 *
 * @example
 * ```typescript
 * const result = checkRateLimit('192.168.1.1', 10, 60000)
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', {
 *     status: 429,
 *     headers: { 'Retry-After': String(result.retryAfter) }
 *   })
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now()

  // 주기적 만료 항목 정리 (100번 요청마다)
  requestCounter++
  if (requestCounter >= CLEANUP_INTERVAL) {
    requestCounter = 0
    cleanupExpiredEntries()
  }

  const record = requestMap.get(identifier)

  // 기록이 없거나 윈도우가 만료된 경우 - 새 윈도우 시작
  if (!record || now > record.resetTime) {
    requestMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      allowed: true,
      remaining: limit - 1,
    }
  }

  // 제한 초과 검사
  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    }
  }

  // 요청 카운트 증가
  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
  }
}
