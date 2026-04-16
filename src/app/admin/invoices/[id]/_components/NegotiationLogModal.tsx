'use client'

/**
 * 네고 로그 모달
 * - 루트~리프 타임라인 표시
 * - 버튼 클릭으로 열기, ESC/오버레이 클릭으로 닫기
 * - 각 라운드: "1차: ₩3,400,000 [고객 제안]" 형식
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from '@/components/admin/status-badge'
import { History, Building2, User } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import type { NegoChainNode } from '@/types/invoice'

interface NegotiationLogModalProps {
  chain: NegoChainNode[]
}

export function NegotiationLogModal({ chain }: NegotiationLogModalProps) {
  const [open, setOpen] = useState(false)

  if (chain.length === 0) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="네고 로그 보기"
      >
        <History className="mr-2 h-4 w-4" />
        네고 로그 ({chain.length}단계)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>네고 협상 로그</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <ol className="space-y-0 py-2">
              {chain.map((node, index) => {
                const isAdmin = node.proposedBy === 'admin'
                const roundLabel = index === 0 ? '최초 제안' : `${index}차 네고`
                const proposerLabel = isAdmin ? '우리 제안' : '고객 제안'

                return (
                  <li key={node.id} className="flex gap-3">
                    {/* 타임라인 선 */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                          isAdmin
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-blue-500 bg-blue-500 text-white'
                        }`}
                      >
                        {isAdmin ? (
                          <Building2 className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </div>
                      {index < chain.length - 1 && (
                        <div className="bg-border mt-1 w-0.5 flex-1" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="mb-6 min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {roundLabel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isAdmin
                              ? 'bg-primary/10 text-primary'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {proposerLabel}
                        </span>
                        <StatusBadge status={node.status} className="text-xs" />
                      </div>

                      <div className="text-muted-foreground mb-1 text-xs">
                        {formatDate(node.issueDate, 'long')} ·{' '}
                        {node.invoiceNumber}
                      </div>

                      <div className="text-base font-bold">
                        {formatCurrency(node.totalAmount)}
                      </div>

                      {node.negoMemo && (
                        <p className="text-muted-foreground mt-1 text-xs italic">
                          &ldquo;{node.negoMemo}&rdquo;
                        </p>
                      )}

                      {/* 항목 요약 (3개 이하일 때만 표시) */}
                      {node.items.length > 0 && node.items.length <= 3 && (
                        <ul className="mt-2 space-y-0.5">
                          {node.items.map(item => (
                            <li
                              key={item.id}
                              className="text-muted-foreground flex justify-between text-xs"
                            >
                              <span>{item.description}</span>
                              <span>
                                {item.quantity > 1 && `×${item.quantity} `}
                                {formatCurrency(item.unitPrice)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
