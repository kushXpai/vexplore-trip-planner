// src/components/layout/AppHeader.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Check, ChevronDown, Shield } from 'lucide-react';
import { TripStatus } from '@/types/trip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface AppHeaderProps {
  title?: string;
  tripStatus?: TripStatus;
  lastSaved?: string;
  showAutosave?: boolean;
}

const statusConfig: Record<TripStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'status-draft' },
  sent: { label: 'Sent for Approval', className: 'status-sent' },
  approved: { label: 'Approved', className: 'status-approved' },
  completed: { label: 'Completed', className: 'status-completed' },
  locked: { label: 'Locked', className: 'status-locked' },
};

export function AppHeader({
  title,
  tripStatus,
  lastSaved,
  showAutosave = false,
}: AppHeaderProps) {
  const { user, logout, isAdmin } = useAuth();

  const userName = user?.name || 'User';
  const userRole = isAdmin ? 'Admin' : 'manager';

  const initials =
    userName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {title && (
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        )}
        {tripStatus && (
          <Badge
            className={cn(
              'status-badge',
              statusConfig[tripStatus].className
            )}
          >
            {statusConfig[tripStatus].label}
          </Badge>
        )}
        {showAutosave && lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3 h-3 text-success" />
            <span>Saved {lastSaved}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {userRole}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Team Management</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={logout}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}