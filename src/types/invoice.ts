/**
 * 견적서 비즈니스 도메인 타입 정의
 * CSV 데이터 및 PRD 기반으로 설계된 타입 시스템
 */

/**
 * v1 견적서 상태 타입 (마이그레이션 이전 레거시)
 * Task 028 마이그레이션 완료 후 제거 예정
 */
export type InvoiceStatusV1 = 'pending' | 'approved' | 'rejected'

/**
 * v2 견적서 상태 타입 (6단계 상태 모델)
 * - sent: 발송됨 (어드민이 링크 발송)
 * - viewed: 검토중 (수신자가 최초 열람)
 * - accepted: 수락 (수신자가 수락)
 * - rejected: 거절 (수신자가 거절)
 * - negotiating: 네고중 (수신자가 네고 요청 또는 어드민 역제안 진행 중)
 * - expired: 만료 (만료일 경과)
 */
export type InvoiceStatusV2 =
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'negotiating'
  | 'expired'

/**
 * 통합 견적서 상태 타입 (마이그레이션 기간 v1 + v2 공존)
 * Task 028 마이그레이션 완료 후 InvoiceStatusV2로 교체 예정
 */
export type InvoiceStatus = InvoiceStatusV1 | InvoiceStatusV2

/**
 * 견적 항목 인터페이스
 * Items 테이블 구조를 반영
 */
export interface InvoiceItem {
  /** 항목 고유 ID (Notion Page ID) */
  id: string
  /** 항목명 (예: 웹사이트 디자인) */
  description: string
  /** 수량 */
  quantity: number
  /** 단가 */
  unitPrice: number
  /** 금액 (수량 × 단가) */
  amount: number
  /** 최소 허용 단가 (네고 하한선, v2 신규) */
  floorPrice?: number
  /** 원래 단가 (네고 전 최초 단가, v2 신규) */
  originalUnitPrice?: number
}

/**
 * 견적서 인터페이스
 * Invoices 테이블 구조를 반영
 */
export interface Invoice {
  /** 견적서 고유 ID (Notion Page ID) */
  id: string
  /** 견적서 번호 (예: INV-2025-001) */
  invoiceNumber: string
  /** 클라이언트명 (예: ABC 회사) */
  clientName: string
  /** 발행일 (ISO 8601 형식) */
  issueDate: string
  /** 유효기간 (ISO 8601 형식) */
  validUntil: string
  /** 견적 항목 배열 */
  items: InvoiceItem[]
  /** 총 금액 */
  totalAmount: number
  /** 견적서 상태 */
  status: InvoiceStatus
  /** 만료일 (ISO 8601 형식, v2 신규) */
  expiresAt?: string
  /** 최대 네고 횟수 (기본 3회, v2 신규) */
  maxNegoRounds?: number
  /** 부모 견적서 ID (네고 트리 루트 추적, v2 신규) */
  parentInvoiceId?: string
  /** 자식 견적서 ID 배열 (네고 역제안 목록, v2 신규) */
  childInvoiceIds?: string[]
  /** 거절 사유 (v2 신규) */
  rejectReason?: string
  /** 네고 메모 (수신자 네고 요청 내용, v2 신규) */
  negoMemo?: string
}

/**
 * 회사 정보 인터페이스
 * PDF 생성 시 사용되는 발행자 정보
 */
export interface CompanyInfo {
  /** 회사명 */
  name: string
  /** 주소 (선택사항) */
  address?: string
  /** 전화번호 (선택사항) */
  phone?: string
  /** 이메일 (선택사항) */
  email?: string
}

/**
 * 네고 체인 단위 인터페이스
 * 부모~리프 타임라인 표시에 사용
 */
export interface NegoChainNode {
  /** 견적서 ID */
  id: string
  /** 견적서 번호 */
  invoiceNumber: string
  /** 상태 */
  status: InvoiceStatus
  /** 발행일 */
  issueDate: string
  /** 총액 */
  totalAmount: number
  /** 제안 주체 ('admin' = 어드민 역제안, 'recipient' = 수신자 네고) */
  proposedBy: 'admin' | 'recipient'
  /** 네고 메모 */
  negoMemo?: string
  /** 항목 */
  items: InvoiceItem[]
}

/**
 * PDF 생성용 데이터 인터페이스
 * 견적서 정보와 회사 정보를 포함
 */
export interface InvoicePDFData {
  /** 견적서 데이터 */
  invoice: Invoice
  /** 회사 정보 (선택사항) */
  companyInfo?: CompanyInfo
}
