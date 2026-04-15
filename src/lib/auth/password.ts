/**
 * 비밀번호 검증 유틸리티
 */

import { timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'

/**
 * 입력된 비밀번호가 관리자 비밀번호와 일치하는지 확인
 * timingSafeEqual을 사용하여 타이밍 공격(Timing Attack)을 방어합니다.
 * 일반 === 비교는 문자 일치 여부에 따라 응답 시간이 달라질 수 있습니다.
 *
 * @param password - 검증할 비밀번호
 * @returns 비밀번호 일치 여부
 */
export function verifyPassword(password: string): boolean {
  const inputBuffer = Buffer.from(password, 'utf8')
  const storedBuffer = Buffer.from(env.ADMIN_PASSWORD, 'utf8')

  // 길이가 다르면 즉시 false (timingSafeEqual은 동일 길이 버퍼만 허용)
  if (inputBuffer.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(inputBuffer, storedBuffer)
}
