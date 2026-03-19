// src/components/TripSectionNav.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Info, Users, Plane, Bus, Train, Hotel as HotelIcon,
  Utensils, Ticket, IdCard, Shield, Calculator, Map, X, List
} from 'lucide-react';

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const ALL_SECTIONS: Section[] = [
  { id: 'section-classification', label: 'Classification',   icon: <Info className="w-4 h-4" /> },
  { id: 'section-basic',          label: 'Basic Info',       icon: <Map className="w-4 h-4" /> },
  { id: 'section-participants',   label: 'Participants',     icon: <Users className="w-4 h-4" /> },
  { id: 'section-flights',        label: 'Flights',          icon: <Plane className="w-4 h-4" /> },
  { id: 'section-buses',          label: 'Buses',            icon: <Bus className="w-4 h-4" /> },
  { id: 'section-trains',         label: 'Trains',           icon: <Train className="w-4 h-4" /> },
  { id: 'section-accommodation',  label: 'Accommodation',    icon: <HotelIcon className="w-4 h-4" /> },
  { id: 'section-meals',          label: 'Meals',            icon: <Utensils className="w-4 h-4" /> },
  { id: 'section-activities',     label: 'Activities',       icon: <Ticket className="w-4 h-4" /> },
  { id: 'section-extras',         label: 'Visa & Insurance', icon: <IdCard className="w-4 h-4" /> },
  { id: 'section-overheads',      label: 'Overheads',        icon: <Shield className="w-4 h-4" /> },
  { id: 'section-summary',        label: 'Cost Summary',     icon: <Calculator className="w-4 h-4" /> },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─── Desktop: sticky left sidebar ────────────────────────────────────────────
export function TripSectionNavDesktop() {
  const [activeId, setActiveId] = useState<string>(ALL_SECTIONS[0]?.id ?? '');

  useEffect(() => {
    const scrollEl = document.getElementById('trip-scroll-container');
    if (!scrollEl) return;

    const handleScroll = () => {
      const containerTop = scrollEl.getBoundingClientRect().top;
      let closestId = ALL_SECTIONS[0]?.id ?? '';
      let closestDist = Infinity;

      ALL_SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = id;
        }
      });

      setActiveId(closestId);
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <aside className="hidden lg:flex flex-col sticky top-0 self-start w-48 shrink-0 max-h-screen overflow-y-auto pt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-2">
        Sections
      </p>
      <nav className="flex flex-col gap-0.5">
        {ALL_SECTIONS.map(({ id, label, icon }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150
                ${isActive
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <span className={isActive ? 'text-primary-foreground' : 'text-primary'}>
                {icon}
              </span>
              <span className="leading-tight">{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground opacity-80" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─── Mobile: floating button + bottom drawer ─────────────────────────────────
export function TripSectionNavMobile() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(ALL_SECTIONS[0]?.id ?? '');
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = document.getElementById('trip-scroll-container');
    if (!scrollEl) return;

    const handleScroll = () => {
      const containerTop = scrollEl.getBoundingClientRect().top;
      let closestId = ALL_SECTIONS[0]?.id ?? '';
      let closestDist = Infinity;

      ALL_SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = id;
        }
      });

      setActiveId(closestId);
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeSection = ALL_SECTIONS.find(s => s.id === activeId);

  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50 bg-background border-t rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-semibold">Jump to Section</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-full hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 pb-8 max-h-72 overflow-y-auto">
          {ALL_SECTIONS.map(({ id, label, icon }) => {
            const isActive = activeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  scrollToSection(id);
                  setOpen(false);
                }}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }
                `}
              >
                <span className={isActive ? 'text-primary-foreground' : 'text-primary'}>
                  {icon}
                </span>
                <span className="text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
      >
        <List className="w-4 h-4" />
        <span className="max-w-[100px] truncate">{activeSection?.label}</span>
      </button>
    </div>
  );
}