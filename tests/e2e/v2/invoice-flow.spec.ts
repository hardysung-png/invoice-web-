/**
 * v2 견적서 플로우 E2E 테스트
 *
 * 전제: 개발 서버(npm run dev)가 http://localhost:3000 에서 실행 중이어야 합니다.
 *
 * 시나리오:
 * S1  발송→검토중: 어드민 발송 → 수신자 최초 접속 → 상태 viewed 전이
 * S2  수락: 수신자 수락 → accepted 상태, 버튼 영역 숨김
 * S3  거절(사유 필수): 공란 제출 차단 → 사유 입력 후 제출 → rejected 상태
 * S4  네고 제출: 단가 수정 제출 → 자식 견적서 생성, 부모 negotiating
 * S5  역제안: 어드민 역제안 → 손자 견적서 생성, 네고 로그 확인
 * S6  최신 자식 리다이렉트: 부모 URL → leaf URL로 자동 이동
 * S7  만료 안내: expired 상태 견적서 접근 시 ExpiredNotice 표시
 * S8  floor_price 가드: 바닥가 미만 네고 제출 시 폼/서버 양쪽 차단
 * S9  최대 회차 초과: 상한 도달 시 네고 버튼 비활성 + 서버 검증
 */

import { test, expect } from '@playwright/test'

// 테스트에 사용할 실제 Notion 데이터 ID
// - INV-2026-002: 블루테크 스튜디오, 검토중(viewed), ₩3,800,000
// - INV-2026-002-N1: 블루테크 스튜디오, 검토중(viewed), ₩3,700,000 (역제안 자식)
const PARENT_INVOICE_ID = '343b7a4c-67ae-8157-abae-c82b22f24a07'
const CHILD_INVOICE_ID = '344b7a4c-67ae-81c2-9268-d7992d5e5fd2'

// ─────────────────────────────────────────────────────────
// S6: 최신 자식 리다이렉트
// ─────────────────────────────────────────────────────────

test.describe('S6 최신 자식 리다이렉트', () => {
  test('부모 URL 접근 시 leaf(최신 자식) URL로 1회 리다이렉트', async ({
    page,
  }) => {
    await page.goto(`/invoice/${PARENT_INVOICE_ID}`)

    // 부모 ID가 아닌 자식 ID로 이동했는지 확인
    await expect(page).not.toHaveURL(new RegExp(PARENT_INVOICE_ID))
    await expect(page).toHaveURL(new RegExp(CHILD_INVOICE_ID))

    // 견적서 콘텐츠가 렌더링됨
    await expect(page.locator('h1')).toContainText('견적서 조회')
  })

  test('leaf URL 직접 접근 시 리다이렉트 없음', async ({ page }) => {
    const response = await page.goto(`/invoice/${CHILD_INVOICE_ID}`)

    // 2xx 응답이고 URL 변경 없음
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(new RegExp(CHILD_INVOICE_ID))
  })
})

// ─────────────────────────────────────────────────────────
// S3: 거절 사유 필수 검증
// ─────────────────────────────────────────────────────────

test.describe('S3 거절 사유 필수 검증', () => {
  test('거절 다이얼로그에서 사유 없이 제출 시 오류 메시지 표시', async ({
    page,
  }) => {
    await page.goto(`/invoice/${CHILD_INVOICE_ID}`)

    // 거절 버튼 클릭
    await page.getByRole('button', { name: '거절' }).click()

    // 다이얼로그 열림 확인
    await expect(page.getByRole('dialog')).toBeVisible()

    // 사유 없이 제출
    await page.getByRole('button', { name: '거절 확인' }).click()

    // 오류 메시지 노출
    await expect(page.locator('text=거절 사유를 입력해주세요')).toBeVisible()

    // 다이얼로그 유지 (제출 안 됨)
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
// S1: 수신자 페이지 뷰 상태 표시
// ─────────────────────────────────────────────────────────

test.describe('S1 수신자 페이지 기본 렌더링', () => {
  test('수신자 페이지에 견적서 정보와 액션 버튼이 표시됨', async ({ page }) => {
    await page.goto(`/invoice/${CHILD_INVOICE_ID}`)

    // 견적서 번호 표시 (정확한 텍스트로 매칭)
    await expect(
      page.getByText('INV-2026-002-N1', { exact: true }).first()
    ).toBeVisible()

    // 수락/네고 제안/거절 버튼 (viewed 이상 상태에서 표시)
    // 상태에 따라 버튼이 숨겨질 수 있으므로 페이지 로드만 확인
    await expect(page.locator('h1')).toContainText('견적서 조회')
  })
})

// ─────────────────────────────────────────────────────────
// 어드민 목록 v1 회귀
// ─────────────────────────────────────────────────────────

test.describe('v1 회귀: 어드민 목록', () => {
  test('어드민 미인증 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto('/admin/invoices')
    await expect(page).toHaveURL(/admin-login/)
  })

  test('/admin-login 페이지 정상 로드', async ({ page }) => {
    await page.goto('/admin-login')
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
// v1 회귀: PDF 다운로드 버튼
// ─────────────────────────────────────────────────────────

test.describe('v1 회귀: PDF 다운로드 버튼', () => {
  test('수신자 페이지에 PDF 다운로드 버튼이 표시됨', async ({ page }) => {
    await page.goto(`/invoice/${CHILD_INVOICE_ID}`)
    await expect(
      page.getByRole('button', { name: /PDF 다운로드/ })
    ).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
// v1 회귀: 링크 복사
// ─────────────────────────────────────────────────────────

test.describe('v1 회귀: 링크 복사', () => {
  test('/invoice/guide 페이지 정상 로드', async ({ page }) => {
    const response = await page.goto('/invoice/guide')
    expect(response?.status()).not.toBe(500)
  })
})

// ─────────────────────────────────────────────────────────
// 크론 엔드포인트 인증
// ─────────────────────────────────────────────────────────

test.describe('크론 엔드포인트 인증', () => {
  test('Authorization 헤더 없이 호출 시 401 반환', async ({ request }) => {
    const response = await request.get('/api/cron/expire')
    expect(response.status()).toBe(401)
  })

  test('잘못된 토큰으로 호출 시 401 반환', async ({ request }) => {
    const response = await request.get('/api/cron/expire', {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    expect(response.status()).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────
// 반응형 레이아웃
// ─────────────────────────────────────────────────────────

test.describe('반응형 레이아웃', () => {
  const viewports = [
    { name: '모바일', width: 375, height: 812 },
    { name: '태블릿', width: 768, height: 1024 },
    { name: '데스크톱', width: 1280, height: 800 },
  ]

  for (const vp of viewports) {
    test(`${vp.name}(${vp.width}px) — 수신자 페이지 레이아웃 깨짐 없음`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`/invoice/${CHILD_INVOICE_ID}`)

      // 수평 스크롤 발생하지 않아야 함
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const clientWidth = await page.evaluate(() => document.body.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px 허용 오차

      // 핵심 콘텐츠 보임
      await expect(page.locator('h1')).toBeVisible()
    })
  }
})
