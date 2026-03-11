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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  fetchCountries,
  fetchCities,
  fetchCurrencies,
  fetchCitiesByCountry,
  fetchHotels,
  addHotel,
  getCurrencyRate as getCurrencyRateHelper,
  getCountryCurrency as getCountryCurrencyHelper,
  formatCurrency as formatCurrencyHelper,
  calculateGrandTotal,
  getCurrentTDSRate
} from '@/services/masterDataService';
import type { Currency, Country, City } from '@/services/masterDataService';
import type { Hotel } from '@/services/masterDataService';
import {
  Plane, Bus, Train, Hotel as HotelIcon, Utensils, Ticket, Calculator, Shield, Info, Plus, Trash2, Minus,
  Loader2, Users, Calendar, MapPin, Save, Globe, Building2, IdCard, Heart, BadgePercent, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  Flight, Bus as BusType, Train as TrainType, Accommodation, Activity, Overhead,
  TripCategory, TripType, TripExtras, RoomPreferences, CityWithDates,
  FlightClassEntry, FlightSeatUpgrade, FlightMealUpgrade, FlightClass, FLIGHT_CLASS_LABELS
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
import { TripSectionNavDesktop, TripSectionNavMobile } from '@/components/TripSectionNav';

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
    countries: [] as string[],
    cities: [] as CityWithDates[],
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
  // Hotel-wise meals: keyed by accommodation id
  const [hotelMeals, setHotelMeals] = useState<Record<string, {
    breakfastCostPerPerson: number;
    lunchCostPerPerson: number;
    dinnerCostPerPerson: number;
    freeBreakfast: number;
    freeLunch: number;
    freeDinner: number;
    currency: string;
  }>>({});
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
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  // Collapsed state for each section's items
  const [collapsedFlights, setCollapsedFlights] = useState<boolean[]>([]);
  const [collapsedBuses, setCollapsedBuses] = useState<boolean[]>([]);
  const [collapsedTrains, setCollapsedTrains] = useState<boolean[]>([]);
  const [collapsedAccommodations, setCollapsedAccommodations] = useState<boolean[]>([]);
  const [collapsedActivities, setCollapsedActivities] = useState<boolean[]>([]);
  const [collapsedOverheads, setCollapsedOverheads] = useState<boolean[]>([]);

  // Hotel state for accommodation
  const [hotelsMasterList, setHotelsMasterList] = useState<Hotel[]>([]);
  // Add Hotel Dialog state
  const [addHotelDialogOpen, setAddHotelDialogOpen] = useState(false);
  const [addHotelDialogAccIndex, setAddHotelDialogAccIndex] = useState<number | null>(null);
  const [addHotelDialogForm, setAddHotelDialogForm] = useState({ hotelname: '', breakfastincluded: false, remarks: '' });
  const [isSavingNewHotel, setIsSavingNewHotel] = useState(false);

  // NEW: Cost optimization toggle state
  const [optimizeRoomsByCost, setOptimizeRoomsByCost] = useState(false);

  // Per-accommodation allocation mode: 'auto' | 'manual'
  const [allocationModes, setAllocationModes] = useState<Record<string, 'auto' | 'manual'>>({});

  // City add form state
  const [showAddCityForm, setShowAddCityForm] = useState(false);
  const [selectedCountryForAdd, setSelectedCountryForAdd] = useState('');
  const [selectedCityForAdd, setSelectedCityForAdd] = useState('');
  const [pendingCityFromDate, setPendingCityFromDate] = useState('');
  const [pendingCityToDate, setPendingCityToDate] = useState('');

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
        const [countriesResult, citiesResult, currenciesResult, hotelsResult] = await Promise.all([
          fetchCountries(),
          fetchCities(),
          fetchCurrencies(),
          fetchHotels()
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

        if (hotelsResult.success && hotelsResult.data) {
          setHotelsMasterList(hotelsResult.data);
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

        const tripCountries = Array.isArray(trip.countries) ? trip.countries : (trip.country ? [trip.country] : []);

        // NEW: Handle multi-city array
        const cityNames = Array.isArray(trip.cities) ? trip.cities : [trip.cities];

        setFormData({
          name: trip.name,
          institution: trip.institution,
          countries: trip.countries || [],
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
          currency: f.currency,
          description: f.description || '',
          classes: f.classes || [],
          seatUpgrades: f.seat_upgrades || [],
          mealUpgrades: f.meal_upgrades || [],
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
          driverRoom: a.driver_room ?? false,
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
          costType: (o.cost_type as 'per_person' | 'lump_sum') || 'per_person',
          amountPerParticipant: o.amount_per_participant,  // CHANGED
          currency: o.currency,
          hideFromClient: o.hide_from_client,
          totalCost: o.total_cost,  // NEW
          totalCostINR: o.total_cost_inr,
        })));

        // Map meals (hotel-wise)
        if (dbMeals && Array.isArray(dbMeals)) {
          const mealsMap: Record<string, any> = {};
          dbMeals.forEach((m: any) => {
            mealsMap[m.accommodation_id] = {
              breakfastCostPerPerson: m.breakfast_cost_per_person,
              lunchCostPerPerson: m.lunch_cost_per_person,
              dinnerCostPerPerson: m.dinner_cost_per_person,
              freeBreakfast: m.free_breakfast ?? 0,
              freeLunch: m.free_lunch ?? 0,
              freeDinner: m.free_dinner ?? 0,
              currency: m.currency,
            };
          });
          setHotelMeals(mealsMap);
        } else if (dbMeals && !Array.isArray(dbMeals)) {
          // Legacy single-record fallback — ignore, will default to empty
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
    } else if (tripType === 'fti') {
      // FTI: only Male + Female + Kids, no VXplorers
      return formData.maleCount + formData.femaleCount + formData.otherCount;
    } else {
      // Commercial trips include VXplorers
      const totalCommercial = formData.maleCount + formData.femaleCount + formData.otherCount;
      const totalVXplorers = formData.commercialMaleVXplorers + formData.commercialFemaleVXplorers;
      return totalCommercial + totalVXplorers;
    }
  };

  const calculateBillableParticipants = () => {
    if (tripType === 'institute') {
      const totalStudents = formData.boys + formData.girls;
      return totalStudents;
    } else {
      // Commercial and FTI trips use same participant fields
      const totalCommercial = formData.maleCount + formData.femaleCount + formData.otherCount;
      return totalCommercial;
    }
  };

  const getCurrencyRate = (code: string): number => {
    return getCurrencyRateHelper(currencies, code);
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    return formatCurrencyHelper(currencies, amount, currencyCode);
  };

  const getCountryCurrency = (countryIds: string | string[]): string => {
    // Convert to array and filter out empty strings
    const idArray = Array.isArray(countryIds) ? countryIds.filter(id => id) : (countryIds ? [countryIds] : []);
    if (idArray.length === 0) return 'INR';
    return getCountryCurrencyHelper(countries, idArray);
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

  const getHotelMealDefaults = (accId: string, currency: string) => {
    return hotelMeals[accId] ?? {
      breakfastCostPerPerson: 0,
      lunchCostPerPerson: 0,
      dinnerCostPerPerson: 0,
      freeBreakfast: 0,
      freeLunch: 0,
      freeDinner: 0,
      currency,
    };
  };

  const updateHotelMeal = (accId: string, field: string, value: number | string, currency: string) => {
    setHotelMeals(prev => ({
      ...prev,
      [accId]: {
        ...getHotelMealDefaults(accId, currency),
        ...prev[accId],
        [field]: value,
      }
    }));
  };

  const calculateHotelMealCost = (accId: string, nights: number, totalPax: number, currency: string) => {
    const m = getHotelMealDefaults(accId, currency);
    const rate = getCurrencyRate(m.currency);
    const bfTotal = m.breakfastCostPerPerson * Math.max(0, totalPax - m.freeBreakfast) * nights;
    const lunchTotal = m.lunchCostPerPerson * Math.max(0, totalPax - m.freeLunch) * nights;
    const dinnerTotal = m.dinnerCostPerPerson * Math.max(0, totalPax - m.freeDinner) * nights;
    const totalCost = bfTotal + lunchTotal + dinnerTotal;
    return {
      breakfastTotal: bfTotal,
      lunchTotal,
      dinnerTotal,
      totalCost,
      totalCostINR: totalCost * rate,
    };
  };

  const calculateAllMealsCost = () => {
    const totalPax = calculateTotalParticipants();
    return accommodations.reduce((sum, acc) => {
      const { totalCostINR } = calculateHotelMealCost(acc.id, acc.numberOfNights, totalPax, acc.currency);
      return sum + totalCostINR;
    }, 0);
  };

  // Multi-city functions with dates
  const addCity = () => {
    if (selectedCityForAdd && !formData.cities.find(c => c.name === selectedCityForAdd)) {
      setFormData(prev => ({
        ...prev,
        cities: [...prev.cities, { name: selectedCityForAdd, fromDate: '', toDate: '' }]
      }));
      setSelectedCityForAdd('');
    }
  };

  const removeCity = (cityName: string) => {
    setFormData(prev => {
      const updated = prev.cities.filter(c => c.name !== cityName);
      return {
        ...prev,
        cities: updated,
        startDate: updated[0]?.fromDate || '',
        endDate: updated[updated.length - 1]?.toDate || '',
      };
    });
  };

  const updateCityDate = (cityName: string, field: 'fromDate' | 'toDate', value: string) => {
    setFormData(prev => {
      // Only update the specific city's date — never touch other cities
      const updated = prev.cities.map(c =>
        c.name === cityName ? { ...c, [field]: value } : c
      );
      // Trip start/end derived from first and last city dates only
      const startDate = updated[0]?.fromDate || prev.startDate;
      const endDate = updated[updated.length - 1]?.toDate || prev.endDate;
      return { ...prev, cities: updated, startDate, endDate };
    });
  };

  // Transport functions
  const addFlight = () => {
    const defaultCurrency = getCountryCurrency(formData.countries.length > 0 ? formData.countries[0] : '') || 'INR';
    setCollapsedFlights(prev => [...prev, false]);
    setFlights([...flights, {
      id: `flight-${Date.now()}`,
      from: '',
      to: '',
      airline: '',
      flightNumber: '',
      departureTime: '',
      arrivalTime: '',
      currency: defaultCurrency,
      description: '',
      classes: [],
      seatUpgrades: [],
      mealUpgrades: [],
      totalCost: 0,
      totalCostINR: 0,
    }]);
  };

  const recalculateFlightTotal = (flight: Flight, currency: string): { totalCost: number; totalCostINR: number } => {
    const classesTotal = flight.classes.reduce((sum, c) => sum + c.costPerPerson * c.passengerCount, 0);
    const seatsTotal = flight.seatUpgrades.reduce((sum, s) => sum + s.costPerSeat * s.seatCount, 0);
    const mealsTotal = flight.mealUpgrades.reduce((sum, m) => sum + m.costPerMeal * m.mealCount, 0);
    const totalCost = classesTotal + seatsTotal + mealsTotal;
    return { totalCost, totalCostINR: totalCost * getCurrencyRate(currency) };
  };

  const updateFlightBasic = (index: number, field: 'from' | 'to' | 'airline' | 'flightNumber' | 'departureTime' | 'arrivalTime' | 'description', value: string) => {
    const updated = [...flights];
    updated[index] = { ...updated[index], [field]: value };
    setFlights(updated);
  };

  const updateFlightCurrency = (index: number, currency: string) => {
    const updated = [...flights];
    updated[index] = { ...updated[index], currency };
    const totals = recalculateFlightTotal(updated[index], currency);
    updated[index] = { ...updated[index], ...totals };
    setFlights(updated);
  };

  const addFlightClass = (flightIndex: number) => {
    const updated = [...flights];
    const newClass: FlightClassEntry = { id: `cls-${Date.now()}`, class: 'economy', passengerCount: 0, costPerPerson: 0 };
    updated[flightIndex] = { ...updated[flightIndex], classes: [...updated[flightIndex].classes, newClass] };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const updateFlightClass = (flightIndex: number, classIndex: number, field: keyof FlightClassEntry, value: any) => {
    const updated = [...flights];
    const classes = [...updated[flightIndex].classes];
    classes[classIndex] = { ...classes[classIndex], [field]: value };
    updated[flightIndex] = { ...updated[flightIndex], classes };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const removeFlightClass = (flightIndex: number, classIndex: number) => {
    const updated = [...flights];
    updated[flightIndex] = { ...updated[flightIndex], classes: updated[flightIndex].classes.filter((_, i) => i !== classIndex) };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const addFlightSeatUpgrade = (flightIndex: number) => {
    const updated = [...flights];
    updated[flightIndex] = { ...updated[flightIndex], seatUpgrades: [...updated[flightIndex].seatUpgrades, { id: `seat-${Date.now()}`, label: '', costPerSeat: 0, seatCount: 0 }] };
    setFlights(updated);
  };

  const updateFlightSeatUpgrade = (flightIndex: number, upgradeIndex: number, field: keyof FlightSeatUpgrade, value: any) => {
    const updated = [...flights];
    const seatUpgrades = [...updated[flightIndex].seatUpgrades];
    seatUpgrades[upgradeIndex] = { ...seatUpgrades[upgradeIndex], [field]: value };
    updated[flightIndex] = { ...updated[flightIndex], seatUpgrades };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const removeFlightSeatUpgrade = (flightIndex: number, upgradeIndex: number) => {
    const updated = [...flights];
    updated[flightIndex] = { ...updated[flightIndex], seatUpgrades: updated[flightIndex].seatUpgrades.filter((_, i) => i !== upgradeIndex) };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const addFlightMealUpgrade = (flightIndex: number) => {
    const updated = [...flights];
    updated[flightIndex] = { ...updated[flightIndex], mealUpgrades: [...updated[flightIndex].mealUpgrades, { id: `fmeal-${Date.now()}`, label: '', costPerMeal: 0, mealCount: 0 }] };
    setFlights(updated);
  };

  const updateFlightMealUpgrade = (flightIndex: number, upgradeIndex: number, field: keyof FlightMealUpgrade, value: any) => {
    const updated = [...flights];
    const mealUpgrades = [...updated[flightIndex].mealUpgrades];
    mealUpgrades[upgradeIndex] = { ...mealUpgrades[upgradeIndex], [field]: value };
    updated[flightIndex] = { ...updated[flightIndex], mealUpgrades };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const removeFlightMealUpgrade = (flightIndex: number, upgradeIndex: number) => {
    const updated = [...flights];
    updated[flightIndex] = { ...updated[flightIndex], mealUpgrades: updated[flightIndex].mealUpgrades.filter((_, i) => i !== upgradeIndex) };
    const totals = recalculateFlightTotal(updated[flightIndex], updated[flightIndex].currency);
    updated[flightIndex] = { ...updated[flightIndex], ...totals };
    setFlights(updated);
  };

  const deleteFlight = (index: number) => {
    setCollapsedFlights(prev => prev.filter((_, i) => i !== index));
    setFlights(flights.filter((_, i) => i !== index));
  };

  const addBus = () => {
    const defaultCurrency = getCountryCurrency(formData.countries.length > 0 ? formData.countries[0] : '') || 'INR';
    setCollapsedBuses(prev => [...prev, false]);
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
    setCollapsedBuses(prev => prev.filter((_, i) => i !== index));
    setBuses(buses.filter((_, i) => i !== index));
  };

  const addTrain = () => {
    const defaultCurrency = getCountryCurrency(formData.countries.length > 0 ? formData.countries[0] : '') || 'INR';
    setCollapsedTrains(prev => [...prev, false]);
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
    setCollapsedTrains(prev => prev.filter((_, i) => i !== index));
    setTrains(trains.filter((_, i) => i !== index));
  };

  // Accommodation functions
  const addAccommodation = () => {
    const defaultCurrency = getCountryCurrency(formData.countries.length > 0 ? formData.countries[0] : '') || 'INR';
    const firstCity = formData.cities[0]?.name || '';

    setCollapsedAccommodations(prev => [...prev, false]);
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
      driverRoom: false,
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

    // Recalculate costs when nights, currency, or driverRoom change
    if (field === 'numberOfNights' || field === 'currency' || field === ('driverRoom' as any)) {
      if (updated[index].roomAllocation.totalRooms > 0) {
        const costs = calculateAccommodationCost(
          updated[index].roomAllocation,
          updated[index].numberOfNights,
          getCurrencyRate(updated[index].currency)
        );
        // Add driver single room cost if enabled
        const driverRoom = updated[index].driverRoom ?? false;
        const singleRoomType = updated[index].roomTypes.find(rt => rt.roomType.toLowerCase() === 'single');
        const driverCost = driverRoom && singleRoomType
          ? singleRoomType.costPerRoom * updated[index].numberOfNights
          : 0;
        const driverCostINR = driverCost * getCurrencyRate(updated[index].currency);
        updated[index].totalCost = costs.totalCost + driverCost;
        updated[index].totalCostINR = costs.totalCostINR + driverCostINR;
      }
    }

    setAccommodations(updated);
  };

  const deleteAccommodation = (index: number) => {
    setCollapsedAccommodations(prev => prev.filter((_, i) => i !== index));
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

  // Update a specific room type's count in the breakdown manually (after auto-allocation)
  // roomTypeTemplate is passed when the room type doesn't exist in the breakdown yet (count was 0)
  const updateRoomBreakdownCount = (
    accIndex: number,
    groupKey: keyof NonNullable<typeof accommodations[0]['roomAllocation']['breakdown']>,
    breakdownIndex: number,
    delta: number,
    roomTypeTemplate?: import('@/types/trip').RoomTypeBreakdown
  ) => {
    const updated = [...accommodations];
    const acc = { ...updated[accIndex] };
    if (!acc.roomAllocation?.breakdown) return;

    const breakdown = [...(acc.roomAllocation.breakdown[groupKey] as import('@/types/trip').RoomTypeBreakdown[])];

    // If index is beyond current breakdown length, it's a new room type — insert it
    if (breakdownIndex >= breakdown.length && roomTypeTemplate) {
      if (delta <= 0) return; // nothing to do for a new entry with decrement
      const newEntry = { ...roomTypeTemplate, numberOfRooms: 1, peopleAccommodated: roomTypeTemplate.capacityPerRoom };
      breakdown.push(newEntry);
    } else {
      const entry = breakdown[breakdownIndex];
      const newCount = Math.max(0, entry.numberOfRooms + delta);
      const newPeople = newCount * entry.capacityPerRoom;
      breakdown[breakdownIndex] = { ...entry, numberOfRooms: newCount, peopleAccommodated: newPeople };
    }

    const newBreakdowns = { ...acc.roomAllocation.breakdown, [groupKey]: breakdown };

    // Recalculate total rooms
    const totalRooms = Object.values(newBreakdowns).reduce(
      (sum, grp) => sum + (grp as import('@/types/trip').RoomTypeBreakdown[]).reduce((s, b) => s + b.numberOfRooms, 0), 0
    );

    acc.roomAllocation = { ...acc.roomAllocation, breakdown: newBreakdowns, totalRooms };
    acc.totalRooms = totalRooms;

    const costs = calculateAccommodationCost(
      acc.roomAllocation,
      acc.numberOfNights,
      getCurrencyRate(acc.currency)
    );
    acc.totalCost = costs.totalCost;
    acc.totalCostINR = costs.totalCostINR;

    updated[accIndex] = acc;
    setAccommodations(updated);
  };

  // Activity functions
  const addActivity = () => {
    const defaultCurrency = getCountryCurrency(formData.countries.length > 0 ? formData.countries[0] : '') || 'INR';
    setCollapsedActivities(prev => [...prev, false]);
    setActivities([...activities, {
      id: `activity-${Date.now()}`,
      name: '',
      city: formData.cities[0]?.name || undefined,
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
    setCollapsedActivities(prev => prev.filter((_, i) => i !== index));
    setActivities(activities.filter((_, i) => i !== index));
  };

  // Overhead functions
  const addOverhead = () => {
    const defaultCurrency = getCountryCurrency(formData.countries.length > 0 ? formData.countries[0] : '') || 'INR';
    setCollapsedOverheads(prev => [...prev, false]);
    setOverheads([...overheads, {
      id: `overhead-${Date.now()}`,
      name: '',
      amountPerParticipant: 0,
      currency: defaultCurrency,
      hideFromClient: false,
      totalCost: 0,
      totalCostINR: 0,
      costType: 'per_person'
    }]);
  };

  const updateOverhead = (index: number, field: keyof Overhead, value: any) => {
    const updated = [...overheads];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'amountPerParticipant' || field === 'currency' || field === 'costType') {
      const totalParticipants = calculateTotalParticipants();
      const amountPerParticipant = field === 'amountPerParticipant' ? value : updated[index].amountPerParticipant;
      const currency = field === 'currency' ? value : updated[index].currency;
      const costType = field === 'costType' ? value : updated[index].costType;

      updated[index].totalCost = costType === 'lump_sum'
        ? amountPerParticipant
        : amountPerParticipant * totalParticipants;
      updated[index].totalCostINR = updated[index].totalCost * getCurrencyRate(currency);
    }

    setOverheads(updated);
  };

  const deleteOverhead = (index: number) => {
    setCollapsedOverheads(prev => prev.filter((_, i) => i !== index));
    setOverheads(overheads.filter((_, i) => i !== index));
  };

  // Calculate totals with GST and TCS - UPDATED: Now async
  const calculateTotals = async () => {
    const transportTotal =
      flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
      buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
      trains.reduce((sum, t) => sum + t.totalCostINR, 0);

    const accommodationTotal = accommodations.reduce((sum, a) => sum + a.totalCostINR, 0);

    const totalParticipants = calculateTotalParticipants();
    const { days } = calculateTripDuration();
    const mealsTotal = calculateAllMealsCost();

    const activitiesTotal = activities.reduce((sum, a) => sum + a.totalCostINR, 0);
    const overheadsTotal = overheads.reduce((sum, o) => sum + o.totalCostINR, 0);

    // NEW: Add extras total
    const extrasTotal = extras.visaTotalCostINR + extras.tipsTotalCostINR + extras.insuranceTotalCostINR;

    const subtotal = transportTotal + accommodationTotal + mealsTotal + activitiesTotal + overheadsTotal + extrasTotal;

    // Calculate GST and TCS
    const taxCalc = await calculateGrandTotal(
      subtotal,
      profit,
      tripCategory === 'international',
      tripType === 'fti'
    );

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
      gstPercentage: taxCalc.gstPercentage,
      tcsAmount: taxCalc.tcsAmount,
      tcsPercentage: taxCalc.tcsPercentage,
      tdsAmount: taxCalc.tdsAmount,
      tdsPercentage: taxCalc.tdsPercentage,
      grandTotal: taxCalc.grandTotal,
      costPerParticipant: (() => {
        if (tripType === 'institute') {
          const studentCount = formData.boys + formData.girls;
          return studentCount > 0 ? taxCalc.grandTotal / studentCount : 0;
        } else {
          // Commercial and FTI: divide by participants only (NOT VXplorers)
          const participantCount = formData.maleCount + formData.femaleCount + formData.otherCount;
          return participantCount > 0 ? taxCalc.grandTotal / participantCount : 0;
        }
      })(),
    };
  };

  // UPDATED: Use React state for totals since calculateTotals is now async
  const [totals, setTotals] = useState({
    transport: 0,
    accommodation: 0,
    meals: 0,
    activities: 0,
    overheads: 0,
    extras: 0,
    subtotalBeforeTax: 0,
    profit: 0,
    adminSubtotal: 0,
    gstAmount: 0,
    gstPercentage: 5,
    tcsAmount: 0,
    tcsPercentage: 5,
    tdsAmount: 0,
    tdsPercentage: 0,
    grandTotal: 0,
    costPerParticipant: 0,
  });

  // Recalculate totals when dependencies change
  useEffect(() => {
    const updateTotals = async () => {
      const newTotals = await calculateTotals();
      setTotals(newTotals);
    };
    updateTotals();
  }, [
    flights,
    buses,
    trains,
    accommodations,
    hotelMeals,
    activities,
    overheads,
    extras,
    profit,
    tripCategory,
    formData.boys,
    formData.girls,
    formData.maleCount,
    formData.femaleCount,
    formData.otherCount,
    formData.startDate,
    formData.endDate,
  ]);

  // Save trip
  const handleSaveTrip = async () => {
    // Validation — collect all errors and show them together
    const validationErrors: string[] = [];

    if (!formData.name.trim())
      validationErrors.push('Trip name is required');
    if (!formData.institution.trim())
      validationErrors.push('Institution name is required');
    if (formData.countries.length === 0)
      validationErrors.push('At least one country must be selected');
    if (formData.cities.length === 0)
      validationErrors.push('At least one city must be added');
    if (formData.cities.some(c => !c.fromDate || !c.toDate))
      validationErrors.push('All cities must have from and to dates');
    if (!formData.startDate || !formData.endDate)
      validationErrors.push('Start and end dates are required');
    if (calculateTotalParticipants() === 0)
      validationErrors.push('At least one participant is required');
    if (!extras.insuranceCostPerPerson || extras.insuranceCostPerPerson <= 0)
      validationErrors.push('Insurance cost per person is required');
    if (tripCategory === 'international' && (!extras.visaCostPerPerson || extras.visaCostPerPerson <= 0))
      validationErrors.push('Visa cost per person is required for international trips');

    if (validationErrors.length > 0) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }

    setIsSaving(true);

    try {
      const { days, nights } = calculateTripDuration();
      const totalParticipants = calculateTotalParticipants();

      // Get country names from IDs
      const countryNames = formData.countries.map(countryId => {
        const country = countries.find(c => c.id === countryId);
        return country?.name || countryId;
      });

      // Get city names from IDs
      const cityNames = formData.cities;

      const tripData = {
        name: formData.name,
        institution: formData.institution,
        tripCategory,
        tripType,
        countries: countryNames,
        cities: cityNames,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: days,
        totalNights: nights,
        defaultCurrency: getCountryCurrency(formData.countries[0] || '') || 'INR',

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
          commercialMaleVXplorers: tripType === 'fti' ? 0 : formData.commercialMaleVXplorers,
          commercialFemaleVXplorers: tripType === 'fti' ? 0 : formData.commercialFemaleVXplorers,
          totalStudents: calculateTotalStudents(),
          totalFaculty: calculateTotalFaculty(),
          totalVXplorers: tripType === 'fti' ? 0 : (formData.maleVXplorers + formData.femaleVXplorers + formData.commercialMaleVXplorers + formData.commercialFemaleVXplorers),
          totalCommercial: calculateTotalCommercial(),
          totalParticipants,
        },

        flights,
        buses,
        trains,
        accommodations,

        meals: accommodations.map(acc => {
          const m = getHotelMealDefaults(acc.id, acc.currency);
          const totalPax = calculateTotalParticipants();
          const { totalCost, totalCostINR } = calculateHotelMealCost(acc.id, acc.numberOfNights, totalPax, acc.currency);
          return {
            accommodation_id: acc.id,
            hotel_name: acc.hotelName,
            city: acc.city,
            number_of_nights: acc.numberOfNights,
            breakfast_cost_per_person: m.breakfastCostPerPerson,
            lunch_cost_per_person: m.lunchCostPerPerson,
            dinner_cost_per_person: m.dinnerCostPerPerson,
            free_breakfast: m.freeBreakfast,
            free_lunch: m.freeLunch,
            free_dinner: m.freeDinner,
            currency: m.currency,
            total_participants: totalPax,
            total_cost: totalCost,
            total_cost_inr: totalCostINR,
          };
        }),

        activities,
        overheads,

        // Always include extras (visa and insurance are mandatory)
        extras,

        subtotalBeforeTax: totals.subtotalBeforeTax,
        profit: profit,
        gstPercentage: totals.gstPercentage,
        gstAmount: totals.gstAmount,
        tcsPercentage: totals.tcsPercentage,
        tcsAmount: totals.tcsAmount,
        tdsPercentage: totals.tdsPercentage,
        tdsAmount: totals.tdsAmount,
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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Fixed header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold gradient-text">
            {isEditing ? 'Edit Trip' : 'Create New Trip'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update trip details and costs' : 'Plan a new trip'}
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div id="trip-scroll-container" className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-7xl mx-auto flex gap-8 items-start">
          <TripSectionNavDesktop />

          <div className="flex-1 min-w-0 space-y-6">

      {/* STEP 1: Trip Classification (NEW) */}
      <Card id="section-classification" className="shadow-card">
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
              className="grid grid-cols-3 gap-4"
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

              <Label
                htmlFor="fti"
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${tripType === 'fti' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <RadioGroupItem value="fti" id="fti" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="font-semibold">FTI Trip</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">FTI • TDS applied</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {tripType === 'fti' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-semibold mb-1">FTI Trip - Tax Info</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                    {tripCategory === 'domestic' ? (
                      <>
                        <li>GST: applied on subtotal</li>
                        <li>TDS: deducted on (Subtotal + GST)</li>
                      </>
                    ) : (
                      <>
                        <li>GST: applied on subtotal</li>
                        <li>TCS: applied on (Subtotal + GST)</li>
                        <li>TDS: deducted on (Subtotal + GST + TCS)</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

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
      <Card id="section-basic" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Trip Name */}
          <div className="space-y-2">
            <Label>Trip Name *</Label>
            <Input
              placeholder="e.g., Paris Cultural Tour 2024"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Institution / Company / Family Name — label based on trip type */}
          <div className="space-y-2">
            <Label>
              {tripType === 'institute' ? 'Institution Name *' : tripType === 'commercial' ? 'Company / Group Name *' : 'Family / Group Name *'}
            </Label>
            <Input
              placeholder={
                tripType === 'institute' ? "e.g., St. Mary's High School" :
                  tripType === 'commercial' ? "e.g., Acme Corp" :
                    "e.g., The Sharma Family"
              }
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            />
          </div>

          {/* Itinerary */}
          <div className="space-y-3">
            <Label>Itinerary *</Label>

            {/* Cities list */}
            {formData.cities.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] bg-muted px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <span>City</span>
                  <span>Country</span>
                  <span>From</span>
                  <span>To</span>
                  <span></span>
                </div>
                {formData.cities.map((city, index) => {
                  const cityObj = cities.find(c => c.name === city.name);
                  const countryObj = cityObj ? countries.find(c => c.id === cityObj.country_id) : null;
                  return (
                    <div
                      key={city.name}
                      className={`grid grid-cols-[1fr_1fr_1fr_1fr_32px] items-center px-3 py-2 text-sm ${index !== formData.cities.length - 1 ? 'border-b' : ''}`}
                    >
                      <span className="font-medium">{city.name}</span>
                      <span className="text-muted-foreground text-xs">{countryObj?.name || '—'}</span>
                      <span className="text-sm">{city.fromDate || '—'}</span>
                      <span className="text-sm">{city.toDate || '—'}</span>
                      <button
                        type="button"
                        onClick={() => removeCity(city.name)}
                        className="hover:text-destructive text-muted-foreground"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add City Button — full width, toggles the form */}
            {!showAddCityForm && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-10"
                onClick={() => setShowAddCityForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add City
              </Button>
            )}

            {/* Add City Form — shown when button clicked */}
            {showAddCityForm && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <p className="text-sm font-medium">New City</p>
                {/* Country + City */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Country</Label>
                    <Select
                      value={selectedCountryForAdd || '__none__'}
                      onValueChange={(val) => {
                        if (val === '__none__') return;
                        setSelectedCountryForAdd(val);
                        setSelectedCityForAdd('');
                      }}
                      disabled={isLoadingMasterData}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="__none__" disabled>Select country</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Select
                      value={selectedCityForAdd || '__none__'}
                      onValueChange={(val) => {
                        if (val === '__none__') return;
                        setSelectedCityForAdd(val);
                      }}
                      disabled={!selectedCountryForAdd || isLoadingMasterData}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={!selectedCountryForAdd ? "Select country first" : "Select city"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="__none__" disabled>Select city</SelectItem>
                        {cities
                          .filter(c => c.country_id === selectedCountryForAdd)
                          .map((city) => (
                            <SelectItem key={city.id} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* From + To dates — only after city selected */}
                {selectedCityForAdd && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">From Date</Label>
                      <Input
                        type="date"
                        className="h-9 text-sm"
                        value={pendingCityFromDate}
                        max={pendingCityToDate || undefined}
                        onChange={(e) => setPendingCityFromDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To Date</Label>
                      <Input
                        type="date"
                        className="h-9 text-sm"
                        value={pendingCityToDate}
                        min={pendingCityFromDate || undefined}
                        onChange={(e) => setPendingCityToDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 h-9"
                    disabled={!selectedCityForAdd || !pendingCityFromDate || !pendingCityToDate}
                    onClick={() => {
                      if (selectedCityForAdd && pendingCityFromDate && pendingCityToDate &&
                        !formData.cities.find(c => c.name === selectedCityForAdd)) {
                        const newCity = { name: selectedCityForAdd, fromDate: pendingCityFromDate, toDate: pendingCityToDate };
                        setFormData(prev => {
                          const updated = [...prev.cities, newCity];
                          const newCountries = selectedCountryForAdd && !prev.countries.includes(selectedCountryForAdd)
                            ? [...prev.countries, selectedCountryForAdd]
                            : prev.countries;
                          return {
                            ...prev,
                            countries: newCountries,
                            cities: updated,
                            startDate: updated[0].fromDate,
                            endDate: updated[updated.length - 1].toDate,
                          };
                        });
                        // Reset form for next city
                        setSelectedCityForAdd('');
                        setPendingCityFromDate('');
                        setPendingCityToDate('');
                        setShowAddCityForm(false);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add City
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-4"
                    onClick={() => {
                      setShowAddCityForm(false);
                      setSelectedCountryForAdd('');
                      setSelectedCityForAdd('');
                      setPendingCityFromDate('');
                      setPendingCityToDate('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Overall Trip Dates — auto-derived, shown below cities */}
            {formData.startDate && formData.endDate && (
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Overall Trip Duration</p>
                  <p className="text-sm font-semibold">
                    {formData.startDate} → {formData.endDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                  <p className="text-sm font-semibold">
                    {calculateTripDuration().days} days · {calculateTripDuration().nights} nights
                  </p>
                </div>
              </div>
            )}

          </div>

        </CardContent>
      </Card>

      {/* Participants - Different based on trip type */}
      <Card id="section-participants" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tripType === 'fti' ? (
            // FTI Trip Participants (same fields as commercial)
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
                  <Label>Kids</Label>
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
                  {/* <div className="p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Billable</p>
                    <p className="text-2xl font-bold text-primary">{calculateBillableParticipants()}</p>
                  </div> */}
                </div>
              </div>
            </>
          ) : tripType === 'institute' ? (
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
            <>
              <div className="grid grid-cols-3 gap-4">
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
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Participants</p>
                    <p className="text-lg font-bold">{calculateTotalCommercial()}</p>
                  </div>
                  {/* <div className="p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Billable</p>
                    <p className="text-2xl font-bold text-primary">{calculateBillableParticipants()}</p>
                  </div> */}
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
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Billable</p>
                <p className="text-2xl font-bold text-primary">{calculateBillableParticipants()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transport - Flights */}
      <Card id="section-flights" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Flights
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {flights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No flights added yet.</p>
          ) : (
            flights.map((flight, index) => {
              const isCollapsed = collapsedFlights[index] ?? false;
              const summary = [flight.from, flight.to].filter(Boolean).join(' → ') || `Flight ${index + 1}`;
              const subSummary = [flight.airline, flight.flightNumber].filter(Boolean).join(' · ');
              return (
                <div key={flight.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => setCollapsedFlights(prev => { const n = [...prev]; n[index] = !n[index]; return n; })}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <span className="font-medium text-sm truncate">{summary}</span>
                      {subSummary && <span className="text-xs text-muted-foreground truncate hidden sm:inline">{subSummary}</span>}
                      {isCollapsed && flight.totalCostINR > 0 && <span className="text-xs text-primary ml-auto mr-2 shrink-0">{formatCurrency(flight.totalCostINR, 'INR')}</span>}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => deleteFlight(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4 space-y-5">

                      {/* Basic flight info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>From</Label><Input placeholder="Departure city" value={flight.from} onChange={(e) => updateFlightBasic(index, 'from', e.target.value)} /></div>
                        <div className="space-y-2"><Label>To</Label><Input placeholder="Arrival city" value={flight.to} onChange={(e) => updateFlightBasic(index, 'to', e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Airline</Label><Input placeholder="e.g., Air India" value={flight.airline} onChange={(e) => updateFlightBasic(index, 'airline', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Flight Number</Label><Input placeholder="e.g., AI 101" value={flight.flightNumber} onChange={(e) => updateFlightBasic(index, 'flightNumber', e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Departure Time</Label><Input type="datetime-local" value={flight.departureTime} onChange={(e) => updateFlightBasic(index, 'departureTime', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Arrival Time</Label><Input type="datetime-local" value={flight.arrivalTime} onChange={(e) => updateFlightBasic(index, 'arrivalTime', e.target.value)} /></div>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select value={flight.currency} onValueChange={(v) => updateFlightCurrency(index, v)} disabled={isLoadingMasterData}>
                          <SelectTrigger className="w-48"><SelectValue placeholder="Select currency" /></SelectTrigger>
                          <SelectContent className="bg-popover">{currencies.map((c) => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>

                      {/* Classes */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Cabin Classes</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addFlightClass(index)} className="h-7 text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Add Class
                          </Button>
                        </div>
                        {flight.classes.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No classes added. Click "Add Class" to specify passenger breakdown by cabin.</p>
                        )}
                        {flight.classes.map((cls, ci) => (
                          <div key={cls.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-3 items-end p-3 rounded-lg bg-muted/30 border">
                            <div className="space-y-1">
                              <Label className="text-xs">Cabin Class</Label>
                              <Select value={cls.class} onValueChange={(v) => updateFlightClass(index, ci, 'class', v as FlightClass)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {(Object.keys(FLIGHT_CLASS_LABELS) as FlightClass[]).map(fc => (
                                    <SelectItem key={fc} value={fc}>{FLIGHT_CLASS_LABELS[fc]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Passengers</Label>
                              <Input className="h-8 text-sm" type="number" placeholder="0" value={cls.passengerCount || ''} onChange={(e) => updateFlightClass(index, ci, 'passengerCount', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cost / Person ({flight.currency})</Label>
                              <Input className="h-8 text-sm" type="number" placeholder="0" value={cls.costPerPerson || ''} onChange={(e) => updateFlightClass(index, ci, 'costPerPerson', parseFloat(e.target.value) || 0)} />
                            </div>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeFlightClass(index, ci)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        {flight.classes.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Classes subtotal: {formatCurrency(flight.classes.reduce((s, c) => s + c.costPerPerson * c.passengerCount, 0), flight.currency)}
                            {' '}= {formatCurrency(flight.classes.reduce((s, c) => s + c.costPerPerson * c.passengerCount, 0) * getCurrencyRate(flight.currency), 'INR')}
                          </p>
                        )}
                      </div>

                      {/* Seat Upgrades */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Seat Upgrades</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addFlightSeatUpgrade(index)} className="h-7 text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Add Seat Upgrade
                          </Button>
                        </div>
                        {flight.seatUpgrades.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No seat upgrades. Add types like Window Seat, Extra Legroom, etc.</p>
                        )}
                        {flight.seatUpgrades.map((su, si) => (
                          <div key={su.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-3 items-end p-3 rounded-lg bg-muted/30 border">
                            <div className="space-y-1">
                              <Label className="text-xs">Upgrade Label</Label>
                              <Input className="h-8 text-sm" placeholder="e.g., Window Seat" value={su.label} onChange={(e) => updateFlightSeatUpgrade(index, si, 'label', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Seats Selected</Label>
                              <Input className="h-8 text-sm" type="number" placeholder="0" value={su.seatCount || ''} onChange={(e) => updateFlightSeatUpgrade(index, si, 'seatCount', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cost / Seat ({flight.currency})</Label>
                              <Input className="h-8 text-sm" type="number" placeholder="0" value={su.costPerSeat || ''} onChange={(e) => updateFlightSeatUpgrade(index, si, 'costPerSeat', parseFloat(e.target.value) || 0)} />
                            </div>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeFlightSeatUpgrade(index, si)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        {flight.seatUpgrades.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Seat upgrades subtotal: {formatCurrency(flight.seatUpgrades.reduce((s, u) => s + u.costPerSeat * u.seatCount, 0), flight.currency)}
                            {' '}= {formatCurrency(flight.seatUpgrades.reduce((s, u) => s + u.costPerSeat * u.seatCount, 0) * getCurrencyRate(flight.currency), 'INR')}
                          </p>
                        )}
                      </div>

                      {/* Meal Upgrades */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Meal Upgrades</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addFlightMealUpgrade(index)} className="h-7 text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Add Meal Upgrade
                          </Button>
                        </div>
                        {flight.mealUpgrades.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No meal upgrades. Add types like Veg Meal, Special Meal, etc.</p>
                        )}
                        {flight.mealUpgrades.map((mu, mi) => (
                          <div key={mu.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-3 items-end p-3 rounded-lg bg-muted/30 border">
                            <div className="space-y-1">
                              <Label className="text-xs">Meal Type</Label>
                              <Input className="h-8 text-sm" placeholder="e.g., Veg Meal" value={mu.label} onChange={(e) => updateFlightMealUpgrade(index, mi, 'label', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Meals Ordered</Label>
                              <Input className="h-8 text-sm" type="number" placeholder="0" value={mu.mealCount || ''} onChange={(e) => updateFlightMealUpgrade(index, mi, 'mealCount', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cost / Meal ({flight.currency})</Label>
                              <Input className="h-8 text-sm" type="number" placeholder="0" value={mu.costPerMeal || ''} onChange={(e) => updateFlightMealUpgrade(index, mi, 'costPerMeal', parseFloat(e.target.value) || 0)} />
                            </div>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeFlightMealUpgrade(index, mi)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        {flight.mealUpgrades.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Meal upgrades subtotal: {formatCurrency(flight.mealUpgrades.reduce((s, m) => s + m.costPerMeal * m.mealCount, 0), flight.currency)}
                            {' '}= {formatCurrency(flight.mealUpgrades.reduce((s, m) => s + m.costPerMeal * m.mealCount, 0) * getCurrencyRate(flight.currency), 'INR')}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2"><Label>Description / Notes</Label><Textarea placeholder="Additional flight details..." value={flight.description} onChange={(e) => updateFlightBasic(index, 'description', e.target.value)} rows={2} /></div>

                      <div className="pt-2 border-t flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Flight Total</p>
                        <p className="text-sm font-semibold text-primary">{formatCurrency(flight.totalCostINR, 'INR')}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Button type="button" variant="outline" className="w-full h-10 border-dashed" onClick={addFlight}>
            <Plus className="w-4 h-4 mr-2" /> Add Flight
          </Button>
        </CardContent>
      </Card>

      {/* Flights Section Total */}
      {flights.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Flights Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(flights.reduce((sum, f) => sum + f.totalCostINR, 0), 'INR')}
          </span>
        </div>
      )}

      {/* Transport - Buses */}
      <Card id="section-buses" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-primary" />
              Buses
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {buses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No buses added yet.</p>
          ) : (
            buses.map((bus, index) => {
              const isCollapsed = collapsedBuses[index] ?? false;
              const summary = bus.name || `Bus ${index + 1}`;
              const subSummary = [bus.seatingCapacity ? `${bus.seatingCapacity} seats` : '', bus.quantity ? `×${bus.quantity}` : '', bus.numberOfDays ? `${bus.numberOfDays} days` : ''].filter(Boolean).join(' · ');
              return (
                <div key={bus.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => setCollapsedBuses(prev => { const n = [...prev]; n[index] = !n[index]; return n; })}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <span className="font-medium text-sm truncate">{summary}</span>
                      {subSummary && <span className="text-xs text-muted-foreground hidden sm:inline">{subSummary}</span>}
                      {isCollapsed && bus.totalCostINR > 0 && <span className="text-xs text-primary ml-auto mr-2 shrink-0">{formatCurrency(bus.totalCostINR, 'INR')}</span>}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => deleteBus(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Bus Name/Type</Label><Input placeholder="e.g., Volvo AC Sleeper" value={bus.name} onChange={(e) => updateBus(index, 'name', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Seating Capacity</Label><Input type="number" placeholder="e.g., 45" value={bus.seatingCapacity || ''} onChange={(e) => updateBus(index, 'seatingCapacity', parseInt(e.target.value) || 0)} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Cost Per Bus</Label><Input type="number" placeholder="0" value={bus.costPerBus || ''} onChange={(e) => updateBus(index, 'costPerBus', parseFloat(e.target.value) || 0)} /></div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select value={bus.currency} onValueChange={(v) => updateBus(index, 'currency', v)} disabled={isLoadingMasterData}>
                            <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                            <SelectContent className="bg-popover">{currencies.map((c) => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Number of Days</Label><Input type="number" placeholder="0" value={bus.numberOfDays || ''} onChange={(e) => updateBus(index, 'numberOfDays', parseInt(e.target.value) || 0)} /></div>
                      </div>
                      <div className="space-y-2"><Label>Quantity (Number of Buses)</Label><Input type="number" placeholder="1" value={bus.quantity || ''} onChange={(e) => updateBus(index, 'quantity', parseInt(e.target.value) || 1)} /></div>
                      <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Route, timings, etc." value={bus.description} onChange={(e) => updateBus(index, 'description', e.target.value)} rows={2} /></div>
                      <div className="pt-2 border-t"><p className="text-sm font-semibold text-primary">Total: {formatCurrency(bus.totalCostINR, 'INR')}</p></div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Button type="button" variant="outline" className="w-full h-10 border-dashed" onClick={addBus}>
            <Plus className="w-4 h-4 mr-2" /> Add Bus
          </Button>
        </CardContent>
      </Card>

      {/* Buses Section Total */}
      {buses.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Buses Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(buses.reduce((sum, b) => sum + b.totalCostINR, 0), 'INR')}
          </span>
        </div>
      )}

      {/* Transport - Trains */}
      <Card id="section-trains" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Train className="w-5 h-5 text-primary" />
              Trains
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {trains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No trains added yet.</p>
          ) : (
            trains.map((train, index) => {
              const isCollapsed = collapsedTrains[index] ?? false;
              const summary = train.name || `Train ${index + 1}`;
              const subSummary = [train.trainNumber, train.class, train.timing].filter(Boolean).join(' · ');
              return (
                <div key={train.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => setCollapsedTrains(prev => { const n = [...prev]; n[index] = !n[index]; return n; })}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <span className="font-medium text-sm truncate">{summary}</span>
                      {subSummary && <span className="text-xs text-muted-foreground hidden sm:inline">{subSummary}</span>}
                      {isCollapsed && train.totalCostINR > 0 && <span className="text-xs text-primary ml-auto mr-2 shrink-0">{formatCurrency(train.totalCostINR, 'INR')}</span>}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTrain(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Train Name</Label><Input placeholder="e.g., Rajdhani Express" value={train.name} onChange={(e) => updateTrain(index, 'name', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Train Number</Label><Input placeholder="e.g., 12301" value={train.trainNumber} onChange={(e) => updateTrain(index, 'trainNumber', e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Class</Label><Input placeholder="e.g., 3AC, 2AC, Sleeper" value={train.class} onChange={(e) => updateTrain(index, 'class', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Timing</Label><Input placeholder="e.g., 08:00 - 14:00" value={train.timing} onChange={(e) => updateTrain(index, 'timing', e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Cost Per Person</Label><Input type="number" placeholder="0" value={train.costPerPerson || ''} onChange={(e) => updateTrain(index, 'costPerPerson', parseFloat(e.target.value) || 0)} /></div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select value={train.currency} onValueChange={(v) => updateTrain(index, 'currency', v)} disabled={isLoadingMasterData}>
                            <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                            <SelectContent className="bg-popover">{currencies.map((c) => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Route, additional details..." value={train.description} onChange={(e) => updateTrain(index, 'description', e.target.value)} rows={2} /></div>
                      <div className="pt-2 border-t"><p className="text-sm font-semibold text-primary">Total: {formatCurrency(train.totalCostINR, 'INR')}</p></div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Button type="button" variant="outline" className="w-full h-10 border-dashed" onClick={addTrain}>
            <Plus className="w-4 h-4 mr-2" /> Add Train
          </Button>
        </CardContent>
      </Card>

      {/* Trains Section Total */}
      {trains.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Trains Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(trains.reduce((sum, t) => sum + t.totalCostINR, 0), 'INR')}
          </span>
        </div>
      )}

      {/* Accommodation */}
      <Card id="section-accommodation" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HotelIcon className="w-5 h-5 text-primary" />
              Accommodation
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {accommodations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No accommodations added yet.</p>
          ) : (
            accommodations.map((accommodation, index) => {
              const isCollapsed = collapsedAccommodations[index] ?? false;
              const summary = accommodation.hotelName || accommodation.city || `Hotel ${index + 1}`;
              const subSummary = [accommodation.city, accommodation.numberOfNights ? `${accommodation.numberOfNights} nights` : ''].filter(Boolean).join(' · ');
              return (
                <div key={accommodation.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => setCollapsedAccommodations(prev => { const n = [...prev]; n[index] = !n[index]; return n; })}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <span className="font-medium text-sm truncate">{summary}</span>
                      {subSummary && <span className="text-xs text-muted-foreground hidden sm:inline">{subSummary}</span>}
                      {isCollapsed && accommodation.totalCostINR > 0 && <span className="text-xs text-primary ml-auto mr-2 shrink-0">{formatCurrency(accommodation.totalCostINR, 'INR')}</span>}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => deleteAccommodation(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-6 space-y-6">

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Select
                            value={accommodation.city || '__no_city__'}
                            onValueChange={(v) => {
                              if (v === '__no_city__') return;
                              setAccommodations(prev => {
                                const updated = [...prev];
                                updated[index] = { ...updated[index], city: v, hotelName: '' };
                                return updated;
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="__no_city__" disabled>Select city</SelectItem>
                              {formData.cities.map((city) => (
                                <SelectItem key={city.name} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Hotel</Label>
                          {(() => {
                            const cityObj = cities.find(c => c.name === accommodation.city);
                            const hotelsForCity = cityObj
                              ? hotelsMasterList.filter(h => h.cityid === cityObj.id)
                              : [];
                            return (
                              <div className="space-y-2">
                                <Select
                                  value={accommodation.hotelName || '__no_hotel__'}
                                  onValueChange={(v) => {
                                    if (v === '__no_hotel__') return;
                                    const selectedHotel = hotelsMasterList.find(h => h.hotelname === v);
                                    setAccommodations(prev => {
                                      const updated = [...prev];
                                      updated[index] = {
                                        ...updated[index],
                                        hotelName: v,
                                        breakfastIncluded: selectedHotel?.breakfastincluded ?? updated[index].breakfastIncluded,
                                      };
                                      return updated;
                                    });
                                  }}
                                  disabled={!accommodation.city}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!accommodation.city ? 'Select city first' : hotelsForCity.length === 0 ? 'No hotels — add one' : 'Select hotel'} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    <SelectItem value="__no_hotel__" disabled>Select hotel</SelectItem>
                                    {hotelsForCity.map(h => (
                                      <SelectItem key={h.id} value={h.hotelname}>
                                        {h.hotelname}{h.breakfastincluded ? ' ✓ Breakfast' : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {accommodation.city && (
                                  <button
                                    type="button"
                                    className="text-xs text-muted-foreground underline hover:text-primary"
                                    onClick={() => {
                                      setAddHotelDialogAccIndex(index);
                                      setAddHotelDialogForm({ hotelname: '', breakfastincluded: false, remarks: '' });
                                      setAddHotelDialogOpen(true);
                                    }}
                                  >
                                    {hotelsForCity.length === 0
                                      ? "No hotel found — add new hotel"
                                      : "Can't find your hotel? Add new hotel"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
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

                      {/* Allocation Mode selector - right after room types */}
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="text-base font-semibold">Room Allocation Method</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setAllocationModes(prev => ({ ...prev, [accommodation.id]: 'auto' }))}
                            className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left ${(allocationModes[accommodation.id] ?? 'auto') === 'auto' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/40'}`}
                          >
                            <span className="text-sm font-semibold flex items-center gap-2"><Calculator className="w-4 h-4" /> Auto Allocate</span>
                            <span className="text-xs text-muted-foreground">System allocates rooms based on preferences</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAllocationModes(prev => ({ ...prev, [accommodation.id]: 'manual' }));
                              const updated = [...accommodations];
                              updated[index] = {
                                ...updated[index],
                                roomAllocation: {
                                  ...updated[index].roomAllocation,
                                  breakdown: {
                                    boys: [], girls: [], maleFaculty: [], femaleFaculty: [],
                                    maleVXplorers: [], femaleVXplorers: [],
                                    commercialMale: [], commercialFemale: [], commercialOther: [],
                                    commercialMaleVXplorers: [], commercialFemaleVXplorers: [],
                                  },
                                  totalRooms: 0,
                                },
                                totalRooms: 0,
                                totalCost: 0,
                                totalCostINR: 0,
                              };
                              setAccommodations(updated);
                            }}
                            className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left ${allocationModes[accommodation.id] === 'manual' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/40'}`}
                          >
                            <span className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Manual Allocate</span>
                            <span className="text-xs text-muted-foreground">Set room counts yourself for each group</span>
                          </button>
                        </div>
                      </div>

                      {/* Room Preferences - only shown in auto mode */}
                      {(allocationModes[accommodation.id] ?? 'auto') === 'auto' && <div className="space-y-4 pt-4 border-t">
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

                            {/* Faculty Preference - same as students/vxplorers */}
                            <div className="space-y-2">
                              <Label className="text-sm">Faculty</Label>
                              <div className="flex flex-wrap gap-2">
                                {accommodation.roomTypes.map((rt) => (
                                  <Button
                                    key={rt.roomType}
                                    size="sm"
                                    variant={accommodation.roomPreferences?.faculty?.includes(rt.roomType.toLowerCase()) ? "default" : "outline"}
                                    onClick={() => {
                                      const currentPrefs = accommodation.roomPreferences?.faculty || [];
                                      const newPrefs = currentPrefs.includes(rt.roomType.toLowerCase())
                                        ? currentPrefs.filter(p => p !== rt.roomType.toLowerCase())
                                        : [...currentPrefs, rt.roomType.toLowerCase()];
                                      updateAccommodation(index, 'roomPreferences', {
                                        ...accommodation.roomPreferences,
                                        faculty: newPrefs
                                      });
                                    }}
                                  >
                                    {rt.roomType}
                                    {accommodation.roomPreferences?.faculty?.includes(rt.roomType.toLowerCase()) && (
                                      <Badge variant="secondary" className="ml-2">
                                        {accommodation.roomPreferences.faculty.indexOf(rt.roomType.toLowerCase()) + 1}
                                      </Badge>
                                    )}
                                  </Button>
                                ))}
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
                      </div>}

                      {/* Allocation Mode + controls */}
                      <div className="space-y-4 pt-4 border-t">
                        {/* Auto mode controls */}
                        {(allocationModes[accommodation.id] ?? 'auto') === 'auto' && (<>
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
                        </>)}

                        {(allocationModes[accommodation.id] === 'manual' || accommodation.roomAllocation?.breakdown) && (() => {
                          // For manual mode with no breakdown yet, seed empty breakdown structure
                          if (allocationModes[accommodation.id] === 'manual' && !accommodation.roomAllocation?.breakdown) {
                            const emptyBreakdown = {
                              boys: [], girls: [], maleFaculty: [], femaleFaculty: [],
                              maleVXplorers: [], femaleVXplorers: [],
                              commercialMale: [], commercialFemale: [], commercialOther: [],
                              commercialMaleVXplorers: [], commercialFemaleVXplorers: [],
                            };
                            const updated = [...accommodations];
                            updated[index] = { ...updated[index], roomAllocation: { ...updated[index].roomAllocation, breakdown: emptyBreakdown } };
                            setTimeout(() => setAccommodations(updated), 0);
                            return null;
                          }
                          // Build full rows for a group: always show ALL room types,
                          // merging auto-allocated rows with zeros for unallocated types
                          const buildFullRows = (
                            groupKey: keyof NonNullable<typeof accommodation.roomAllocation.breakdown>
                          ): import('@/types/trip').RoomTypeBreakdown[] => {
                            const existing = (accommodation.roomAllocation.breakdown![groupKey] as import('@/types/trip').RoomTypeBreakdown[]) || [];
                            return accommodation.roomTypes.map(rt => {
                              const found = existing.find(b => b.roomType.toLowerCase() === rt.roomType.toLowerCase());
                              return found ?? {
                                roomType: rt.roomType,
                                capacityPerRoom: rt.capacityPerRoom,
                                numberOfRooms: 0,
                                peopleAccommodated: 0,
                                costPerRoom: rt.costPerRoom,
                              };
                            });
                          };

                          // Helper to render a group's counter rows — always shows all room types
                          const RoomCounterGroup = ({
                            label,
                            totalPeople,
                            groupKey,
                          }: {
                            label: string;
                            totalPeople: number;
                            groupKey: keyof NonNullable<typeof accommodation.roomAllocation.breakdown>;
                          }) => {
                            if (totalPeople === 0) return null;
                            const rows = buildFullRows(groupKey);
                            const accommodated = rows.reduce((s, b) => s + b.peopleAccommodated, 0);
                            const isOver = accommodated > totalPeople;
                            const isUnder = accommodated < totalPeople;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-foreground">{label}</p>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOver ? 'bg-yellow-100 text-yellow-700' : isUnder ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                    {accommodated}/{totalPeople} people
                                  </span>
                                </div>
                                {rows.map((b, i) => {
                                  const isZero = b.numberOfRooms === 0;
                                  // Find the real index in the existing breakdown for updateRoomBreakdownCount
                                  const existing = (accommodation.roomAllocation.breakdown![groupKey] as import('@/types/trip').RoomTypeBreakdown[]) || [];
                                  const existingIndex = existing.findIndex(e => e.roomType.toLowerCase() === b.roomType.toLowerCase());
                                  return (
                                    <div key={b.roomType} className={`flex items-center justify-between bg-background border rounded-md px-3 py-2 ${isZero ? 'opacity-40' : ''}`}>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium">{b.roomType}</p>
                                        <p className="text-xs text-muted-foreground">{b.capacityPerRoom} per room · {b.numberOfRooms * b.capacityPerRoom} people</p>
                                      </div>
                                      <div className="flex items-center gap-2 ml-3">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 w-7 p-0"
                                          onClick={() => updateRoomBreakdownCount(index, groupKey, existingIndex >= 0 ? existingIndex : existing.length, -1, b)}
                                          disabled={b.numberOfRooms <= 0}
                                        >
                                          <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="text-sm font-bold w-6 text-center">{b.numberOfRooms}</span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 w-7 p-0"
                                          onClick={() => updateRoomBreakdownCount(index, groupKey, existingIndex >= 0 ? existingIndex : existing.length, 1, b)}
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-4 p-4 bg-muted rounded-lg">
                              <h4 className="font-semibold text-sm">Room Allocation Summary</h4>
                              <p className="text-xs text-muted-foreground -mt-2">All room types shown. Dimmed ones are at 0 — bump them up manually if needed.</p>

                              {tripType === 'institute' ? (
                                <>
                                  <RoomCounterGroup label={`Boys (${formData.boys} students)`} totalPeople={formData.boys} groupKey="boys" />
                                  <RoomCounterGroup label={`Girls (${formData.girls} students)`} totalPeople={formData.girls} groupKey="girls" />
                                  <RoomCounterGroup label={`Male Faculty (${formData.maleFaculty})`} totalPeople={formData.maleFaculty} groupKey="maleFaculty" />
                                  <RoomCounterGroup label={`Female Faculty (${formData.femaleFaculty})`} totalPeople={formData.femaleFaculty} groupKey="femaleFaculty" />
                                  <RoomCounterGroup label={`Male VXplorers (${formData.maleVXplorers})`} totalPeople={formData.maleVXplorers} groupKey="maleVXplorers" />
                                  <RoomCounterGroup label={`Female VXplorers (${formData.femaleVXplorers})`} totalPeople={formData.femaleVXplorers} groupKey="femaleVXplorers" />
                                </>
                              ) : (
                                <>
                                  <RoomCounterGroup label={`Male Participants (${formData.maleCount})`} totalPeople={formData.maleCount} groupKey="commercialMale" />
                                  <RoomCounterGroup label={`Female Participants (${formData.femaleCount})`} totalPeople={formData.femaleCount} groupKey="commercialFemale" />
                                  <RoomCounterGroup label={`Other Participants (${formData.otherCount})`} totalPeople={formData.otherCount} groupKey="commercialOther" />
                                  <RoomCounterGroup label={`Male VXplorers (${formData.commercialMaleVXplorers})`} totalPeople={formData.commercialMaleVXplorers} groupKey="commercialMaleVXplorers" />
                                  <RoomCounterGroup label={`Female VXplorers (${formData.commercialFemaleVXplorers})`} totalPeople={formData.commercialFemaleVXplorers} groupKey="commercialFemaleVXplorers" />
                                </>
                              )}

                              {/* Driver room toggle */}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={accommodation.driverRoom ?? false}
                                    onCheckedChange={(checked) => updateAccommodation(index, 'driverRoom' as any, checked)}
                                  />
                                  <div>
                                    <p className="text-xs font-semibold">Driver Room</p>
                                    <p className="text-xs text-muted-foreground">1 single room for driver</p>
                                  </div>
                                </div>
                                {accommodation.driverRoom && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">+1 Single Room</span>
                                )}
                              </div>

                              <div className="pt-2 border-t flex items-center justify-between">
                                <p className="text-sm font-semibold">Total Rooms</p>
                                <p className="text-sm font-bold text-primary">
                                  {accommodation.roomAllocation.totalRooms + (accommodation.driverRoom ? 1 : 0)}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm font-semibold text-primary">
                          Total Cost: {formatCurrency(accommodation.totalCostINR, 'INR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Button type="button" variant="outline" className="w-full h-10 border-dashed" onClick={addAccommodation}>
            <Plus className="w-4 h-4 mr-2" /> Add Hotel
          </Button>
        </CardContent>
      </Card>

      {/* Accommodation Section Total */}
      {accommodations.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Accommodation Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(accommodations.reduce((sum, a) => sum + a.totalCostINR, 0), 'INR')}
          </span>
        </div>
      )}

      {/* Meals */}
      <Card id="section-meals" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Meals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accommodations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Add accommodations first — meals are configured per hotel.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accommodations.map((acc) => {
                const totalPax = calculateTotalParticipants();
                const m = getHotelMealDefaults(acc.id, acc.currency);
                const costs = calculateHotelMealCost(acc.id, acc.numberOfNights, totalPax, acc.currency);

                return (
                  <div key={acc.id} className="border rounded-lg overflow-hidden">
                    {/* Hotel header */}
                    <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b">
                      <div className="flex items-center gap-2">
                        <HotelIcon className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{acc.hotelName || 'Unnamed Hotel'}</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">{acc.city}</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">{acc.numberOfNights} nights</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">{totalPax} pax</span>
                      </div>
                      {/* Currency selector */}
                      <Select
                        value={m.currency}
                        onValueChange={(v) => updateHotelMeal(acc.id, 'currency', v, acc.currency)}
                        disabled={isLoadingMasterData}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.code} className="text-xs">
                              {currency.code} ({currency.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Meal rows */}
                    <div className="divide-y">
                      {/* Header row */}
                      <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-3 px-4 py-2 bg-muted/20 text-xs font-medium text-muted-foreground">
                        <span>Meal</span>
                        <span>Cost / Person</span>
                        <span>Free Meal Pax</span>
                        <span className="text-right">Row Total (INR)</span>
                      </div>

                      {/* Breakfast */}
                      <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-3 items-center px-4 py-3">
                        <span className="text-sm font-medium flex items-center gap-1.5">🌅 Breakfast</span>
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          value={m.breakfastCostPerPerson || ''}
                          onChange={(e) => updateHotelMeal(acc.id, 'breakfastCostPerPerson', parseFloat(e.target.value) || 0, acc.currency)}
                        />
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          value={m.freeBreakfast || ''}
                          onChange={(e) => updateHotelMeal(acc.id, 'freeBreakfast', parseFloat(e.target.value) || 0, acc.currency)}
                        />
                        <span className="text-right text-sm font-medium">
                          {formatCurrency(costs.breakfastTotal * getCurrencyRate(m.currency), 'INR')}
                        </span>
                      </div>

                      {/* Lunch */}
                      <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-3 items-center px-4 py-3">
                        <span className="text-sm font-medium flex items-center gap-1.5">☀️ Lunch</span>
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          value={m.lunchCostPerPerson || ''}
                          onChange={(e) => updateHotelMeal(acc.id, 'lunchCostPerPerson', parseFloat(e.target.value) || 0, acc.currency)}
                        />
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          value={m.freeLunch || ''}
                          onChange={(e) => updateHotelMeal(acc.id, 'freeLunch', parseFloat(e.target.value) || 0, acc.currency)}
                        />
                        <span className="text-right text-sm font-medium">
                          {formatCurrency(costs.lunchTotal * getCurrencyRate(m.currency), 'INR')}
                        </span>
                      </div>

                      {/* Dinner */}
                      <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-3 items-center px-4 py-3">
                        <span className="text-sm font-medium flex items-center gap-1.5">🌙 Dinner</span>
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          value={m.dinnerCostPerPerson || ''}
                          onChange={(e) => updateHotelMeal(acc.id, 'dinnerCostPerPerson', parseFloat(e.target.value) || 0, acc.currency)}
                        />
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          value={m.freeDinner || ''}
                          onChange={(e) => updateHotelMeal(acc.id, 'freeDinner', parseFloat(e.target.value) || 0, acc.currency)}
                        />
                        <span className="text-right text-sm font-medium">
                          {formatCurrency(costs.dinnerTotal * getCurrencyRate(m.currency), 'INR')}
                        </span>
                      </div>

                      {/* Hotel subtotal */}
                      <div className="flex justify-between items-center px-4 py-3 bg-muted/20">
                        <span className="text-xs text-muted-foreground">
                          Formula: Cost × (Pax − Free Pax) × {acc.numberOfNights} nights
                        </span>
                        <span className="font-semibold text-sm">
                          Hotel Subtotal: {formatCurrency(costs.totalCostINR, 'INR')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Grand total */}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-base font-semibold">Total Meals Cost</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(calculateAllMealsCost(), 'INR')}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meals Section Total */}
      {accommodations.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Meals Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(calculateAllMealsCost(), 'INR')}
          </span>
        </div>
      )}

      {/* Activities */}
      <Card id="section-activities" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Activities & Sightseeing
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activities added yet.</p>
          ) : (
            activities.map((activity, index) => {
              const isCollapsed = collapsedActivities[index] ?? false;
              const summary = activity.name || `Activity ${index + 1}`;
              const subSummary = activity.city || '';
              return (
                <div key={activity.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => setCollapsedActivities(prev => { const n = [...prev]; n[index] = !n[index]; return n; })}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <span className="font-medium text-sm truncate">{summary}</span>
                      {subSummary && <span className="text-xs text-muted-foreground hidden sm:inline">{subSummary}</span>}
                      {isCollapsed && activity.totalCostINR > 0 && <span className="text-xs text-primary ml-auto mr-2 shrink-0">{formatCurrency(activity.totalCostINR, 'INR')}</span>}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => deleteActivity(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">

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
                                <SelectItem key={city.name} value={city.name}>
                                  {city.name}
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
                  )}
                </div>
              );
            })
          )}
          <Button type="button" variant="outline" className="w-full h-10 border-dashed" onClick={addActivity}>
            <Plus className="w-4 h-4 mr-2" /> Add Activity
          </Button>
        </CardContent>
      </Card>

      {/* Activities Section Total */}
      {activities.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Activities Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(activities.reduce((sum, a) => sum + a.totalCostINR, 0), 'INR')}
          </span>
        </div>
      )}

      {/* Visa, Tips and Insurance */}
      <Card id="section-extras" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Visa, Tips and Insurance
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

      {/* Visa, Tips & Insurance Section Total */}
      {(extras.visaTotalCostINR + extras.tipsTotalCostINR + extras.insuranceTotalCostINR) > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Visa, Tips & Insurance Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(extras.visaTotalCostINR + extras.tipsTotalCostINR + extras.insuranceTotalCostINR, 'INR')}
          </span>
        </div>
      )}

      {/* Overheads */}
      <Card id="section-overheads" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Overheads
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {overheads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No overheads added yet.</p>
          ) : (
            overheads.map((overhead, index) => {
              const isCollapsed = collapsedOverheads[index] ?? false;
              const summary = overhead.name || `Overhead ${index + 1}`;
              return (
                <div key={overhead.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => setCollapsedOverheads(prev => { const n = [...prev]; n[index] = !n[index]; return n; })}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <span className="font-medium text-sm truncate">{summary}</span>
                      {isCollapsed && overhead.totalCostINR > 0 && <span className="text-xs text-primary ml-auto mr-2 shrink-0">{formatCurrency(overhead.totalCostINR, 'INR')}</span>}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => deleteOverhead(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">

                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            placeholder="Contingency, Admin Fee, etc."
                            value={overhead.name}
                            onChange={(e) => updateOverhead(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cost Type</Label>
                          <Select
                            value={overhead.costType}
                            onValueChange={(v) => updateOverhead(index, 'costType', v as 'per_person' | 'lump_sum')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="per_person">Per Person</SelectItem>
                              <SelectItem value="lump_sum">Lump Sum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{overhead.costType === 'lump_sum' ? 'Total Amount' : 'Amount Per Participant'}</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={overhead.amountPerParticipant || ''}
                            onChange={(e) => updateOverhead(index, 'amountPerParticipant', parseFloat(e.target.value) || 0)}
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
                        <p className="text-sm text-muted-foreground">
                          {overhead.costType === 'lump_sum'
                            ? `Lump Sum: ${formatCurrency(overhead.amountPerParticipant, overhead.currency)}`
                            : `${formatCurrency(overhead.amountPerParticipant, overhead.currency)} × ${calculateTotalParticipants()} participants`
                          }
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          Total: {formatCurrency(overhead.totalCostINR, 'INR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Button type="button" variant="outline" className="w-full h-10 border-dashed" onClick={addOverhead}>
            <Plus className="w-4 h-4 mr-2" /> Add Overhead
          </Button>
        </CardContent>
      </Card>

      {/* Overheads Section Total */}
      {overheads.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-muted-foreground">Overheads Total</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(overheads.reduce((sum, o) => sum + o.totalCostINR, 0), 'INR')}
          </span>
        </div>
      )}

      {/* Cost Summary with GST and TCS */}
      <Card id="section-summary" className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* NEW: Admin Charges Input */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <Label className="text-sm font-semibold">Admin Charges</Label>
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
              Admin Charges will be added to subtotal before calculating GST and TCS
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
              <span className="text-muted-foreground">Visa, Tips and Insurance</span>
              <span className="font-semibold">{formatCurrency(totals.extras, 'INR')}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Overheads</span>
              <span className="font-semibold">{formatCurrency(totals.overheads, 'INR')}</span>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Subtotal (Before Admin Charges)</span>
              <span className="text-lg font-bold">{formatCurrency(totals.subtotalBeforeTax, 'INR')}</span>
            </div>

            {/* NEW: Admin Charges */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <BadgePercent className="w-4 h-4" />
                Admin Charges
              </span>
              <span className="font-semibold">{formatCurrency(totals.profit, 'INR')}</span>
            </div>

            {/* NEW: Admin Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Admin Subtotal (Subtotal + Admin Charges)</span>
              <span className="text-lg font-bold">{formatCurrency(totals.adminSubtotal, 'INR')}</span>
            </div>

            {/* GST */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <BadgePercent className="w-4 h-4" />
                GST ({totals.gstPercentage}%)
              </span>
              <span className="font-semibold">{formatCurrency(totals.gstAmount, 'INR')}</span>
            </div>

            {/* TCS (International only) */}
            {tripCategory === 'international' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <BadgePercent className="w-4 h-4" />
                  TCS ({totals.tcsPercentage}% on Subtotal + GST)
                </span>
                <span className="font-semibold">{formatCurrency(totals.tcsAmount, 'INR')}</span>
              </div>
            )}

            {/* TDS (FTI trips only) */}
            {tripType === 'fti' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <BadgePercent className="w-4 h-4" />
                  TDS ({totals.tdsPercentage}% deducted{tripCategory === 'international' ? ' on Subtotal + GST + TCS' : ' on Subtotal + GST'})
                </span>
                <span className="font-semibold text-destructive">- {formatCurrency(totals.tdsAmount, 'INR')}</span>
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

      {/* Add Hotel Dialog */}
      <Dialog open={addHotelDialogOpen} onOpenChange={(open) => { if (!open) setAddHotelDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Hotel to Master List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Hotel Name *</Label>
              <Input
                placeholder="e.g., Taj Mahal Palace"
                value={addHotelDialogForm.hotelname}
                onChange={(e) => setAddHotelDialogForm(prev => ({ ...prev, hotelname: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="dialogBreakfast"
                checked={addHotelDialogForm.breakfastincluded}
                onChange={(e) => setAddHotelDialogForm(prev => ({ ...prev, breakfastincluded: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="dialogBreakfast">Breakfast Included</Label>
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Input
                placeholder="e.g., Beachfront, city center..."
                value={addHotelDialogForm.remarks}
                onChange={(e) => setAddHotelDialogForm(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
            {addHotelDialogAccIndex !== null && (() => {
              const acc = accommodations[addHotelDialogAccIndex];
              const cityObj = cities.find(c => c.name === acc?.city);
              const countryObj = cityObj ? countries.find(co => co.id === cityObj.country_id) : null;
              return acc?.city ? (
                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  📍 Will be added for <strong>{acc.city}</strong>{countryObj ? `, ${countryObj.name}` : ''}
                </p>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddHotelDialogOpen(false)} disabled={isSavingNewHotel}>
              Cancel
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              disabled={isSavingNewHotel || !addHotelDialogForm.hotelname.trim()}
              onClick={async () => {
                const name = addHotelDialogForm.hotelname.trim();
                if (!name) { toast.error('Hotel name is required'); return; }
                if (addHotelDialogAccIndex === null) return;
                const acc = accommodations[addHotelDialogAccIndex];
                const cityObj = cities.find(c => c.name === acc?.city);
                const countryId = cityObj ? countries.find(co => co.id === cityObj.country_id)?.id : undefined;
                setIsSavingNewHotel(true);
                const result = await addHotel({
                  hotelname: name,
                  cityid: cityObj?.id,
                  countryid: countryId,
                  breakfastincluded: addHotelDialogForm.breakfastincluded,
                  remarks: addHotelDialogForm.remarks || undefined,
                });
                setIsSavingNewHotel(false);
                if (result.success && result.data) {
                  setHotelsMasterList(prev => [...prev, result.data!]);
                  updateAccommodation(addHotelDialogAccIndex, 'hotelName', result.data!.hotelname);
                  if (addHotelDialogForm.breakfastincluded) {
                    updateAccommodation(addHotelDialogAccIndex, 'breakfastIncluded', true);
                  }
                  toast.success('Hotel added to master list');
                  setAddHotelDialogOpen(false);
                } else {
                  toast.error('Failed to add hotel');
                }
              }}
            >
              {isSavingNewHotel ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : 'Add Hotel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

        </div>{/* end flex-1 content column */}
        </div>{/* end max-w-7xl flex row */}
      </div>{/* end scrollable body */}

      <TripSectionNavMobile />
    </div>
  );
}