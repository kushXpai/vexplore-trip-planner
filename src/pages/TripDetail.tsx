// src/pages/TripDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
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
  Globe,
  Building2,
  Shield,
  IdCard,
  Heart,
  BadgePercent,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Trip, PostTripAnalysis, TripCategory, TripType } from '@/types/trip';
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
  const [tripStatus, setTripStatus] = useState<'draft' | 'sent' | 'approved' | 'rejected' | 'completed' | 'locked'>('draft');
  const [isLocked, setIsLocked] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'superadmin' | 'admin' | 'manager' | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

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

  // Fetch current user role
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userData) {
          setCurrentUserRole(userData.role);
        }
      }
    };
    fetchUserRole();
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
          trip_extras (*),
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
        // ✅ FIX: Supabase returns related tables as arrays, access first element
        const participantsData = Array.isArray(data.trip_participants) 
          ? data.trip_participants[0] 
          : data.trip_participants;

        const mappedTrip: Trip = {
          id: data.id,
          name: data.name,
          institution: data.institution,

          // NEW: Trip classification
          tripCategory: data.trip_category || 'domestic',
          tripType: data.trip_type || 'institute',

          country: data.country,

          // NEW: Multi-city support
          cities: data.cities || [],

          startDate: data.start_date,
          endDate: data.end_date,
          totalDays: data.total_days ?? 0,
          totalNights: data.total_nights ?? 0,
          defaultCurrency: data.default_currency ?? 'INR',
          status: data.status ?? 'draft',

          participants: {
            // Institute participants
            boys: participantsData?.boys ?? 0,
            girls: participantsData?.girls ?? 0,
            maleFaculty: participantsData?.male_faculty ?? 0,
            femaleFaculty: participantsData?.female_faculty ?? 0,
            maleVXplorers: participantsData?.male_vxplorers ?? 0,
            femaleVXplorers: participantsData?.female_vxplorers ?? 0,

            // NEW: Commercial participants
            maleCount: participantsData?.male_count ?? 0,
            femaleCount: participantsData?.female_count ?? 0,
            otherCount: participantsData?.other_count ?? 0,
            commercialMaleVXplorers: participantsData?.commercial_male_vxplorers ?? 0,
            commercialFemaleVXplorers: participantsData?.commercial_female_vxplorers ?? 0,

            totalStudents: participantsData?.total_students ?? 0,
            totalFaculty: participantsData?.total_faculty ?? 0,
            totalVXplorers: participantsData?.total_vxplorers ?? 0,
            totalCommercial: participantsData?.total_commercial ?? 0,
            totalParticipants: participantsData?.total_participants ?? 0,
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
            roomTypes: a.room_types ?? [],
            roomPreferences: a.room_preferences ?? {},
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
              maleVXplorerRooms: 0,
              femaleVXplorerRooms: 0,
              commercialMaleRooms: 0,
              commercialFemaleRooms: 0,
              commercialOtherRooms: 0,
              commercialMaleVXplorerRooms: 0,
              commercialFemaleVXplorerRooms: 0,
              totalRooms: 0,
            },
          })),

          meals: (() => {
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
              currency: 'INR',
              totalDays: 0,
              totalParticipants: 0,
              dailyCostPerPerson: 0,
              totalCost: 0,
              totalCostINR: 0,
            };
          })(),

          activities: (data.trip_activities || []).map((a: any) => ({
            id: a.id,
            name: a.name ?? '',
            city: a.city,  // NEW: City for multi-city trips
            entryCost: a.entry_cost ?? 0,
            transportCost: a.transport_cost ?? 0,
            guideCost: a.guide_cost ?? 0,
            currency: a.currency ?? 'INR',
            description: a.description ?? '',
            totalCost: a.total_cost ?? 0,
            totalCostINR: a.total_cost_inr ?? 0,
          })),

          overheads: (data.trip_overheads || []).map((o: any) => ({
            id: o.id,
            name: o.name ?? '',
            amount: o.amount ?? 0,
            currency: o.currency ?? 'INR',
            hideFromClient: o.hide_from_client ?? false,
            totalCostINR: o.total_cost_inr ?? 0,
          })),

          // NEW: Extras (visa, tips, insurance)
          // ✅ FIX: Handle trip_extras as array
          extras: (() => {
            const extrasData = Array.isArray(data.trip_extras) 
              ? data.trip_extras[0] 
              : data.trip_extras;
            
            return extrasData ? {
              visaCostPerPerson: extrasData.visa_cost_per_person ?? 0,
              visaCurrency: extrasData.visa_currency ?? 'INR',
              visaTotalCost: extrasData.visa_total_cost ?? 0,
              visaTotalCostINR: extrasData.visa_total_cost_inr ?? 0,
              tipsCostPerPerson: extrasData.tips_cost_per_person ?? 0,
              tipsCurrency: extrasData.tips_currency ?? 'INR',
              tipsTotalCost: extrasData.tips_total_cost ?? 0,
              tipsTotalCostINR: extrasData.tips_total_cost_inr ?? 0,
              insuranceCostPerPerson: extrasData.insurance_cost_per_person ?? 0,
              insuranceCurrency: extrasData.insurance_currency ?? 'INR',
              insuranceTotalCost: extrasData.insurance_total_cost ?? 0,
              insuranceTotalCostINR: extrasData.insurance_total_cost_inr ?? 0,
            } : undefined;
          })(),

          // Cost calculations
          subtotalBeforeTax: data.subtotal_before_tax ?? 0,
          profit: data.profit ?? 0,

          // NEW: Tax fields
          gstPercentage: data.gst_percentage ?? 5,
          gstAmount: data.gst_amount ?? 0,
          tcsPercentage: data.tcs_percentage ?? 5,
          tcsAmount: data.tcs_amount ?? 0,

          grandTotal: data.grand_total ?? 0,
          grandTotalINR: data.grand_total_inr ?? 0,
          costPerParticipant: data.cost_per_participant ?? 0,

          createdAt: data.created_at ?? '',
          updatedAt: data.updated_at ?? '',

          analysis: data.post_trip_analysis ? {
            categories: data.post_trip_analysis.categories || [],
            totalExpected: data.post_trip_analysis.total_expected ?? 0,
            totalActual: data.post_trip_analysis.total_actual ?? 0,
            profitLoss: data.post_trip_analysis.profit_loss ?? 0,
            profitLossPercentage: data.post_trip_analysis.profit_loss_percentage ?? 0,
            varianceExplanation: data.post_trip_analysis.variance_explanation ?? '',
            isFinalized: data.post_trip_analysis.is_finalized ?? false,
          } : undefined,
        };

        setTrip(mappedTrip);
        setTripStatus(mappedTrip.status);
        setIsLocked(mappedTrip.status === 'locked');
        if (mappedTrip.analysis) {
          setTripAnalysis(mappedTrip.analysis);
        }
      }

      setLoading(false);
    };

    fetchTrip();
  }, [id]);

  const handleEdit = () => {
    navigate(`/trips/create?edit=${id}`);
  };

  const handleSendForApproval = async () => {
    if (!trip) return;

    const { error } = await supabase
      .from('trips')
      .update({ status: 'sent' })
      .eq('id', trip.id);

    if (error) {
      toast.error('Failed to send for approval');
      return;
    }

    setTripStatus('sent');
    toast.success('Trip sent for approval! Waiting for admin approval.');
  };

  const handleApproveTrip = async () => {
    if (!trip) return;

    const { error } = await supabase
      .from('trips')
      .update({ status: 'approved' })
      .eq('id', trip.id);

    if (error) {
      toast.error('Failed to approve trip');
      return;
    }

    setTripStatus('approved');
    toast.success('Trip approved successfully!');
  };

  const handleRejectTrip = async () => {
    if (!trip) return;

    const { error } = await supabase
      .from('trips')
      .update({ status: 'rejected' })
      .eq('id', trip.id);

    if (error) {
      toast.error('Failed to reject trip');
      return;
    }

    setTripStatus('rejected');
    toast.success('Trip rejected');
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;

    const { error } = await supabase
      .from('trips')
      .update({ status: 'completed' })
      .eq('id', trip.id);

    if (error) {
      toast.error('Failed to complete trip');
      return;
    }

    setTripStatus('completed');
    setShowCompleteDialog(false);
    toast.success('Trip marked as completed!');
  };

  const handleLockTrip = async () => {
    if (!trip) return;

    const { error } = await supabase
      .from('trips')
      .update({ status: 'locked' })
      .eq('id', trip.id);

    if (error) {
      toast.error('Failed to lock trip');
      return;
    }

    setTripStatus('locked');
    setIsLocked(true);
    toast.success('Trip locked successfully');
  };

  const handleActualExpensesSubmit = async (actuals: ActualExpenses) => {
    if (!trip) return;

    const transportExpected =
      trip.transport.flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
      trip.transport.buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
      trip.transport.trains.reduce((sum, t) => sum + t.totalCostINR, 0);
    const accommodationExpected = trip.accommodation.reduce((sum, h) => sum + h.totalCostINR, 0);
    const mealsExpected = trip.meals.totalCostINR;
    const activitiesExpected = trip.activities.reduce((sum, a) => sum + a.totalCostINR, 0);
    const extrasExpected = trip.extras
      ? (trip.extras.visaTotalCostINR + trip.extras.tipsTotalCostINR + trip.extras.insuranceTotalCostINR)
      : 0;
    const overheadsExpected = trip.overheads.reduce((sum, o) => sum + o.totalCostINR, 0);

    const totalExpected = transportExpected + accommodationExpected + mealsExpected + activitiesExpected + extrasExpected + overheadsExpected;
    const totalActual = actuals.transport + actuals.accommodation + actuals.meals + actuals.activities + actuals.extras + actuals.overheads;
    const profitLoss = totalExpected - totalActual;
    const profitLossPercentage = totalExpected > 0 ? (profitLoss / totalExpected) * 100 : 0;

    const categories = [
      {
        name: 'Transport',
        expected: transportExpected,
        actual: actuals.transport,
        difference: transportExpected - actuals.transport,
        variancePercentage: transportExpected > 0 ? ((transportExpected - actuals.transport) / transportExpected) * 100 : 0,
      },
      {
        name: 'Accommodation',
        expected: accommodationExpected,
        actual: actuals.accommodation,
        difference: accommodationExpected - actuals.accommodation,
        variancePercentage: accommodationExpected > 0 ? ((accommodationExpected - actuals.accommodation) / accommodationExpected) * 100 : 0,
      },
      {
        name: 'Meals',
        expected: mealsExpected,
        actual: actuals.meals,
        difference: mealsExpected - actuals.meals,
        variancePercentage: mealsExpected > 0 ? ((mealsExpected - actuals.meals) / mealsExpected) * 100 : 0,
      },
      {
        name: 'Activities',
        expected: activitiesExpected,
        actual: actuals.activities,
        difference: activitiesExpected - actuals.activities,
        variancePercentage: activitiesExpected > 0 ? ((activitiesExpected - actuals.activities) / activitiesExpected) * 100 : 0,
      },
      {
        name: 'Extras (Visa, Tips, Insurance)',
        expected: extrasExpected,
        actual: actuals.extras,
        difference: extrasExpected - actuals.extras,
        variancePercentage: extrasExpected > 0 ? ((extrasExpected - actuals.extras) / extrasExpected) * 100 : 0,
      },
      {
        name: 'Overheads',
        expected: overheadsExpected,
        actual: actuals.overheads,
        difference: overheadsExpected - actuals.overheads,
        variancePercentage: overheadsExpected > 0 ? ((overheadsExpected - actuals.overheads) / overheadsExpected) * 100 : 0,
      },
    ];

    const analysisData = {
      trip_id: trip.id,
      categories,
      total_expected: totalExpected,
      total_actual: totalActual,
      profit_loss: profitLoss,
      profit_loss_percentage: profitLossPercentage,
      variance_explanation: actuals.explanation,
      is_finalized: false,
    };

    const { error } = await supabase
      .from('post_trip_analysis')
      .upsert(analysisData, { onConflict: 'trip_id' });

    if (error) {
      toast.error('Failed to save analysis');
      return;
    }

    setTripAnalysis({
      categories,
      totalExpected,
      totalActual,
      profitLoss,
      profitLossPercentage,
      varianceExplanation: actuals.explanation,
      isFinalized: false,
    });

    toast.success('Analysis saved successfully');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-8">
        <div className="text-center">Trip not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{trip.name}</h1>
            <p className="text-muted-foreground">{trip.institution}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={tripStatus} />

          {/* DRAFT - Show Edit and Send for Approval */}
          {!isLocked && tripStatus === 'draft' && (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleSendForApproval} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Send for Approval
              </Button>
            </>
          )}

          {/* SENT - Waiting message for managers */}
          {!isLocked && tripStatus === 'sent' && currentUserRole === 'manager' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Waiting for Approval</span>
            </div>
          )}

          {/* SENT - Approve/Reject for admins/superadmins */}
          {!isLocked && tripStatus === 'sent' && (currentUserRole === 'admin' || currentUserRole === 'superadmin') && (
            <>
              <Button onClick={handleApproveTrip} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button onClick={handleRejectTrip} variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}

          {/* APPROVED - Complete Trip button */}
          {!isLocked && tripStatus === 'approved' && (
            <>
              <Button onClick={() => setShowCompleteDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Trip
              </Button>
              <Button onClick={handleLockTrip} variant="outline">
                <Lock className="w-4 h-4 mr-2" />
                Lock Trip
              </Button>
            </>
          )}

          {/* REJECTED - Show message */}
          {!isLocked && tripStatus === 'rejected' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Trip Rejected</span>
            </div>
          )}

          {/* COMPLETED - Show message */}
          {!isLocked && tripStatus === 'completed' && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Trip Completed</span>
              </div>
              <Button onClick={handleLockTrip} variant="outline">
                <Lock className="w-4 h-4 mr-2" />
                Lock Trip
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Complete Trip Confirmation Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Complete this trip?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to mark this trip as completed? This will change the status to "Completed" and you can enter actual expenses for analysis.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteTrip} className="bg-purple-600 hover:bg-purple-700">
                Yes, Complete Trip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Trip Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* NEW: Trip Category */}
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Trip Category</p>
                <p className="font-semibold capitalize">{trip.tripCategory}</p>
              </div>
            </div>

            {/* NEW: Trip Type */}
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Trip Type</p>
                <p className="font-semibold capitalize">{trip.tripType}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">
                  {trip.totalDays} Days, {trip.totalNights} Nights
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-semibold">{trip.country}</p>
                {/* NEW: Multi-city display */}
                {trip.cities && trip.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {trip.cities.map((city, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {city}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="font-semibold">{trip.participants.totalParticipants} Total</p>
                {trip.tripType === 'institute' ? (
                  <p className="text-xs text-muted-foreground">
                    {trip.participants.totalStudents} Students, {trip.participants.totalFaculty} Faculty, {trip.participants.totalVXplorers} VXplorers
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {trip.participants.totalCommercial} Participants, {trip.participants.totalVXplorers} VXplorers
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <ParticipantsSection trip={trip} />
          <MealsSection trip={trip} currencies={currencies} />
          {trip.extras && <ExtrasSection trip={trip} currencies={currencies} />}
          <OverheadsSection trip={trip} currencies={currencies} />
        </TabsContent>

        {/* Transport Tab */}
        <TabsContent value="transport" className="space-y-6">
          <TransportSection trip={trip} currencies={currencies} />
        </TabsContent>

        {/* Accommodation Tab */}
        <TabsContent value="accommodation" className="space-y-6">
          <AccommodationSection trip={trip} currencies={currencies} />
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <ActivitiesSection trip={trip} currencies={currencies} />
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <CostSummarySection trip={trip} />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {tripStatus === 'completed' || tripStatus === 'locked' ? (
            tripAnalysis ? (
              <AnalysisSection trip={trip} />
            ) : (
              <ActualExpensesEntry trip={trip} onSubmit={handleActualExpensesSubmit} />
            )
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Analysis is only available for completed trips
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ParticipantsSection({ trip }: { trip: Trip }) {
  const { participants, tripType } = trip;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Participants Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tripType === 'institute' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Boys</p>
              <p className="text-2xl font-bold">{participants.boys}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Girls</p>
              <p className="text-2xl font-bold">{participants.girls}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Male Faculty</p>
              <p className="text-2xl font-bold">{participants.maleFaculty}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Female Faculty</p>
              <p className="text-2xl font-bold">{participants.femaleFaculty}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Male VXplorers</p>
              <p className="text-2xl font-bold">{participants.maleVXplorers}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Female VXplorers</p>
              <p className="text-2xl font-bold">{participants.femaleVXplorers}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Male Participants</p>
              <p className="text-2xl font-bold">{participants.maleCount}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Female Participants</p>
              <p className="text-2xl font-bold">{participants.femaleCount}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Other</p>
              <p className="text-2xl font-bold">{participants.otherCount}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Male VXplorers</p>
              <p className="text-2xl font-bold">{participants.commercialMaleVXplorers}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Female VXplorers</p>
              <p className="text-2xl font-bold">{participants.commercialFemaleVXplorers}</p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          {tripType === 'institute' && (
            <>
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-xl font-bold">{participants.totalStudents}</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Faculty</p>
                <p className="text-xl font-bold">{participants.totalFaculty}</p>
              </div>
            </>
          )}
          {tripType === 'commercial' && (
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Participants</p>
              <p className="text-xl font-bold">{participants.totalCommercial}</p>
            </div>
          )}
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Total VXplorers</p>
            <p className="text-xl font-bold">{participants.totalVXplorers}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Grand Total</p>
            <p className="text-xl font-bold text-primary">{participants.totalParticipants}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransportSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  const { flights, buses, trains } = trip.transport;

  return (
    <div className="space-y-6">
      {/* Flights */}
      {flights.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Flights ({flights.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {flights.map((flight, index) => (
                <div key={flight.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{flight.airline} - {flight.flightNumber}</h4>
                      <p className="text-sm text-muted-foreground">
                        {flight.from} → {flight.to}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrencyWithSymbol(flight.totalCost, flight.currency, currencies)}</p>
                      <p className="text-sm text-muted-foreground">{formatINR(flight.totalCostINR)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Departure:</span>
                      <span className="ml-2 font-medium">{flight.departureTime}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Arrival:</span>
                      <span className="ml-2 font-medium">{flight.arrivalTime}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost/Person:</span>
                      <span className="ml-2 font-medium">{formatCurrencyWithSymbol(flight.costPerPerson, flight.currency, currencies)}</span>
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

      {/* Buses */}
      {buses.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-primary" />
              Buses ({buses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {buses.map((bus, index) => (
                <div key={bus.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{bus.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Capacity: {bus.seatingCapacity} seats
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrencyWithSymbol(bus.totalCost, bus.currency, currencies)}</p>
                      <p className="text-sm text-muted-foreground">{formatINR(bus.totalCostINR)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{bus.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Days:</span>
                      <span className="ml-2 font-medium">{bus.numberOfDays}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost/Bus:</span>
                      <span className="ml-2 font-medium">{formatCurrencyWithSymbol(bus.costPerBus, bus.currency, currencies)}</span>
                    </div>
                  </div>
                  {bus.description && (
                    <p className="text-sm text-muted-foreground mt-2">{bus.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trains */}
      {trains.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Train className="w-5 h-5 text-primary" />
              Trains ({trains.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trains.map((train, index) => (
                <div key={train.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{train.name} - {train.trainNumber}</h4>
                      <p className="text-sm text-muted-foreground">
                        Class: {train.class}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrencyWithSymbol(train.totalCost, train.currency, currencies)}</p>
                      <p className="text-sm text-muted-foreground">{formatINR(train.totalCostINR)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Timing:</span>
                      <span className="ml-2 font-medium">{train.timing}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost/Person:</span>
                      <span className="ml-2 font-medium">{formatCurrencyWithSymbol(train.costPerPerson, train.currency, currencies)}</span>
                    </div>
                  </div>
                  {train.description && (
                    <p className="text-sm text-muted-foreground mt-2">{train.description}</p>
                  )}
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="w-5 h-5 text-primary" />
          Accommodation ({trip.accommodation.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {trip.accommodation.map((hotel, index) => (
            <div key={hotel.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{hotel.hotelName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{hotel.city}</Badge>
                    <Badge variant="outline">{hotel.numberOfNights} {hotel.numberOfNights === 1 ? 'Night' : 'Nights'}</Badge>
                    {hotel.breakfastIncluded && <Badge variant="outline">Breakfast Included</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrencyWithSymbol(hotel.totalCost, hotel.currency, currencies)}</p>
                  <p className="text-sm text-muted-foreground">{formatINR(hotel.totalCostINR)}</p>
                </div>
              </div>

              {/* Room Types */}
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Room Types:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {hotel.roomTypes.map((rt, idx) => (
                    <div key={idx} className="p-2 bg-muted/30 rounded text-sm">
                      <p className="font-medium">{rt.roomType}</p>
                      <p className="text-xs text-muted-foreground">
                        Capacity: {rt.capacityPerRoom} | {formatCurrencyWithSymbol(rt.costPerRoom, hotel.currency, currencies)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Allocation Summary */}
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-sm font-semibold mb-2">Room Allocation:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {trip.tripType === 'institute' ? (
                    <>
                      {hotel.roomAllocation.boysRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Boys:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.boysRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.girlsRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Girls:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.girlsRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.maleFacultyRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Male Faculty:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.maleFacultyRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.femaleFacultyRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Female Faculty:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.femaleFacultyRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.maleVXplorerRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Male VXplorers:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.maleVXplorerRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.femaleVXplorerRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Female VXplorers:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.femaleVXplorerRooms} rooms</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {hotel.roomAllocation.commercialMaleRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Male:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.commercialMaleRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.commercialFemaleRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Female:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.commercialFemaleRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.commercialOtherRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Other:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.commercialOtherRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.commercialMaleVXplorerRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Male VXplorers:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.commercialMaleVXplorerRooms} rooms</span>
                        </div>
                      )}
                      {hotel.roomAllocation.commercialFemaleVXplorerRooms > 0 && (
                        <div>
                          <span className="text-muted-foreground">Female VXplorers:</span>
                          <span className="ml-2 font-medium">{hotel.roomAllocation.commercialFemaleVXplorerRooms} rooms</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-bold text-primary">{hotel.roomAllocation.totalRooms} rooms</span>
                  </div>
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
  const { meals } = trip;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          Meals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Breakfast/Person</p>
            <p className="text-lg font-semibold">
              {formatCurrencyWithSymbol(meals.breakfastCostPerPerson, meals.currency, currencies)}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Lunch/Person</p>
            <p className="text-lg font-semibold">
              {formatCurrencyWithSymbol(meals.lunchCostPerPerson, meals.currency, currencies)}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Dinner/Person</p>
            <p className="text-lg font-semibold">
              {formatCurrencyWithSymbol(meals.dinnerCostPerPerson, meals.currency, currencies)}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Daily Cost/Person</p>
            <p className="text-lg font-semibold">
              {formatCurrencyWithSymbol(meals.dailyCostPerPerson, meals.currency, currencies)}
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-primary/5 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Meals Cost</p>
              <p className="text-xs text-muted-foreground">
                {meals.totalDays} days × {meals.totalParticipants} participants
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{formatCurrencyWithSymbol(meals.totalCost, meals.currency, currencies)}</p>
              <p className="text-sm text-muted-foreground">{formatINR(meals.totalCostINR)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExtrasSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  const { extras } = trip;
  if (!extras) return null;

  const hasVisa = extras.visaCostPerPerson > 0;
  const hasTips = extras.tipsCostPerPerson > 0;
  const hasInsurance = extras.insuranceCostPerPerson > 0;

  if (!hasVisa && !hasTips && !hasInsurance) return null;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Extras (Visa, Tips, Insurance)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hasVisa && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <IdCard className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">Visa</h4>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Person:</span>
                  <span className="font-medium">
                    {formatCurrencyWithSymbol(extras.visaCostPerPerson, extras.visaCurrency, currencies)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">
                    {formatCurrencyWithSymbol(extras.visaTotalCost, extras.visaCurrency, currencies)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">In INR:</span>
                  <span>{formatINR(extras.visaTotalCostINR)}</span>
                </div>
              </div>
            </div>
          )}

          {hasTips && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">Tips</h4>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Person:</span>
                  <span className="font-medium">
                    {formatCurrencyWithSymbol(extras.tipsCostPerPerson, extras.tipsCurrency, currencies)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">
                    {formatCurrencyWithSymbol(extras.tipsTotalCost, extras.tipsCurrency, currencies)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">In INR:</span>
                  <span>{formatINR(extras.tipsTotalCostINR)}</span>
                </div>
              </div>
            </div>
          )}

          {hasInsurance && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">Insurance</h4>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Person:</span>
                  <span className="font-medium">
                    {formatCurrencyWithSymbol(extras.insuranceCostPerPerson, extras.insuranceCurrency, currencies)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">
                    {formatCurrencyWithSymbol(extras.insuranceTotalCost, extras.insuranceCurrency, currencies)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">In INR:</span>
                  <span>{formatINR(extras.insuranceTotalCostINR)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-primary/5 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="font-semibold">Total Extras Cost</p>
            <p className="text-xl font-bold">
              {formatINR(extras.visaTotalCostINR + extras.tipsTotalCostINR + extras.insuranceTotalCostINR)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitiesSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          Activities ({trip.activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trip.activities.map((activity, index) => (
            <div key={activity.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">{activity.name}</h4>
                  {activity.city && (
                    <Badge variant="outline" className="mt-1">{activity.city}</Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrencyWithSymbol(activity.totalCost, activity.currency, currencies)}</p>
                  <p className="text-sm text-muted-foreground">{formatINR(activity.totalCostINR)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
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

function OverheadsSection({ trip, currencies }: { trip: Trip; currencies: Currency[] }) {
  const visibleOverheads = trip.overheads.filter(o => !o.hideFromClient);
  const hiddenOverheads = trip.overheads.filter(o => o.hideFromClient);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Overheads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleOverheads.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-3">Client-Visible Overheads:</p>
            <div className="space-y-2">
              {visibleOverheads.map((overhead) => (
                <div key={overhead.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="font-medium">{overhead.name}</span>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrencyWithSymbol(overhead.amount, overhead.currency, currencies)}</p>
                    <p className="text-xs text-muted-foreground">{formatINR(overhead.totalCostINR)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hiddenOverheads.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-3 text-warning">Hidden Overheads (Admin Only):</p>
            <div className="space-y-2">
              {hiddenOverheads.map((overhead) => (
                <div key={overhead.id} className="flex justify-between items-center p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <span className="font-medium">{overhead.name}</span>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrencyWithSymbol(overhead.amount, overhead.currency, currencies)}</p>
                    <p className="text-xs text-muted-foreground">{formatINR(overhead.totalCostINR)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
  const extrasTotal = trip.extras
    ? (trip.extras.visaTotalCostINR + trip.extras.tipsTotalCostINR + trip.extras.insuranceTotalCostINR)
    : 0;
  const overheadsTotal = trip.overheads.reduce((sum, o) => sum + o.totalCostINR, 0);
  const visibleOverheadsTotal = trip.overheads.filter(o => !o.hideFromClient).reduce((sum, o) => sum + o.totalCostINR, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Cost Summary & Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Cost Components */}
          <CostRow label="Transport" sublabel="Flights, Buses, Trains" amount={transportTotal} />
          <CostRow label="Accommodation" sublabel="Hotels & Stay" amount={accommodationTotal} />
          <CostRow label="Meals" sublabel="Breakfast, Lunch & Dinner" amount={trip.meals.totalCostINR} />
          <CostRow label="Activities" sublabel="Entry, Transport, Guides" amount={activitiesTotal} />
          {extrasTotal > 0 && (
            <CostRow label="Extras" sublabel="Visa, Tips, Insurance" amount={extrasTotal} />
          )}
          <CostRow label="Overheads" sublabel="All overheads" amount={overheadsTotal} />

          {/* Subtotal Before Tax */}
          <div className="pt-4 border-t">
            <CostRow
              label="Subtotal (Before Profit & Tax)"
              amount={trip.subtotalBeforeTax}
              isSubtotal
            />
          </div>

          {/* NEW: Profit */}
          {trip.profit > 0 && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-primary" />
                <span className="font-medium">Profit</span>
              </div>
              <span className="font-semibold">{formatINR(trip.profit)}</span>
            </div>
          )}

          {/* Admin Subtotal (Subtotal + Profit) */}
          <div className="flex justify-between items-center py-2 border-t border-dashed">
            <span className="font-semibold">Admin Subtotal (Subtotal + Profit)</span>
            <span className="font-semibold text-lg">{formatINR(trip.subtotalBeforeTax + trip.profit)}</span>
          </div>

          {/* NEW: GST */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <BadgePercent className="w-4 h-4 text-primary" />
              <span className="font-medium">GST ({trip.gstPercentage}%)</span>
            </div>
            <span className="font-semibold">{formatINR(trip.gstAmount)}</span>
          </div>

          {/* NEW: TCS (for international trips only) */}
          {trip.tripCategory === 'international' && trip.tcsAmount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-primary" />
                <span className="font-medium">TCS ({trip.tcsPercentage}% on Subtotal + GST)</span>
              </div>
              <span className="font-semibold">{formatINR(trip.tcsAmount)}</span>
            </div>
          )}

          {/* Hidden Overheads Warning */}
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

          {/* Grand Total */}
          <div className="pt-4 border-t-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">Grand Total</p>
                <p className="text-sm text-muted-foreground">
                  {trip.tripCategory === 'international'
                    ? 'Including GST, TCS & all charges'
                    : 'Including GST & all charges'}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatINR(trip.grandTotalINR)}</p>
            </div>

            <div className="flex justify-between items-center mt-4 p-3 bg-primary/5 rounded-lg">
              <span className="font-medium">
                Cost per {trip.tripType === 'institute' ? 'Student' : 'Participant'}
              </span>
              <span className="text-lg font-bold">{formatINR(trip.costPerParticipant)}</span>
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
                    <td className={`p-3 text-right ${cat.difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {cat.difference >= 0 ? '+' : ''}{formatINR(cat.difference)}
                    </td>
                    <td className={`p-3 text-right ${cat.variancePercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {cat.variancePercentage >= 0 ? '+' : ''}{cat.variancePercentage.toFixed(2)}%
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