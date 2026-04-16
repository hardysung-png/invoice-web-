'use client'

/**
 * 수신자 액션 버튼 영역
 * - 수락 / 거절 / 네고 제안 버튼 제공
 * - 상태별 노출 규칙: sent/viewed/negotiating → 표시, 그 외 → 숨김
 * - 거절 클릭 시 RejectReasonDialog 열기
 * - 네고 제안 클릭 시 NegotiationForm 열기
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RejectReasonDialog } from './RejectReasonDialog'
import { NegotiationForm } from './NegotiationForm'
import { ACTIONABLE_STATUSES } from '@/lib/constants'
import type { InvoiceStatus, InvoiceItem } from '@/types/invoice'

interface RecipientActionsProps {
  invoiceId: string
  currentStatus: InvoiceStatus
  items: InvoiceItem[]
  onAccept: (id: string) => Promise<{ success: boolean; error?: string }>
  onReject: (
    id: string,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>
  onNegotiate: (
    id: string,
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      floorPrice?: number
      originalUnitPrice?: number
    }>,
    memo?: string
  ) => Promise<{ success: boolean; childId?: string; error?: string }>
}

export function RecipientActions({
  invoiceId,
  currentStatus,
  items,
  onAccept,
  onReject,
  onNegotiate,
}: RecipientActionsProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [negoFormOpen, setNegoFormOpen] = useState(false)
  const router = useRouter()

  // terminal/v1 상태에서는 버튼 영역 숨김
  if (!(ACTIONABLE_STATUSES as readonly string[]).includes(currentStatus)) {
    return null
  }

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const result = await onAccept(invoiceId)
      if (result.success) {
        toast.success('견적서를 수락했습니다.')
        router.refresh()
      } else {
        toast.error(result.error ?? '수락 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleRejectConfirm(reason: string) {
    const result = await onReject(invoiceId, reason)
    if (result.success) {
      toast.success('견적서를 거절했습니다.')
      router.refresh()
    } else {
      toast.error(result.error ?? '거절 처리 중 오류가 발생했습니다.')
    }
  }

  async function handleNegoSubmit(
    proposedItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      floorPrice?: number
      originalUnitPrice?: number
    }>,
    memo?: string
  ) {
    const result = await onNegotiate(invoiceId, proposedItems, memo)
    if (result.success && result.childId) {
      toast.success('네고 제안을 제출했습니다.')
      // 새로 생성된 자식 견적서 페이지로 이동
      router.push(`/invoice/${result.childId}`)
    } else {
      toast.error(result.error ?? '네고 제안 중 오류가 발생했습니다.')
      throw new Error(result.error ?? '네고 제안 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          size="lg"
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full sm:w-auto"
        >
          {isAccepting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-5 w-5" />
          )}
          수락
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setNegoFormOpen(true)}
          disabled={isAccepting}
          className="w-full sm:w-auto"
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          네고 제안
        </Button>
        <Button
          size="lg"
          variant="destructive"
          onClick={() => setRejectDialogOpen(true)}
          disabled={isAccepting}
          className="w-full sm:w-auto"
        >
          <XCircle className="mr-2 h-5 w-5" />
          거절
        </Button>
      </div>

      <RejectReasonDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
      />

      <NegotiationForm
        open={negoFormOpen}
        onOpenChange={setNegoFormOpen}
        items={items}
        onSubmit={handleNegoSubmit}
      />
    </>
  )
}
