/**
 * 애플리케이션 전역 상수 정의
 * as const 패턴을 사용하여 타입 리터럴 보장
 */

/**
 * v1 견적서 상태 상수 (레거시, Task 028 마이그레이션 완료 후 제거 예정)
 */
export const INVOICE_STATUS_V1 = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

/**
 * v2 견적서 상태 상수 (6단계 상태 모델)
 */
export const INVOICE_STATUS_V2 = {
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  NEGOTIATING: 'negotiating',
  EXPIRED: 'expired',
} as const

/**
 * 통합 견적서 상태 상수 (마이그레이션 기간 v1 + v2 공존)
 */
export const INVOICE_STATUS = {
  ...INVOICE_STATUS_V1,
  ...INVOICE_STATUS_V2,
} as const

export type InvoiceStatusKey = keyof typeof INVOICE_STATUS
export type InvoiceStatusValue = (typeof INVOICE_STATUS)[InvoiceStatusKey]

/**
 * 견적서 상태 한글 레이블 (v1 + v2)
 */
export const INVOICE_STATUS_LABELS = {
  // v1 (레거시)
  pending: '대기',
  approved: '승인',
  // v2
  sent: '발송됨',
  viewed: '검토중',
  accepted: '수락',
  rejected: '거절',
  negotiating: '네고중',
  expired: '만료',
} as const

/**
 * Notion 한글 상태값 → 영문 상태값 변환 맵 (v1 + v2)
 */
export const KOREAN_TO_STATUS_MAP = {
  // v1 (레거시)
  대기: 'pending',
  승인: 'approved',
  // v2
  발송됨: 'sent',
  검토중: 'viewed',
  수락: 'accepted',
  거절: 'rejected',
  네고중: 'negotiating',
  만료: 'expired',
} as const

/**
 * 영문 상태값 → Notion 한글 상태값 변환 맵 (v2 기준)
 */
export const STATUS_TO_KOREAN_MAP = {
  pending: '대기',
  approved: '승인',
  sent: '발송됨',
  viewed: '검토중',
  accepted: '수락',
  rejected: '거절',
  negotiating: '네고중',
  expired: '만료',
} as const

/**
 * v2 유효 상태 전이 규칙
 * key: 현재 상태, value: 전이 가능한 상태 배열
 */
export const VALID_STATUS_TRANSITIONS = {
  sent: ['viewed', 'expired'],
  viewed: ['accepted', 'rejected', 'negotiating', 'expired'],
  accepted: [],
  rejected: [],
  negotiating: ['accepted', 'rejected', 'negotiating', 'expired'],
  expired: [],
  // v1 레거시 (마이그레이션 이전 기록에만 존재)
  pending: ['sent'],
  approved: [],
} as const

/** 최대 네고 횟수 기본값 */
export const DEFAULT_MAX_NEGO_ROUNDS = 3

/**
 * 수신자 액션(수락/거절/네고)이 가능한 v2 상태 목록
 * terminal 상태에서는 버튼을 숨깁니다.
 */
export const ACTIONABLE_STATUSES = ['sent', 'viewed', 'negotiating'] as const
export type ActionableStatus = (typeof ACTIONABLE_STATUSES)[number]

/**
 * 더 이상 전이가 불가능한 terminal 상태 목록
 */
export const TERMINAL_STATUSES = ['accepted', 'rejected', 'expired'] as const
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]

/**
 * PDF 설정 상수
 */
export const PDF_CONFIG = {
  DEFAULT_FORMAT: 'A4',
  DEFAULT_ORIENTATION: 'portrait',
  FILENAME_PREFIX: 'invoice',
} as const

/**
 * 에러 메시지 상수
 */
export const ERROR_MESSAGES = {
  INVOICE_NOT_FOUND: '견적서를 찾을 수 없습니다.',
  NOTION_API_ERROR: 'Notion API 연결 오류가 발생했습니다.',
  PDF_GENERATION_ERROR: 'PDF 생성 중 오류가 발생했습니다.',
  INVALID_INVOICE_DATA: '유효하지 않은 견적서 데이터입니다.',
  MISSING_REQUIRED_FIELD: '필수 필드가 누락되었습니다.',
} as const

/**
 * 통화 포맷 설정
 */
export const CURRENCY_FORMAT = {
  LOCALE: 'ko-KR',
  CURRENCY: 'KRW',
  SYMBOL: '₩',
} as const
