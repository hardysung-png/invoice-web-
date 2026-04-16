/**
 * Notion API 응답 타입 정의
 * @notionhq/client SDK 공식 타입을 재사용하여 중복 방지
 */

import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'

/**
 * Notion Page 타입 (SDK 재사용)
 */
export type NotionPage = PageObjectResponse

/**
 * Notion Database 타입 (SDK 재사용)
 */
export type NotionDatabase = DatabaseObjectResponse

/**
 * 견적서 페이지 속성 타입
 * CSV 데이터의 실제 한글 속성명을 반영 (v2 신규 필드 포함)
 */
export interface InvoicePageProperties {
  /** 견적서 번호 (Title 속성) */
  '견적서 번호': {
    type: 'title'
    title: Array<{ plain_text: string }>
  }
  /** 클라이언트명 (Rich Text 속성) */
  클라이언트명: {
    type: 'rich_text'
    rich_text: Array<{ plain_text: string }>
  }
  /** 발행일 (Date 속성) */
  발행일: {
    type: 'date'
    date: { start: string } | null
  }
  /** 유효기간 (Date 속성) */
  유효기간: {
    type: 'date'
    date: { start: string } | null
  }
  /** 총 금액 (Rollup 속성) */
  '총 금액': {
    type: 'rollup'
    rollup: {
      type: 'number'
      number: number | null
      function: string
    }
  }
  /** 상태 (Select 속성: v1 대기/승인/거절, v2 발송됨/검토중/수락/거절/네고중/만료) */
  상태: {
    type: 'select'
    select: { name: string } | null
  }
  /** 항목 (Relation 속성 → Items) */
  항목: {
    type: 'relation'
    relation: Array<{ id: string }>
  }
  /** 만료일 (Date 속성, v2 신규) */
  expires_at?: {
    type: 'date'
    date: { start: string } | null
  }
  /** 최대 네고 횟수 (Number 속성, v2 신규) */
  max_nego_rounds?: {
    type: 'number'
    number: number | null
  }
  /** 부모 견적서 Relation (v2 신규) */
  parent_invoice?: {
    type: 'relation'
    relation: Array<{ id: string }>
  }
  /** 자식 견적서 Relation (v2 신규, parent_invoice의 역방향) */
  child_invoices?: {
    type: 'relation'
    relation: Array<{ id: string }>
  }
  /** 거절 사유 (Rich Text 속성, v2 신규) */
  reject_reason?: {
    type: 'rich_text'
    rich_text: Array<{ plain_text: string }>
  }
  /** 네고 메모 (Rich Text 속성, v2 신규) */
  nego_memo?: {
    type: 'rich_text'
    rich_text: Array<{ plain_text: string }>
  }
}

/**
 * 항목 페이지 속성 타입
 * CSV 데이터의 Items 테이블 구조를 반영 (v2 신규 필드 포함)
 */
export interface ItemPageProperties {
  /** 항목명 (Title 속성) */
  항목명: {
    type: 'title'
    title: Array<{ plain_text: string }>
  }
  /** 수량 (Number 속성) */
  수량: {
    type: 'number'
    number: number | null
  }
  /** 단가 (Number 속성) */
  단가: {
    type: 'number'
    number: number | null
  }
  /** 금액 (Formula 속성, 수량 × 단가) */
  금액: {
    type: 'formula'
    formula: {
      type: 'number'
      number: number | null
    }
  }
  /** 견적서 (Relation 속성 → Invoices) */
  견적서: {
    type: 'relation'
    relation: Array<{ id: string }>
  }
  /** 네고 하한선 단가 (Number 속성, v2 신규) */
  floor_price?: {
    type: 'number'
    number: number | null
  }
  /** 원래 단가 (Number 속성, v2 신규) */
  original_unit_price?: {
    type: 'number'
    number: number | null
  }
}

/**
 * Notion 페이지를 Invoice 속성으로 타입 캐스팅하기 위한 타입 가드
 */
export function isInvoicePage(
  page: NotionPage
): page is NotionPage & { properties: InvoicePageProperties } {
  return 'properties' in page && '견적서 번호' in page.properties
}

/**
 * Notion 페이지를 Item 속성으로 타입 캐스팅하기 위한 타입 가드
 */
export function isItemPage(
  page: NotionPage
): page is NotionPage & { properties: ItemPageProperties } {
  return 'properties' in page && '항목명' in page.properties
}
