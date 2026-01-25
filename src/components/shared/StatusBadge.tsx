// src/components/shared/StatusBadge.tsx
import { TripStatus } from '@/types/trip';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: TripStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<TripStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-warning/10 text-warning border-warning/20' },
  approved: { label: 'Approved', className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  locked: { label: 'Locked', className: 'bg-foreground/10 text-foreground border-foreground/20' },
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
