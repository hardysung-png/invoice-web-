/**
 * 로그아웃 버튼 컴포넌트
 * Client Component (버튼 클릭 이벤트 처리)
 */

'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/admin/actions'

/**
 * 로그아웃 버튼
 * logoutAction에서 서버 사이드 redirect를 처리하므로
 * 클라이언트에서 별도 router.push가 필요하지 않습니다.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </form>
  )
}
