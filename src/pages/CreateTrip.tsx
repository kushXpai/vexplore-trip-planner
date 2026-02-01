// src/pages/CreateTrip.tsx - INLINE EDITABLE VERSION
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
import {
  fetchCountries,
  fetchCities,
  fetchCurrencies,
  fetchCitiesByCountry,
  Currency,
  Country,
  City,
  getCurrencyRate as getCurrencyRateHelper,
  getCountryCurrency as getCountryCurrencyHelper,
  formatCurrency as formatCurrencyHelper
} from '@/services/masterDataService';
import { Plane, Bus, Train, Hotel, Utensils, Ticket, Calculator, Shield, Info, Plus, Trash2, Loader2, Users, Calendar, MapPin, Save } from 'lucide-react';
import { Flight, Bus as BusType, Train as TrainType, Accommodation, Activity, Overhead } from '@/types/trip';
import { toast } from 'sonner';
import { createTrip, updateTrip, getTripById } from '@/services/tripService';

import { autoAllocateRooms, calculateAccommodationCost, validateRoomAllocation, getRoomTypePresets } from '@/utils/roomAllocation';
import { RoomTypeConfig } from '@/types/trip';

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
  const [meals, setMeals] = useState({ breakfastCostPerPerson: 0, lunchCostPerPerson: 0, dinnerCostPerPerson: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [overheads, setOverheads] = useState<Overhead[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  // Load trip data when editing
  useEffect(() => {
    if (editId && countries.length > 0 && cities.length > 0) {
      loadTripData(editId);
    }
  }, [editId, countries.length, cities.length]);

  // Fetch master data on component mount
  useEffect(() => {
    const loadMasterData = async () => {
      setIsLoadingMasterData(true);
      try {
        const [countriesResult, citiesResult, currenciesResult] = await Promise.all([
          fetchCountries(),
          fetchCities(),
          fetchCurrencies()
        ]);

        if (countriesResult.success && countriesResult.data) {
          setCountries(countriesResult.data);
        }

        if (citiesResult.success && citiesResult.data) {
          setCities(citiesResult.data);
        }

        if (currenciesResult.success && currenciesResult.data) {
          setCurrencies(currenciesResult.data);
        }
      } catch (error) {
        console.error('Error loading master data:', error);
        toast.error('Failed to load countries and currencies');
      } finally {
        setIsLoadingMasterData(false);
      }
    };

    loadMasterData();
  }, []);

  // Update filtered cities when country changes
  useEffect(() => {
    if (formData.country) {
      const filtered = cities.filter(c => c.country_id === formData.country);
      setFilteredCities(filtered);
    } else {
      setFilteredCities([]);
    }
  }, [formData.country, cities]);

  const loadTripData = async (tripId: string) => {
  setIsLoading(true);
  try {
    const result = await getTripById(tripId);
    if (result.success && result.data) {
      const {
        trip,
        participants,
        flights: dbFlights,
        buses: dbBuses,
        trains: dbTrains,
        accommodations: dbAccommodations,
        activities: dbActivities,
        overheads: dbOverheads,
        meals: dbMeals
      } = result.data;

      // IMPROVED: Find country and city with better matching
      const country = countries.find(c => c.name === trip.country);
      let cityId = '';
      
      if (country) {
        const city = cities.find(c => c.name === trip.city && c.country_id === country.id);
        cityId = city?.id || '';
        
        // Debug log to check if matching works
        console.log('Country found:', country);
        console.log('City found:', city);
        console.log('Available cities for country:', cities.filter(c => c.country_id === country.id));
      } else {
        console.warn('Country not found:', trip.country);
      }

      setFormData({
        name: trip.name,
        institution: trip.institution,
        country: country?.id || '',
        city: cityId,
        startDate: trip.start_date,
        endDate: trip.end_date,
        boys: participants?.boys || 0,
        girls: participants?.girls || 0,
        maleFaculty: participants?.male_faculty || 0,
        femaleFaculty: participants?.female_faculty || 0,
        maleVXplorers: participants?.male_vxplorers || 0,
        femaleVXplorers: participants?.female_vxplorers || 0,
      });

      // Rest of the code remains the same...
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
      
      // ... rest of your existing mapping code
    }
  } catch (error) {
    console.error('Error loading trip:', error);
    toast.error('Failed to load trip data');
  } finally {
    setIsLoading(false);
  }
};

  // Helper functions
  // Helper functions
  const calculateTotalStudents = () => formData.boys + formData.girls;
  const calculateTotalFaculty = () => formData.maleFaculty + formData.femaleFaculty;
  const calculateTotalVXplorers = () => formData.maleVXplorers + formData.femaleVXplorers;
  const calculateTotalParticipants = () => calculateTotalStudents() + calculateTotalFaculty() + calculateTotalVXplorers();

  const getCurrencyRate = (code: string): number => {
    return getCurrencyRateHelper(currencies, code);
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    return formatCurrencyHelper(currencies, amount, currencyCode);
  };

  const getCountryCurrency = (countryId: string): string => {
    return getCountryCurrencyHelper(countries, countryId);
  };

  const getCitiesByCountry = (countryId: string): City[] => {
    return cities.filter(c => c.country_id === countryId);
  };

  const getTripDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getTripNights = () => {
    const days = getTripDays();
    return days > 0 ? days - 1 : 0;
  };

  const tripCurrency = formData.country ? getCountryCurrency(formData.country) : 'INR';
  const availableCities = formData.country ? getCitiesByCountry(formData.country) : [];

  // Add new items
  const addFlight = () => {
    setFlights([...flights, {
      id: `temp-${Date.now()}`,
      from: '',
      to: '',
      airline: '',
      flightNumber: '',
      departureTime: '',
      arrivalTime: '',
      costPerPerson: 0,
      currency: tripCurrency,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const addBus = () => {
    setBuses([...buses, {
      id: `temp-${Date.now()}`,
      name: '',
      seatingCapacity: 0,
      costPerBus: 0,
      currency: tripCurrency,
      numberOfDays: 0,
      quantity: 1,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const addTrain = () => {
    setTrains([...trains, {
      id: `temp-${Date.now()}`,
      name: '',
      trainNumber: '',
      class: '',
      timing: '',
      costPerPerson: 0,
      currency: tripCurrency,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const addRoomType = (accIndex: number) => {
    const updated = [...accommodations];
    const newRoomType: RoomTypeConfig = {
      roomType: 'Triple',
      capacityPerRoom: 3,
      costPerRoom: 0,
    };

    updated[accIndex].roomTypes = [...updated[accIndex].roomTypes, newRoomType];
    recalculateAccommodationRooms(updated, accIndex);
    setAccommodations(updated);
  };

  const removeRoomType = (accIndex: number, roomTypeIndex: number) => {
    const updated = [...accommodations];
    updated[accIndex].roomTypes = updated[accIndex].roomTypes.filter((_, i) => i !== roomTypeIndex);

    if (updated[accIndex].roomTypes.length > 0) {
      recalculateAccommodationRooms(updated, accIndex);
    } else {
      toast.error('At least one room type is required');
      return;
    }

    setAccommodations(updated);
  };

  const updateRoomType = (accIndex: number, roomTypeIndex: number, field: keyof RoomTypeConfig, value: any) => {
    const updated = [...accommodations];
    (updated[accIndex].roomTypes[roomTypeIndex] as any)[field] = value;
    recalculateAccommodationRooms(updated, accIndex);
    setAccommodations(updated);
  };

  const applyRoomTypePreset = (accIndex: number, presetName: string) => {
    const presets = getRoomTypePresets();
    const preset = presets[presetName];

    if (preset) {
      const updated = [...accommodations];
      // Keep existing costs if available, otherwise use preset
      updated[accIndex].roomTypes = preset.map(p => ({
        ...p,
        costPerRoom: p.costPerRoom || 0,
      }));
      recalculateAccommodationRooms(updated, accIndex);
      setAccommodations(updated);
      toast.success(`Applied "${presetName}" room configuration`);
    }
  };

  const recalculateAccommodationRooms = (updated: Accommodation[], index: number) => {
    const acc = updated[index];

    try {
      // Get current participants
      const participants = {
        boys: formData.boys,
        girls: formData.girls,
        maleFaculty: formData.maleFaculty,
        femaleFaculty: formData.femaleFaculty,
        maleVXplorers: formData.maleVXplorers,
        femaleVXplorers: formData.femaleVXplorers,
        totalStudents: calculateTotalStudents(),
        totalFaculty: calculateTotalFaculty(),
        totalVXplorers: calculateTotalVXplorers(),
        totalParticipants: calculateTotalParticipants(),
      };

      // Auto-allocate rooms
      const roomAllocation = autoAllocateRooms(participants, acc.roomTypes);
      acc.roomAllocation = roomAllocation;
      acc.totalRooms = roomAllocation.totalRooms;

      // Calculate costs
      const currencyRate = getCurrencyRate(acc.currency);
      const costs = calculateAccommodationCost(roomAllocation, acc.numberOfNights, currencyRate);
      acc.totalCost = costs.totalCost;
      acc.totalCostINR = costs.totalCostINR;

      // Validate
      const errors = validateRoomAllocation(participants, roomAllocation);
      if (errors.length > 0) {
        console.warn('Room allocation warnings:', errors);
      }
    } catch (error) {
      console.error('Error calculating rooms:', error);
      toast.error(error instanceof Error ? error.message : 'Error calculating rooms');
    }
  };

  const addAccommodation = () => {
    const newAccommodation: Accommodation = {
      id: `acc-${Date.now()}`,
      hotelName: '',
      city: formData.city,
      numberOfNights: getTripNights(),
      roomTypes: [
        { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 }
      ],
      currency: tripCurrency,
      breakfastIncluded: false,
      roomAllocation: {
        boysRooms: 0,
        girlsRooms: 0,
        maleFacultyRooms: 0,
        femaleFacultyRooms: 0,
        maleVXplorerRooms: 0,
        femaleVXplorerRooms: 0,
        totalRooms: 0,
      },
      totalRooms: 0,
      totalCost: 0,
      totalCostINR: 0,
    };

    setAccommodations([...accommodations, newAccommodation]);
  };

  useEffect(() => {
    if (accommodations.length > 0) {
      const updated = [...accommodations];
      accommodations.forEach((_, index) => {
        recalculateAccommodationRooms(updated, index);
      });
      setAccommodations(updated);
    }
  }, [formData.boys, formData.girls, formData.maleFaculty, formData.femaleFaculty, formData.maleVXplorers, formData.femaleVXplorers]);

  // Add this useEffect to recalculate flight and train costs when participants change
  useEffect(() => {
    const totalParticipants = calculateTotalParticipants();

    // Recalculate all flight costs
    if (flights.length > 0) {
      const updatedFlights = flights.map(flight => {
        const rate = getCurrencyRate(flight.currency);
        return {
          ...flight,
          totalCost: flight.costPerPerson * totalParticipants,
          totalCostINR: flight.costPerPerson * totalParticipants * rate,
        };
      });
      setFlights(updatedFlights);
    }

    // Recalculate all train costs
    if (trains.length > 0) {
      const updatedTrains = trains.map(train => {
        const rate = getCurrencyRate(train.currency);
        return {
          ...train,
          totalCost: train.costPerPerson * totalParticipants,
          totalCostINR: train.costPerPerson * totalParticipants * rate,
        };
      });
      setTrains(updatedTrains);
    }

    // Recalculate all activity costs
    if (activities.length > 0) {
      const updatedActivities = activities.map(activity => {
        const rate = getCurrencyRate(activity.currency);
        return {
          ...activity,
          totalCost: (activity.entryCost * totalParticipants) + activity.transportCost + activity.guideCost,
          totalCostINR: ((activity.entryCost * totalParticipants) + activity.transportCost + activity.guideCost) * rate,
        };
      });
      setActivities(updatedActivities);
    }
  }, [formData.boys, formData.girls, formData.maleFaculty, formData.femaleFaculty, formData.maleVXplorers, formData.femaleVXplorers]);

  const addActivity = () => {
    setActivities([...activities, {
      id: `temp-${Date.now()}`,
      name: '',
      entryCost: 0,
      transportCost: 0,
      guideCost: 0,
      currency: tripCurrency,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const addOverhead = () => {
    setOverheads([...overheads, {
      id: `temp-${Date.now()}`,
      name: '',
      amount: 0,
      currency: 'INR',
      hideFromClient: false,
      totalCostINR: 0,
    }]);
  };

  // Update items
  const updateFlight = (index: number, field: keyof Flight, value: any) => {
    const updated = [...flights];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totals
    if (['costPerPerson', 'currency'].includes(field)) {
      const totalParticipants = calculateTotalParticipants();
      const rate = getCurrencyRate(updated[index].currency);
      updated[index].totalCost = updated[index].costPerPerson * totalParticipants;
      updated[index].totalCostINR = updated[index].totalCost * rate;
    }

    setFlights(updated);
  };

  const updateBus = (index: number, field: keyof BusType, value: any) => {
    const updated = [...buses];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totals
    if (['costPerBus', 'numberOfDays', 'quantity', 'currency'].includes(field)) {
      const rate = getCurrencyRate(updated[index].currency);
      updated[index].totalCost = updated[index].costPerBus * updated[index].numberOfDays * updated[index].quantity;
      updated[index].totalCostINR = updated[index].totalCost * rate;
    }

    setBuses(updated);
  };

  const updateTrain = (index: number, field: keyof TrainType, value: any) => {
    const updated = [...trains];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totals
    if (['costPerPerson', 'currency'].includes(field)) {
      const totalParticipants = calculateTotalParticipants();
      const rate = getCurrencyRate(updated[index].currency);
      updated[index].totalCost = updated[index].costPerPerson * totalParticipants;
      updated[index].totalCostINR = updated[index].totalCost * rate;
    }

    setTrains(updated);
  };

  const updateAccommodation = (index: number, field: string, value: any) => {
    const updated = [...accommodations];

    if (field === 'roomTypes') {
      updated[index].roomTypes = value;
      // Auto-recalculate rooms and costs
      recalculateAccommodationRooms(updated, index);
    } else {
      (updated[index] as any)[field] = value;

      // Recalculate if nights or currency changes
      if (field === 'numberOfNights' || field === 'currency') {
        recalculateAccommodationRooms(updated, index);
      }
    }

    setAccommodations(updated);
  };

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totals
    if (['entryCost', 'transportCost', 'guideCost', 'currency'].includes(field)) {
      const totalParticipants = calculateTotalParticipants();
      const rate = getCurrencyRate(updated[index].currency);
      updated[index].totalCost = (updated[index].entryCost * totalParticipants) + updated[index].transportCost + updated[index].guideCost;
      updated[index].totalCostINR = updated[index].totalCost * rate;
    }

    setActivities(updated);
  };

  const updateOverhead = (index: number, field: keyof Overhead, value: any) => {
    const updated = [...overheads];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totals
    if (['amount', 'currency'].includes(field)) {
      const rate = getCurrencyRate(updated[index].currency);
      updated[index].totalCostINR = updated[index].amount * rate;
    }

    setOverheads(updated);
  };

  // Delete items
  const deleteFlight = (index: number) => setFlights(flights.filter((_, i) => i !== index));
  const deleteBus = (index: number) => setBuses(buses.filter((_, i) => i !== index));
  const deleteTrain = (index: number) => setTrains(trains.filter((_, i) => i !== index));
  const deleteAccommodation = (index: number) => setAccommodations(accommodations.filter((_, i) => i !== index));
  const deleteActivity = (index: number) => setActivities(activities.filter((_, i) => i !== index));
  const deleteOverhead = (index: number) => setOverheads(overheads.filter((_, i) => i !== index));

  // Calculate totals
  const calculateTotals = () => {
    const totalParticipants = calculateTotalParticipants();
    const totalDays = getTripDays();

    const transportTotal =
      flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
      buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
      trains.reduce((sum, t) => sum + t.totalCostINR, 0);

    const accommodationTotal = accommodations.reduce((sum, a) => sum + a.totalCostINR, 0);

    const mealsCostPerDay = (meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * totalParticipants;
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
          breakfastCostPerPerson: meals.breakfastCostPerPerson,
          lunchCostPerPerson: meals.lunchCostPerPerson,
          dinnerCostPerPerson: meals.dinnerCostPerPerson,
          currency: tripCurrency,
          totalDays,
          totalParticipants,
          dailyCostPerPerson: meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson,
          totalCost: (meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * totalParticipants * totalDays,
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

  if (isLoadingMasterData || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              {isLoadingMasterData ? 'Loading countries and currencies...' : 'Loading trip data...'}
            </p>
          </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trip Name *</Label>
                <Input
                  placeholder="Singapore Education Tour 2024"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) => {
                    setFormData({ ...formData, country: v, city: '' });
                  }}
                  disabled={isLoadingMasterData}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={isLoadingMasterData ? "Loading countries..." : "Select country"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                  disabled={!formData.country || isLoadingMasterData}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={
                      !formData.country
                        ? "Select country first"
                        : isLoadingMasterData
                          ? "Loading cities..."
                          : "Select city"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {filteredCities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-semibold">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Duration: {getTripDays()} days / {getTripNights()} nights
                </p>
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Boys</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.boys || ''}
                  onChange={(e) => setFormData({ ...formData, boys: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Girls</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.girls || ''}
                  onChange={(e) => setFormData({ ...formData, girls: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Total Students</Label>
                <Input value={calculateTotalStudents()} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Male Faculty</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.maleFaculty || ''}
                  onChange={(e) => setFormData({ ...formData, maleFaculty: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Female Faculty</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.femaleFaculty || ''}
                  onChange={(e) => setFormData({ ...formData, femaleFaculty: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Total Faculty</Label>
                <Input value={calculateTotalFaculty()} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Male VXplorers</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.maleVXplorers || ''}
                  onChange={(e) => setFormData({ ...formData, maleVXplorers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Female VXplorers</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.femaleVXplorers || ''}
                  onChange={(e) => setFormData({ ...formData, femaleVXplorers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Total VXplorers</Label>
                <Input value={calculateTotalVXplorers()} disabled className="bg-muted" />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-bold text-primary">
                  Total Participants: {calculateTotalParticipants()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport - Flights */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-primary" />
                Flights
              </div>
              <Button onClick={addFlight} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Flight
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {flights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No flights added yet. Click "Add Flight" to begin.</p>
            ) : (
              flights.map((flight, index) => (
                <div key={flight.id} className="p-4 border rounded-lg space-y-4 relative bg-card">
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteFlight(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>From</Label>
                      <Input
                        placeholder="Mumbai"
                        value={flight.from}
                        onChange={(e) => updateFlight(index, 'from', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To</Label>
                      <Input
                        placeholder="Singapore"
                        value={flight.to}
                        onChange={(e) => updateFlight(index, 'to', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Airline</Label>
                      <Input
                        placeholder="Singapore Airlines"
                        value={flight.airline}
                        onChange={(e) => updateFlight(index, 'airline', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Flight Number</Label>
                      <Input
                        placeholder="SQ406"
                        value={flight.flightNumber}
                        onChange={(e) => updateFlight(index, 'flightNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Departure</Label>
                      <Input
                        type="datetime-local"
                        value={flight.departureTime}
                        onChange={(e) => updateFlight(index, 'departureTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Arrival</Label>
                      <Input
                        type="datetime-local"
                        value={flight.arrivalTime}
                        onChange={(e) => updateFlight(index, 'arrivalTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost/Person ({flight.currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={flight.costPerPerson || ''}
                        onChange={(e) => updateFlight(index, 'costPerPerson', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Additional flight details..."
                      value={flight.description}
                      onChange={(e) => updateFlight(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-primary">
                      Total: {formatCurrency(flight.totalCostINR, 'INR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transport - Buses */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-primary" />
                Buses
              </div>
              <Button onClick={addBus} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Bus
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {buses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No buses added yet. Click "Add Bus" to begin.</p>
            ) : (
              buses.map((bus, index) => (
                <div key={bus.id} className="p-4 border rounded-lg space-y-4 relative bg-card">
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBus(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Bus Name/Type</Label>
                      <Input
                        placeholder="Volvo AC Coach"
                        value={bus.name}
                        onChange={(e) => updateBus(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Seating Capacity</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={bus.seatingCapacity || ''}
                        onChange={(e) => updateBus(index, 'seatingCapacity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost/Bus ({bus.currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={bus.costPerBus || ''}
                        onChange={(e) => updateBus(index, 'costPerBus', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Days</Label>
                      <Input
                        type="number"
                        placeholder="6"
                        value={bus.numberOfDays || ''}
                        onChange={(e) => updateBus(index, 'numberOfDays', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity (No. of Buses)</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={bus.quantity || ''}
                        onChange={(e) => updateBus(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Additional bus details..."
                      value={bus.description}
                      onChange={(e) => updateBus(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-primary">
                      Total: {formatCurrency(bus.totalCostINR, 'INR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transport - Trains */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Train className="w-5 h-5 text-primary" />
                Trains
              </div>
              <Button onClick={addTrain} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Train
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {trains.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No trains added yet. Click "Add Train" to begin.</p>
            ) : (
              trains.map((train, index) => (
                <div key={train.id} className="p-4 border rounded-lg space-y-4 relative bg-card">
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTrain(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Train Name</Label>
                      <Input
                        placeholder="Rajdhani Express"
                        value={train.name}
                        onChange={(e) => updateTrain(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Train Number</Label>
                      <Input
                        placeholder="12301"
                        value={train.trainNumber}
                        onChange={(e) => updateTrain(index, 'trainNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Input
                        placeholder="AC 2-Tier"
                        value={train.class}
                        onChange={(e) => updateTrain(index, 'class', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timing</Label>
                      <Input
                        placeholder="10:00 AM"
                        value={train.timing}
                        onChange={(e) => updateTrain(index, 'timing', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cost/Person ({train.currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={train.costPerPerson || ''}
                        onChange={(e) => updateTrain(index, 'costPerPerson', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Additional details..."
                        value={train.description}
                        onChange={(e) => updateTrain(index, 'description', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-primary">
                      Total: {formatCurrency(train.totalCostINR, 'INR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Accommodation */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hotel className="w-5 h-5 text-primary" />
                Accommodation
              </div>
              <Button onClick={addAccommodation} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Hotel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {accommodations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No accommodation added yet. Click "Add Hotel" to begin.</p>
            ) : (
              accommodations.map((accommodation, index) => (
                <div key={accommodation.id} className="p-6 border rounded-lg space-y-6 relative bg-card">
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAccommodation(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Hotel Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hotel Name</Label>
                      <Input
                        placeholder="Hotel name"
                        value={accommodation.hotelName}
                        onChange={(e) => updateAccommodation(index, 'hotelName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="City"
                        value={accommodation.city}
                        onChange={(e) => updateAccommodation(index, 'city', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nights</Label>
                      <Input
                        type="number"
                        min="1"
                        value={accommodation.numberOfNights || ''}
                        onChange={(e) => updateAccommodation(index, 'numberOfNights', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={accommodation.currency}
                        onValueChange={(v) => updateAccommodation(index, 'currency', v)}
                        disabled={isLoadingMasterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingMasterData ? "Loading..." : "Select currency"} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code} ({currency.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={accommodation.breakfastIncluded}
                          onCheckedChange={(checked) => updateAccommodation(index, 'breakfastIncluded', checked)}
                        />
                        <Label>Breakfast Included</Label>
                      </div>
                    </div>
                  </div>

                  {/* Room Type Configuration */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Room Types Configuration</Label>
                      <div className="flex gap-2">
                        <Select onValueChange={(v) => applyRoomTypePreset(index, v)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Apply Preset" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="Double Only">Double Only</SelectItem>
                            <SelectItem value="Triple Only">Triple Only</SelectItem>
                            <SelectItem value="Double + Triple">Double + Triple</SelectItem>
                            <SelectItem value="Single + Double">Single + Double</SelectItem>
                            <SelectItem value="All Types">All Types</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={() => addRoomType(index)} size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Room Type
                        </Button>
                      </div>
                    </div>

                    {/* Room Types List */}
                    <div className="space-y-3">
                      {accommodation.roomTypes.map((roomType, rtIndex) => (
                        <div key={rtIndex} className="grid grid-cols-4 gap-3 items-end p-3 bg-muted/50 rounded-md">
                          <div className="space-y-2">
                            <Label className="text-xs">Room Type</Label>
                            <Input
                              placeholder="e.g., Double, Triple"
                              value={roomType.roomType}
                              onChange={(e) => updateRoomType(index, rtIndex, 'roomType', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">People/Room</Label>
                            <Input
                              type="number"
                              min="1"
                              value={roomType.capacityPerRoom || ''}
                              onChange={(e) => updateRoomType(index, rtIndex, 'capacityPerRoom', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Cost/Room ({accommodation.currency})</Label>
                            <Input
                              type="number"
                              min="0"
                              value={roomType.costPerRoom || ''}
                              onChange={(e) => updateRoomType(index, rtIndex, 'costPerRoom', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRoomType(index, rtIndex)}
                            className="text-destructive"
                            disabled={accommodation.roomTypes.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-Calculated Room Allocation Display */}
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-base font-semibold">Auto-Calculated Room Allocation</Label>

                    {accommodation.roomAllocation.breakdown && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {[
                          { label: 'Boys', count: formData.boys, breakdown: accommodation.roomAllocation.breakdown.boys },
                          { label: 'Girls', count: formData.girls, breakdown: accommodation.roomAllocation.breakdown.girls },
                          { label: 'Male Faculty', count: formData.maleFaculty, breakdown: accommodation.roomAllocation.breakdown.maleFaculty },
                          { label: 'Female Faculty', count: formData.femaleFaculty, breakdown: accommodation.roomAllocation.breakdown.femaleFaculty },
                          { label: 'Male VXplorers', count: formData.maleVXplorers, breakdown: accommodation.roomAllocation.breakdown.maleVXplorers },
                          { label: 'Female VXplorers', count: formData.femaleVXplorers, breakdown: accommodation.roomAllocation.breakdown.femaleVXplorers },
                        ].map(({ label, count, breakdown }) => (
                          count > 0 && (
                            <div key={label} className="p-3 bg-muted/30 rounded-md">
                              <div className="font-medium text-muted-foreground mb-1">{label} ({count} people)</div>
                              {breakdown.map((b, i) => (
                                <div key={i} className="text-xs flex justify-between">
                                  <span>{b.numberOfRooms} × {b.roomType}</span>
                                  <span className="text-muted-foreground">({b.peopleAccommodated} people)</span>
                                </div>
                              ))}
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total Rooms:</span>
                      <span className="text-lg font-bold text-primary">{accommodation.totalRooms} rooms</span>
                    </div>
                  </div>

                  {/* Total Cost */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {accommodation.totalRooms} rooms × {accommodation.numberOfNights} nights
                      </span>
                      <span className="text-lg font-semibold text-primary">
                        {formatCurrency(accommodation.totalCostINR, 'INR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Breakfast/Person ({tripCurrency})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={meals.breakfastCostPerPerson || ''}
                  onChange={(e) => setMeals({ ...meals, breakfastCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Put 0 if included in hotel</p>
              </div>
              <div className="space-y-2">
                <Label>Lunch/Person ({tripCurrency})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={meals.lunchCostPerPerson || ''}
                  onChange={(e) => setMeals({ ...meals, lunchCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dinner/Person ({tripCurrency})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={meals.dinnerCostPerPerson || ''}
                  onChange={(e) => setMeals({ ...meals, dinnerCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {totals.totalParticipants > 0 && totals.totalDays > 0 && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Daily Cost/Person:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson,
                      tripCurrency
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Daily Cost (All {totals.totalParticipants} people):
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson) *
                      totals.totalParticipants,
                      tripCurrency
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Meals Total ({totals.totalDays} days):</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(totals.meals, 'INR')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Activities
              </div>
              <Button onClick={addActivity} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activities added yet. Click "Add Activity" to begin.</p>
            ) : (
              activities.map((activity, index) => (
                <div key={activity.id} className="p-4 border rounded-lg space-y-4 relative bg-card">
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteActivity(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Activity Name</Label>
                    <Input
                      placeholder="Universal Studios"
                      value={activity.name}
                      onChange={(e) => updateActivity(index, 'name', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Entry/Person ({activity.currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={activity.entryCost || ''}
                        onChange={(e) => updateActivity(index, 'entryCost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport ({activity.currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={activity.transportCost || ''}
                        onChange={(e) => updateActivity(index, 'transportCost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Guide ({activity.currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={activity.guideCost || ''}
                        onChange={(e) => updateActivity(index, 'guideCost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Activity details..."
                      value={activity.description}
                      onChange={(e) => updateActivity(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-primary">
                      Total: {formatCurrency(activity.totalCostINR, 'INR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Overheads */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Overheads
              </div>
              <Button onClick={addOverhead} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Overhead
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {overheads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No overheads added yet. Click "Add Overhead" to begin.</p>
            ) : (
              overheads.map((overhead, index) => (
                <div key={overhead.id} className="p-4 border rounded-lg space-y-4 relative bg-card">
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteOverhead(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="Contingency, Admin Fee, etc."
                        value={overhead.name}
                        onChange={(e) => updateOverhead(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={overhead.amount || ''}
                        onChange={(e) => updateOverhead(index, 'amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={overhead.currency}
                        onValueChange={(v) => updateOverhead(index, 'currency', v)}
                        disabled={isLoadingMasterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingMasterData ? "Loading..." : "Select currency"} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code} ({currency.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={overhead.hideFromClient}
                      onCheckedChange={(checked) => updateOverhead(index, 'hideFromClient', checked)}
                    />
                    <Label>Hide from Client</Label>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-primary">
                      Total: {formatCurrency(overhead.totalCostINR, 'INR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Transport</span>
                <span className="font-semibold">{formatCurrency(totals.transport, 'INR')}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Accommodation</span>
                <span className="font-semibold">{formatCurrency(totals.accommodation, 'INR')}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Meals</span>
                <span className="font-semibold">{formatCurrency(totals.meals, 'INR')}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Activities</span>
                <span className="font-semibold">{formatCurrency(totals.activities, 'INR')}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Overheads</span>
                <span className="font-semibold">{formatCurrency(totals.overheads, 'INR')}</span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totals.grandTotal, 'INR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Cost per Student</span>
                <span className="text-xl font-semibold text-primary">
                  {formatCurrency(totals.costPerStudent, 'INR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTrip}
            disabled={isSaving}
            className="gradient-primary text-primary-foreground px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Trip' : 'Create Trip'}
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}