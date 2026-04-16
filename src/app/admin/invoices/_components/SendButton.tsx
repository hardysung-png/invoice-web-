'use client'

/**
 * 어드민 견적서 발송 버튼 컴포넌트
 * - 클릭 시 sendInvoiceAction Server Action을 호출합니다.
 * - 발송 성공 시 toast 알림을 표시합니다.
 * - 이미 발송됐거나 terminal 상태일 경우 비활성화됩니다.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendInvoiceAction } from '../[id]/actions'
import type { InvoiceStatus } from '@/types/invoice'

/** 발송 버튼이 활성화되는 상태 */
const SENDABLE_STATUSES: InvoiceStatus[] = ['pending', 'approved']

interface SendButtonProps {
  invoiceId: string
  currentStatus: InvoiceStatus
  expiresAt?: string
}

export function SendButton({
  invoiceId,
  currentStatus,
  expiresAt,
}: SendButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const isDisabled = !SENDABLE_STATUSES.includes(currentStatus) || isPending

  async function handleSend() {
    setIsPending(true)

    try {
      const result = await sendInvoiceAction(invoiceId, expiresAt)

      if (result.success) {
        toast.success('견적서가 발송됨 상태로 전환되었습니다.')
        router.refresh()
      } else {
        toast.error(`발송 실패: ${result.error ?? '알 수 없는 오류'}`)
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      onClick={handleSend}
      disabled={isDisabled}
      variant="default"
      size="sm"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Send className="mr-2 h-4 w-4" />
      )}
      발송
    </Button>
  )
}
