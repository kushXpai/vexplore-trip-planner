// src/pages/CreateTrip.tsx - UPDATED WITH ALL NEW FEATURES
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
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
  formatCurrency as formatCurrencyHelper,
  calculateGrandTotal
} from '@/services/masterDataService';
import {
  Plane, Bus, Train, Hotel, Utensils, Ticket, Calculator, Shield, Info, Plus, Trash2,
  Loader2, Users, Calendar, MapPin, Save, Globe, Building2, IdCard, Heart, BadgePercent
} from 'lucide-react';
import {
  Flight, Bus as BusType, Train as TrainType, Accommodation, Activity, Overhead,
  TripCategory, TripType, TripExtras, RoomPreferences
} from '@/types/trip';
import { toast } from 'sonner';
import { createTrip, updateTrip, getTripById } from '@/services/tripService';
import {
  autoAllocateRooms,
  calculateAccommodationCost,
  validateRoomAllocation,
  getRoomTypePresets,
  getDefaultRoomPreferences
} from '@/utils/roomAllocation';
import { RoomTypeConfig } from '@/types/trip';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // NEW: Trip classification state
  const [tripCategory, setTripCategory] = useState<TripCategory>('domestic');
  const [tripType, setTripType] = useState<TripType>('institute');

  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    country: '',
    cities: [] as string[], // CHANGED: Multi-city array
    startDate: '',
    endDate: '',

    // Institute trip participants
    boys: 0,
    girls: 0,
    maleFaculty: 0,
    femaleFaculty: 0,
    maleVXplorers: 0,
    femaleVXplorers: 0,

    // Commercial trip participants
    maleCount: 0,
    femaleCount: 0,
    otherCount: 0,
    commercialMaleVXplorers: 0,  // NEW
    commercialFemaleVXplorers: 0,  // NEW
  });

  const [flights, setFlights] = useState<Flight[]>([]);
  const [buses, setBuses] = useState<BusType[]>([]);
  const [trains, setTrains] = useState<TrainType[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [meals, setMeals] = useState({
    breakfastCostPerPerson: 0,
    lunchCostPerPerson: 0,
    dinnerCostPerPerson: 0,
    currency: 'INR'
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [overheads, setOverheads] = useState<Overhead[]>([]);
  const [profit, setProfit] = useState(0);

  // NEW: Extras state
  const [extras, setExtras] = useState<TripExtras>({
    visaCostPerPerson: 0,
    visaCurrency: 'INR',
    visaTotalCost: 0,
    visaTotalCostINR: 0,
    tipsCostPerPerson: 0,
    tipsCurrency: 'INR',
    tipsTotalCost: 0,
    tipsTotalCostINR: 0,
    insuranceCostPerPerson: 0,
    insuranceCurrency: 'INR',
    insuranceTotalCost: 0,
    insuranceTotalCostINR: 0,
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  // NEW: Cost optimization toggle state
  const [optimizeRoomsByCost, setOptimizeRoomsByCost] = useState(false);

  // NEW: Multi-city selection state
  const [selectedCityForAdd, setSelectedCityForAdd] = useState('');

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

  // NEW: Auto-calculate extras totals
  useEffect(() => {
    const totalParticipants = calculateTotalParticipants();

    setExtras(prev => ({
      ...prev,
      visaTotalCost: prev.visaCostPerPerson * totalParticipants,
      visaTotalCostINR: prev.visaCostPerPerson * totalParticipants * getCurrencyRate(prev.visaCurrency),
      tipsTotalCost: prev.tipsCostPerPerson * totalParticipants,
      tipsTotalCostINR: prev.tipsCostPerPerson * totalParticipants * getCurrencyRate(prev.tipsCurrency),
      insuranceTotalCost: prev.insuranceCostPerPerson * totalParticipants,
      insuranceTotalCostINR: prev.insuranceCostPerPerson * totalParticipants * getCurrencyRate(prev.insuranceCurrency),
    }));
  }, [
    formData.boys, formData.girls, formData.maleFaculty, formData.femaleFaculty,
    formData.maleVXplorers, formData.femaleVXplorers,
    formData.maleCount, formData.femaleCount, formData.otherCount,
    extras.visaCostPerPerson, extras.tipsCostPerPerson, extras.insuranceCostPerPerson,
    extras.visaCurrency, extras.tipsCurrency, extras.insuranceCurrency
  ]);

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
          meals: dbMeals,
          extras: dbExtras
        } = result.data;

        // NEW: Set trip category and type
        setTripCategory(trip.trip_category);
        setTripType(trip.trip_type);

        const country = countries.find(c => c.name === trip.country);

        // NEW: Handle multi-city array
        const cityNames = Array.isArray(trip.cities) ? trip.cities : [trip.cities];

        setFormData({
          name: trip.name,
          institution: trip.institution,
          country: trip.country,
          cities: trip.cities || [],
          startDate: trip.start_date,
          endDate: trip.end_date,
          boys: participants?.boys || 0,
          girls: participants?.girls || 0,
          maleFaculty: participants?.male_faculty || 0,
          femaleFaculty: participants?.female_faculty || 0,
          maleVXplorers: participants?.male_vxplorers || 0,
          femaleVXplorers: participants?.female_vxplorers || 0,
          maleCount: participants?.male_count || 0,
          femaleCount: participants?.female_count || 0,
          otherCount: participants?.other_count || 0,
          commercialMaleVXplorers: participants?.commercial_male_vxplorers || 0,  // NEW
          commercialFemaleVXplorers: participants?.commercial_female_vxplorers || 0,  // NEW
        });

        // NEW: Load profit from trip
        setProfit(trip.profit || 0);

        // Load extras if available
        if (dbExtras) {
          setExtras({
            visaCostPerPerson: dbExtras.visa_cost_per_person,
            visaCurrency: dbExtras.visa_currency,
            visaTotalCost: dbExtras.visa_total_cost,
            visaTotalCostINR: dbExtras.visa_total_cost_inr,
            tipsCostPerPerson: dbExtras.tips_cost_per_person,
            tipsCurrency: dbExtras.tips_currency,
            tipsTotalCost: dbExtras.tips_total_cost,
            tipsTotalCostINR: dbExtras.tips_total_cost_inr,
            insuranceCostPerPerson: dbExtras.insurance_cost_per_person,
            insuranceCurrency: dbExtras.insurance_currency,
            insuranceTotalCost: dbExtras.insurance_total_cost,
            insuranceTotalCostINR: dbExtras.insurance_total_cost_inr,
          });
        }

        // Map flights
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

        // Map buses
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

        // Map trains
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

        // Map accommodations
        setAccommodations(dbAccommodations.map(a => ({
          id: a.id!,
          hotelName: a.hotel_name,
          city: a.city,
          numberOfNights: a.number_of_nights,
          roomTypes: a.room_types || [],
          roomPreferences: a.room_preferences || getDefaultRoomPreferences(trip.trip_type),
          currency: a.currency,
          breakfastIncluded: a.breakfast_included,
          roomAllocation: a.room_allocation,
          totalRooms: a.total_rooms,
          totalCost: a.total_cost,
          totalCostINR: a.total_cost_inr,
        })));

        // Map activities
        setActivities(dbActivities.map(a => ({
          id: a.id!,
          name: a.name,
          city: a.city,
          entryCost: a.entry_cost,
          transportCost: a.transport_cost,
          guideCost: a.guide_cost,
          currency: a.currency,
          description: a.description,
          totalCost: a.total_cost,
          totalCostINR: a.total_cost_inr,
        })));

        // Map overheads
        setOverheads(dbOverheads.map(o => ({
          id: o.id!,
          name: o.name,
          amount: o.amount,
          currency: o.currency,
          hideFromClient: o.hide_from_client,
          totalCostINR: o.total_cost_inr,
        })));

        // Map meals
        if (dbMeals) {
          setMeals({
            breakfastCostPerPerson: dbMeals.breakfast_cost_per_person,
            lunchCostPerPerson: dbMeals.lunch_cost_per_person,
            dinnerCostPerPerson: dbMeals.dinner_cost_per_person,
            currency: dbMeals.currency,
          });
        }
      }
    } catch (error) {
      console.error('Error loading trip:', error);
      toast.error('Failed to load trip data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const calculateTotalStudents = () => formData.boys + formData.girls;
  const calculateTotalFaculty = () => formData.maleFaculty + formData.femaleFaculty;
  const calculateTotalVXplorers = () => formData.maleVXplorers + formData.femaleVXplorers;
  const calculateTotalCommercial = () => formData.maleCount + formData.femaleCount + formData.otherCount;

  const calculateTotalParticipants = () => {
    if (tripType === 'institute') {
      const totalStudents = formData.boys + formData.girls;
      const totalFaculty = formData.maleFaculty + formData.femaleFaculty;
      const totalVXplorers = formData.maleVXplorers + formData.femaleVXplorers;
      return totalStudents + totalFaculty + totalVXplorers;
    } else {
      // Commercial trip
      const totalCommercial = formData.maleCount + formData.femaleCount + formData.otherCount;
      const totalVXplorers = formData.commercialMaleVXplorers + formData.commercialFemaleVXplorers;
      return totalCommercial + totalVXplorers;
    }
  };

  const getCurrencyRate = (code: string): number => {
    return getCurrencyRateHelper(currencies, code);
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    return formatCurrencyHelper(currencies, amount, currencyCode);
  };

  const getCountryCurrency = (countryId: string): string => {
    return getCountryCurrencyHelper(countries, countryId);
  };

  const calculateTripDuration = () => {
    if (!formData.startDate || !formData.endDate) return { days: 0, nights: 0 };
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { days, nights: Math.max(0, days - 1) };
  };

  const calculateTripDays = () => {
    const { days } = calculateTripDuration();
    return days;
  };

  const calculateMealsCost = () => {
    const totalParticipants = calculateTotalParticipants();
    const days = calculateTripDays();
    const dailyCostPerPerson = meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson;
    const totalCost = dailyCostPerPerson * days * totalParticipants;
    const totalCostINR = totalCost * getCurrencyRate(meals.currency);

    return {
      dailyCostPerPerson,
      totalCost,
      totalCostINR,
    };
  };

  // NEW: Multi-city functions
  const addCity = () => {
    if (selectedCityForAdd && !formData.cities.includes(selectedCityForAdd)) {
      setFormData(prev => ({
        ...prev,
        cities: [...prev.cities, selectedCityForAdd]
      }));
      setSelectedCityForAdd('');
    }
  };

  const removeCity = (cityName: string) => {
    setFormData(prev => ({
      ...prev,
      cities: prev.cities.filter(c => c !== cityName)
    }));
  };

  // Transport functions
  const addFlight = () => {
    const defaultCurrency = getCountryCurrency(formData.country) || 'INR';
    setFlights([...flights, {
      id: `flight-${Date.now()}`,
      from: '',
      to: '',
      airline: '',
      flightNumber: '',
      departureTime: '',
      arrivalTime: '',
      costPerPerson: 0,
      currency: defaultCurrency,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const updateFlight = (index: number, field: keyof Flight, value: any) => {
    const updated = [...flights];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'costPerPerson' || field === 'currency') {
      const totalParticipants = calculateTotalParticipants();
      const cost = field === 'costPerPerson' ? value : updated[index].costPerPerson;
      const currency = field === 'currency' ? value : updated[index].currency;

      updated[index].totalCost = cost * totalParticipants;
      updated[index].totalCostINR = cost * totalParticipants * getCurrencyRate(currency);
    }

    setFlights(updated);
  };

  const deleteFlight = (index: number) => {
    setFlights(flights.filter((_, i) => i !== index));
  };

  const addBus = () => {
    const defaultCurrency = getCountryCurrency(formData.country) || 'INR';
    setBuses([...buses, {
      id: `bus-${Date.now()}`,
      name: '',
      seatingCapacity: 0,
      costPerBus: 0,
      currency: defaultCurrency,
      numberOfDays: 1,
      quantity: 1,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const updateBus = (index: number, field: keyof BusType, value: any) => {
    const updated = [...buses];
    updated[index] = { ...updated[index], [field]: value };

    if (['costPerBus', 'numberOfDays', 'quantity', 'currency'].includes(field)) {
      const cost = field === 'costPerBus' ? value : updated[index].costPerBus;
      const days = field === 'numberOfDays' ? value : updated[index].numberOfDays;
      const qty = field === 'quantity' ? value : updated[index].quantity;
      const currency = field === 'currency' ? value : updated[index].currency;

      updated[index].totalCost = cost * days * qty;
      updated[index].totalCostINR = cost * days * qty * getCurrencyRate(currency);
    }

    setBuses(updated);
  };

  const deleteBus = (index: number) => {
    setBuses(buses.filter((_, i) => i !== index));
  };

  const addTrain = () => {
    const defaultCurrency = getCountryCurrency(formData.country) || 'INR';
    setTrains([...trains, {
      id: `train-${Date.now()}`,
      name: '',
      trainNumber: '',
      class: '',
      timing: '',
      costPerPerson: 0,
      currency: defaultCurrency,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const updateTrain = (index: number, field: keyof TrainType, value: any) => {
    const updated = [...trains];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'costPerPerson' || field === 'currency') {
      const totalParticipants = calculateTotalParticipants();
      const cost = field === 'costPerPerson' ? value : updated[index].costPerPerson;
      const currency = field === 'currency' ? value : updated[index].currency;

      updated[index].totalCost = cost * totalParticipants;
      updated[index].totalCostINR = cost * totalParticipants * getCurrencyRate(currency);
    }

    setTrains(updated);
  };

  const deleteTrain = (index: number) => {
    setTrains(trains.filter((_, i) => i !== index));
  };

  // Accommodation functions
  const addAccommodation = () => {
    const defaultCurrency = getCountryCurrency(formData.country) || 'INR';
    const firstCity = formData.cities[0] || '';

    setAccommodations([...accommodations, {
      id: `acc-${Date.now()}`,
      hotelName: '',
      city: firstCity,
      numberOfNights: 1,
      roomTypes: [],
      roomPreferences: getDefaultRoomPreferences(tripType),
      currency: defaultCurrency,
      breakfastIncluded: false,
      roomAllocation: {
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
      totalRooms: 0,
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const updateAccommodation = (index: number, field: keyof Accommodation, value: any) => {
    const updated = [...accommodations];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-allocate rooms when room types or preferences change
    if (field === 'roomTypes' || field === 'roomPreferences') {
      if (updated[index].roomTypes.length > 0) {
        try {
          const participants = {
            boys: formData.boys,
            girls: formData.girls,
            maleFaculty: formData.maleFaculty,
            femaleFaculty: formData.femaleFaculty,
            maleVXplorers: formData.maleVXplorers,
            femaleVXplorers: formData.femaleVXplorers,
            maleCount: formData.maleCount,
            femaleCount: formData.femaleCount,
            otherCount: formData.otherCount,
            commercialMaleVXplorers: formData.commercialMaleVXplorers,
            commercialFemaleVXplorers: formData.commercialFemaleVXplorers,
            totalStudents: calculateTotalStudents(),
            totalFaculty: calculateTotalFaculty(),
            totalVXplorers: calculateTotalVXplorers(),
            totalCommercial: calculateTotalCommercial(),
            totalParticipants: calculateTotalParticipants(),
          };

          const allocation = autoAllocateRooms(
            participants,
            updated[index].roomTypes,
            updated[index].roomPreferences,
            tripType
          );

          updated[index].roomAllocation = allocation;
          updated[index].totalRooms = allocation.totalRooms;

          const costs = calculateAccommodationCost(
            allocation,
            updated[index].numberOfNights,
            getCurrencyRate(updated[index].currency)
          );

          updated[index].totalCost = costs.totalCost;
          updated[index].totalCostINR = costs.totalCostINR;
        } catch (error: any) {
          toast.error(error.message);
        }
      }
    }

    // Recalculate costs when nights or currency change
    if (field === 'numberOfNights' || field === 'currency') {
      if (updated[index].roomAllocation.totalRooms > 0) {
        const costs = calculateAccommodationCost(
          updated[index].roomAllocation,
          updated[index].numberOfNights,
          getCurrencyRate(updated[index].currency)
        );
        updated[index].totalCost = costs.totalCost;
        updated[index].totalCostINR = costs.totalCostINR;
      }
    }

    setAccommodations(updated);
  };

  const deleteAccommodation = (index: number) => {
    setAccommodations(accommodations.filter((_, i) => i !== index));
  };

  const applyRoomPreset = (accIndex: number, presetName: string) => {
    const presets = getRoomTypePresets();
    const preset = presets[presetName];
    if (preset) {
      updateAccommodation(accIndex, 'roomTypes', preset);
    }
  };

  const autoAllocateAccommodationRooms = (accIndex: number) => {
    const accommodation = accommodations[accIndex];
    if (accommodation.roomTypes.length === 0) {
      toast.error('Please add room types first');
      return;
    }

    try {
      const participants = {
        boys: formData.boys,
        girls: formData.girls,
        maleFaculty: formData.maleFaculty,
        femaleFaculty: formData.femaleFaculty,
        maleVXplorers: formData.maleVXplorers,
        femaleVXplorers: formData.femaleVXplorers,
        maleCount: formData.maleCount,
        femaleCount: formData.femaleCount,
        otherCount: formData.otherCount,
        commercialMaleVXplorers: formData.commercialMaleVXplorers,
        commercialFemaleVXplorers: formData.commercialFemaleVXplorers,
        totalStudents: calculateTotalStudents(),
        totalFaculty: calculateTotalFaculty(),
        totalVXplorers: calculateTotalVXplorers(),
        totalCommercial: calculateTotalCommercial(),
        totalParticipants: calculateTotalParticipants(),
      };

      const allocation = autoAllocateRooms(
        participants,
        accommodation.roomTypes,
        accommodation.roomPreferences,
        tripType,
        optimizeRoomsByCost  // NEW: Pass the cost optimization flag
      );

      const costs = calculateAccommodationCost(
        allocation,
        accommodation.numberOfNights,
        getCurrencyRate(accommodation.currency)
      );

      const updated = [...accommodations];
      updated[accIndex].roomAllocation = allocation;
      updated[accIndex].totalRooms = allocation.totalRooms;
      updated[accIndex].totalCost = costs.totalCost;
      updated[accIndex].totalCostINR = costs.totalCostINR;
      setAccommodations(updated);

      toast.success('Rooms allocated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Activity functions
  const addActivity = () => {
    const defaultCurrency = getCountryCurrency(formData.country) || 'INR';
    setActivities([...activities, {
      id: `activity-${Date.now()}`,
      name: '',
      city: formData.cities[0] || undefined,
      entryCost: 0,
      transportCost: 0,
      guideCost: 0,
      currency: defaultCurrency,
      description: '',
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [field]: value };

    if (['entryCost', 'transportCost', 'guideCost', 'currency'].includes(field)) {
      const totalParticipants = calculateTotalParticipants();
      const entry = field === 'entryCost' ? value : updated[index].entryCost;
      const transport = field === 'transportCost' ? value : updated[index].transportCost;
      const guide = field === 'guideCost' ? value : updated[index].guideCost;
      const currency = field === 'currency' ? value : updated[index].currency;

      const cost = (entry + transport + guide) * totalParticipants;
      updated[index].totalCost = cost;
      updated[index].totalCostINR = cost * getCurrencyRate(currency);
    }

    setActivities(updated);
  };

  const deleteActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  // Overhead functions
  const addOverhead = () => {
    const defaultCurrency = getCountryCurrency(formData.country) || 'INR';
    setOverheads([...overheads, {
      id: `overhead-${Date.now()}`,
      name: '',
      amount: 0,
      currency: defaultCurrency,
      hideFromClient: false,
      totalCostINR: 0,
    }]);
  };

  const updateOverhead = (index: number, field: keyof Overhead, value: any) => {
    const updated = [...overheads];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'amount' || field === 'currency') {
      const amount = field === 'amount' ? value : updated[index].amount;
      const currency = field === 'currency' ? value : updated[index].currency;
      updated[index].totalCostINR = amount * getCurrencyRate(currency);
    }

    setOverheads(updated);
  };

  const deleteOverhead = (index: number) => {
    setOverheads(overheads.filter((_, i) => i !== index));
  };

  // Calculate totals with GST and TCS
  const calculateTotals = () => {
    const transportTotal =
      flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
      buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
      trains.reduce((sum, t) => sum + t.totalCostINR, 0);

    const accommodationTotal = accommodations.reduce((sum, a) => sum + a.totalCostINR, 0);

    const totalParticipants = calculateTotalParticipants();
    const { days } = calculateTripDuration();
    const mealsCostPerDay = meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson;
    const mealsTotal = mealsCostPerDay * days * totalParticipants * getCurrencyRate(meals.currency);

    const activitiesTotal = activities.reduce((sum, a) => sum + a.totalCostINR, 0);
    const overheadsTotal = overheads.reduce((sum, o) => sum + o.totalCostINR, 0);

    // NEW: Add extras total
    const extrasTotal = extras.visaTotalCostINR + extras.tipsTotalCostINR + extras.insuranceTotalCostINR;

    const subtotal = transportTotal + accommodationTotal + mealsTotal + activitiesTotal + overheadsTotal + extrasTotal;

    // Calculate GST and TCS
    const taxCalc = calculateGrandTotal(subtotal, profit, tripCategory === 'international', 5, 5);

    return {
      transport: transportTotal,
      accommodation: accommodationTotal,
      meals: mealsTotal,
      activities: activitiesTotal,
      overheads: overheadsTotal,
      extras: extrasTotal,
      subtotalBeforeTax: taxCalc.subtotal,
      profit: taxCalc.profit,
      adminSubtotal: taxCalc.adminSubtotal,
      gstAmount: taxCalc.gstAmount,
      tcsAmount: taxCalc.tcsAmount,
      grandTotal: taxCalc.grandTotal,
      costPerParticipant: (() => {
        if (tripType === 'institute') {
          // For institute: divide by students only (boys + girls)
          const studentCount = formData.boys + formData.girls;
          return studentCount > 0 ? taxCalc.grandTotal / studentCount : 0;
        } else {
          // For commercial: divide by participants only (male + female + other, NOT VXplorers)
          const participantCount = formData.maleCount + formData.femaleCount + formData.otherCount;
          return participantCount > 0 ? taxCalc.grandTotal / participantCount : 0;
        }
      })(),
    };
  };

  const totals = calculateTotals();

  // Save trip
  const handleSaveTrip = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter trip name');
      return;
    }
    if (!formData.institution.trim()) {
      toast.error('Please enter institution name');
      return;
    }
    if (!formData.country) {
      toast.error('Please select a country');
      return;
    }
    if (formData.cities.length === 0) {
      toast.error('Please add at least one city');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    if (calculateTotalParticipants() === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    setIsSaving(true);

    try {
      const { days, nights } = calculateTripDuration();
      const totalParticipants = calculateTotalParticipants();
      const selectedCountry = countries.find(c => c.id === formData.country);

      // Get city names from IDs
      const cityNames = formData.cities;

      const tripData = {
        name: formData.name,
        institution: formData.institution,
        tripCategory,
        tripType,
        country: selectedCountry?.name || '',
        cities: cityNames,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: days,
        totalNights: nights,
        defaultCurrency: getCountryCurrency(formData.country) || 'INR',

        participants: {
          boys: formData.boys,
          girls: formData.girls,
          maleFaculty: formData.maleFaculty,
          femaleFaculty: formData.femaleFaculty,
          maleVXplorers: formData.maleVXplorers,
          femaleVXplorers: formData.femaleVXplorers,
          maleCount: formData.maleCount,
          femaleCount: formData.femaleCount,
          otherCount: formData.otherCount,
          commercialMaleVXplorers: formData.commercialMaleVXplorers,  // NEW
          commercialFemaleVXplorers: formData.commercialFemaleVXplorers,  // NEW
          totalStudents: calculateTotalStudents(),
          totalFaculty: calculateTotalFaculty(),
          totalVXplorers: formData.maleVXplorers + formData.femaleVXplorers + formData.commercialMaleVXplorers + formData.commercialFemaleVXplorers,  // UPDATED
          totalCommercial: calculateTotalCommercial(),
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
          currency: meals.currency,
          totalDays: days,
          totalParticipants,
          dailyCostPerPerson: meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson,
          totalCost: (meals.breakfastCostPerPerson + meals.lunchCostPerPerson + meals.dinnerCostPerPerson) * days * totalParticipants,
          totalCostINR: totals.meals,
        },

        activities,
        overheads,

        // NEW: Include extras only if applicable
        extras: (tripCategory === 'international' || extras.insuranceCostPerPerson > 0) ? extras : undefined,

        subtotalBeforeTax: totals.subtotalBeforeTax,
        profit: profit,
        gstPercentage: 5,
        gstAmount: totals.gstAmount,
        tcsPercentage: 5,
        tcsAmount: totals.tcsAmount,
        grandTotal: totals.grandTotal,
        grandTotalINR: totals.grandTotal,
        costPerParticipant: totals.costPerParticipant,
      };

      const result = isEditing
        ? await updateTrip(editId!, tripData)
        : await createTrip(tripData);

      if (result.success) {
        toast.success(isEditing ? 'Trip updated successfully!' : 'Trip created successfully!');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Failed to save trip');
      }
    } catch (error: any) {
      console.error('Error saving trip:', error);
      toast.error(error.message || 'An error occurred while saving the trip');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingMasterData || (isEditing && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            {isEditing ? 'Edit Trip' : 'Create New Trip'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update trip details and costs' : 'Plan a new educational trip'}
          </p>
        </div>
      </div>

      {/* STEP 1: Trip Classification (NEW) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Trip Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trip Category */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Trip Category *</Label>
            <RadioGroup
              value={tripCategory}
              onValueChange={(value) => setTripCategory(value as TripCategory)}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="domestic"
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${tripCategory === 'domestic' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <RadioGroupItem value="domestic" id="domestic" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Domestic</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Within country • GST only</p>
                </div>
              </Label>

              <Label
                htmlFor="international"
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${tripCategory === 'international' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <RadioGroupItem value="international" id="international" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="font-semibold">International</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Outside country • GST + TCS</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Trip Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Trip Type *</Label>
            <RadioGroup
              value={tripType}
              onValueChange={(value) => setTripType(value as TripType)}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="institute"
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${tripType === 'institute' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <RadioGroupItem value="institute" id="institute" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Institute Trip</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Students & Faculty</p>
                </div>
              </Label>

              <Label
                htmlFor="commercial"
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${tripType === 'commercial' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <RadioGroupItem value="commercial" id="commercial" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Commercial Trip</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">General Participants</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {tripCategory === 'international' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">International Trip - Tax Info</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>GST: 5% will be applied to the subtotal</li>
                    <li>TCS: 5% will be applied after GST</li>
                    <li>Visa, tips, and insurance fields will be available</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                placeholder="e.g., Paris Cultural Tour 2024"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Institution *</Label>
              <Input
                placeholder="e.g., St. Mary's High School"
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
                onValueChange={(value) => setFormData({ ...formData, country: value, cities: [] })}
                disabled={isLoadingMasterData}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingMasterData ? "Loading..." : "Select country"} />
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

            {/* NEW: Multi-City Selection */}
            <div className="space-y-2">
              <Label>Cities * (Multi-City Support)</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedCityForAdd}
                  onValueChange={setSelectedCityForAdd}
                  disabled={!formData.country || isLoadingMasterData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.country ? "Select country first" : "Select city"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {filteredCities.map((city) => (
                      <SelectItem key={city.id} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addCity}
                  disabled={!selectedCityForAdd}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected Cities */}
              {formData.cities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.cities.map((cityName) => (
                    <Badge key={cityName} variant="secondary" className="gap-1">
                      {cityName}
                      <button
                        type="button"
                        onClick={() => removeCity(cityName)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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
                min={formData.startDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {formData.startDate && formData.endDate && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold">
                Duration: {calculateTripDuration().days} days, {calculateTripDuration().nights} nights
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants - Different based on trip type */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tripType === 'institute' ? (
            // Institute Trip Participants
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Boys</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.boys || ''}
                    onChange={(e) => setFormData({ ...formData, boys: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Girls</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.girls || ''}
                    onChange={(e) => setFormData({ ...formData, girls: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Students</p>
                    <p className="text-lg font-bold">{calculateTotalStudents()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Male Faculty</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.maleFaculty || ''}
                    onChange={(e) => setFormData({ ...formData, maleFaculty: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Female Faculty</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.femaleFaculty || ''}
                    onChange={(e) => setFormData({ ...formData, femaleFaculty: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Faculty</p>
                    <p className="text-lg font-bold">{calculateTotalFaculty()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Male VXplorers</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.maleVXplorers || ''}
                    onChange={(e) => setFormData({ ...formData, maleVXplorers: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Female VXplorers</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.femaleVXplorers || ''}
                    onChange={(e) => setFormData({ ...formData, femaleVXplorers: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total VXplorers</p>
                    <p className="text-lg font-bold">{calculateTotalVXplorers()}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Commercial Trip Participants
            // Commercial Trip Participants
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Male Participants</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.maleCount || ''}
                    onChange={(e) => setFormData({ ...formData, maleCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Female Participants</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.femaleCount || ''}
                    onChange={(e) => setFormData({ ...formData, femaleCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Participants</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.otherCount || ''}
                    onChange={(e) => setFormData({ ...formData, otherCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Participants</p>
                    <p className="text-lg font-bold">{calculateTotalCommercial()}</p>
                  </div>
                </div>
              </div>

              {/* NEW: VXplorers for Commercial Trips */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="commercialMaleVXplorers" className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Male VXplorers
                  </Label>
                  <Input
                    id="commercialMaleVXplorers"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.commercialMaleVXplorers || ''}
                    onChange={(e) => setFormData({ ...formData, commercialMaleVXplorers: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercialFemaleVXplorers" className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Female VXplorers
                  </Label>
                  <Input
                    id="commercialFemaleVXplorers"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.commercialFemaleVXplorers || ''}
                    onChange={(e) => setFormData({ ...formData, commercialFemaleVXplorers: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total VXplorers</p>
                    <p className="text-lg font-bold">{formData.commercialMaleVXplorers + formData.commercialFemaleVXplorers}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold text-primary">{calculateTotalParticipants()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Extras Section (Visa, Tips, Insurance) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Extras (Visa, Tips, Insurance)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {tripCategory === 'international' && (
            <>
              {/* Visa */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <IdCard className="w-4 h-4" />
                  Visa (International Only)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Person</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={extras.visaCostPerPerson || ''}
                      onChange={(e) => setExtras({ ...extras, visaCostPerPerson: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={extras.visaCurrency}
                      onValueChange={(v) => setExtras({ ...extras, visaCurrency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(extras.visaTotalCostINR, 'INR')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Tips (International Only)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Person</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={extras.tipsCostPerPerson || ''}
                      onChange={(e) => setExtras({ ...extras, tipsCostPerPerson: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={extras.tipsCurrency}
                      onValueChange={(v) => setExtras({ ...extras, tipsCurrency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(extras.tipsTotalCostINR, 'INR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Insurance (Both Domestic and International) */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Insurance (Required for all trips)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost Per Person</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={extras.insuranceCostPerPerson || ''}
                  onChange={(e) => setExtras({ ...extras, insuranceCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={extras.insuranceCurrency}
                  onValueChange={(v) => setExtras({ ...extras, insuranceCurrency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-2 flex flex-col justify-end">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{formatCurrency(extras.insuranceTotalCostINR, 'INR')}</p>
                </div>
              </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      placeholder="Departure city"
                      value={flight.from}
                      onChange={(e) => updateFlight(index, 'from', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      placeholder="Arrival city"
                      value={flight.to}
                      onChange={(e) => updateFlight(index, 'to', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Airline</Label>
                    <Input
                      placeholder="e.g., Air India"
                      value={flight.airline}
                      onChange={(e) => updateFlight(index, 'airline', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Flight Number</Label>
                    <Input
                      placeholder="e.g., AI 101"
                      value={flight.flightNumber}
                      onChange={(e) => updateFlight(index, 'flightNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      type="datetime-local"
                      value={flight.departureTime}
                      onChange={(e) => updateFlight(index, 'departureTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival Time</Label>
                    <Input
                      type="datetime-local"
                      value={flight.arrivalTime}
                      onChange={(e) => updateFlight(index, 'arrivalTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Person</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={flight.costPerPerson || ''}
                      onChange={(e) => updateFlight(index, 'costPerPerson', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={flight.currency}
                      onValueChange={(v) => updateFlight(index, 'currency', v)}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bus Name/Type</Label>
                    <Input
                      placeholder="e.g., Volvo AC Sleeper"
                      value={bus.name}
                      onChange={(e) => updateBus(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Seating Capacity</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 45"
                      value={bus.seatingCapacity || ''}
                      onChange={(e) => updateBus(index, 'seatingCapacity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Bus</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={bus.costPerBus || ''}
                      onChange={(e) => updateBus(index, 'costPerBus', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={bus.currency}
                      onValueChange={(v) => updateBus(index, 'currency', v)}
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
                  <div className="space-y-2">
                    <Label>Number of Days</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={bus.numberOfDays || ''}
                      onChange={(e) => updateBus(index, 'numberOfDays', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity (Number of Buses)</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={bus.quantity || ''}
                      onChange={(e) => updateBus(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Route, timings, etc."
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Train Name</Label>
                    <Input
                      placeholder="e.g., Rajdhani Express"
                      value={train.name}
                      onChange={(e) => updateTrain(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Train Number</Label>
                    <Input
                      placeholder="e.g., 12301"
                      value={train.trainNumber}
                      onChange={(e) => updateTrain(index, 'trainNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Input
                      placeholder="e.g., 3AC, 2AC, Sleeper"
                      value={train.class}
                      onChange={(e) => updateTrain(index, 'class', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timing</Label>
                    <Input
                      placeholder="e.g., 08:00 - 14:00"
                      value={train.timing}
                      onChange={(e) => updateTrain(index, 'timing', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Person</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={train.costPerPerson || ''}
                      onChange={(e) => updateTrain(index, 'costPerPerson', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={train.currency}
                      onValueChange={(v) => updateTrain(index, 'currency', v)}
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

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Route, additional details..."
                    value={train.description}
                    onChange={(e) => updateTrain(index, 'description', e.target.value)}
                    rows={2}
                  />
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
            <p className="text-sm text-muted-foreground text-center py-8">No accommodations added yet. Click "Add Hotel" to begin.</p>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input
                      placeholder="e.g., Grand Hotel"
                      value={accommodation.hotelName}
                      onChange={(e) => updateAccommodation(index, 'hotelName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select
                      value={accommodation.city}
                      onValueChange={(v) => updateAccommodation(index, 'city', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {formData.cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Nights</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={accommodation.numberOfNights || ''}
                      onChange={(e) => updateAccommodation(index, 'numberOfNights', parseInt(e.target.value) || 0)}
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
                  <div className="space-y-2 flex items-center gap-2 pt-6">
                    <Switch
                      checked={accommodation.breakfastIncluded}
                      onCheckedChange={(checked) => updateAccommodation(index, 'breakfastIncluded', checked)}
                    />
                    <Label>Breakfast Included</Label>
                  </div>
                </div>

                {/* Room Types Configuration */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Room Types & Pricing</Label>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(preset) => {
                          const presets = getRoomTypePresets();
                          const selectedPreset = presets[preset];
                          if (selectedPreset) {
                            updateAccommodation(index, 'roomTypes', selectedPreset);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Load Preset" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {Object.keys(getRoomTypePresets()).map((presetName) => (
                            <SelectItem key={presetName} value={presetName}>
                              {presetName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newRoomTypes = [...accommodation.roomTypes, { roomType: '', capacityPerRoom: 2, costPerRoom: 0 }];
                          updateAccommodation(index, 'roomTypes', newRoomTypes);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Room Type
                      </Button>
                    </div>
                  </div>

                  {accommodation.roomTypes.map((roomType, rtIndex) => (
                    <div key={rtIndex} className="grid grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Room Type</Label>
                        <Input
                          placeholder="e.g., Double, Triple"
                          value={roomType.roomType}
                          onChange={(e) => {
                            const newRoomTypes = [...accommodation.roomTypes];
                            newRoomTypes[rtIndex] = { ...newRoomTypes[rtIndex], roomType: e.target.value };
                            updateAccommodation(index, 'roomTypes', newRoomTypes);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input
                          type="number"
                          placeholder="2"
                          value={roomType.capacityPerRoom || ''}
                          onChange={(e) => {
                            const newRoomTypes = [...accommodation.roomTypes];
                            newRoomTypes[rtIndex] = { ...newRoomTypes[rtIndex], capacityPerRoom: parseInt(e.target.value) || 0 };
                            updateAccommodation(index, 'roomTypes', newRoomTypes);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cost Per Room ({accommodation.currency})</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={roomType.costPerRoom || ''}
                          onChange={(e) => {
                            const newRoomTypes = [...accommodation.roomTypes];
                            newRoomTypes[rtIndex] = { ...newRoomTypes[rtIndex], costPerRoom: parseFloat(e.target.value) || 0 };
                            updateAccommodation(index, 'roomTypes', newRoomTypes);
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newRoomTypes = accommodation.roomTypes.filter((_, i) => i !== rtIndex);
                          updateAccommodation(index, 'roomTypes', newRoomTypes);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Room Preferences */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">Room Preferences (Priority Order)</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Select room types in order of preference. The system will allocate rooms starting with the first preference.
                  </div>

                  {tripType === 'institute' ? (
                    <>
                      {/* Students Preference */}
                      <div className="space-y-2">
                        <Label className="text-sm">Students (Boys & Girls)</Label>
                        <div className="flex flex-wrap gap-2">
                          {accommodation.roomTypes.map((rt) => (
                            <Button
                              key={rt.roomType}
                              size="sm"
                              variant={accommodation.roomPreferences?.students?.includes(rt.roomType.toLowerCase()) ? "default" : "outline"}
                              onClick={() => {
                                const currentPrefs = accommodation.roomPreferences?.students || [];
                                const newPrefs = currentPrefs.includes(rt.roomType.toLowerCase())
                                  ? currentPrefs.filter(p => p !== rt.roomType.toLowerCase())
                                  : [...currentPrefs, rt.roomType.toLowerCase()];
                                updateAccommodation(index, 'roomPreferences', {
                                  ...accommodation.roomPreferences,
                                  students: newPrefs
                                });
                              }}
                            >
                              {rt.roomType}
                              {accommodation.roomPreferences?.students?.includes(rt.roomType.toLowerCase()) && (
                                <Badge variant="secondary" className="ml-2">
                                  {accommodation.roomPreferences.students.indexOf(rt.roomType.toLowerCase()) + 1}
                                </Badge>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Faculty always gets single rooms - just show info */}
                      <div className="space-y-2">
                        <Label className="text-sm">Faculty</Label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            ✓ Faculty always get single rooms (1 person per room)
                          </p>
                        </div>
                      </div>

                      {/* NEW: VXplorers Preference */}
                      <div className="space-y-2">
                        <Label className="text-sm">VXplorers</Label>
                        <div className="flex flex-wrap gap-2">
                          {accommodation.roomTypes.map((rt) => (
                            <Button
                              key={rt.roomType}
                              size="sm"
                              variant={accommodation.roomPreferences?.vxplorers?.includes(rt.roomType.toLowerCase()) ? "default" : "outline"}
                              onClick={() => {
                                const currentPrefs = accommodation.roomPreferences?.vxplorers || [];
                                const newPrefs = currentPrefs.includes(rt.roomType.toLowerCase())
                                  ? currentPrefs.filter(p => p !== rt.roomType.toLowerCase())
                                  : [...currentPrefs, rt.roomType.toLowerCase()];
                                updateAccommodation(index, 'roomPreferences', {
                                  ...accommodation.roomPreferences,
                                  vxplorers: newPrefs
                                });
                              }}
                            >
                              {rt.roomType}
                              {accommodation.roomPreferences?.vxplorers?.includes(rt.roomType.toLowerCase()) && (
                                <Badge variant="secondary" className="ml-2">
                                  {accommodation.roomPreferences.vxplorers.indexOf(rt.roomType.toLowerCase()) + 1}
                                </Badge>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Commercial: Participants Preference */}
                      <div className="space-y-2">
                        <Label className="text-sm">Participants</Label>
                        <div className="flex flex-wrap gap-2">
                          {accommodation.roomTypes.map((rt) => (
                            <Button
                              key={rt.roomType}
                              size="sm"
                              variant={accommodation.roomPreferences?.participants?.includes(rt.roomType.toLowerCase()) ? "default" : "outline"}
                              onClick={() => {
                                const currentPrefs = accommodation.roomPreferences?.participants || [];
                                const newPrefs = currentPrefs.includes(rt.roomType.toLowerCase())
                                  ? currentPrefs.filter(p => p !== rt.roomType.toLowerCase())
                                  : [...currentPrefs, rt.roomType.toLowerCase()];
                                updateAccommodation(index, 'roomPreferences', {
                                  ...accommodation.roomPreferences,
                                  participants: newPrefs
                                });
                              }}
                            >
                              {rt.roomType}
                              {accommodation.roomPreferences?.participants?.includes(rt.roomType.toLowerCase()) && (
                                <Badge variant="secondary" className="ml-2">
                                  {accommodation.roomPreferences.participants.indexOf(rt.roomType.toLowerCase()) + 1}
                                </Badge>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* NEW: Commercial VXplorers Preference */}
                      <div className="space-y-2">
                        <Label className="text-sm">VXplorers</Label>
                        <div className="flex flex-wrap gap-2">
                          {accommodation.roomTypes.map((rt) => (
                            <Button
                              key={rt.roomType}
                              size="sm"
                              variant={accommodation.roomPreferences?.commercialVXplorers?.includes(rt.roomType.toLowerCase()) ? "default" : "outline"}
                              onClick={() => {
                                const currentPrefs = accommodation.roomPreferences?.commercialVXplorers || [];
                                const newPrefs = currentPrefs.includes(rt.roomType.toLowerCase())
                                  ? currentPrefs.filter(p => p !== rt.roomType.toLowerCase())
                                  : [...currentPrefs, rt.roomType.toLowerCase()];
                                updateAccommodation(index, 'roomPreferences', {
                                  ...accommodation.roomPreferences,
                                  commercialVXplorers: newPrefs
                                });
                              }}
                            >
                              {rt.roomType}
                              {accommodation.roomPreferences?.commercialVXplorers?.includes(rt.roomType.toLowerCase()) && (
                                <Badge variant="secondary" className="ml-2">
                                  {accommodation.roomPreferences.commercialVXplorers.indexOf(rt.roomType.toLowerCase()) + 1}
                                </Badge>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Auto-allocate button and results */}
                <div className="space-y-4 pt-4 border-t">
                  {/* Cost Optimization Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Switch
                      checked={optimizeRoomsByCost}
                      onCheckedChange={setOptimizeRoomsByCost}
                    />
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Optimize by Cost</Label>
                      <p className="text-xs text-muted-foreground">
                        {optimizeRoomsByCost 
                          ? "Finding cheapest room combination within preferences" 
                          : "Following strict preference order (greedy allocation)"}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => autoAllocateAccommodationRooms(index)}
                    variant="outline"
                    className="w-full"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Auto-Allocate Rooms
                  </Button>

                  {accommodation.roomAllocation?.breakdown && (
                    <div className="space-y-3 p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold text-sm">Room Allocation Summary</h4>

                      {tripType === 'institute' ? (
                        <>
                          {accommodation.roomAllocation.breakdown.boys.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Boys ({formData.boys} students)</p>
                              {accommodation.roomAllocation.breakdown.boys.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.girls.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Girls ({formData.girls} students)</p>
                              {accommodation.roomAllocation.breakdown.girls.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.maleFaculty.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Male Faculty ({formData.maleFaculty})</p>
                              {accommodation.roomAllocation.breakdown.maleFaculty.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} (single rooms)
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.femaleFaculty.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Female Faculty ({formData.femaleFaculty})</p>
                              {accommodation.roomAllocation.breakdown.femaleFaculty.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} (single rooms)
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.maleVXplorers.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Male VXplorers ({formData.maleVXplorers})</p>
                              {accommodation.roomAllocation.breakdown.maleVXplorers.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.femaleVXplorers.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Female VXplorers ({formData.femaleVXplorers})</p>
                              {accommodation.roomAllocation.breakdown.femaleVXplorers.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {accommodation.roomAllocation.breakdown.commercialMale.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Male Participants ({formData.maleCount})</p>
                              {accommodation.roomAllocation.breakdown.commercialMale.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.commercialFemale.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Female Participants ({formData.femaleCount})</p>
                              {accommodation.roomAllocation.breakdown.commercialFemale.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {accommodation.roomAllocation.breakdown.commercialOther.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Other Participants ({formData.otherCount})</p>
                              {accommodation.roomAllocation.breakdown.commercialOther.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {/* NEW: Commercial Male VXplorers */}
                          {accommodation.roomAllocation.breakdown.commercialMaleVXplorers && accommodation.roomAllocation.breakdown.commercialMaleVXplorers.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Male VXplorers ({formData.commercialMaleVXplorers})</p>
                              {accommodation.roomAllocation.breakdown.commercialMaleVXplorers.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}

                          {/* NEW: Commercial Female VXplorers */}
                          {accommodation.roomAllocation.breakdown.commercialFemaleVXplorers && accommodation.roomAllocation.breakdown.commercialFemaleVXplorers.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Female VXplorers ({formData.commercialFemaleVXplorers})</p>
                              {accommodation.roomAllocation.breakdown.commercialFemaleVXplorers.map((b, i) => (
                                <p key={i} className="text-xs ml-2">
                                  • {b.numberOfRooms}x {b.roomType} ({b.capacityPerRoom} per room) = {b.peopleAccommodated} people
                                </p>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      <div className="pt-2 border-t mt-3">
                        <p className="text-sm font-semibold">
                          Total Rooms: {accommodation.roomAllocation.totalRooms}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold text-primary">
                    Total Cost: {formatCurrency(accommodation.totalCostINR, 'INR')}
                  </p>
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
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Breakfast Per Person</Label>
              <Input
                type="number"
                placeholder="0"
                value={meals.breakfastCostPerPerson || ''}
                onChange={(e) => setMeals({ ...meals, breakfastCostPerPerson: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lunch Per Person</Label>
              <Input
                type="number"
                placeholder="0"
                value={meals.lunchCostPerPerson || ''}
                onChange={(e) => setMeals({ ...meals, lunchCostPerPerson: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dinner Per Person</Label>
              <Input
                type="number"
                placeholder="0"
                value={meals.dinnerCostPerPerson || ''}
                onChange={(e) => setMeals({ ...meals, dinnerCostPerPerson: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={meals.currency}
                onValueChange={(v) => setMeals({ ...meals, currency: v })}
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

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Cost Per Person</span>
              <span className="font-semibold">{formatCurrency(calculateMealsCost().dailyCostPerPerson * getCurrencyRate(meals.currency), 'INR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Days × Participants</span>
              <span className="font-semibold">{calculateTripDays()} days × {calculateTotalParticipants()} people</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-base font-semibold">Total Meals Cost</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(calculateMealsCost().totalCostINR, 'INR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Activities & Sightseeing
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Activity Name</Label>
                    <Input
                      placeholder="e.g., Eiffel Tower Visit"
                      value={activity.name}
                      onChange={(e) => updateActivity(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City (Optional)</Label>
                    <Select
                      value={activity.city || 'none'}
                      onValueChange={(v) => updateActivity(index, 'city', v === 'none' ? undefined : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="none">No specific city</SelectItem>
                        {formData.cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={activity.currency}
                      onValueChange={(v) => updateActivity(index, 'currency', v)}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Entry Cost ({activity.currency})</Label>
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

      {/* Extras (Visa, Tips, Insurance) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Extras (Visa, Tips, Insurance)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {tripCategory === 'international' && (
            <>
              {/* Visa */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <IdCard className="w-4 h-4" />
                  Visa (International Only)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Person</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={extras.visaCostPerPerson || ''}
                      onChange={(e) => setExtras({ ...extras, visaCostPerPerson: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={extras.visaCurrency}
                      onValueChange={(v) => setExtras({ ...extras, visaCurrency: v })}
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
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(extras.visaTotalCostINR, 'INR')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Tips (International Only)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Per Person</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={extras.tipsCostPerPerson || ''}
                      onChange={(e) => setExtras({ ...extras, tipsCostPerPerson: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={extras.tipsCurrency}
                      onValueChange={(v) => setExtras({ ...extras, tipsCurrency: v })}
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
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(extras.tipsTotalCostINR, 'INR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Insurance (Both Domestic and International) */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Insurance (Required for all trips)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost Per Person</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={extras.insuranceCostPerPerson || ''}
                  onChange={(e) => setExtras({ ...extras, insuranceCostPerPerson: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={extras.insuranceCurrency}
                  onValueChange={(v) => setExtras({ ...extras, insuranceCurrency: v })}
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
              <div className="space-y-2 flex flex-col justify-end">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{formatCurrency(extras.insuranceTotalCostINR, 'INR')}</p>
                </div>
              </div>
            </div>
          </div>
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

      {/* Cost Summary with GST and TCS */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* NEW: Profit Input */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <Label className="text-sm font-semibold">Profit Amount</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="0"
                value={profit || ''}
                onChange={(e) => setProfit(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">₹</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Profit will be added to subtotal before calculating GST and TCS
            </p>
          </div>

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
              <span className="text-muted-foreground">Extras (Visa, Tips, Insurance)</span>
              <span className="font-semibold">{formatCurrency(totals.extras, 'INR')}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Overheads</span>
              <span className="font-semibold">{formatCurrency(totals.overheads, 'INR')}</span>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Subtotal (Before Profit)</span>
              <span className="text-lg font-bold">{formatCurrency(totals.subtotalBeforeTax, 'INR')}</span>
            </div>

            {/* NEW: Profit */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <BadgePercent className="w-4 h-4" />
                Profit
              </span>
              <span className="font-semibold">{formatCurrency(totals.profit, 'INR')}</span>
            </div>

            {/* NEW: Admin Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Admin Subtotal (Subtotal + Profit)</span>
              <span className="text-lg font-bold">{formatCurrency(totals.adminSubtotal, 'INR')}</span>
            </div>

            {/* GST */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <BadgePercent className="w-4 h-4" />
                GST (5%)
              </span>
              <span className="font-semibold">{formatCurrency(totals.gstAmount, 'INR')}</span>
            </div>

            {/* TCS (International only) */}
            {tripCategory === 'international' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <BadgePercent className="w-4 h-4" />
                  TCS (5% on Subtotal + GST)
                </span>
                <span className="font-semibold">{formatCurrency(totals.tcsAmount, 'INR')}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-lg font-bold">Grand Total</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totals.grandTotal, 'INR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-muted-foreground">
                Cost per {tripType === 'institute' ? 'Student' : 'Participant'}
              </span>
              <span className="text-xl font-semibold text-primary">
                {formatCurrency(totals.costPerParticipant, 'INR')}
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
  );
}