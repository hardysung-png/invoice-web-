/**
 * v1 → v2 견적서 상태 마이그레이션 스크립트
 *
 * 변환 규칙:
 *   대기(pending)  → 발송됨(sent)
 *   승인(approved) → 수락(accepted)
 *   거절(rejected) → 거절(rejected) [유지]
 *
 * 사용법:
 *   # dry-run (실제 변경 없음, 대상 목록만 출력)
 *   npm run migrate:dry
 *
 *   # 실제 마이그레이션 실행
 *   npm run migrate:run
 *
 * 전제 조건:
 *   - .env.local에 NOTION_API_KEY, NOTION_DATABASE_ID 설정 필요
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID?.replace(/-/g, '')
const NOTION_API_KEY = process.env.NOTION_API_KEY

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error(
    '❌ NOTION_API_KEY 또는 NOTION_DATABASE_ID 환경변수가 설정되지 않았습니다.'
  )
  process.exit(1)
}

const notion = new Client({ auth: NOTION_API_KEY })

/** v1 → v2 한글 상태값 매핑 */
const V1_TO_V2_KOREAN: Record<string, string> = {
  대기: '발송됨',
  승인: '수락',
}

interface MigrationStats {
  total: number
  skipped: number
  migrated: number
  failed: number
}

/**
 * 지수 백오프 재시도
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000)
        console.warn(
          `  ⚠️  ${label} 재시도 ${i + 1}/${maxRetries} (${delay}ms 후)`
        )
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

/**
 * 데이터베이스의 data_source_id 조회
 */
async function getDataSourceId(): Promise<string> {
  const response = await notion.databases.retrieve({
    database_id: NOTION_DATABASE_ID!,
  })

  // v5 SDK는 dataSources 배열을 반환
  const dataSources = (
    response as unknown as { data_sources?: Array<{ id: string }> }
  ).data_sources

  if (dataSources && dataSources.length > 0) {
    return dataSources[0].id
  }

  // fallback: database ID 자체를 사용
  return NOTION_DATABASE_ID!
}

/**
 * v1 상태 레코드 페이지 단위 조회 (dataSources.query 사용)
 */
async function* fetchV1Records(dataSourceId: string): AsyncGenerator<{
  id: string
  number: string
  currentStatus: string
}> {
  let cursor: string | undefined = undefined

  do {
    const response = await withRetry(
      () =>
        notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: {
            or: [
              { property: '상태', select: { equals: '대기' } },
              { property: '상태', select: { equals: '승인' } },
            ],
          },
          page_size: 50,
          start_cursor: cursor,
        }),
      'DB 조회'
    )

    for (const page of response.results) {
      if (!('properties' in page)) continue
      const fullPage = page as PageObjectResponse
      const props = fullPage.properties

      const statusProp = props['상태']
      const currentStatus =
        statusProp?.type === 'select' ? (statusProp.select?.name ?? '') : ''

      const numberProp = props['견적서 번호']
      const number =
        numberProp?.type === 'title'
          ? numberProp.title
              .map((t: { plain_text: string }) => t.plain_text)
              .join('')
          : fullPage.id

      yield { id: fullPage.id, number, currentStatus }
    }

    cursor = response.next_cursor ?? undefined
  } while (cursor)
}

/**
 * 단일 레코드 상태를 v2로 업데이트
 */
async function migrateRecord(
  pageId: string,
  newKoreanStatus: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return

  await withRetry(
    () =>
      notion.pages.update({
        page_id: pageId,
        properties: {
          상태: { select: { name: newKoreanStatus } },
        },
      }),
    `페이지(${pageId}) 업데이트`
  )
}

async function main() {
  const isDryRun = process.env.MIGRATE !== 'true'

  console.log('='.repeat(60))
  console.log('  견적서 상태 마이그레이션: v1 → v2')
  console.log('='.repeat(60))
  console.log(
    `  모드: ${isDryRun ? '🔍 DRY-RUN (변경 없음)' : '🚀 실제 마이그레이션'}`
  )
  console.log(`  DB  : ${NOTION_DATABASE_ID}`)
  console.log()

  // data_source_id 조회
  console.log('  data_source_id 조회 중...')
  const dataSourceId = await withRetry(
    () => getDataSourceId(),
    'data_source_id 조회'
  )
  console.log(`  data_source_id: ${dataSourceId}`)
  console.log()

  const stats: MigrationStats = {
    total: 0,
    skipped: 0,
    migrated: 0,
    failed: 0,
  }

  for await (const record of fetchV1Records(dataSourceId)) {
    stats.total++
    const newStatus = V1_TO_V2_KOREAN[record.currentStatus]

    if (!newStatus) {
      stats.skipped++
      console.log(
        `  ↔  [SKIP] ${record.number} (${record.currentStatus} → 변환 불필요)`
      )
      continue
    }

    try {
      console.log(
        `  →  [${isDryRun ? 'DRY' : 'RUN'}] ${record.number}: ${record.currentStatus} → ${newStatus}`
      )
      await migrateRecord(record.id, newStatus, isDryRun)
      stats.migrated++

      // Notion API rate limit 방지 (0.3초 간격)
      if (!isDryRun) {
        await new Promise(r => setTimeout(r, 300))
      }
    } catch (err) {
      stats.failed++
      console.error(`  ❌ [FAIL] ${record.number} (${record.id}): ${err}`)
    }
  }

  if (stats.total === 0) {
    console.log('  ✅ v1 상태 레코드 없음. 마이그레이션 불필요.')
    return
  }

  console.log()
  console.log('='.repeat(60))
  console.log('  마이그레이션 결과')
  console.log('='.repeat(60))
  console.log(`  전체 대상  : ${stats.total}건`)
  console.log(
    `  변환 성공  : ${stats.migrated}건${isDryRun ? ' (dry-run, 실제 미변경)' : ''}`
  )
  console.log(`  건너뜀     : ${stats.skipped}건 (변환 불필요)`)
  console.log(`  실패       : ${stats.failed}건`)
  console.log()

  if (isDryRun && stats.migrated > 0) {
    console.log('💡 실제 마이그레이션을 실행하려면:')
    console.log('   npm run migrate:run')
    console.log()
  }

  if (stats.failed > 0) {
    console.error('❌ 일부 레코드 마이그레이션 실패. 위 로그를 확인하세요.')
    process.exit(1)
  } else if (isDryRun) {
    console.log('✅ Dry-run 완료.')
  } else {
    console.log('✅ 마이그레이션 완료.')
  }
}

main().catch(err => {
  console.error('예기치 않은 오류:', err)
  process.exit(1)
})
