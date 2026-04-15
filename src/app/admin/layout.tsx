/**
 * 관리자 레이아웃
 * Server Component (세션 검증)
 */

import { Suspense } from 'react'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { AdminHeader } from '@/components/admin/admin-header'
import { AdminNav } from '@/components/admin/admin-nav'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * 관리자 레이아웃 Props
 */
interface AdminLayoutProps {
  children: React.ReactNode
}

/**
 * 콘텐츠 영역 로딩 스켈레톤
 * 페이지 콘텐츠 로딩 중 표시되는 플레이스홀더
 */
function ContentSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * 관리자 레이아웃
 * 인증된 사용자만 접근 가능
 * Suspense 경계를 통해 헤더/네비게이션은 즉시 표시하고
 * 페이지 콘텐츠는 스트리밍으로 로드합니다.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession()

  // 세션이 없으면 로그인 페이지로 리다이렉트
  // (미들웨어에서도 체크하지만 이중 보안)
  if (!session) {
    redirect('/admin-login')
  }

  return (
    <div className="bg-background min-h-screen">
      {/* 헤더는 즉시 렌더링 */}
      <AdminHeader />
      <div className="flex">
        {/* 네비게이션도 즉시 렌더링 */}
        <AdminNav />
        {/* 페이지 콘텐츠는 Suspense로 스트리밍 */}
        <main className="flex-1 p-6">
          <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  )
}
