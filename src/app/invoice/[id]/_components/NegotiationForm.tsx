'use client'

/**
 * 수신자 네고 제안 폼 다이얼로그
 * - 품목별 단가 수정 (원본가 취소선 + 제안가 입력)
 * - 합계 자동 재계산
 * - floor_price 미만 입력 차단 (폼 단 검증)
 * - 네고 메모 입력
 */

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { InvoiceItem } from '@/types/invoice'

/** 네고 제안 폼 스키마 */
function buildNegoSchema() {
  return z.object({
    items: z.array(
      z
        .object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number().min(1, '단가는 1원 이상이어야 합니다.'),
          floorPrice: z.number().optional(),
          originalUnitPrice: z.number().optional(),
        })
        .superRefine((item, ctx) => {
          if (
            item.floorPrice !== undefined &&
            item.unitPrice < item.floorPrice
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['unitPrice'],
              message: `최소 허용 단가(${item.floorPrice.toLocaleString()}원) 이상이어야 합니다.`,
            })
          }
        })
    ),
    memo: z.string().max(500, '메모는 500자 이내로 입력해주세요.').optional(),
  })
}

type NegoFormValues = ReturnType<ReturnType<typeof buildNegoSchema>['parse']>

interface NegotiationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: InvoiceItem[]
  onSubmit: (
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      floorPrice?: number
      originalUnitPrice?: number
    }>,
    memo?: string
  ) => Promise<void>
}

export function NegotiationForm({
  open,
  onOpenChange,
  items,
  onSubmit,
}: NegotiationFormProps) {
  const [isPending, setIsPending] = useState(false)
  const schema = buildNegoSchema()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<NegoFormValues>({
    resolver: zodResolver(schema),
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

  /** 합계 자동 재계산 */
  const proposedTotal = watchedItems.reduce((sum, item) => {
    const price = Number(item.unitPrice) || 0
    return sum + price * item.quantity
  }, 0)

  /** 원본 합계 */
  const originalTotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  async function handleFormSubmit(values: NegoFormValues) {
    setIsPending(true)
    try {
      await onSubmit(values.items, values.memo || undefined)
      reset()
      onOpenChange(false)
    } finally {
      setIsPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      reset()
      onOpenChange(next)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>네고 제안</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* 항목별 단가 수정 */}
          <div className="space-y-3">
            <Label>항목별 단가 수정</Label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">항목명</th>
                    <th className="pb-2 text-right font-medium">수량</th>
                    <th className="pb-2 text-right font-medium">원래 단가</th>
                    <th className="pb-2 text-right font-medium">제안 단가</th>
                    <th className="pb-2 text-right font-medium">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const proposedPrice =
                      Number(watchedItems[index]?.unitPrice) || 0
                    const amount = proposedPrice * item.quantity
                    const isChanged = proposedPrice !== item.unitPrice
                    const fieldError = errors.items?.[index]?.unitPrice?.message

                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3 pr-3">
                          {/* 숨김 필드는 td 내부에 배치 (tr 직계 자식 input은 유효하지 않은 HTML) */}
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
                              min={item.floorPrice ?? 1}
                              step={1000}
                              className={`w-32 text-right ${fieldError ? 'border-destructive' : ''}`}
                              {...register(`items.${index}.unitPrice`, {
                                valueAsNumber: true,
                              })}
                            />
                            {item.floorPrice && (
                              <span className="text-muted-foreground text-xs">
                                최소: {formatCurrency(item.floorPrice)}
                              </span>
                            )}
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

          {/* 네고 메모 */}
          <div className="space-y-2">
            <Label htmlFor="memo">네고 메모 (선택)</Label>
            <Textarea
              id="memo"
              placeholder="단가 조정에 대한 이유나 요청 사항을 입력해주세요."
              rows={3}
              {...register('memo')}
              className={errors.memo ? 'border-destructive' : ''}
            />
            {errors.memo && (
              <p className="text-destructive text-sm">{errors.memo.message}</p>
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
              네고 제안 제출
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
