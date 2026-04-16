/**
 * 어드민 견적서 상세 페이지 (v2 신규)
 * 견적서의 현재 상태, 항목, 메타데이터를 표시하고
 * 향후 Actions(발송/거절/네고 역제안 등)를 위한 진입점 역할을 합니다.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Calendar, User, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/admin/status-badge'
import { CopyButton } from '@/components/admin/copy-button'
import { SendButton } from '@/app/admin/invoices/_components/SendButton'
import { getOptimizedInvoice } from '@/lib/services/invoice.service'
import { formatCurrency, formatDate } from '@/lib/format'
import { generateInvoiceUrl } from '@/lib/utils/link-generator'

interface AdminInvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminInvoiceDetailPage({
  params,
}: AdminInvoiceDetailPageProps) {
  const { id } = await params

  let invoice
  try {
    invoice = await getOptimizedInvoice(id)
  } catch {
    notFound()
  }

  const invoiceUrl = generateInvoiceUrl(invoice.id)

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            견적서 목록
          </Link>
        </Button>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} className="text-sm" />
          </div>
          <p className="text-muted-foreground mt-1">{invoice.clientName}</p>
        </div>

        <div className="flex gap-2">
          <SendButton
            invoiceId={invoice.id}
            currentStatus={invoice.status}
            expiresAt={invoice.expiresAt}
          />
          <CopyButton text={invoiceUrl} />
          <Button variant="outline" size="sm" asChild>
            <Link href={invoiceUrl} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              수신자 뷰
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 견적서 기본 정보 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 견적 항목 */}
          <Card>
            <CardHeader>
              <CardTitle>견적 항목</CardTitle>
              <CardDescription>
                총 {invoice.items.length}개 항목
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left font-medium">항목명</th>
                      <th className="pb-3 text-right font-medium">수량</th>
                      <th className="pb-3 text-right font-medium">단가</th>
                      <th className="pb-3 text-right font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map(item => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-4 text-right font-semibold">
                        합계
                      </td>
                      <td className="pt-4 text-right text-lg font-bold">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 네고/거절 메모 (있을 경우) */}
          {(invoice.negoMemo || invoice.rejectReason) && (
            <Card>
              <CardHeader>
                <CardTitle>수신자 메모</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.negoMemo && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      네고 메모
                    </p>
                    <p className="text-sm">{invoice.negoMemo}</p>
                  </div>
                )}
                {invoice.rejectReason && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      거절 사유
                    </p>
                    <p className="text-sm">{invoice.rejectReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 사이드 메타데이터 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">견적서 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Hash className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">견적서 번호</p>
                  <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">클라이언트</p>
                  <p className="text-sm font-medium">{invoice.clientName}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">발행일</p>
                  <p className="text-sm font-medium">
                    {formatDate(invoice.issueDate, 'long')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">유효기간</p>
                  <p className="text-sm font-medium">
                    {formatDate(invoice.validUntil, 'long')}
                  </p>
                </div>
              </div>

              {invoice.expiresAt && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">만료일</p>
                      <p className="text-sm font-medium">
                        {formatDate(invoice.expiresAt, 'long')}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {invoice.maxNegoRounds !== undefined && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      최대 네고 횟수
                    </p>
                    <p className="text-sm font-medium">
                      {invoice.maxNegoRounds}회
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 수신자 링크 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수신자 링크</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-hidden rounded px-2 py-1 text-xs text-ellipsis whitespace-nowrap">
                  {invoiceUrl}
                </code>
                <CopyButton text={invoiceUrl} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
