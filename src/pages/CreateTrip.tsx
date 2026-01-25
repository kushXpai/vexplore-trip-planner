// src/pages/CreateTrip.tsx - FINAL VERSION WITH OPTIMAL ROOM ALLOCATION
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { countries, cities, getCitiesByCountry, getCountryCurrency, formatCurrency, getCurrencyRate } from '@/data/demoData';
import { Plane, Bus, Train, Hotel, Utensils, Ticket, Calculator, Shield, Info, Plus, Trash2, Loader2, Users, Calendar, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import { Flight, Bus as BusType, Train as TrainType, Accommodation, Activity, Overhead } from '@/types/trip';
import { toast } from 'sonner';
import { createTrip, updateTrip, getTripById } from '@/services/tripService';

// Room Type Definition (NO quantity - system calculates)
type RoomTypeDefinition = {
  id: string;
  name: string;
  occupancy: number;
  pricePerNight: number;
};

// Allocation Result (system output)
type RoomAllocationResult = {
  roomTypeId: string;
  roomTypeName: string;
  occupancy: number;
  pricePerNight: number;
  quantityNeeded: number;
  category: string; // 'boys', 'girls', etc.
};

export default function CreateTrip() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    country: '',
    city: '',
    startDate: '',
    endDate: '',
    boys: 0,
    girls: 0,
    maleFaculty: 0,
    femaleFaculty: 0,
    maleVXplorers: 0,
    femaleVXplorers: 0,
  });

  const [flights, setFlights] = useState<Flight[]>([]);
  const [buses, setBuses] = useState<BusType[]>([]);
  const [trains, setTrains] = useState<TrainType[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [meals, setMeals] = useState({ lunchCostPerPerson: 0, dinnerCostPerPerson: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [overheads, setOverheads] = useState<Overhead[]>([]);

  // Dialog states
  const [showFlightDialog, setShowFlightDialog] = useState(false);
  const [showBusDialog, setShowBusDialog] = useState(false);
  const [showTrainDialog, setShowTrainDialog] = useState(false);
  const [showHotelDialog, setShowHotelDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showOverheadDialog, setShowOverheadDialog] = useState(false);

  // Load trip data when editing
  useEffect(() => {
    if (editId) {
      loadTripData(editId);
    }
  }, [editId]);

  const loadTripData = async (tripId: string) => {
    setIsLoading(true);
    try {
      const result = await getTripById(tripId);
      if (result.success && result.data) {
        const { trip, participants, flights: dbFlights, buses: dbBuses, trains: dbTrains, accommodations: dbAccommodations, activities: dbActivities } = result.data;

        const country = countries.find(c => c.name === trip.country);
        const city = cities.find(c => c.name === trip.city);

        setFormData({
          name: trip.name,
          institution: trip.institution,
          country: country?.id || '',
          city: city?.id || '',
          startDate: trip.start_date,
          endDate: trip.end_date,
          boys: participants?.boys || 0,
          girls: participants?.girls || 0,
          maleFaculty: participants?.male_faculty || 0,
          femaleFaculty: participants?.female_faculty || 0,
          maleVXplorers: participants?.male_vxplorers || 0,
          femaleVXplorers: participants?.female_vxplorers || 0,
        });

        setFlights(dbFlights.map(f => ({
          id: f.id!,
          from: f.from_city,
          to: f.to_city,
          airline: f.airline,
          flightNumber: f.flight_number,
          departureTime: f.departure_time,
          arrivalTime: f.arrival_time,
          costPerPerson: f.cost_per_person,
          currency: f.currency,
          description: f.description,
          totalCost: f.total_cost,
          totalCostINR: f.total_cost_inr,
        })));

        setBuses(dbBuses.map(b => ({
          id: b.id!,
          name: b.name,
          seatingCapacity: b.seating_capacity,
          costPerBus: b.cost_per_bus,
          currency: b.currency,
          numberOfDays: b.number_of_days,
          quantity: b.quantity,
          description: b.description,
          totalCost: b.total_cost,
          totalCostINR: b.total_cost_inr,
        })));

        setTrains(dbTrains.map(t => ({
          id: t.id!,
          name: t.name,
          trainNumber: t.train_number,
          class: t.class,
          timing: t.timing,
          costPerPerson: t.cost_per_person,
          currency: t.currency,
          description: t.description,
          totalCost: t.total_cost,
          totalCostINR: t.total_cost_inr,
        })));

        setAccommodations(dbAccommodations.map(a => ({
          id: a.id!,
          hotelName: a.hotel_name,
          city: a.city,
          numberOfNights: a.number_of_nights,
          costPerRoom: a.cost_per_room,
          currency: a.currency,
          breakfastIncluded: a.breakfast_included,
          totalRooms: a.total_rooms,
          totalCost: a.total_cost,
          totalCostINR: a.total_cost_inr,
          roomAllocation: a.room_allocation || {
            boysRooms: 0,
            girlsRooms: 0,
            maleFacultyRooms: 0,
            femaleFacultyRooms: 0,
            maleVXplorerRooms: 0,
            femaleVXplorerRooms: 0,
            totalRooms: 0,
          },
        })));

        setActivities(dbActivities.map(a => ({
          id: a.id!,
          name: a.name,
          entryCost: a.entry_cost,
          transportCost: a.transport_cost,
          guideCost: a.guide_cost,
          currency: a.currency,
          description: a.description,
          totalCost: a.total_cost,
          totalCostINR: a.total_cost_inr,
        })));

        toast.success('Trip loaded for editing');
      }
    } catch (error) {
      console.error('Error loading trip:', error);
      toast.error('Failed to load trip data');
    } finally {
      setIsLoading(false);
    }
  };

  // AUTO-RECALCULATION: When participants change, recalculate all costs
  useEffect(() => {
    if (isEditing && !isLoading) {
      recalculateAllCosts();
    }
  }, [
    formData.boys,
    formData.girls,
    formData.maleFaculty,
    formData.femaleFaculty,
    formData.maleVXplorers,
    formData.femaleVXplorers,
  ]);

  const recalculateAllCosts = () => {
    const totalParticipants = calculateTotalParticipants();
    
    if (flights.length > 0) {
      setFlights(prev => prev.map(flight => {
        const totalCost = flight.costPerPerson * totalParticipants;
        const rate = getCurrencyRate(flight.currency);
        return {
          ...flight,
          totalCost,
          totalCostINR: totalCost * rate,
        };
      }));
    }

    if (trains.length > 0) {
      setTrains(prev => prev.map(train => {
        const totalCost = train.costPerPerson * totalParticipants;
        const rate = getCurrencyRate(train.currency);
        return {
          ...train,
          totalCost,
          totalCostINR: totalCost * rate,
        };
      }));
    }

    if (activities.length > 0) {
      setActivities(prev => prev.map(activity => {
        const totalCost = (activity.entryCost * totalParticipants) + activity.transportCost + activity.guideCost;
        const rate = getCurrencyRate(activity.currency);
        return {
          ...activity,
          totalCost,
          totalCostINR: totalCost * rate,
        };
      }));
    }
  };

  const calculateTotalParticipants = () => {
    return (
      formData.boys +
      formData.girls +
      formData.maleFaculty +
      formData.femaleFaculty +
      formData.maleVXplorers +
      formData.femaleVXplorers
    );
  };

  const calculateTotalStudents = () => formData.boys + formData.girls;
  const calculateTotalFaculty = () => formData.maleFaculty + formData.femaleFaculty;
  const calculateTotalVXplorers = () => formData.maleVXplorers + formData.femaleVXplorers;

  const getTripDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  const getTripNights = () => Math.max(0, getTripDays() - 1);

  const selectedCountry = countries.find(c => c.id === formData.country);
  const availableCities = formData.country ? getCitiesByCountry(formData.country) : [];
  const tripCurrency = selectedCountry ? getCountryCurrency(selectedCountry.name) : 'INR';

  const handleAddFlight = (flight: Omit<Flight, 'id' | 'totalCost' | 'totalCostINR'>) => {
    const totalParticipants = calculateTotalParticipants();
    const totalCost = flight.costPerPerson * totalParticipants;
    const rate = getCurrencyRate(flight.currency);
    const newFlight: Flight = {
      ...flight,
      id: crypto.randomUUID(),
      totalCost,
      totalCostINR: totalCost * rate,
    };
    setFlights([...flights, newFlight]);
    setShowFlightDialog(false);
    toast.success('Flight added');
  };

  const handleAddBus = (bus: Omit<BusType, 'id' | 'totalCost' | 'totalCostINR'>) => {
    const totalCost = bus.costPerBus * bus.quantity * bus.numberOfDays;
    const rate = getCurrencyRate(bus.currency);
    const newBus: BusType = {
      ...bus,
      id: crypto.randomUUID(),
      totalCost,
      totalCostINR: totalCost * rate,
    };
    setBuses([...buses, newBus]);
    setShowBusDialog(false);
    toast.success('Bus added');
  };

  const handleAddTrain = (train: Omit<TrainType, 'id' | 'totalCost' | 'totalCostINR'>) => {
    const totalParticipants = calculateTotalParticipants();
    const totalCost = train.costPerPerson * totalParticipants;
    const rate = getCurrencyRate(train.currency);
    const newTrain: TrainType = {
      ...train,
      id: crypto.randomUUID(),
      totalCost,
      totalCostINR: totalCost * rate,
    };
    setTrains([...trains, newTrain]);
    setShowTrainDialog(false);
    toast.success('Train added');
  };

  const handleAddAccommodation = (accommodation: Omit<Accommodation, 'id' | 'totalRooms' | 'totalCost' | 'totalCostINR'>) => {
    const totalRooms = 
      accommodation.roomAllocation.boysRooms +
      accommodation.roomAllocation.girlsRooms +
      accommodation.roomAllocation.maleFacultyRooms +
      accommodation.roomAllocation.femaleFacultyRooms +
      accommodation.roomAllocation.maleVXplorerRooms +
      accommodation.roomAllocation.femaleVXplorerRooms;
    
    const totalCost = accommodation.costPerRoom * totalRooms * accommodation.numberOfNights;
    const rate = getCurrencyRate(accommodation.currency);
    
    const newAccommodation: Accommodation = {
      ...accommodation,
      id: crypto.randomUUID(),
      totalRooms,
      totalCost,
      totalCostINR: totalCost * rate,
    };
    setAccommodations([...accommodations, newAccommodation]);
    setShowHotelDialog(false);
    toast.success('Accommodation added');
  };

  const handleAddActivity = (activity: Omit<Activity, 'id' | 'totalCost' | 'totalCostINR'>) => {
    const totalParticipants = calculateTotalParticipants();
    const totalCost = (activity.entryCost * totalParticipants) + activity.transportCost + activity.guideCost;
    const rate = getCurrencyRate(activity.currency);
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
      totalCost,
      totalCostINR: totalCost * rate,
    };
    setActivities([...activities, newActivity]);
    setShowActivityDialog(false);
    toast.success('Activity added');
  };

  const handleAddOverhead = (overhead: Omit<Overhead, 'id' | 'totalCostINR'>) => {
    const rate = getCurrencyRate(overhead.currency);
    const newOverhead: Overhead = {
      ...overhead,
      id: crypto.randomUUID(),
      totalCostINR: overhead.amount * rate,
    };
    setOverheads([...overheads, newOverhead]);
    setShowOverheadDialog(false);
    toast.success('Overhead added');
  };

  const calculateTotals = () => {
    const totalParticipants = calculateTotalParticipants();
    const totalDays = getTripDays();
    
    const transportTotal = 
      flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
      buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
      trains.reduce((sum, t) => sum + t.totalCostINR, 0);
    
    const accommodationTotal = accommodations.reduce((sum, a) => sum + a.totalCostINR, 0);
    
    const mealsCostPerDay = (meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * totalParticipants;
    const mealsRate = getCurrencyRate(tripCurrency);
    const mealsTotalCost = mealsCostPerDay * totalDays;
    const mealsTotalINR = mealsTotalCost * mealsRate;
    
    const activitiesTotal = activities.reduce((sum, a) => sum + a.totalCostINR, 0);
    const overheadsTotal = overheads.reduce((sum, o) => sum + o.totalCostINR, 0);
    
    const grandTotal = transportTotal + accommodationTotal + mealsTotalINR + activitiesTotal + overheadsTotal;
    const totalStudents = calculateTotalStudents();
    const costPerStudent = totalStudents > 0 ? grandTotal / totalStudents : 0;
    
    return {
      transport: transportTotal,
      accommodation: accommodationTotal,
      meals: mealsTotalINR,
      activities: activitiesTotal,
      overheads: overheadsTotal,
      grandTotal,
      costPerStudent,
      totalDays,
      totalParticipants,
    };
  };

  const handleSaveTrip = async () => {
    if (!formData.name || !formData.institution || !formData.country || !formData.city || !formData.startDate || !formData.endDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const totalParticipants = calculateTotalParticipants();
    if (totalParticipants === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    setIsSaving(true);

    try {
      const totals = calculateTotals();
      const totalDays = getTripDays();
      const totalNights = getTripNights();

      const countryName = countries.find(c => c.id === formData.country)?.name || '';
      const cityName = cities.find(c => c.id === formData.city)?.name || '';

      const tripData = {
        name: formData.name,
        institution: formData.institution,
        country: countryName,
        city: cityName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays,
        totalNights,
        currency: tripCurrency,
        participants: {
          boys: formData.boys,
          girls: formData.girls,
          maleFaculty: formData.maleFaculty,
          femaleFaculty: formData.femaleFaculty,
          maleVXplorers: formData.maleVXplorers,
          femaleVXplorers: formData.femaleVXplorers,
          totalStudents: calculateTotalStudents(),
          totalFaculty: calculateTotalFaculty(),
          totalVXplorers: calculateTotalVXplorers(),
          totalParticipants,
        },
        flights,
        buses,
        trains,
        accommodations,
        meals: {
          lunchCostPerPerson: meals.lunchCostPerPerson,
          dinnerCostPerPerson: meals.dinnerCostPerPerson,
          currency: tripCurrency,
          totalDays,
          totalParticipants,
          dailyCost: (meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * totalParticipants,
          totalCost: (meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * totalParticipants * totalDays,
          totalCostINR: totals.meals,
        },
        activities,
        overheads,
        totalCost: totals.grandTotal / getCurrencyRate(tripCurrency),
        totalCostINR: totals.grandTotal,
        costPerStudent: totals.costPerStudent,
      };

      let result;
      if (isEditing && editId) {
        result = await updateTrip(editId, tripData);
        if (result.success) {
          toast.success('Trip updated successfully!');
          navigate(`/trips/${editId}`);
        }
      } else {
        result = await createTrip(tripData);
        if (result.success) {
          toast.success('Trip created successfully!');
          navigate('/dashboard');
        }
      }

      if (!result.success) {
        toast.error(result.error || 'Failed to save trip');
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <AppLayout title={isEditing ? 'Edit Trip' : 'Create New Trip'}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? 'Edit Trip' : 'Create New Trip'}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Basic Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trip Name *</Label>
                <Input
                  placeholder="Singapore Educational Tour 2024"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Institution *</Label>
                <Input
                  placeholder="ABC School"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country *</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v, city: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v })} disabled={!formData.country}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {availableCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{getTripDays()} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{getTripNights()} nights</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-3">
                <Label className="text-sm font-semibold text-blue-600 dark:text-blue-400">Students</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Boys</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.boys}
                      onChange={(e) => setFormData({ ...formData, boys: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Girls</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.girls}
                      onChange={(e) => setFormData({ ...formData, girls: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Total Students: <span className="font-semibold">{calculateTotalStudents()}</span></p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg space-y-3">
                <Label className="text-sm font-semibold text-purple-600 dark:text-purple-400">Faculty</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Male Faculty</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.maleFaculty}
                      onChange={(e) => setFormData({ ...formData, maleFaculty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Female Faculty</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.femaleFaculty}
                      onChange={(e) => setFormData({ ...formData, femaleFaculty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Total Faculty: <span className="font-semibold">{calculateTotalFaculty()}</span></p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-3">
                <Label className="text-sm font-semibold text-green-600 dark:text-green-400">VXplorers</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Male VXplorers</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.maleVXplorers}
                      onChange={(e) => setFormData({ ...formData, maleVXplorers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Female VXplorers</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.femaleVXplorers}
                      onChange={(e) => setFormData({ ...formData, femaleVXplorers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Total VXplorers: <span className="font-semibold">{calculateTotalVXplorers()}</span></p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-lg font-semibold">Total Participants: <span className="text-primary">{calculateTotalParticipants()}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport Section - Flights, Buses, Trains */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Transport
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Flights */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Flights</Label>
                <Button size="sm" variant="outline" onClick={() => setShowFlightDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Flight
                </Button>
              </div>
              {flights.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Flight</TableHead>
                      <TableHead>Cost/Person</TableHead>
                      <TableHead className="text-right">Total (INR)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flights.map((f, idx) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.from} → {f.to}</TableCell>
                        <TableCell>{f.airline} {f.flightNumber}</TableCell>
                        <TableCell>{formatCurrency(f.costPerPerson, f.currency)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(f.totalCostINR, 'INR')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setFlights(flights.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Buses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Buses</Label>
                <Button size="sm" variant="outline" onClick={() => setShowBusDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Bus
                </Button>
              </div>
              {buses.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Days × Qty</TableHead>
                      <TableHead className="text-right">Total (INR)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buses.map((b, idx) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.name}</TableCell>
                        <TableCell>{b.seatingCapacity} seats</TableCell>
                        <TableCell>{b.numberOfDays} × {b.quantity}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(b.totalCostINR, 'INR')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setBuses(buses.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Trains */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Trains</Label>
                <Button size="sm" variant="outline" onClick={() => setShowTrainDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Train
                </Button>
              </div>
              {trains.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Train</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Cost/Person</TableHead>
                      <TableHead className="text-right">Total (INR)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trains.map((t, idx) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name} ({t.trainNumber})</TableCell>
                        <TableCell>{t.class}</TableCell>
                        <TableCell>{formatCurrency(t.costPerPerson, t.currency)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(t.totalCostINR, 'INR')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setTrains(trains.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-semibold">Transport Total: <span className="text-primary">{formatCurrency(totals.transport, 'INR')}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Accommodation */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Hotel className="w-5 h-5 text-primary" />
                Accommodation
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowHotelDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Hotel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accommodations.length > 0 ? (
              <div className="space-y-4">
                {accommodations.map((acc, idx) => (
                  <div key={acc.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{acc.hotelName}</h4>
                        <p className="text-sm text-muted-foreground">{acc.city} • {acc.numberOfNights} nights • {acc.totalRooms} rooms</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{formatCurrency(acc.totalCostINR, 'INR')}</span>
                        <Button size="sm" variant="ghost" onClick={() => setAccommodations(accommodations.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold">Accommodation Total: <span className="text-primary">{formatCurrency(totals.accommodation, 'INR')}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No accommodations added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Meals */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" />
              Meals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lunch Cost/Person ({tripCurrency})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={meals.lunchCostPerPerson || ''}
                  onChange={(e) => setMeals({ ...meals, lunchCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dinner Cost/Person ({tripCurrency})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={meals.dinnerCostPerPerson || ''}
                  onChange={(e) => setMeals({ ...meals, dinnerCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="pt-4 border-t space-y-2">
              <p className="text-sm text-muted-foreground">Daily Cost: {formatCurrency((meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * totals.totalParticipants, tripCurrency)}</p>
              <p className="text-sm font-semibold">Meals Total ({totals.totalDays} days): <span className="text-primary">{formatCurrency(totals.meals, 'INR')}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Activities
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowActivityDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Activity
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((act, idx) => (
                  <div key={act.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{act.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Entry: {formatCurrency(act.entryCost, act.currency)} • 
                          Transport: {formatCurrency(act.transportCost, act.currency)} • 
                          Guide: {formatCurrency(act.guideCost, act.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{formatCurrency(act.totalCostINR, 'INR')}</span>
                        <Button size="sm" variant="ghost" onClick={() => setActivities(activities.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold">Activities Total: <span className="text-primary">{formatCurrency(totals.activities, 'INR')}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No activities added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Overheads */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Overheads
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowOverheadDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Overhead
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {overheads.length > 0 ? (
              <div className="space-y-4">
                {overheads.map((oh, idx) => (
                  <div key={oh.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{oh.name}</h4>
                        <p className="text-sm text-muted-foreground">{oh.hideFromClient ? '🔒 Hidden from client' : '👁️ Visible to client'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{formatCurrency(oh.totalCostINR, 'INR')}</span>
                        <Button size="sm" variant="ghost" onClick={() => setOverheads(overheads.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold">Overheads Total: <span className="text-primary">{formatCurrency(totals.overheads, 'INR')}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No overheads added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card className="shadow-card border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Transport</span>
              <span className="font-semibold">{formatCurrency(totals.transport, 'INR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Accommodation</span>
              <span className="font-semibold">{formatCurrency(totals.accommodation, 'INR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Meals</span>
              <span className="font-semibold">{formatCurrency(totals.meals, 'INR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Activities</span>
              <span className="font-semibold">{formatCurrency(totals.activities, 'INR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Overheads</span>
              <span className="font-semibold">{formatCurrency(totals.overheads, 'INR')}</span>
            </div>
            <div className="pt-4 border-t-2 border-primary/30">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totals.grandTotal, 'INR')}</span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Cost per Student</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(totals.costPerStudent, 'INR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button onClick={handleSaveTrip} disabled={isSaving} className="gradient-primary text-primary-foreground">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>{isEditing ? 'Update Trip' : 'Create Trip'}</>
            )}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <FlightDialog
        open={showFlightDialog}
        onClose={() => setShowFlightDialog(false)}
        onAdd={handleAddFlight}
        currency={tripCurrency}
      />
      <BusDialog
        open={showBusDialog}
        onClose={() => setShowBusDialog(false)}
        onAdd={handleAddBus}
        currency={tripCurrency}
      />
      <TrainDialog
        open={showTrainDialog}
        onClose={() => setShowTrainDialog(false)}
        onAdd={handleAddTrain}
        currency={tripCurrency}
      />
      <OptimalHotelDialog
        open={showHotelDialog}
        onClose={() => setShowHotelDialog(false)}
        onAdd={handleAddAccommodation}
        currency={tripCurrency}
        nights={getTripNights()}
        participants={{
          boys: formData.boys,
          girls: formData.girls,
          maleFaculty: formData.maleFaculty,
          femaleFaculty: formData.femaleFaculty,
          maleVXplorers: formData.maleVXplorers,
          femaleVXplorers: formData.femaleVXplorers,
        }}
      />
      <ActivityDialog
        open={showActivityDialog}
        onClose={() => setShowActivityDialog(false)}
        onAdd={handleAddActivity}
        currency={tripCurrency}
      />
      <OverheadDialog
        open={showOverheadDialog}
        onClose={() => setShowOverheadDialog(false)}
        onAdd={handleAddOverhead}
      />
    </AppLayout>
  );
}

// ========== DIALOG COMPONENTS ==========

function FlightDialog({ open, onClose, onAdd, currency }: any) {
  const [form, setForm] = useState({ from: '', to: '', airline: '', flightNumber: '', departureTime: '', arrivalTime: '', costPerPerson: 0, description: '' });
  const handleSubmit = () => {
    if (!form.from || !form.to || !form.airline || !form.costPerPerson) return toast.error('Please fill required fields');
    onAdd({ ...form, currency });
    setForm({ from: '', to: '', airline: '', flightNumber: '', departureTime: '', arrivalTime: '', costPerPerson: 0, description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plane className="w-5 h-5 text-primary" />Add Flight</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>From *</Label><Input placeholder="Mumbai" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></div>
            <div className="space-y-2"><Label>To *</Label><Input placeholder="Singapore" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Airline *</Label><Input placeholder="Singapore Airlines" value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} /></div>
            <div className="space-y-2"><Label>Flight Number</Label><Input placeholder="SQ123" value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Departure</Label><Input type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} /></div>
            <div className="space-y-2"><Label>Arrival</Label><Input type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Cost/Person ({currency}) *</Label><Input type="number" placeholder="0" value={form.costPerPerson || ''} onChange={(e) => setForm({ ...form, costPerPerson: parseFloat(e.target.value) || 0 })} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Additional flight details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">Add Flight</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BusDialog({ open, onClose, onAdd, currency }: any) {
  const [form, setForm] = useState({ name: '', seatingCapacity: 0, costPerBus: 0, numberOfDays: 1, quantity: 1, description: '' });
  const handleSubmit = () => {
    if (!form.name || !form.costPerBus) return toast.error('Please fill required fields');
    onAdd({ ...form, currency });
    setForm({ name: '', seatingCapacity: 0, costPerBus: 0, numberOfDays: 1, quantity: 1, description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Bus className="w-5 h-5 text-primary" />Add Bus</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Bus Name *</Label><Input placeholder="Volvo Multi-Axle" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Seating Capacity</Label><Input type="number" placeholder="45" value={form.seatingCapacity || ''} onChange={(e) => setForm({ ...form, seatingCapacity: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Cost/Bus/Day ({currency}) *</Label><Input type="number" placeholder="0" value={form.costPerBus || ''} onChange={(e) => setForm({ ...form, costPerBus: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Number of Days</Label><Input type="number" min="1" value={form.numberOfDays} onChange={(e) => setForm({ ...form, numberOfDays: parseInt(e.target.value) || 1 })} /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Bus details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">Add Bus</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrainDialog({ open, onClose, onAdd, currency }: any) {
  const [form, setForm] = useState({ name: '', trainNumber: '', class: '', timing: '', costPerPerson: 0, description: '' });
  const handleSubmit = () => {
    if (!form.name || !form.costPerPerson) return toast.error('Please fill required fields');
    onAdd({ ...form, currency });
    setForm({ name: '', trainNumber: '', class: '', timing: '', costPerPerson: 0, description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Train className="w-5 h-5 text-primary" />Add Train</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Train Name *</Label><Input placeholder="Rajdhani Express" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Train Number</Label><Input placeholder="12345" value={form.trainNumber} onChange={(e) => setForm({ ...form, trainNumber: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Class</Label><Input placeholder="AC 2-Tier" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} /></div>
            <div className="space-y-2"><Label>Timing</Label><Input placeholder="10:00 AM" value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Cost/Person ({currency}) *</Label><Input type="number" placeholder="0" value={form.costPerPerson || ''} onChange={(e) => setForm({ ...form, costPerPerson: parseFloat(e.target.value) || 0 })} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Train journey details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">Add Train</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== OPTIMAL HOTEL DIALOG - USER DEFINES TYPES & PRICES, SYSTEM CALCULATES QUANTITIES ==========

function OptimalHotelDialog({ open, onClose, onAdd, currency, nights, participants }: any) {
  const [step, setStep] = useState<'basic-info' | 'room-types' | 'allocation'>('basic-info');
  
  const [basicInfo, setBasicInfo] = useState({
    hotelName: '',
    city: '',
    numberOfNights: nights || 1,
    breakfastIncluded: true,
  });

  const [roomTypes, setRoomTypes] = useState<RoomTypeDefinition[]>([
    { id: '1', name: 'Room Type 1', occupancy: 2, pricePerNight: 0 }
  ]);

  const [allocationResult, setAllocationResult] = useState<{
    breakdown: RoomAllocationResult[];
    totalRooms: number;
    totalCost: number;
    avgCostPerRoom: number;
  } | null>(null);

  useEffect(() => {
    if (nights > 0) setBasicInfo(prev => ({ ...prev, numberOfNights: nights }));
  }, [nights]);

  useEffect(() => {
    if (!open) {
      setStep('basic-info');
      setBasicInfo({ hotelName: '', city: '', numberOfNights: nights || 1, breakfastIncluded: true });
      setRoomTypes([{ id: '1', name: 'Room Type 1', occupancy: 2, pricePerNight: 0 }]);
      setAllocationResult(null);
    }
  }, [open]);

  const addRoomType = () => {
    setRoomTypes([...roomTypes, {
      id: Date.now().toString(),
      name: `Room Type ${roomTypes.length + 1}`,
      occupancy: 2,
      pricePerNight: 0
    }]);
  };

  const removeRoomType = (id: string) => {
    if (roomTypes.length === 1) return toast.error('At least one room type required');
    setRoomTypes(roomTypes.filter(rt => rt.id !== id));
  };

  const updateRoomType = (id: string, field: keyof RoomTypeDefinition, value: any) => {
    setRoomTypes(roomTypes.map(rt => rt.id === id ? { ...rt, [field]: value } : rt));
  };

  const proceedToRoomTypes = () => {
    if (!basicInfo.hotelName) return toast.error('Please enter hotel name');
    setStep('room-types');
  };

  const proceedToAllocation = () => {
    if (roomTypes.some(rt => rt.pricePerNight === 0)) {
      return toast.error('Please enter price for all room types');
    }
    setStep('allocation');
  };

  // ========== OPTIMAL ALLOCATION ALGORITHM ==========
  const calculateOptimalAllocation = () => {
    const participantGroups = [
      { name: 'boys', count: participants.boys, category: 'boysRooms' },
      { name: 'girls', count: participants.girls, category: 'girlsRooms' },
      { name: 'maleFaculty', count: participants.maleFaculty, category: 'maleFacultyRooms' },
      { name: 'femaleFaculty', count: participants.femaleFaculty, category: 'femaleFacultyRooms' },
      { name: 'maleVXplorers', count: participants.maleVXplorers, category: 'maleVXplorerRooms' },
      { name: 'femaleVXplorers', count: participants.femaleVXplorers, category: 'femaleVXplorerRooms' },
    ];

    // Sort room types by cost-efficiency (cost per person)
    const sortedRoomTypes = [...roomTypes].sort((a, b) => {
      const costPerPersonA = a.pricePerNight / a.occupancy;
      const costPerPersonB = b.pricePerNight / b.occupancy;
      return costPerPersonA - costPerPersonB;
    });

    const allocationBreakdown: RoomAllocationResult[] = [];
    let totalRooms = 0;
    let totalCost = 0;

    // Allocate for each group separately
    participantGroups.forEach(group => {
      if (group.count === 0) return;

      let remaining = group.count;
      const groupAllocation: RoomAllocationResult[] = [];

      // Use most cost-efficient rooms first
      for (const roomType of sortedRoomTypes) {
        if (remaining === 0) break;

        const roomsNeeded = Math.ceil(remaining / roomType.occupancy);
        const peopleInTheseRooms = Math.min(remaining, roomsNeeded * roomType.occupancy);
        
        groupAllocation.push({
          roomTypeId: roomType.id,
          roomTypeName: roomType.name,
          occupancy: roomType.occupancy,
          pricePerNight: roomType.pricePerNight,
          quantityNeeded: roomsNeeded,
          category: group.category,
        });

        totalRooms += roomsNeeded;
        totalCost += roomsNeeded * roomType.pricePerNight * basicInfo.numberOfNights;
        remaining -= peopleInTheseRooms;
        
        // Once group is accommodated, stop
        if (remaining <= 0) break;
      }

      allocationBreakdown.push(...groupAllocation);
    });

    const avgCostPerRoom = totalRooms > 0 ? totalCost / totalRooms : 0;

    setAllocationResult({
      breakdown: allocationBreakdown,
      totalRooms,
      totalCost,
      avgCostPerRoom,
    });

    toast.success(`✨ Optimal allocation calculated! ${totalRooms} rooms needed.`);
  };

  const handleSubmit = () => {
    if (!allocationResult) {
      toast.error('Please calculate allocation first');
      return;
    }

    // Convert allocation result to room allocation format
    const allocation = {
      boysRooms: 0,
      girlsRooms: 0,
      maleFacultyRooms: 0,
      femaleFacultyRooms: 0,
      maleVXplorerRooms: 0,
      femaleVXplorerRooms: 0,
    };

    allocationResult.breakdown.forEach(item => {
      allocation[item.category as keyof typeof allocation] += item.quantityNeeded;
    });

    // Calculate average cost per room
    const avgCostPerRoom = allocationResult.avgCostPerRoom / basicInfo.numberOfNights;

    onAdd({
      hotelName: basicInfo.hotelName,
      city: basicInfo.city,
      numberOfNights: basicInfo.numberOfNights,
      costPerRoom: avgCostPerRoom,
      currency,
      breakfastIncluded: basicInfo.breakfastIncluded,
      roomAllocation: allocation
    });

    // Reset
    setBasicInfo({ hotelName: '', city: '', numberOfNights: nights || 1, breakfastIncluded: true });
    setRoomTypes([{ id: '1', name: 'Room Type 1', occupancy: 2, pricePerNight: 0 }]);
    setAllocationResult(null);
    setStep('basic-info');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-primary" />
            Add Hotel 
            {step === 'room-types' && ' - Define Room Types'}
            {step === 'allocation' && ' - Optimal Allocation'}
          </DialogTitle>
        </DialogHeader>

        {step === 'basic-info' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hotel Name *</Label>
                <Input placeholder="Taj Palace" value={basicInfo.hotelName} onChange={(e) => setBasicInfo({ ...basicInfo, hotelName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Mumbai" value={basicInfo.city} onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Number of Nights</Label>
              <Input type="number" min="1" value={basicInfo.numberOfNights} onChange={(e) => setBasicInfo({ ...basicInfo, numberOfNights: parseInt(e.target.value) || 1 })} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={basicInfo.breakfastIncluded} onCheckedChange={(c) => setBasicInfo({ ...basicInfo, breakfastIncluded: c })} />
              <Label>Breakfast Included</Label>
            </div>
          </div>
        )}

        {step === 'room-types' && (
          <div className="grid gap-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Available Room Types</Label>
                <Button size="sm" variant="outline" onClick={addRoomType}>
                  <Plus className="w-4 h-4 mr-1" /> Add Room Type
                </Button>
              </div>

              <div className="space-y-3">
                {roomTypes.map((rt, idx) => (
                  <div key={rt.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Room Name</Label>
                      <Input
                        placeholder={`e.g., Deluxe Double`}
                        value={rt.name}
                        onChange={(e) => updateRoomType(rt.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">Occupancy</Label>
                      <Select
                        value={rt.occupancy.toString()}
                        onValueChange={(v) => updateRoomType(rt.id, 'occupancy', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="1">Single (1)</SelectItem>
                          <SelectItem value="2">Double (2)</SelectItem>
                          <SelectItem value="3">Triple (3)</SelectItem>
                          <SelectItem value="4">Quad (4)</SelectItem>
                          <SelectItem value="5">5 People</SelectItem>
                          <SelectItem value="6">6 People</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">Price/Night ({currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={rt.pricePerNight || ''}
                        onChange={(e) => updateRoomType(rt.id, 'pricePerNight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {roomTypes.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeRoomType(rt.id)} className="mt-6">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 System will calculate the most cost-effective combination
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'allocation' && (
          <div className="grid gap-4 py-4">
            {/* Participants Summary */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <Label className="font-semibold">Participants to Accommodate</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>👦 Boys: {participants.boys}</div>
                <div>👧 Girls: {participants.girls}</div>
                <div>👨‍🏫 Male Faculty: {participants.maleFaculty}</div>
                <div>👩‍🏫 Female Faculty: {participants.femaleFaculty}</div>
                <div>👨‍💼 Male VXplorers: {participants.maleVXplorers}</div>
                <div>👩‍💼 Female VXplorers: {participants.femaleVXplorers}</div>
              </div>
              <p className="text-sm font-semibold pt-2 border-t">
                Total: {participants.boys + participants.girls + participants.maleFaculty + participants.femaleFaculty + participants.maleVXplorers + participants.femaleVXplorers} people
              </p>
            </div>

            {/* Calculate Button */}
            <Button onClick={calculateOptimalAllocation} className="gradient-primary text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              Calculate Optimal Allocation
            </Button>

            {/* Allocation Result */}
            {allocationResult && (
              <div className="p-4 bg-primary/5 rounded-lg space-y-4 border-2 border-primary/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <Label className="font-semibold text-lg">Optimal Allocation Result</Label>
                </div>

                <div className="space-y-2">
                  {allocationResult.breakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                      <div>
                        <span className="font-medium">{item.quantityNeeded}x</span> {item.roomTypeName}
                        <span className="text-muted-foreground ml-2">({item.occupancy} people)</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(item.pricePerNight * item.quantityNeeded * basicInfo.numberOfNights, currency)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Rooms Needed:</span>
                    <span className="text-lg font-bold text-primary">{allocationResult.totalRooms} rooms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Cost ({basicInfo.numberOfNights} nights):</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(allocationResult.totalCost, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Average Cost per Room:</span>
                    <span>{formatCurrency(allocationResult.avgCostPerRoom, currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {!allocationResult && (
              <div className="p-4 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Click "Calculate Optimal Allocation" to see the best room combination
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step === 'basic-info' && (
            <Button onClick={proceedToRoomTypes} className="gradient-primary text-primary-foreground">
              Next: Define Room Types
            </Button>
          )}
          {step === 'room-types' && (
            <>
              <Button variant="outline" onClick={() => setStep('basic-info')}>
                Back
              </Button>
              <Button onClick={proceedToAllocation} className="gradient-primary text-primary-foreground">
                Next: Calculate Allocation
              </Button>
            </>
          )}
          {step === 'allocation' && (
            <>
              <Button variant="outline" onClick={() => setStep('room-types')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!allocationResult}
                className="gradient-primary text-primary-foreground"
              >
                Add Hotel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDialog({ open, onClose, onAdd, currency }: any) {
  const [form, setForm] = useState({ name: '', entryCost: 0, transportCost: 0, guideCost: 0, description: '' });
  const handleSubmit = () => {
    if (!form.name) return toast.error('Please enter activity name');
    onAdd({ ...form, currency });
    setForm({ name: '', entryCost: 0, transportCost: 0, guideCost: 0, description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-primary" />Add Activity</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Activity Name *</Label><Input placeholder="Universal Studios" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Entry/Person ({currency})</Label><Input type="number" placeholder="0" value={form.entryCost || ''} onChange={(e) => setForm({ ...form, entryCost: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Transport ({currency})</Label><Input type="number" placeholder="0" value={form.transportCost || ''} onChange={(e) => setForm({ ...form, transportCost: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Guide ({currency})</Label><Input type="number" placeholder="0" value={form.guideCost || ''} onChange={(e) => setForm({ ...form, guideCost: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Activity details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">Add Activity</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverheadDialog({ open, onClose, onAdd }: any) {
  const [form, setForm] = useState({ name: '', amount: 0, currency: 'INR', hideFromClient: false });
  const handleSubmit = () => {
    if (!form.name || !form.amount) return toast.error('Please fill required fields');
    onAdd(form);
    setForm({ name: '', amount: 0, currency: 'INR', hideFromClient: false });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Add Overhead</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Name *</Label><Input placeholder="Contingency, Admin, etc." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" placeholder="0" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="SGD">SGD (S$)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.hideFromClient} onCheckedChange={(c) => setForm({ ...form, hideFromClient: c })} /><Label>Hide from Client</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">Add Overhead</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}