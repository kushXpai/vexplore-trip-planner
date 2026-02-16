// src/pages/Dashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plane,
  TrendingUp,
  Users,
  IndianRupee,
  Plus,
  Calendar,
  Globe,
  Building2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

/* -------------------- TYPES -------------------- */

type DashboardTrip = {
  id: string;
  name: string;
  institution: string;
  countries: string[];  // FIXED: Changed from 'country' to 'countries' array
  cities: string[];
  tripCategory: 'domestic' | 'international';
  tripType: 'institute' | 'commercial';
  startDate: string;
  endDate: string;
  totalDays: number;
  totalCostINR: number;
  status: 'draft' | 'sent' | 'approved' | 'completed' | 'locked';
  participants: { totalParticipants: number };
  createdAt: string;
};

/* -------------------- COMPONENT -------------------- */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* -------------------- FETCH TRIPS WITH ROLE-BASED ACCESS -------------------- */
  const { data: trips, isLoading } = useQuery<DashboardTrip[], Error>({
    queryKey: ['dashboard-trips', user?.id, user?.role],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

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
          created_at,
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
        countries: t.countries || [],  // FIXED: Now array
        cities: t.cities || [],
        tripCategory: t.trip_category || 'domestic',
        tripType: t.trip_type || 'institute',
        startDate: t.start_date,
        endDate: t.end_date,
        totalDays: t.total_days,
        totalCostINR: t.grand_total_inr,
        status: t.status,
        createdAt: t.created_at,
        participants: {
          totalParticipants: t.trip_participants?.total_participants || 0
        },
      }));
    },
    enabled: !!user,
  });

  /* -------------------- CALCULATE STATS -------------------- */
  const stats = {
    totalTrips: trips?.length || 0,
    activeTrips: trips?.filter(t => ['draft', 'sent', 'approved'].includes(t.status)).length || 0,
    completedTrips: trips?.filter(t => t.status === 'completed').length || 0,
    totalRevenue: trips?.reduce((sum, t) => sum + t.totalCostINR, 0) || 0,
    domesticTrips: trips?.filter(t => t.tripCategory === 'domestic').length || 0,
    internationalTrips: trips?.filter(t => t.tripCategory === 'international').length || 0,
    instituteTrips: trips?.filter(t => t.tripType === 'institute').length || 0,
    commercialTrips: trips?.filter(t => t.tripType === 'commercial').length || 0,
    totalParticipants: trips?.reduce((sum, t) => sum + t.participants.totalParticipants, 0) || 0,
  };

  // Recent trips (last 5)
  const recentTrips = trips?.slice(0, 5) || [];

  // Upcoming trips (next 5 by start date)
  const upcomingTrips = trips
    ?.filter(t => new Date(t.startDate) > new Date() && ['approved', 'sent'].includes(t.status))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5) || [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your trips today.
        </p>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Trips"
          value={stats.totalTrips}
          subtitle={user?.role === 'admin' ? 'All trips' : 'Your trips'}
          icon={Plane}
          trend={stats.totalTrips > 0 ? { value: 12, isPositive: true } : undefined}
        />
        <StatCard
          title="Active Trips"
          value={stats.activeTrips}
          subtitle="In progress"
          icon={Calendar}
          trend={stats.activeTrips > 0 ? { value: 8, isPositive: true } : undefined}
        />
        <StatCard
          title="Total Revenue"
          value={formatINR(stats.totalRevenue)}
          subtitle="All time"
          icon={IndianRupee}
        />
        <StatCard
          title="Total Participants"
          value={stats.totalParticipants.toLocaleString()}
          subtitle="Across all trips"
          icon={Users}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Domestic Trips</p>
                <p className="text-2xl font-bold">{stats.domesticTrips}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">International Trips</p>
                <p className="text-2xl font-bold">{stats.internationalTrips}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Plane className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Institute Trips</p>
                <p className="text-2xl font-bold">{stats.instituteTrips}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commercial Trips</p>
                <p className="text-2xl font-bold">{stats.commercialTrips}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent and Upcoming Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Trips */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold">Recent Trips</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/trips')}
              className="text-primary hover:text-primary"
            >
              View All
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentTrips.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No trips yet</p>
                <Button
                  onClick={() => navigate('/trips/create')}
                  size="sm"
                  className="gradient-primary text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrips.map(trip => (
                  <div
                    key={trip.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/trips/${trip.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{trip.name}</h4>
                        <p className="text-xs text-muted-foreground">{trip.institution}</p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{trip.totalDays}d</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{trip.participants.totalParticipants}</span>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {trip.tripCategory}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {trip.tripType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Trips */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold">Upcoming Trips</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/trips')}
              className="text-primary hover:text-primary"
            >
              View All
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingTrips.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No upcoming trips scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTrips.map(trip => (
                  <div
                    key={trip.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/trips/${trip.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{trip.name}</h4>
                        <p className="text-xs text-muted-foreground">{trip.institution}</p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(trip.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{trip.totalDays}d</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{trip.participants.totalParticipants}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate('/trips/create')}
              className="h-24 flex flex-col items-center justify-center gap-2 gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Plus className="w-6 h-6" />
              <span>Create New Trip</span>
            </Button>
            <Button
              onClick={() => navigate('/trips')}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <Plane className="w-6 h-6" />
              <span>View All Trips</span>
            </Button>
            <Button
              onClick={() => navigate('/masters')}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <BarChart3 className="w-6 h-6" />
              <span>Manage Masters</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- UTILITY -------------------- */
function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}