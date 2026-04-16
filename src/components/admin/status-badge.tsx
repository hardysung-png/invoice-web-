/**
 * 견적서 상태 배지 컴포넌트
 * v1 레거시 + v2 상태 모두 렌더링합니다.
 */

import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/types/invoice'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

const STATUS_CONFIG: Record<InvoiceStatus, StatusConfig> = {
  // v1 레거시
  pending: { label: '대기', variant: 'outline' },
  approved: { label: '승인', variant: 'secondary' },
  // v2
  sent: { label: '발송됨', variant: 'default' },
  viewed: { label: '검토중', variant: 'default' },
  accepted: { label: '수락', variant: 'secondary' },
  rejected: { label: '거절', variant: 'destructive' },
  negotiating: { label: '네고중', variant: 'default' },
  expired: { label: '만료', variant: 'outline' },
}

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'outline' as BadgeVariant,
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
