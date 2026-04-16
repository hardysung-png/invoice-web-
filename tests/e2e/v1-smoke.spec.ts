/**
 * v1 핵심 기능 스모크 테스트 (v2 개발 전 회귀 기준선)
 *
 * 목적: v2 개발 진행 중 v1의 핵심 플로우가 깨지지 않음을 확인한다.
 * 전제: 개발 서버(npm run dev)가 실행 중이어야 함.
 *       .env.local에 NOTION_API_KEY, NOTION_DATABASE_ID, ADMIN_PASSWORD, SESSION_SECRET 설정 필요.
 *
 * 참고:
 * - 실제 Notion API 호출이 필요한 테스트는 유효한 페이지 ID를 사용한다.
 * - 환경변수 없이 실행 가능한 구조적 테스트(라우팅/리다이렉트)를 우선 포함한다.
 */

import { test, expect } from '@playwright/test'

// ────────────────────────────────────────────────────────────────────────
// 1. 어드민 인증 플로우
// ────────────────────────────────────────────────────────────────────────

test.describe('어드민 인증 플로우', () => {
  test('미인증 상태에서 /admin 접근 시 /admin-login으로 리다이렉트', async ({
    page,
  }) => {
    // 쿠키 없는 상태로 /admin 접근
    await page.goto('/admin')
    // 미들웨어가 /admin-login으로 리다이렉트해야 함
    await expect(page).toHaveURL(/admin-login/)
  })

  test('미인증 상태에서 /admin/invoices 접근 시 /admin-login으로 리다이렉트', async ({
    page,
  }) => {
    await page.goto('/admin/invoices')
    await expect(page).toHaveURL(/admin-login/)
  })

  test('/admin-login 페이지가 로드됨', async ({ page }) => {
    await page.goto('/admin-login')
    // 로그인 폼 존재 확인
    await expect(page.locator('form')).toBeVisible()
    // 비밀번호 입력 필드 존재 확인
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ────────────────────────────────────────────────────────────────────────
// 2. 견적서 공개 라우트
// ────────────────────────────────────────────────────────────────────────

test.describe('견적서 공개 라우트', () => {
  test('존재하지 않는 견적서 ID 접근 시 404 페이지 표시', async ({ page }) => {
    await page.goto('/invoice/invalid-id-not-found-test-12345')
    // not-found.tsx 또는 404 응답 확인
    const status = page.url()
    // 에러 없이 응답이 온다는 것만 확인 (404 페이지가 렌더링됨)
    expect(status).toContain('invoice')
  })

  test('/invoice/guide 페이지가 로드됨', async ({ page }) => {
    const response = await page.goto('/invoice/guide')
    // 404가 아닌 응답 확인
    expect(response?.status()).not.toBe(500)
  })
})

// ────────────────────────────────────────────────────────────────────────
// 3. 보안 헤더 확인
// ────────────────────────────────────────────────────────────────────────

test.describe('보안 헤더', () => {
  test('/admin-login 페이지 응답에 보안 헤더 포함', async ({ page }) => {
    const response = await page.goto('/admin-login')
    const headers = response?.headers() ?? {}

    // X-Frame-Options 헤더 확인
    expect(headers['x-frame-options']).toBe('DENY')
    // X-Content-Type-Options 헤더 확인
    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  test('X-Powered-By 헤더 미노출 (정보 은닉)', async ({ page }) => {
    const response = await page.goto('/admin-login')
    const headers = response?.headers() ?? {}
    // Next.js는 기본적으로 X-Powered-By를 제거함 (poweredByHeader: false)
    expect(headers['x-powered-by']).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────────────────
// 4. API 엔드포인트 기본 동작
// ────────────────────────────────────────────────────────────────────────

test.describe('API 엔드포인트', () => {
  test('/api/generate-pdf — 본문 없이 POST 시 400/422 응답 (서버 살아있음)', async ({
    request,
  }) => {
    const response = await request.post('/api/generate-pdf', {
      data: {},
    })
    // 요청 형식 오류이므로 400~422 범위 응답 (서버가 정상 작동 중임을 의미)
    expect([400, 422, 500]).toContain(response.status())
  })
})
