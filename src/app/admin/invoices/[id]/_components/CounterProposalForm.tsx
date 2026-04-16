'use client'

/**
 * 어드민 역제안 폼 다이얼로그
 * - 수신자 네고에 대해 어드민이 새 단가를 역제안
 * - 합계 자동 재계산
 * - 역제안 메모 입력
 */

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, MessageSquare } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { InvoiceItem } from '@/types/invoice'
import type { CounterProposeResult } from '@/app/admin/invoices/[id]/actions'

/** 역제안 폼 스키마 */
const counterProposalSchema = z.object({
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number().min(1, '단가는 1원 이상이어야 합니다.'),
      floorPrice: z.number().optional(),
      originalUnitPrice: z.number().optional(),
    })
  ),
  memo: z.string().max(500, '메모는 500자 이내로 입력해주세요.').optional(),
})

type CounterProposalFormValues = z.infer<typeof counterProposalSchema>

interface CounterProposalFormProps {
  invoiceId: string
  items: InvoiceItem[]
  onCounterPropose: (
    invoiceId: string,
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      floorPrice?: number
      originalUnitPrice?: number
    }>,
    memo?: string
  ) => Promise<CounterProposeResult>
}

export function CounterProposalForm({
  invoiceId,
  items,
  onCounterPropose,
}: CounterProposalFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<CounterProposalFormValues>({
    resolver: zodResolver(counterProposalSchema),
    defaultValues: {
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        floorPrice: item.floorPrice,
        originalUnitPrice: item.originalUnitPrice ?? item.unitPrice,
      })),
      memo: '',
    },
  })

  useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  /** 제안 합계 */
  const proposedTotal = watchedItems.reduce((sum, item) => {
    return sum + (Number(item.unitPrice) || 0) * item.quantity
  }, 0)

  /** 원본 합계 */
  const originalTotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  async function handleFormSubmit(values: CounterProposalFormValues) {
    setIsPending(true)
    try {
      const result = await onCounterPropose(
        invoiceId,
        values.items,
        values.memo || undefined
      )
      if (result.success && result.childId) {
        toast.success('역제안을 제출했습니다.')
        setOpen(false)
        reset()
        router.push(`/admin/invoices/${result.childId}`)
      } else {
        toast.error(result.error ?? '역제안 처리 중 오류가 발생했습니다.')
      }
    } catch {
      toast.error('역제안 처리 중 예외가 발생했습니다.')
    } finally {
      setIsPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      if (!next) reset()
      setOpen(next)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare className="mr-2 h-4 w-4" />
        역제안
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>역제안</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* 항목별 단가 수정 */}
            <div className="space-y-3">
              <Label>항목별 단가 조정</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">항목명</th>
                      <th className="pb-2 text-right font-medium">수량</th>
                      <th className="pb-2 text-right font-medium">현재 단가</th>
                      <th className="pb-2 text-right font-medium">
                        역제안 단가
                      </th>
                      <th className="pb-2 text-right font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const proposedPrice =
                        Number(watchedItems[index]?.unitPrice) || 0
                      const amount = proposedPrice * item.quantity
                      const isChanged = proposedPrice !== item.unitPrice
                      const fieldError =
                        errors.items?.[index]?.unitPrice?.message

                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-3 pr-3">
                            {/* 숨김 필드는 td 내부에 배치 */}
                            <input
                              type="hidden"
                              {...register(`items.${index}.description`)}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.floorPrice`, {
                                setValueAs: (v: string) =>
                                  v === '' ? undefined : Number(v),
                              })}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.originalUnitPrice`, {
                                setValueAs: (v: string) =>
                                  v === '' ? undefined : Number(v),
                              })}
                            />
                            {item.description}
                          </td>
                          <td className="py-3 text-right">{item.quantity}</td>
                          <td className="py-3 text-right">
                            <span
                              className={
                                isChanged
                                  ? 'text-muted-foreground line-through'
                                  : ''
                              }
                            >
                              {formatCurrency(item.unitPrice)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <Input
                                type="number"
                                step={1}
                                className={`w-32 text-right ${fieldError ? 'border-destructive' : ''}`}
                                {...register(`items.${index}.unitPrice`, {
                                  valueAsNumber: true,
                                })}
                              />
                              {fieldError && (
                                <p className="text-destructive text-xs">
                                  {fieldError}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <span className={isChanged ? 'font-semibold' : ''}>
                              {formatCurrency(amount)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        className="pt-4 text-right text-sm font-semibold"
                      >
                        합계
                      </td>
                      <td className="pt-4 text-right">
                        {originalTotal !== proposedTotal && (
                          <span className="text-muted-foreground mr-2 text-xs line-through">
                            {formatCurrency(originalTotal)}
                          </span>
                        )}
                      </td>
                      <td className="pt-4 text-right font-bold">
                        {formatCurrency(proposedTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 역제안 메모 */}
            <div className="space-y-2">
              <Label htmlFor="counter-memo">역제안 메모 (선택)</Label>
              <Textarea
                id="counter-memo"
                placeholder="단가 조정에 대한 이유나 제안 사항을 입력해주세요."
                rows={3}
                {...register('memo')}
                className={errors.memo ? 'border-destructive' : ''}
              />
              {errors.memo && (
                <p className="text-destructive text-sm">
                  {errors.memo.message}
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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                역제안 제출
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
