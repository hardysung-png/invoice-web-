/**
 * 관리자 페이지 공통 Server Actions
 */

'use server'

import { redirect } from 'next/navigation'
import { deleteSession } from '@/lib/auth/session'

/**
 * 로그아웃 처리 Server Action
 * 세션을 삭제하고 서버에서 직접 로그인 페이지로 리다이렉트합니다.
 * 클라이언트 router.push에 의존하지 않으므로 JS 비활성 환경에서도 안전합니다.
 */
export async function logoutAction(): Promise<void> {
  await deleteSession()
  redirect('/admin-login')
}
