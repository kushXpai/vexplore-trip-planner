// src/pages/Trips.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
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
  Users,
  Filter,
  Globe,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/* -------------------- TYPES -------------------- */

type DashboardTrip = {
  id: string;
  name: string;
  institution: string;
  countries: string[];
  cities: { name: string; fromDate: string; toDate: string }[];
  tripCategory: 'domestic' | 'international';
  tripType: 'institute' | 'commercial' | 'fti';
  startDate: string;
  endDate: string;
  totalDays: number;
  totalCostINR: number;
  status: 'draft' | 'sent' | 'approved' | 'completed' | 'locked';
  participants: { totalParticipants: number };
  createdBy?: string;
};

type ViewMode = 'table' | 'cards';

/* -------------------- COMPONENT -------------------- */

export default function Trips() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  /* -------------------- FETCH TRIPS -------------------- */
  const { data: trips, isLoading, refetch } = useQuery<DashboardTrip[], Error>({
    queryKey: ['trips', user?.id, user?.role],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('trips')
        .select(`
          id,
          name,
          institution,
          countries,
          cities,
          trip_category,
          trip_type,
          start_date,
          end_date,
          total_days,
          grand_total_inr,
          status,
          created_by,
          trip_participants (
            total_participants
          )
        `);

      if (user.role === 'manager') {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        institution: t.institution,
        countries: t.countries || [],
        cities: (t.cities || []).map((c: any) =>
          typeof c === 'string'
            ? { name: c, fromDate: t.start_date, toDate: t.end_date }
            : { name: c.name, fromDate: c.fromDate, toDate: c.toDate }
        ),
        tripCategory: t.trip_category || 'domestic',
        tripType: t.trip_type || 'institute',
        startDate: t.start_date,
        endDate: t.end_date,
        totalDays: t.total_days,
        totalCostINR: t.grand_total_inr,
        status: t.status,
        createdBy: t.created_by,
        participants: {
          totalParticipants: t.trip_participants?.total_participants || 0
        },
      }));
    },
    enabled: !!user,
  });

  /* -------------------- FILTERED TRIPS -------------------- */
  const filteredTrips = trips?.filter(trip => {
    const matchesSearch =
      trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.cities.some(city => city.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      trip.countries.some(country => country.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || trip.tripCategory === categoryFilter;
    const matchesType = typeFilter === 'all' || trip.tripType === typeFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesType;
  }) || [];

  /* -------------------- DELETE -------------------- */
  const handleDeleteTrip = async (tripId: string, tripName: string) => {
    if (!confirm(`Are you sure you want to delete "${tripName}"? This action cannot be undone.`)) return;

    const { error } = await supabase.from('trips').delete().eq('id', tripId);

    if (error) {
      toast.error('Failed to delete trip');
      return;
    }

    toast.success('Trip deleted successfully');
    refetch();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">All Trips</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'manager'
              ? 'Manage your trip cost sheets'
              : 'Manage all trip cost sheets across the organization'}
          </p>
        </div>
        <Button
          onClick={() => navigate('/trips/create')}
          className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Trip
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{trips?.length || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">
                  {trips?.filter(t => t.status === 'draft').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Filter className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {trips?.filter(t => t.status === 'approved').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {trips?.filter(t => t.status === 'completed').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trips Table/Cards */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Trips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search trips, institutions, cities, or countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="domestic">Domestic</SelectItem>
                <SelectItem value="international">International</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="institute">Institute</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="fti">FTI</SelectItem>
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
            <TripTable trips={filteredTrips} onDelete={handleDeleteTrip} />
          ) : (
            <TripCards trips={filteredTrips} onDelete={handleDeleteTrip} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- TRIP TABLE — Option 2 Card-in-Table -------------------- */
function TripTable({ trips, onDelete }: { trips: DashboardTrip[]; onDelete: (id: string, name: string) => void }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {trips.map(trip => (
        <div
          key={trip.id}
          onClick={() => navigate(`/trips/${trip.id}`)}
          className="border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 bg-card"
        >
          {/* Row 1: Trip name + Institution + Type badges + Actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-base leading-tight">
                    {trip.name}
                  </h3>
                  <StatusBadge status={trip.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{trip.institution}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-1.5">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs capitalize',
                    trip.tripCategory === 'international'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                  )}
                >
                  {trip.tripCategory}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {trip.tripType}
                </Badge>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TripActions trip={trip} onDelete={onDelete} />
              </div>
            </div>
          </div>

          {/* Row 2: Destination + Dates + Cost */}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">

            {/* Countries */}
            {trip.countries.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">
                  {trip.countries.join(', ')}
                </span>
              </div>
            )}

            {/* Cities */}
            {trip.cities.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {trip.cities.map(c => c.name).join(' · ')}
                </span>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                {new Date(trip.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {' – '}
                {new Date(trip.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                <span className="ml-1 text-xs">({trip.totalDays}d)</span>
              </span>
            </div>

            {/* Participants */}
            {trip.participants.totalParticipants > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {trip.participants.totalParticipants} participants
                </span>
              </div>
            )}

            {/* Cost — pushed to the right */}
            <div className="ml-auto">
              <span className="text-base font-bold text-foreground">
                {formatINR(trip.totalCostINR)}
              </span>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- TRIP CARDS -------------------- */
function TripCards({ trips, onDelete }: { trips: DashboardTrip[]; onDelete: (id: string, name: string) => void }) {
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
              <div onClick={(e) => e.stopPropagation()}>
                <TripActions trip={trip} onDelete={onDelete} />
              </div>
            </div>

            <h3 className="font-semibold text-foreground mb-0.5 group-hover:text-primary transition-colors">
              {trip.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{trip.institution}</p>

            <div className="flex gap-1.5 mb-3 flex-wrap">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs capitalize',
                  trip.tripCategory === 'international'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                )}
              >
                {trip.tripCategory}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {trip.tripType}
              </Badge>
            </div>

            <div className="space-y-1.5 text-sm">
              {trip.countries.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium text-foreground">{trip.countries.join(', ')}</span>
                </div>
              )}
              {trip.cities.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{trip.cities.map(c => c.name).join(' · ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {trip.totalDays} days •{' '}
                  {new Date(trip.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{trip.participants.totalParticipants} participants</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between">
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
function TripActions({ trip, onDelete }: { trip: DashboardTrip; onDelete: (id: string, name: string) => void }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={() => navigate(`/trips/${trip.id}`)}>
          <Eye className="w-4 h-4 mr-2" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/trips/create?edit=${trip.id}`)}>
          <Pencil className="w-4 h-4 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="w-4 h-4 mr-2" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileDown className="w-4 h-4 mr-2" /> Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(trip.id, trip.name)}
          className="text-destructive focus:text-destructive"
        >
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