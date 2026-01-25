// src/components/layout/AppLayout.tsx
import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { TripStatus } from '@/types/trip';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  tripStatus?: TripStatus;
  lastSaved?: string;
  showAutosave?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  tripStatus, 
  lastSaved, 
  showAutosave 
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen ml-0">
        <AppHeader 
          title={title} 
          tripStatus={tripStatus} 
          lastSaved={lastSaved}
          showAutosave={showAutosave}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
