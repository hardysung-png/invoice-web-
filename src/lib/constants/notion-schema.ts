/**
 * Notion DB 스키마 Property 키 상수
 * Invoices DB 및 Items DB의 컬럼명을 상수로 관리하여 오타 방지
 */

/**
 * Invoices 데이터베이스 Property 키
 */
export const INVOICES_PROPS = {
  // --- 기존 v1 컬럼 ---
  /** 견적서 번호 (Title) */
  INVOICE_NUMBER: '견적서 번호',
  /** 클라이언트명 (Rich Text) */
  CLIENT_NAME: '클라이언트명',
  /** 발행일 (Date) */
  ISSUE_DATE: '발행일',
  /** 유효기간 (Date) */
  VALID_UNTIL: '유효기간',
  /** 총 금액 (Rollup) */
  TOTAL_AMOUNT: '총 금액',
  /** 상태 (Select) */
  STATUS: '상태',
  /** 항목 Relation (→ Items) */
  ITEMS: '항목',

  // --- v2 신규 컬럼 ---
  /** 만료일 (Date) */
  EXPIRES_AT: 'expires_at',
  /** 최대 네고 횟수 (Number) */
  MAX_NEGO_ROUNDS: 'max_nego_rounds',
  /** 부모 견적서 Relation (자기 참조) */
  PARENT_INVOICE: 'parent_invoice',
  /** 자식 견적서 Relation (parent_invoice 역방향) */
  CHILD_INVOICES: 'child_invoices',
  /** 거절 사유 (Rich Text) */
  REJECT_REASON: 'reject_reason',
  /** 네고 메모 (Rich Text) */
  NEGO_MEMO: 'nego_memo',
} as const

/**
 * Items 데이터베이스 Property 키
 */
export const ITEMS_PROPS = {
  // --- 기존 v1 컬럼 ---
  /** 항목명 (Title) */
  NAME: '항목명',
  /** 수량 (Number) */
  QUANTITY: '수량',
  /** 단가 (Number) */
  UNIT_PRICE: '단가',
  /** 금액 (Formula: 수량 × 단가) */
  AMOUNT: '금액',
  /** 견적서 Relation (→ Invoices) */
  INVOICE: '견적서',

  // --- v2 신규 컬럼 ---
  /** 네고 하한선 단가 (Number) */
  FLOOR_PRICE: 'floor_price',
  /** 원래 단가 (Number, 네고 전 최초 단가) */
  ORIGINAL_UNIT_PRICE: 'original_unit_price',
} as const

export type InvoicesPropKey =
  (typeof INVOICES_PROPS)[keyof typeof INVOICES_PROPS]
export type ItemsPropKey = (typeof ITEMS_PROPS)[keyof typeof ITEMS_PROPS]
