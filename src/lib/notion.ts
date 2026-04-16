import { Client } from '@notionhq/client'
import { env } from './env'
import { logger } from './logger'
import { NotionUpdateError } from './errors'

export const notion = new Client({
  auth: env.NOTION_API_KEY,
  notionVersion: '2025-09-03',
})

export async function getNotionPage(pageId: string) {
  try {
    return await notion.pages.retrieve({ page_id: pageId })
  } catch (error) {
    logger.error('Notion API 오류', {
      pageId,
    })
    throw error
  }
}

/**
 * Notion 페이지 properties 업데이트 (지수 백오프 재시도 포함)
 * @param pageId - 업데이트할 Notion 페이지 ID
 * @param properties - 업데이트할 properties 객체 (Notion API 형식)
 * @param maxRetries - 최대 재시도 횟수 (기본 3회)
 * @throws {NotionUpdateError} - 최대 재시도 초과 또는 권한 오류 시
 */
export async function updateNotionPage(
  pageId: string,
  properties: Parameters<typeof notion.pages.update>[0]['properties'],
  maxRetries: number = 3
): Promise<void> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await notion.pages.update({ page_id: pageId, properties })
      logger.info('Notion 페이지 업데이트 성공', { pageId })
      return
    } catch (error) {
      lastError = error
      const errorObj = error as { code?: string; status?: number }

      // 재시도 불필요한 에러: 권한 없음, 페이지 없음
      const nonRetryableCodes = [
        'unauthorized',
        'object_not_found',
        'forbidden',
      ]
      if (errorObj.code && nonRetryableCodes.includes(errorObj.code)) {
        logger.error('Notion 업데이트 재시도 불가 에러', {
          pageId,
          code: errorObj.code,
        })
        throw new NotionUpdateError(pageId, error)
      }

      if (attempt < maxRetries - 1) {
        // 지수 백오프: 1초, 2초, 4초
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000)
        logger.warn('Notion 업데이트 재시도', {
          pageId,
          attempt: attempt + 1,
          maxRetries,
          delayMs,
        })
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw new NotionUpdateError(pageId, lastError)
}

/**
 * Notion 데이터베이스에 새 페이지(레코드) 생성 (지수 백오프 재시도 포함)
 * @param databaseId - 대상 데이터베이스 ID
 * @param properties - 생성할 페이지 properties 객체 (Notion API 형식)
 * @param maxRetries - 최대 재시도 횟수 (기본 3회)
 * @returns 생성된 페이지 ID
 * @throws {NotionUpdateError} - 최대 재시도 초과 또는 권한 오류 시
 */
export async function createNotionPage(
  databaseId: string,
  properties: Parameters<typeof notion.pages.create>[0]['properties'],
  maxRetries: number = 3
): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      })
      logger.info('Notion 페이지 생성 성공', {
        databaseId,
        pageId: response.id,
      })
      return response.id
    } catch (error) {
      lastError = error
      const errorObj = error as { code?: string }

      const nonRetryableCodes = [
        'unauthorized',
        'object_not_found',
        'forbidden',
      ]
      if (errorObj.code && nonRetryableCodes.includes(errorObj.code)) {
        logger.error('Notion 페이지 생성 재시도 불가 에러', {
          databaseId,
          code: errorObj.code,
        })
        throw new NotionUpdateError(databaseId, error)
      }

      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000)
        logger.warn('Notion 페이지 생성 재시도', {
          databaseId,
          attempt: attempt + 1,
          maxRetries,
          delayMs,
        })
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw new NotionUpdateError(databaseId, lastError)
}

/**
 * 데이터베이스의 data_source_id를 조회하고 캐싱합니다.
 * Notion API v5에서는 database_id 대신 data_source_id를 사용해야 합니다.
 */
let cachedDataSourceId: string | null = null

export async function getDataSourceId(): Promise<string> {
  // 이미 캐싱된 경우 바로 반환
  if (cachedDataSourceId) {
    return cachedDataSourceId
  }

  try {
    const response = await notion.databases.retrieve({
      database_id: env.NOTION_DATABASE_ID,
    })

    // v5에서 database는 data_sources 배열을 반환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataSources = (response as any).data_sources

    if (!dataSources || dataSources.length === 0) {
      throw new Error('데이터베이스에 data source가 없습니다')
    }

    // 첫 번째 data_source 사용 (일반적인 케이스)
    const dataSourceId = dataSources[0].id
    cachedDataSourceId = dataSourceId
    logger.info('Data Source ID 캐싱 완료', {
      dataSourceId,
    })

    return dataSourceId
  } catch (error) {
    logger.error('Data Source ID 조회 실패', {
      databaseId: env.NOTION_DATABASE_ID,
      error,
    })
    throw error
  }
}
