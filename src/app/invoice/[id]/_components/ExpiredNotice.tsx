/**
 * 만료된 견적서 안내 컴포넌트
 * - 견적서 상태가 'expired'일 때 표시
 * - 모든 수락/거절/네고 액션을 비활성화하고 재발행 문의를 안내
 */

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ExpiredNotice() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>견적서가 만료되었습니다</AlertTitle>
      <AlertDescription>
        이 견적서의 유효기간이 지났습니다. 재발행이 필요하신 경우 견적서
        발행자에게 직접 연락해 주세요.
      </AlertDescription>
    </Alert>
  )
}
