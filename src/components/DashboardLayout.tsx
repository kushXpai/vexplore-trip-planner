// src/components/DashboardLayout.tsx
import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plane,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FileText,
  BarChart3,
  Briefcase,
  Database,
  Shield,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Trips', href: '/trips', icon: <Briefcase className="w-5 h-5" /> },
  { label: 'Create Trip', href: '/trips/create', icon: <Plane className="w-5 h-5" /> },
  { label: 'Masters', href: '/masters', icon: <Database className="w-5 h-5" />, adminOnly: true },
  { label: 'User Management', href: '/users', icon: <Shield className="w-5 h-5" />, superAdminOnly: true },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'text-white';
      case 'admin': return 'text-white';
      case 'manager': return 'text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border bg-gradient-to-r from-sidebar to-sidebar/95">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Plane className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>

          {/* App Name */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-sidebar-foreground text-base truncate">
              VXplore
            </h1>
            <p className="text-[10px] text-sidebar-foreground/60 font-medium">
              Trip Cost Manager
            </p>
          </div>

          {/* Close button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === '/trips' && location.pathname.startsWith('/trips/') && location.pathname !== '/trips/create');
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <span className={cn(
                  "transition-transform duration-200",
                  isActive && "scale-110"
                )}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              {user?.role === 'superadmin' ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <Users className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                  getRoleBadgeColor(user?.role)
                )}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/10">
                  {user?.role === 'superadmin' ? (
                    <Shield className="w-4 h-4 text-black" />
                  ) : (
                    <Users className="w-4 h-4 text-black" />
                  )}
                </div>
                <span className="hidden sm:inline font-medium text-black">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                <span className={cn(
                  "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide",
                  getRoleBadgeColor(user?.role)
                )}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}