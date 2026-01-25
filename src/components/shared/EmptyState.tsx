// src/components/shared/EmptyState.tsx
import { Plane, MapPin, Building2 } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center">
          <Plane className="w-10 h-10 text-primary/40" />
        </div>
        <div className="absolute -right-2 -top-2 w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-accent/60" />
        </div>
        <div className="absolute -left-2 -bottom-2 w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-warning/60" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No trips yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Create your first trip cost sheet to get started with managing your travel expenses.
      </p>
    </div>
  );
}
