'use client'

/**
 * 거절 사유 입력 다이얼로그
 * - 사유 필수 입력 (Zod 검증)
 * - 제출 시 onConfirm 콜백 호출
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const rejectSchema = z.object({
  reason: z
    .string()
    .min(1, '거절 사유를 입력해주세요.')
    .max(500, '거절 사유는 500자 이내로 입력해주세요.'),
})

type RejectFormValues = z.infer<typeof rejectSchema>

interface RejectReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
}

export function RejectReasonDialog({
  open,
  onOpenChange,
  onConfirm,
}: RejectReasonDialogProps) {
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
  })

  async function onSubmit(values: RejectFormValues) {
    setIsPending(true)
    try {
      await onConfirm(values.reason)
      reset()
      onOpenChange(false)
    } finally {
      setIsPending(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!isPending) {
      reset()
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>견적서 거절</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">거절 사유 *</Label>
            <Textarea
              id="reason"
              placeholder="거절 사유를 입력해주세요 (예: 예산 초과, 일정 불가 등)"
              rows={4}
              {...register('reason')}
              className={errors.reason ? 'border-destructive' : ''}
            />
            {errors.reason && (
              <p className="text-destructive text-sm">
                {errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              거절 확인
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
