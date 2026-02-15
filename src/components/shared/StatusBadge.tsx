// src/components/shared/StatusBadge.tsx
import { TripStatus } from '@/types/trip';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: TripStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<TripStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent for Approval', className: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-300' },
  completed: { label: 'Completed', className: 'bg-purple-100 text-purple-700 border-purple-300' },
  locked: { label: 'Locked', className: 'bg-orange-100 text-orange-700 border-orange-300' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}