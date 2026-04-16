import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 테스트 설정
 *
 * - 개발 서버를 자동으로 시작하고 테스트를 실행한다.
 * - PLAYWRIGHT_BASE_URL 환경변수로 대상 URL을 오버라이드할 수 있다(CI/배포 환경 대응).
 * - tests/e2e/ 하위의 *.spec.ts 파일만 실행한다 (기존 MCP 가이드 문서 파일 포함되지 않도록 주의).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  // 테스트 파일 위치
  testDir: './tests/e2e',

  // 테스트 파일 패턴 — 실제 test() 코드가 있는 파일만 인식됨
  testMatch: '**/*.spec.ts',

  // 병렬 실행 설정
  fullyParallel: false,

  // CI 환경에서 retry 1회
  retries: process.env.CI ? 1 : 0,

  // 워커 수 (로컬: 1, CI: 1)
  workers: 1,

  // 리포터 설정
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // 글로벌 설정
  use: {
    baseURL: BASE_URL,
    // 테스트 실패 시 스크린샷 캡처
    screenshot: 'only-on-failure',
    // 헤드리스 실행
    headless: true,
    // 타임아웃 30초
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },

  // 프로젝트 정의 (Chromium 기본, 모바일 추가)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 개발 서버 자동 시작 (이미 서버가 실행 중이면 재사용)
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
