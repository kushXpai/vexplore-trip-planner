// src/pages/TripDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
// import { PDFPreview } from '@/components/trip/PDFPreview';
import { ActualExpensesEntry, ActualExpenses } from '@/components/trip/ActualExpensesEntry';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  FileDown,
  Send,
  Lock,
  Calendar,
  MapPin,
  Users,
  Plane,
  Bus,
  Train,
  Hotel,
  Utensils,
  Ticket,
  Calculator,
  BarChart3,
  ClipboardEdit,
} from 'lucide-react';
import { Trip, PostTripAnalysis } from '@/types/trip';
import { supabase } from '@/supabase/client';
import { fetchCurrencies, Currency } from '@/services/masterDataService';

// Helper function to format currency with symbol
const formatCurrencyWithSymbol = (amount: number, currencyCode: string, currencies: Currency[]): string => {
  const currency = currencies.find(c => c.code === currencyCode);
  const symbol = currency?.symbol ?? '₹';
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format INR specifically
const formatINR = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [tripAnalysis, setTripAnalysis] = useState<PostTripAnalysis | null>(null);
  const [tripStatus, setTripStatus] = useState<'draft' | 'sent' | 'approved' | 'completed' | 'locked'>('draft');
  const [isLocked, setIsLocked] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Fetch currencies on mount
  useEffect(() => {
    const loadCurrencies = async () => {
      const result = await fetchCurrencies();
      if (result.success && result.data) {
        setCurrencies(result.data);
      }
    };
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchTrip = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_participants (*),
          trip_flights (*),
          trip_buses (*),
          trip_trains (*),
          trip_accommodations (*),
          trip_meals (*),
          trip_activities (*),
          trip_overheads (*),
          post_trip_analysis (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        toast.error('Failed to fetch trip');
        setLoading(false);
        return;
      }

      if (data) {
        const mappedTrip: Trip = {
          id: data.id,
          name: data.name,
          institution: data.institution,
          country: data.country,
          city: data.city,
          startDate: data.start_date,
          endDate: data.end_date,
          totalDays: data.total_days ?? 0,
          totalNights: data.total_nights ?? 0,
          currency: data.currency ?? 'INR',
          status: data.status ?? 'draft',
          totalCost: data.total_cost ?? 0,
          totalCostINR: data.total_cost_inr ?? 0,
          costPerStudent: data.cost_per_student ?? 0,
          participants: {
            boys: data.trip_participants?.boys ?? 0,
            girls: data.trip_participants?.girls ?? 0,
            maleFaculty: data.trip_participants?.male_faculty ?? 0,
            femaleFaculty: data.trip_participants?.female_faculty ?? 0,
            maleVXplorers: data.trip_participants?.male_vxplorers ?? 0,
            femaleVXplorers: data.trip_participants?.female_vxplorers ?? 0,
            totalStudents: data.trip_participants?.total_students ?? 0,
            totalFaculty: data.trip_participants?.total_faculty ?? 0,
            totalVXplorers: data.trip_participants?.total_vxplorers ?? 0,
            totalParticipants: data.trip_participants?.total_participants ?? 0,
          },
          transport: {
            flights: (data.trip_flights || []).map((f: any) => ({
              id: f.id,
              from: f.from_city ?? '',
              to: f.to_city ?? '',
              airline: f.airline ?? '',
              flightNumber: f.flight_number ?? '',
              departureTime: f.departure_time ?? '',
              arrivalTime: f.arrival_time ?? '',
              costPerPerson: f.cost_per_person ?? 0,
              currency: f.currency ?? 'INR',
              description: f.description ?? '',
              totalCost: f.total_cost ?? 0,
              totalCostINR: f.total_cost_inr ?? 0,
            })),
            buses: (data.trip_buses || []).map((b: any) => ({
              id: b.id,
              name: b.name ?? '',
              seatingCapacity: b.seating_capacity ?? 0,
              costPerBus: b.cost_per_bus ?? 0,
              currency: b.currency ?? 'INR',
              numberOfDays: b.number_of_days ?? 0,
              quantity: b.quantity ?? 0,
              description: b.description ?? '',
              totalCost: b.total_cost ?? 0,
              totalCostINR: b.total_cost_inr ?? 0,
            })),
            trains: (data.trip_trains || []).map((t: any) => ({
              id: t.id,
              name: t.name ?? '',
              trainNumber: t.train_number ?? '',
              class: t.class ?? '',
              timing: t.timing ?? '',
              costPerPerson: t.cost_per_person ?? 0,
              currency: t.currency ?? 'INR',
              description: t.description ?? '',
              totalCost: t.total_cost ?? 0,
              totalCostINR: t.total_cost_inr ?? 0,
            })),
          },
          accommodation: (data.trip_accommodations || []).map((a: any) => ({
            id: a.id,
            hotelName: a.hotel_name ?? '',
            city: a.city ?? '',
            numberOfNights: a.number_of_nights ?? 0,
            costPerRoom: a.cost_per_room ?? 0,
            currency: a.currency ?? 'INR',
            breakfastIncluded: a.breakfast_included ?? false,
            totalRooms: a.total_rooms ?? 0,
            totalCost: a.total_cost ?? 0,
            totalCostINR: a.total_cost_inr ?? 0,
            roomAllocation: a.room_allocation ?? {
              boysRooms: 0,
              girlsRooms: 0,
              maleFacultyRooms: 0,
              femaleFacultyRooms: 0,
            },
          })),
          meals: (() => {
            // Find the meals data from the query
            const mealsData = data.trip_meals?.[0] || data.trip_meals;

            if (mealsData) {
              return {
                breakfastCostPerPerson: mealsData.breakfast_cost_per_person ?? 0,
                lunchCostPerPerson: mealsData.lunch_cost_per_person ?? 0,
                dinnerCostPerPerson: mealsData.dinner_cost_per_person ?? 0,
                currency: mealsData.currency ?? 'INR',
                totalDays: mealsData.total_days ?? data.total_days ?? 0,
                totalParticipants: mealsData.total_participants ?? data.trip_participants?.total_participants ?? 0,
                dailyCostPerPerson: mealsData.daily_cost_per_person ?? 0,
                totalCost: mealsData.total_cost ?? 0,
                totalCostINR: mealsData.total_cost_inr ?? 0,
              };
            }
            return {
              breakfastCostPerPerson: 0,
              lunchCostPerPerson: 0,
              dinnerCostPerPerson: 0,
              currency: data.currency ?? 'INR',
              totalDays: data.total_days ?? 0,
              totalParticipants: data.trip_participants?.total_participants ?? 0,
              dailyCostPerPerson: 0,
              totalCost: 0,
              totalCostINR: 0,
            };
          })(),
          activities: (data.trip_activities || []).map((a: any) => ({
            id: a.id,
            name: a.name ?? '',
            entryCost: a.entry_cost ?? 0,
            transportCost: a.transport_cost ?? 0,
            guideCost: a.guide_cost ?? 0,
            currency: a.currency ?? 'INR',
            description: a.description ?? '',
            totalCost: a.total_cost ?? 0,
            totalCostINR: a.total_cost_inr ?? 0,
          })),
          overheads: (data.overheads || []).map((o: any) => ({
            ...o,
            totalCostINR: o.total_cost_inr ?? 0,
          })),
          analysis: data.post_trip_analysis || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };


        setTrip(mappedTrip);
        setTripAnalysis(mappedTrip.analysis || null);
        setTripStatus(mappedTrip.status);
        setIsLocked(mappedTrip.status === 'locked');
      }

      setLoading(false);
    };

    fetchTrip();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground mb-4">Trip not found</p>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  // Handlers
  const handleLockTrip = () => {
    setTripStatus('locked');
    setIsLocked(true);
    toast.success('Trip has been locked. No further edits are allowed.');
  };

  const handleSendForApproval = () => {
    setTripStatus('sent');
    toast.success('Trip sent for approval');
  };

  const handleLockExchangeRate = () => {
    toast.success('Exchange rate locked at current rates');
  };

  const handleActualExpensesSubmit = (actuals: ActualExpenses) => {
    const transportExpected =
      trip.transport.flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
      trip.transport.buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
      trip.transport.trains.reduce((sum, t) => sum + t.totalCostINR, 0);
    const accommodationExpected = trip.accommodation.reduce((sum, h) => sum + h.totalCostINR, 0);
    const mealsExpected = trip.meals.totalCostINR;
    const activitiesExpected = trip.activities.reduce((sum, a) => sum + a.totalCostINR, 0);
    const overheadsExpected = trip.overheads.reduce((sum, o) => sum + o.totalCostINR, 0);
    const totalExpected = transportExpected + accommodationExpected + mealsExpected + activitiesExpected + overheadsExpected;
    const totalActual = actuals.transport + actuals.accommodation + actuals.meals + actuals.activities + actuals.overheads;

    const newAnalysis: PostTripAnalysis = {
      categories: [
        { name: 'Transport', expected: transportExpected, actual: actuals.transport, difference: actuals.transport - transportExpected, variancePercentage: transportExpected > 0 ? ((actuals.transport - transportExpected) / transportExpected) * 100 : 0 },
        { name: 'Accommodation', expected: accommodationExpected, actual: actuals.accommodation, difference: actuals.accommodation - accommodationExpected, variancePercentage: accommodationExpected > 0 ? ((actuals.accommodation - accommodationExpected) / accommodationExpected) * 100 : 0 },
        { name: 'Meals', expected: mealsExpected, actual: actuals.meals, difference: actuals.meals - mealsExpected, variancePercentage: mealsExpected > 0 ? ((actuals.meals - mealsExpected) / mealsExpected) * 100 : 0 },
        { name: 'Activities', expected: activitiesExpected, actual: actuals.activities, difference: actuals.activities - activitiesExpected, variancePercentage: activitiesExpected > 0 ? ((actuals.activities - activitiesExpected) / activitiesExpected) * 100 : 0 },
        { name: 'Overheads', expected: overheadsExpected, actual: actuals.overheads, difference: actuals.overheads - overheadsExpected, variancePercentage: overheadsExpected > 0 ? ((actuals.overheads - overheadsExpected) / overheadsExpected) * 100 : 0 },
      ],
      totalExpected,
      totalActual,
      profitLoss: totalExpected - totalActual,
      profitLossPercentage: totalExpected > 0 ? ((totalExpected - totalActual) / totalExpected) * 100 : 0,
      varianceExplanation: actuals.explanation,
      isFinalized: true,
    };
    setTripAnalysis(newAnalysis);
  };

  // Currency formatting helper functions
  const formatINR = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || '₹';
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  };

  return (

    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowPDFPreview(true)}>
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
          {!isLocked && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/trips/create?edit=${trip.id}`)}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          {trip.status === 'draft' && (
            <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSendForApproval}>
              <Send className="w-4 h-4" />
              Send for Approval
            </Button>
          )}
          {trip.status === 'approved' && (
            <Button variant="secondary" className="gap-2" onClick={handleLockExchangeRate}>
              <Lock className="w-4 h-4" />
              Lock Exchange Rate
            </Button>
          )}
          {(trip.status === 'completed' || tripAnalysis) && !isLocked && (
            <Button variant="destructive" className="gap-2" onClick={handleLockTrip}>
              <Lock className="w-4 h-4" />
              Lock Trip
            </Button>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-md text-sm font-medium">
              <Lock className="w-4 h-4" />
              Trip Locked
            </span>
          )}
        </div>
      </div>

      {/* Trip Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Trip Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <InfoItem label="Institution" value={trip.institution} />
              <InfoItem
                label="Destination"
                value={`${trip.city}, ${trip.country}`}
                icon={<MapPin className="w-4 h-4" />}
              />
              <InfoItem
                label="Duration"
                value={`${trip.totalDays} Days / ${trip.totalNights} Nights`}
              />
              <InfoItem label="Currency" value={trip.currency} />
              <InfoItem
                label="Start Date"
                value={new Date(trip.startDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              />
              <InfoItem
                label="End Date"
                value={new Date(trip.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Boys</span>
                <span className="font-medium">{trip.participants.boys}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Girls</span>
                <span className="font-medium">{trip.participants.girls}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Male Faculty</span>
                <span className="font-medium">{trip.participants.maleFaculty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Female Faculty</span>
                <span className="font-medium">{trip.participants.femaleFaculty}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Students</span>
                  <span className="font-semibold">{trip.participants.totalStudents}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Total Faculty</span>
                  <span className="font-semibold">{trip.participants.totalFaculty}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t">
                  <span className="font-medium">Total Participants</span>
                  <span className="font-bold text-primary">{trip.participants.totalParticipants}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <Tabs defaultValue="transport" className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="transport" className="gap-2">
            <Plane className="w-4 h-4" />
            Transport
          </TabsTrigger>
          <TabsTrigger value="accommodation" className="gap-2">
            <Hotel className="w-4 h-4" />
            Accommodation
          </TabsTrigger>
          <TabsTrigger value="meals" className="gap-2">
            <Utensils className="w-4 h-4" />
            Meals
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-2">
            <Ticket className="w-4 h-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <Calculator className="w-4 h-4" />
            Cost Summary
          </TabsTrigger>
          <TabsTrigger value="actuals" className="gap-2">
            <ClipboardEdit className="w-4 h-4" />
            Enter Actuals
          </TabsTrigger>
          {trip.analysis && (
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transport">
          <TransportSection trip={trip} currencies={currencies} />
        </TabsContent>
        <TabsContent value="accommodation">
          <AccommodationSection trip={trip} currencies={currencies} />
        </TabsContent>
        <TabsContent value="meals">
          <MealsSection trip={trip} currencies={currencies} />
        </TabsContent>
        <TabsContent value="activities">
          <ActivitiesSection trip={trip} currencies={currencies} />
        </TabsContent>
        <TabsContent value="summary">
          <CostSummarySection trip={trip} />
        </TabsContent>
        <TabsContent value="actuals">
          <ActualExpensesEntry trip={trip} onSubmit={handleActualExpensesSubmit} />
        </TabsContent>
        {trip.analysis && (
          <TabsContent value="analysis">
            <AnalysisSection trip={trip} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium flex items-center gap-1.5">
        {icon}
        {value}
      </p>
    </div>
  );
}

function TransportSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  return (
    <div className="grid gap-4">
      {trip.transport.flights.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane className="w-4 h-4 text-primary" />
              Flights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trip.transport.flights.map((flight) => (
                <div key={flight.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{flight.from} → {flight.to}</span>
                    <StatusBadge status="approved" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Airline</p>
                      <p className="font-medium">{flight.airline}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Flight No.</p>
                      <p className="font-medium">{flight.flightNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost/Person</p>
                      <p className="font-medium">{formatCurrencyWithSymbol(flight.costPerPerson, flight.currency, currencies)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total (INR)</p>
                      <p className="font-semibold text-primary">{formatINR(flight.totalCostINR)}</p>
                    </div>
                  </div>
                  {flight.description && (
                    <p className="text-sm text-muted-foreground mt-2">{flight.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {trip.transport.buses.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary" />
              Buses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trip.transport.buses.map((bus) => (
                <div key={bus.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{bus.name}</span>
                    <span className="text-sm text-muted-foreground">×{bus.quantity}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Capacity</p>
                      <p className="font-medium">{bus.seatingCapacity} seats</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost/Bus/Day</p>
                      <p className="font-medium">{formatCurrencyWithSymbol(bus.costPerBus, bus.currency, currencies)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Days</p>
                      <p className="font-medium">{bus.numberOfDays}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total (INR)</p>
                      <p className="font-semibold text-primary">{formatINR(bus.totalCostINR)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {trip.transport.trains.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Train className="w-4 h-4 text-primary" />
              Trains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trip.transport.trains.map((train) => (
                <div key={train.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{train.name}</span>
                    <span className="text-sm text-muted-foreground">{train.trainNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Class</p>
                      <p className="font-medium">{train.class}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Timing</p>
                      <p className="font-medium">{train.timing}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost/Person</p>
                      <p className="font-medium">{formatCurrencyWithSymbol(train.costPerPerson, train.currency, currencies)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total (INR)</p>
                      <p className="font-semibold text-primary">{formatINR(train.totalCostINR)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AccommodationSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Hotel className="w-4 h-4 text-primary" />
          Hotels & Accommodation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trip.accommodation.map((hotel) => (
            <div key={hotel.id} className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold">{hotel.hotelName}</span>
                  <span className="text-sm text-muted-foreground ml-2">• {hotel.city}</span>
                </div>
                {hotel.breakfastIncluded && (
                  <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">
                    Breakfast Included
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                <div>
                  <p className="text-muted-foreground">Nights</p>
                  <p className="font-medium">{hotel.numberOfNights}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost/Room</p>
                  <p className="font-medium">{formatCurrencyWithSymbol(hotel.totalCostINR / hotel.totalRooms, hotel.currency, currencies)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Rooms</p>
                  <p className="font-medium">{hotel.totalRooms}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total (INR)</p>
                  <p className="font-semibold text-primary">{formatINR(hotel.totalCostINR)}</p>
                </div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Room Allocation</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    Boys: {hotel.roomAllocation.boysRooms} rooms
                  </span>
                  <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded">
                    Girls: {hotel.roomAllocation.girlsRooms} rooms
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                    Male Faculty: {hotel.roomAllocation.maleFacultyRooms} rooms
                  </span>
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    Female Faculty: {hotel.roomAllocation.femaleFacultyRooms} rooms
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MealsSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" />
          Meals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-muted-foreground text-sm">Lunch Cost/Person</p>
              <p className="font-semibold text-lg">{formatCurrencyWithSymbol(trip.meals.lunchCostPerPerson, trip.meals.currency, currencies)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Dinner Cost/Person</p>
              <p className="font-semibold text-lg">{formatCurrencyWithSymbol(trip.meals.dinnerCostPerPerson, trip.meals.currency, currencies)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Daily Total</p>
              <p className="font-semibold text-lg">{formatCurrencyWithSymbol(trip.meals.dailyCostPerPerson, trip.meals.currency, currencies)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total ({trip.meals.totalDays} days)</p>
              <p className="font-bold text-xl text-primary">{formatINR(trip.meals.totalCostINR)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            <p>Calculation: ({trip.meals.lunchCostPerPerson} + {trip.meals.dinnerCostPerPerson}) × {trip.meals.totalParticipants} participants × {trip.meals.totalDays} days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitiesSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  const totalActivitiesCost = trip.activities.reduce((sum, a) => sum + a.totalCostINR, 0);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            Activities & Site Visits
          </CardTitle>
          <span className="font-semibold text-primary">{formatINR(totalActivitiesCost)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trip.activities.map((activity) => (
            <div key={activity.id} className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{activity.name}</span>
                <span className="font-semibold text-primary">{formatINR(activity.totalCostINR)}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Entry: {formatCurrencyWithSymbol(activity.entryCost, activity.currency, currencies)}</span>
                {activity.transportCost > 0 && (
                  <span>Transport: {formatCurrencyWithSymbol(activity.transportCost, activity.currency, currencies)}</span>
                )}
                {activity.guideCost > 0 && (
                  <span>Guide: {formatCurrencyWithSymbol(activity.guideCost, activity.currency, currencies)}</span>
                )}
              </div>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CostSummarySection({ trip }: { trip: Trip }) {
  const transportTotal =
    trip.transport.flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
    trip.transport.buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
    trip.transport.trains.reduce((sum, t) => sum + t.totalCostINR, 0);
  const accommodationTotal = trip.accommodation.reduce((sum, h) => sum + h.totalCostINR, 0);
  const activitiesTotal = trip.activities.reduce((sum, a) => sum + a.totalCostINR, 0);
  const overheadsTotal = trip.overheads.reduce((sum, o) => sum + o.totalCostINR, 0);
  const visibleOverheadsTotal = trip.overheads.filter(o => !o.hideFromClient).reduce((sum, o) => sum + o.totalCostINR, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Cost Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CostRow label="Transport" sublabel="Flights, Buses, Trains" amount={transportTotal} />
          <CostRow label="Accommodation" sublabel="Hotels & Stay" amount={accommodationTotal} />
          <CostRow label="Meals" sublabel="Lunch & Dinner" amount={trip.meals.totalCostINR} />
          <CostRow label="Activities" sublabel="Entry, Transport, Guides" amount={activitiesTotal} />
          <CostRow label="Overheads" sublabel="All overheads" amount={overheadsTotal} />

          <div className="pt-4 border-t border-dashed">
            <CostRow
              label="Subtotal (Client View)"
              amount={transportTotal + accommodationTotal + trip.meals.totalCostINR + activitiesTotal + visibleOverheadsTotal}
              isSubtotal
            />
          </div>

          {overheadsTotal > visibleOverheadsTotal && (
            <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
              <CostRow
                label="Hidden Overheads (Admin Only)"
                sublabel="Margins, Admin charges"
                amount={overheadsTotal - visibleOverheadsTotal}
                className="text-warning"
              />
            </div>
          )}

          <div className="pt-4 border-t-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">Grand Total</p>
                <p className="text-sm text-muted-foreground">Including all overheads</p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatINR(trip.totalCostINR)}</p>
            </div>
            <div className="flex justify-between items-center mt-4 p-3 bg-primary/5 rounded-lg">
              <span className="font-medium">Cost per Student</span>
              <span className="text-lg font-bold">{formatINR(trip.costPerStudent)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostRow({
  label,
  sublabel,
  amount,
  isSubtotal = false,
  className = ''
}: {
  label: string;
  sublabel?: string;
  amount: number;
  isSubtotal?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div>
        <p className={isSubtotal ? 'font-semibold' : 'font-medium'}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <p className={isSubtotal ? 'font-semibold text-lg' : 'font-medium'}>{formatINR(amount)}</p>
    </div>
  );
}

function AnalysisSection({ trip }: { trip: Trip }) {
  if (!trip.analysis) return null;

  const { analysis } = trip;
  const isProfitable = analysis.profitLoss >= 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Post-Trip Analysis
          </CardTitle>
          {analysis.isFinalized && (
            <span className="text-xs bg-foreground/10 text-foreground px-2 py-1 rounded">
              Finalized
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Expected Cost</p>
              <p className="text-xl font-bold">{formatINR(analysis.totalExpected)}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Actual Cost</p>
              <p className="text-xl font-bold">{formatINR(analysis.totalActual)}</p>
            </div>
            <div className={`p-4 rounded-lg ${isProfitable ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p className="text-sm text-muted-foreground">Profit/Loss</p>
              <p className={`text-xl font-bold ${isProfitable ? 'text-success' : 'text-destructive'}`}>
                {isProfitable ? '+' : ''}{formatINR(analysis.profitLoss)}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isProfitable ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p className="text-sm text-muted-foreground">Variance</p>
              <p className={`text-xl font-bold ${isProfitable ? 'text-success' : 'text-destructive'}`}>
                {isProfitable ? '+' : ''}{analysis.profitLossPercentage.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Category</th>
                  <th className="text-right p-3 font-semibold">Expected</th>
                  <th className="text-right p-3 font-semibold">Actual</th>
                  <th className="text-right p-3 font-semibold">Difference</th>
                  <th className="text-right p-3 font-semibold">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {analysis.categories.map((cat, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3 font-medium">{cat.name}</td>
                    <td className="p-3 text-right">{formatINR(cat.expected)}</td>
                    <td className="p-3 text-right">{formatINR(cat.actual)}</td>
                    <td className={`p-3 text-right ${cat.difference <= 0 ? 'text-success' : 'text-destructive'}`}>
                      {cat.difference <= 0 ? '' : '+'}{formatINR(cat.difference)}
                    </td>
                    <td className={`p-3 text-right ${cat.variancePercentage <= 0 ? 'text-success' : 'text-destructive'}`}>
                      {cat.variancePercentage <= 0 ? '' : '+'}{cat.variancePercentage.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Explanation */}
          {analysis.varianceExplanation && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Variance Explanation</p>
              <p className="text-sm text-muted-foreground">{analysis.varianceExplanation}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
