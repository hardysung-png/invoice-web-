/**
 * 애플리케이션 커스텀 에러 클래스
 */

/**
 * 견적서 상태 전이가 허용되지 않을 때 발생하는 에러
 * 예: sent → expired는 허용, sent → accepted는 불허
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string
  ) {
    super(
      `상태 전이 불가: '${fromStatus}' → '${toStatus}'. 허용된 전이가 아닙니다.`
    )
    this.name = 'InvalidTransitionError'
  }
}

/**
 * 네고 단가가 floor_price 미만일 때 발생하는 에러
 */
export class FloorPriceViolationError extends Error {
  constructor(
    public readonly itemDescription: string,
    public readonly proposed: number,
    public readonly floor: number
  ) {
    super(
      `"${itemDescription}" 단가 ${proposed.toLocaleString()}원이 최소 허용 단가 ${floor.toLocaleString()}원보다 낮습니다.`
    )
    this.name = 'FloorPriceViolationError'
  }
}

/**
 * 네고 최대 횟수를 초과했을 때 발생하는 에러
 */
export class NegoRoundsLimitError extends Error {
  constructor(public readonly maxRounds: number) {
    super(`최대 네고 횟수(${maxRounds}회)를 초과했습니다.`)
    this.name = 'NegoRoundsLimitError'
  }
}

/**
 * Notion 페이지 업데이트 실패 시 발생하는 에러
 * 네트워크 오류, 권한 오류, 재시도 초과 등
 */
export class NotionUpdateError extends Error {
  constructor(
    public readonly pageId: string,
    public readonly cause?: unknown
  ) {
    const causeMessage =
      cause instanceof Error ? cause.message : String(cause ?? '')
    super(
      `Notion 업데이트 실패 (pageId: ${pageId})${causeMessage ? `: ${causeMessage}` : ''}`
    )
    this.name = 'NotionUpdateError'
  }
}
