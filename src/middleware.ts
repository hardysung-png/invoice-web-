/**
 * Next.js Middleware
 * 1. API 라우트에 대한 Rate Limiting 적용
 * 2. 관리자 페이지 인증 검사
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { jwtVerify } from 'jose'

/**
 * Rate Limit 설정
 */
const RATE_LIMIT_CONFIG = {
  /** 일반 API 분당 최대 요청 횟수 */
  MAX_REQUESTS: 10,
  /** 시간 윈도우 (밀리초) - 60초 */
  WINDOW_MS: 60000,
} as const

/**
 * 로그인 페이지 Rate Limit 설정 (브루트포스 공격 방지)
 * 일반 API보다 엄격하게 제한합니다.
 */
const LOGIN_RATE_LIMIT_CONFIG = {
  /** 분당 최대 로그인 시도 횟수 */
  MAX_REQUESTS: 5,
  /** 시간 윈도우 (밀리초) - 60초 */
  WINDOW_MS: 60000,
} as const

/**
 * JWT 세션 검증을 위한 시크릿 키
 */
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || ''
)

/**
 * Middleware 함수
 * 1. API 라우트: Rate Limiting 적용
 * 2. 관리자 페이지: 인증 검사
 */
export async function middleware(request: NextRequest) {
  // 로그인 페이지 Rate Limiting (브루트포스 공격 방지)
  if (
    request.nextUrl.pathname === '/admin-login' &&
    request.method === 'POST'
  ) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // 로그인 시도 Rate Limit 검사 (IP + 'login' 접두사로 분리)
    const rateLimitResult = checkRateLimit(
      `login:${ip}`,
      LOGIN_RATE_LIMIT_CONFIG.MAX_REQUESTS,
      LOGIN_RATE_LIMIT_CONFIG.WINDOW_MS
    )

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: '로그인 시도 한도를 초과했습니다.',
          message: `분당 최대 ${LOGIN_RATE_LIMIT_CONFIG.MAX_REQUESTS}회 로그인 시도 가능합니다.`,
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }
  }

  // 관리자 페이지 인증 검사 (/admin-login 자체는 제외)
  if (
    request.nextUrl.pathname.startsWith('/admin') &&
    request.nextUrl.pathname !== '/admin-login'
  ) {
    // 세션 확인
    const token = request.cookies.get('admin_session')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }

    try {
      // JWT 검증
      await jwtVerify(token, SESSION_SECRET)
      return NextResponse.next()
    } catch {
      // JWT 검증 실패 (만료, 변조 등) - 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  // API 라우트에만 Rate Limiting 적용
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // IP 주소 추출 (프록시 환경 고려)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Rate Limit 검사
    const rateLimitResult = checkRateLimit(
      ip,
      RATE_LIMIT_CONFIG.MAX_REQUESTS,
      RATE_LIMIT_CONFIG.WINDOW_MS
    )

    // 제한 초과 시 429 응답
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: '요청 한도를 초과했습니다.',
          message: `분당 최대 ${RATE_LIMIT_CONFIG.MAX_REQUESTS}회 요청 가능합니다.`,
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // 정상 요청 - Rate Limit 헤더 추가
    const response = NextResponse.next()
    response.headers.set(
      'X-RateLimit-Limit',
      String(RATE_LIMIT_CONFIG.MAX_REQUESTS)
    )
    response.headers.set(
      'X-RateLimit-Remaining',
      String(rateLimitResult.remaining)
    )

    return response
  }

  // API 라우트가 아닌 경우 그대로 통과
  return NextResponse.next()
}

/**
 * Middleware 적용 경로 설정
 * 1. API 라우트 (/api/*)
 * 2. 관리자 페이지 (/admin/*)
 * 3. 로그인 페이지 (/admin-login) - Rate Limiting 적용
 */
export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/admin-login'],
}
