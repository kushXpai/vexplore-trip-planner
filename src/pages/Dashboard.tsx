// src/pages/Dashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plane,
  TrendingUp,
  Users,
  IndianRupee,
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  FileDown,
  Trash2,
  Calendar,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/client';
import { useQuery } from '@tanstack/react-query';

/* -------------------- TYPES -------------------- */

// Dashboard only needs partial Trip info
type DashboardTrip = {
  id: string;
  name: string;
  institution: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalCostINR: number;
  status: 'draft' | 'sent' | 'approved' | 'completed' | 'locked';
  participants: { totalParticipants: number };
};

type ViewMode = 'table' | 'cards';

/* -------------------- COMPONENT -------------------- */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  /* -------------------- FETCH TRIPS -------------------- */
  const { data: trips, isLoading } = useQuery<DashboardTrip[], Error>({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          name,
          institution,
          country,
          city,
          start_date,
          end_date,
          total_days,
          total_cost_inr,
          status,
          trip_participants (
            total_participants
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        institution: t.institution,
        country: t.country,
        city: t.city,
        startDate: t.start_date,
        endDate: t.end_date,
        totalDays: t.total_days,
        totalCostINR: t.total_cost_inr,
        status: t.status,
        participants: {
          totalParticipants: t.trip_participants?.total_participants || 0
        },
      }));
    },
  });

  /* -------------------- FILTERED TRIPS -------------------- */
  const filteredTrips = trips?.filter(trip => {
    const matchesSearch =
      trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  /* -------------------- DASHBOARD STATS -------------------- */
  const stats = {
    totalTrips: trips?.length || 0,
    activeTrips: trips?.filter(t => ['draft', 'sent', 'approved'].includes(t.status)).length || 0,
    totalRevenue: trips?.reduce((sum, t) => sum + t.totalCostINR, 0) || 0,
    avgProfit: 0, // Placeholder
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Greeting */}
      {user && (
        <div className="text-sm text-muted-foreground">
          Hi <span className="font-medium text-foreground">{user.name}</span> ({user.role})
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Trips"
          value={stats.totalTrips}
          subtitle="All time"
          icon={Plane}
        />
        <StatCard
          title="Active Trips"
          value={stats.activeTrips}
          subtitle="In progress"
          icon={Calendar}
        />
        <StatCard
          title="Total Revenue"
          value={formatINR(stats.totalRevenue)}
          subtitle="This quarter"
          icon={IndianRupee}
        />
        <StatCard
          title="Avg. Profit Margin"
          value={`${stats.avgProfit}%`}
          subtitle="Across all trips"
          icon={TrendingUp}
        />
      </div>

      {/* Trips Section */}
      <Card className="shadow-card">
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold">Trip Cost Sheets</CardTitle>
          <Button
            onClick={() => navigate('/trips/create')}
            className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search trips, institutions, destinations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={cn('rounded-none', viewMode === 'table' && 'bg-muted')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('cards')}
                className={cn('rounded-none', viewMode === 'cards' && 'bg-muted')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading trips...</div>
          ) : filteredTrips.length === 0 ? (
            <EmptyState />
          ) : viewMode === 'table' ? (
            <TripTable trips={filteredTrips} />
          ) : (
            <TripCards trips={filteredTrips} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- TRIP TABLE -------------------- */
function TripTable({ trips }: { trips: DashboardTrip[] }) {
  const navigate = useNavigate();
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Trip Name</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map(trip => (
            <TableRow
              key={trip.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/trips/${trip.id}`)}
            >
              <TableCell className="font-medium">{trip.name}</TableCell>
              <TableCell className="text-muted-foreground">{trip.institution}</TableCell>
              <TableCell className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{trip.city}, {trip.country}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(trip.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(trip.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </TableCell>
              <TableCell><StatusBadge status={trip.status} /></TableCell>
              <TableCell className="text-right font-semibold">{formatINR(trip.totalCostINR)}</TableCell>
              <TableCell><TripActions trip={trip} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------------------- TRIP CARDS -------------------- */
function TripCards({ trips }: { trips: DashboardTrip[] }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {trips.map(trip => (
        <Card
          key={trip.id}
          className="cursor-pointer hover:shadow-card-hover transition-all duration-200 group"
          onClick={() => navigate(`/trips/${trip.id}`)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <StatusBadge status={trip.status} />
              <TripActions trip={trip} />
            </div>
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{trip.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{trip.institution}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{trip.city}, {trip.country}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{trip.totalDays} days • {new Date(trip.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{trip.participants.totalParticipants} participants</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Cost</span>
              <span className="font-bold text-lg text-foreground">{formatINR(trip.totalCostINR)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* -------------------- TRIP ACTIONS -------------------- */
function TripActions({ trip }: { trip: DashboardTrip }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/trips/${trip.id}`); }}>
          <Eye className="w-4 h-4 mr-2" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/trips/create?edit=${trip.id}`); }}>
          <Pencil className="w-4 h-4 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={e => e.stopPropagation()}>
          <Copy className="w-4 h-4 mr-2" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={e => e.stopPropagation()}>
          <FileDown className="w-4 h-4 mr-2" /> Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={e => e.stopPropagation()} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------- UTILITY -------------------- */
function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}