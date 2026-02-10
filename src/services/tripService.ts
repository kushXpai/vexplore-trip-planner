// src/services/tripService.ts
import { supabase } from '@/supabase/client';
import type { 
  Trip,
  TripCategory,
  TripType,
  Flight, 
  Bus, 
  Train, 
  Accommodation, 
  Activity, 
  Overhead,
  Participants,
  TripExtras
} from '@/types/trip';

/**
 * Database Type Mappings
 * Maps from frontend types to database snake_case columns
 */

interface DbTrip {
  id?: string;
  name: string;
  institution: string;
  
  // NEW: Trip classification
  trip_category: TripCategory;
  trip_type: TripType;
  
  country: string;
  
  // CHANGED: Multi-city support (JSONB array)
  cities: string[];  // PostgreSQL JSONB array
  
  start_date: string;
  end_date: string;
  total_days: number;
  total_nights: number;
  
  default_currency: string;
  status: string;
  
  // Cost fields
  subtotal_before_tax: number;
  
  // NEW: Tax fields
  gst_percentage: number;
  gst_amount: number;
  tcs_percentage: number;
  tcs_amount: number;
  
  grand_total: number;
  grand_total_inr: number;
  cost_per_participant: number;
  
  created_by?: string;
}

interface DbParticipants {
  trip_id: string;
  
  // Institute trip fields
  boys: number;
  girls: number;
  male_faculty: number;
  female_faculty: number;
  male_vxplorers: number;
  female_vxplorers: number;
  
  // Commercial trip fields
  male_count: number;
  female_count: number;
  other_count: number;
  commercial_male_vxplorers: number;  // NEW
  commercial_female_vxplorers: number;  // NEW
  
  // Totals
  total_students: number;
  total_faculty: number;
  total_vxplorers: number;
  total_commercial: number;
  total_participants: number;
}

// NEW: Trip Extras interface
interface DbTripExtras {
  trip_id: string;
  
  // Visa
  visa_cost_per_person: number;
  visa_currency: string;
  visa_total_cost: number;
  visa_total_cost_inr: number;
  
  // Tips
  tips_cost_per_person: number;
  tips_currency: string;
  tips_total_cost: number;
  tips_total_cost_inr: number;
  
  // Insurance
  insurance_cost_per_person: number;
  insurance_currency: string;
  insurance_total_cost: number;
  insurance_total_cost_inr: number;
}

interface DbFlight {
  id?: string;
  trip_id: string;
  from_city: string;
  to_city: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  cost_per_person: number;
  currency: string;
  description: string;
  total_cost: number;
  total_cost_inr: number;
}

interface DbBus {
  id?: string;
  trip_id: string;
  name: string;
  seating_capacity: number;
  cost_per_bus: number;
  currency: string;
  number_of_days: number;
  quantity: number;
  description: string;
  total_cost: number;
  total_cost_inr: number;
}

interface DbTrain {
  id?: string;
  trip_id: string;
  name: string;
  train_number: string;
  class: string;
  timing: string;
  cost_per_person: number;
  currency: string;
  description: string;
  total_cost: number;
  total_cost_inr: number;
}

interface DbAccommodation {
  id?: string;
  trip_id: string;
  hotel_name: string;
  city: string;
  number_of_nights: number;
  currency: string;
  breakfast_included: boolean;
  total_rooms: number;
  total_cost: number;
  total_cost_inr: number;
  room_allocation?: any;  // JSONB
  room_types?: any;       // JSONB
  room_preferences?: any; // NEW: JSONB
}

interface DbActivity {
  id?: string;
  trip_id: string;
  name: string;
  city?: string;  // NEW: Optional city for multi-city trips
  entry_cost: number;
  transport_cost: number;
  guide_cost: number;
  currency: string;
  description: string;
  total_cost: number;
  total_cost_inr: number;
}

interface DbMeals {
  trip_id: string;
  breakfast_cost_per_person: number;
  lunch_cost_per_person: number;
  dinner_cost_per_person: number;
  currency: string;
  total_days: number;
  total_participants: number;
  daily_cost_per_person: number;
  total_cost: number;
  total_cost_inr: number;
}

interface DbOverhead {
  id?: string;
  trip_id: string;
  name: string;
  amount: number;
  currency: string;
  hide_from_client: boolean;
  total_cost_inr: number;
}

/**
 * Create a new trip with all related data
 */
export async function createTrip(tripData: {
  // Basic Info
  name: string;
  institution: string;
  tripCategory: TripCategory;  // NEW
  tripType: TripType;          // NEW
  country: string;
  cities: string[];            // CHANGED: Multi-city array
  startDate: string;
  endDate: string;
  totalDays: number;
  totalNights: number;
  defaultCurrency: string;     // CHANGED: defaultCurrency instead of currency
  
  // Participants
  participants: Participants;
  
  // Transport
  flights: Flight[];
  buses: Bus[];
  trains: Train[];
  
  // Accommodation
  accommodations: Accommodation[];
  
  // Meals
  meals: {
    breakfastCostPerPerson: number;
    lunchCostPerPerson: number;
    dinnerCostPerPerson: number;
    currency: string;
    totalDays: number;
    totalParticipants: number;
    dailyCostPerPerson: number;
    totalCost: number;
    totalCostINR: number;
  };
  
  // Activities
  activities: Activity[];
  
  // Overheads
  overheads: Overhead[];
  
  // NEW: Extras (visa, tips, insurance)
  extras?: TripExtras;
  
  // Costs
  subtotalBeforeTax: number;
  gstPercentage: number;
  gstAmount: number;
  tcsPercentage: number;
  tcsAmount: number;
  grandTotal: number;
  grandTotalINR: number;
  costPerParticipant: number;
}) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // 1. Create the main trip record
    const dbTrip: DbTrip = {
      name: tripData.name,
      institution: tripData.institution,
      trip_category: tripData.tripCategory,
      trip_type: tripData.tripType,
      country: tripData.country,
      cities: tripData.cities,  // JSONB array
      start_date: tripData.startDate,
      end_date: tripData.endDate,
      total_days: tripData.totalDays,
      total_nights: tripData.totalNights,
      default_currency: tripData.defaultCurrency,
      status: 'draft',
      subtotal_before_tax: tripData.subtotalBeforeTax,
      gst_percentage: tripData.gstPercentage,
      gst_amount: tripData.gstAmount,
      tcs_percentage: tripData.tcsPercentage,
      tcs_amount: tripData.tcsAmount,
      grand_total: tripData.grandTotal,
      grand_total_inr: tripData.grandTotalINR,
      cost_per_participant: tripData.costPerParticipant,
      created_by: user.id,
    };

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert(dbTrip)
      .select()
      .single();

    if (tripError) throw tripError;
    if (!trip) throw new Error('Failed to create trip');

    const tripId = trip.id;

    // 2. Create participants record
    const dbParticipants: DbParticipants = {
      trip_id: trip.id,
      boys: tripData.participants.boys,
      girls: tripData.participants.girls,
      male_faculty: tripData.participants.maleFaculty,
      female_faculty: tripData.participants.femaleFaculty,
      male_vxplorers: tripData.participants.maleVXplorers,
      female_vxplorers: tripData.participants.femaleVXplorers,
      male_count: tripData.participants.maleCount,
      female_count: tripData.participants.femaleCount,
      other_count: tripData.participants.otherCount,
      commercial_male_vxplorers: tripData.participants.commercialMaleVXplorers,  // NEW
      commercial_female_vxplorers: tripData.participants.commercialFemaleVXplorers,  // NEW
      total_students: tripData.participants.totalStudents,
      total_faculty: tripData.participants.totalFaculty,
      total_vxplorers: tripData.participants.totalVXplorers,
      total_commercial: tripData.participants.totalCommercial,
      total_participants: tripData.participants.totalParticipants,
    };

    const { error: participantsError } = await supabase
      .from('trip_participants')
      .insert(dbParticipants);

    if (participantsError) throw participantsError;

    // 3. Insert extras (visa, tips, insurance) if provided
    if (tripData.extras) {
      const dbExtras: DbTripExtras = {
        trip_id: tripId,
        visa_cost_per_person: tripData.extras.visaCostPerPerson,
        visa_currency: tripData.extras.visaCurrency,
        visa_total_cost: tripData.extras.visaTotalCost,
        visa_total_cost_inr: tripData.extras.visaTotalCostINR,
        tips_cost_per_person: tripData.extras.tipsCostPerPerson,
        tips_currency: tripData.extras.tipsCurrency,
        tips_total_cost: tripData.extras.tipsTotalCost,
        tips_total_cost_inr: tripData.extras.tipsTotalCostINR,
        insurance_cost_per_person: tripData.extras.insuranceCostPerPerson,
        insurance_currency: tripData.extras.insuranceCurrency,
        insurance_total_cost: tripData.extras.insuranceTotalCost,
        insurance_total_cost_inr: tripData.extras.insuranceTotalCostINR,
      };

      const { error: extrasError } = await supabase
        .from('trip_extras')
        .insert(dbExtras);

      if (extrasError) throw extrasError;
    }

    // 4. Insert flights
    if (tripData.flights.length > 0) {
      const dbFlights: DbFlight[] = tripData.flights.map(flight => ({
        trip_id: tripId,
        from_city: flight.from,
        to_city: flight.to,
        airline: flight.airline,
        flight_number: flight.flightNumber,
        departure_time: flight.departureTime,
        arrival_time: flight.arrivalTime,
        cost_per_person: flight.costPerPerson,
        currency: flight.currency,
        description: flight.description || '',
        total_cost: flight.totalCost,
        total_cost_inr: flight.totalCostINR,
      }));

      const { error: flightsError } = await supabase
        .from('trip_flights')
        .insert(dbFlights);

      if (flightsError) throw flightsError;
    }

    // 5. Insert buses
    if (tripData.buses.length > 0) {
      const dbBuses: DbBus[] = tripData.buses.map(bus => ({
        trip_id: tripId,
        name: bus.name,
        seating_capacity: bus.seatingCapacity,
        cost_per_bus: bus.costPerBus,
        currency: bus.currency,
        number_of_days: bus.numberOfDays,
        quantity: bus.quantity,
        description: bus.description || '',
        total_cost: bus.totalCost,
        total_cost_inr: bus.totalCostINR,
      }));

      const { error: busesError } = await supabase
        .from('trip_buses')
        .insert(dbBuses);

      if (busesError) throw busesError;
    }

    // 6. Insert trains
    if (tripData.trains.length > 0) {
      const dbTrains: DbTrain[] = tripData.trains.map(train => ({
        trip_id: tripId,
        name: train.name,
        train_number: train.trainNumber,
        class: train.class,
        timing: train.timing,
        cost_per_person: train.costPerPerson,
        currency: train.currency,
        description: train.description || '',
        total_cost: train.totalCost,
        total_cost_inr: train.totalCostINR,
      }));

      const { error: trainsError } = await supabase
        .from('trip_trains')
        .insert(dbTrains);

      if (trainsError) throw trainsError;
    }

    // 7. Insert accommodations
    if (tripData.accommodations.length > 0) {
      const dbAccommodations: DbAccommodation[] = tripData.accommodations.map(acc => ({
        trip_id: tripId,
        hotel_name: acc.hotelName,
        city: acc.city,
        number_of_nights: acc.numberOfNights,
        currency: acc.currency,
        breakfast_included: acc.breakfastIncluded,
        total_rooms: acc.totalRooms,
        total_cost: acc.totalCost,
        total_cost_inr: acc.totalCostINR,
        room_allocation: acc.roomAllocation,
        room_types: acc.roomTypes,
        room_preferences: acc.roomPreferences,  // NEW
      }));

      const { error: accommodationsError } = await supabase
        .from('trip_accommodations')
        .insert(dbAccommodations);

      if (accommodationsError) throw accommodationsError;
    }

    // 8. Insert meals
    const dbMeals: DbMeals = {
      trip_id: tripId,
      breakfast_cost_per_person: tripData.meals.breakfastCostPerPerson,
      lunch_cost_per_person: tripData.meals.lunchCostPerPerson,
      dinner_cost_per_person: tripData.meals.dinnerCostPerPerson,
      currency: tripData.meals.currency,
      total_days: tripData.meals.totalDays,
      total_participants: tripData.meals.totalParticipants,
      daily_cost_per_person: tripData.meals.dailyCostPerPerson,
      total_cost: tripData.meals.totalCost,
      total_cost_inr: tripData.meals.totalCostINR,
    };

    const { error: mealsError } = await supabase
      .from('trip_meals')
      .insert(dbMeals);

    if (mealsError) throw mealsError;

    // 9. Insert activities
    if (tripData.activities.length > 0) {
      const dbActivities: DbActivity[] = tripData.activities.map(activity => ({
        trip_id: tripId,
        name: activity.name,
        city: activity.city,  // NEW: Optional city
        entry_cost: activity.entryCost,
        transport_cost: activity.transportCost,
        guide_cost: activity.guideCost,
        currency: activity.currency,
        description: activity.description || '',
        total_cost: activity.totalCost,
        total_cost_inr: activity.totalCostINR,
      }));

      const { error: activitiesError } = await supabase
        .from('trip_activities')
        .insert(dbActivities);

      if (activitiesError) throw activitiesError;
    }

    // 10. Insert overheads
    if (tripData.overheads.length > 0) {
      const dbOverheads: DbOverhead[] = tripData.overheads.map(overhead => ({
        trip_id: tripId,
        name: overhead.name,
        amount: overhead.amount,
        currency: overhead.currency,
        hide_from_client: overhead.hideFromClient,
        total_cost_inr: overhead.totalCostINR,
      }));

      const { error: overheadsError } = await supabase
        .from('trip_overheads')
        .insert(dbOverheads);

      if (overheadsError) throw overheadsError;
    }

    return { success: true, tripId };
  } catch (error) {
    console.error('Error creating trip:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Update an existing trip with all related data
 */
export async function updateTrip(tripId: string, tripData: Parameters<typeof createTrip>[0]) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // 1. Update the main trip record
    const dbTrip: Omit<DbTrip, 'created_by'> = {
      name: tripData.name,
      institution: tripData.institution,
      trip_category: tripData.tripCategory,
      trip_type: tripData.tripType,
      country: tripData.country,
      cities: tripData.cities,
      start_date: tripData.startDate,
      end_date: tripData.endDate,
      total_days: tripData.totalDays,
      total_nights: tripData.totalNights,
      default_currency: tripData.defaultCurrency,
      status: 'draft',
      subtotal_before_tax: tripData.subtotalBeforeTax,
      gst_percentage: tripData.gstPercentage,
      gst_amount: tripData.gstAmount,
      tcs_percentage: tripData.tcsPercentage,
      tcs_amount: tripData.tcsAmount,
      grand_total: tripData.grandTotal,
      grand_total_inr: tripData.grandTotalINR,
      cost_per_participant: tripData.costPerParticipant,
    };

    const { error: tripError } = await supabase
      .from('trips')
      .update(dbTrip)
      .eq('id', tripId);

    if (tripError) throw tripError;

    // 2. Update participants (upsert)
    const dbParticipants: DbParticipants = {
      trip_id: tripId,
      boys: tripData.participants.boys,
      girls: tripData.participants.girls,
      male_faculty: tripData.participants.maleFaculty,
      female_faculty: tripData.participants.femaleFaculty,
      male_vxplorers: tripData.participants.maleVXplorers,
      female_vxplorers: tripData.participants.femaleVXplorers,
      male_count: tripData.participants.maleCount,
      female_count: tripData.participants.femaleCount,
      other_count: tripData.participants.otherCount,
      commercial_male_vxplorers: tripData.participants.commercialMaleVXplorers,  // NEW
      commercial_female_vxplorers: tripData.participants.commercialFemaleVXplorers,  // NEW
      total_students: tripData.participants.totalStudents,
      total_faculty: tripData.participants.totalFaculty,
      total_vxplorers: tripData.participants.totalVXplorers,
      total_commercial: tripData.participants.totalCommercial,
      total_participants: tripData.participants.totalParticipants,
    };

    const { error: participantsError } = await supabase
      .from('trip_participants')
      .upsert(dbParticipants, { onConflict: 'trip_id' });

    if (participantsError) throw participantsError;

    // NEW: Update extras (upsert) - if provided
    if (tripData.extras) {
      const dbExtras: DbTripExtras = {
        trip_id: tripId,
        visa_cost_per_person: tripData.extras.visaCostPerPerson,
        visa_currency: tripData.extras.visaCurrency,
        visa_total_cost: tripData.extras.visaTotalCost,
        visa_total_cost_inr: tripData.extras.visaTotalCostINR,
        tips_cost_per_person: tripData.extras.tipsCostPerPerson,
        tips_currency: tripData.extras.tipsCurrency,
        tips_total_cost: tripData.extras.tipsTotalCost,
        tips_total_cost_inr: tripData.extras.tipsTotalCostINR,
        insurance_cost_per_person: tripData.extras.insuranceCostPerPerson,
        insurance_currency: tripData.extras.insuranceCurrency,
        insurance_total_cost: tripData.extras.insuranceTotalCost,
        insurance_total_cost_inr: tripData.extras.insuranceTotalCostINR,
      };

      const { error: extrasError } = await supabase
        .from('trip_extras')
        .upsert(dbExtras, { onConflict: 'trip_id' });

      if (extrasError) throw extrasError;
    }

    // 4. Delete and re-insert flights
    await supabase.from('trip_flights').delete().eq('trip_id', tripId);
    if (tripData.flights.length > 0) {
      const dbFlights: DbFlight[] = tripData.flights.map(flight => ({
        trip_id: tripId,
        from_city: flight.from,
        to_city: flight.to,
        airline: flight.airline,
        flight_number: flight.flightNumber,
        departure_time: flight.departureTime,
        arrival_time: flight.arrivalTime,
        cost_per_person: flight.costPerPerson,
        currency: flight.currency,
        description: flight.description || '',
        total_cost: flight.totalCost,
        total_cost_inr: flight.totalCostINR,
      }));
      await supabase.from('trip_flights').insert(dbFlights);
    }

    // 5. Delete and re-insert buses
    await supabase.from('trip_buses').delete().eq('trip_id', tripId);
    if (tripData.buses.length > 0) {
      const dbBuses: DbBus[] = tripData.buses.map(bus => ({
        trip_id: tripId,
        name: bus.name,
        seating_capacity: bus.seatingCapacity,
        cost_per_bus: bus.costPerBus,
        currency: bus.currency,
        number_of_days: bus.numberOfDays,
        quantity: bus.quantity,
        description: bus.description || '',
        total_cost: bus.totalCost,
        total_cost_inr: bus.totalCostINR,
      }));
      await supabase.from('trip_buses').insert(dbBuses);
    }

    // 6. Delete and re-insert trains
    await supabase.from('trip_trains').delete().eq('trip_id', tripId);
    if (tripData.trains.length > 0) {
      const dbTrains: DbTrain[] = tripData.trains.map(train => ({
        trip_id: tripId,
        name: train.name,
        train_number: train.trainNumber,
        class: train.class,
        timing: train.timing,
        cost_per_person: train.costPerPerson,
        currency: train.currency,
        description: train.description || '',
        total_cost: train.totalCost,
        total_cost_inr: train.totalCostINR,
      }));
      await supabase.from('trip_trains').insert(dbTrains);
    }

    // 7. Delete and re-insert accommodations
    await supabase.from('trip_accommodations').delete().eq('trip_id', tripId);
    if (tripData.accommodations.length > 0) {
      const dbAccommodations: DbAccommodation[] = tripData.accommodations.map(acc => ({
        trip_id: tripId,
        hotel_name: acc.hotelName,
        city: acc.city,
        number_of_nights: acc.numberOfNights,
        currency: acc.currency,
        breakfast_included: acc.breakfastIncluded,
        total_rooms: acc.totalRooms,
        total_cost: acc.totalCost,
        total_cost_inr: acc.totalCostINR,
        room_allocation: acc.roomAllocation,
        room_types: acc.roomTypes,
        room_preferences: acc.roomPreferences,
      }));
      await supabase.from('trip_accommodations').insert(dbAccommodations);
    }

    // 8. Update meals (upsert)
    const dbMeals: DbMeals = {
      trip_id: tripId,
      breakfast_cost_per_person: tripData.meals.breakfastCostPerPerson,
      lunch_cost_per_person: tripData.meals.lunchCostPerPerson,
      dinner_cost_per_person: tripData.meals.dinnerCostPerPerson,
      currency: tripData.meals.currency,
      total_days: tripData.meals.totalDays,
      total_participants: tripData.meals.totalParticipants,
      daily_cost_per_person: tripData.meals.dailyCostPerPerson,
      total_cost: tripData.meals.totalCost,
      total_cost_inr: tripData.meals.totalCostINR,
    };

    const { error: mealsError } = await supabase
      .from('trip_meals')
      .upsert(dbMeals, { onConflict: 'trip_id' });

    if (mealsError) throw mealsError;

    // 9. Delete and re-insert activities
    await supabase.from('trip_activities').delete().eq('trip_id', tripId);
    if (tripData.activities.length > 0) {
      const dbActivities: DbActivity[] = tripData.activities.map(activity => ({
        trip_id: tripId,
        name: activity.name,
        city: activity.city,
        entry_cost: activity.entryCost,
        transport_cost: activity.transportCost,
        guide_cost: activity.guideCost,
        currency: activity.currency,
        description: activity.description || '',
        total_cost: activity.totalCost,
        total_cost_inr: activity.totalCostINR,
      }));
      await supabase.from('trip_activities').insert(dbActivities);
    }

    // 10. Delete and re-insert overheads
    await supabase.from('trip_overheads').delete().eq('trip_id', tripId);
    if (tripData.overheads.length > 0) {
      const dbOverheads: DbOverhead[] = tripData.overheads.map(overhead => ({
        trip_id: tripId,
        name: overhead.name,
        amount: overhead.amount,
        currency: overhead.currency,
        hide_from_client: overhead.hideFromClient,
        total_cost_inr: overhead.totalCostINR,
      }));
      await supabase.from('trip_overheads').insert(dbOverheads);
    }

    return { success: true, tripId };
  } catch (error) {
    console.error('Error updating trip:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Fetch a trip by ID with all related data
 */
export async function getTripById(tripId: string) {
  try {
    // Fetch main trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;
    if (!trip) throw new Error('Trip not found');

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from('trip_participants')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    if (participantsError) throw participantsError;

    // Fetch extras
    const { data: extras, error: extrasError } = await supabase
      .from('trip_extras')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    // Don't throw error if extras not found (optional)
    if (extrasError && extrasError.code !== 'PGRST116') throw extrasError;

    // Fetch flights
    const { data: flights, error: flightsError } = await supabase
      .from('trip_flights')
      .select('*')
      .eq('trip_id', tripId);

    if (flightsError) throw flightsError;

    // Fetch buses
    const { data: buses, error: busesError } = await supabase
      .from('trip_buses')
      .select('*')
      .eq('trip_id', tripId);

    if (busesError) throw busesError;

    // Fetch trains
    const { data: trains, error: trainsError } = await supabase
      .from('trip_trains')
      .select('*')
      .eq('trip_id', tripId);

    if (trainsError) throw trainsError;

    // Fetch accommodations
    const { data: accommodations, error: accommodationsError } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId);

    if (accommodationsError) throw accommodationsError;

    // Fetch meals
    const { data: meals, error: mealsError } = await supabase
      .from('trip_meals')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    if (mealsError && mealsError.code !== 'PGRST116') throw mealsError;

    // Fetch activities
    const { data: activities, error: activitiesError } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId);

    if (activitiesError) throw activitiesError;

    // Fetch overheads
    const { data: overheads, error: overheadsError } = await supabase
      .from('trip_overheads')
      .select('*')
      .eq('trip_id', tripId);

    if (overheadsError) throw overheadsError;

    // Transform to frontend format
    return {
      success: true,
      data: {
        trip,
        participants,
        extras: extras || null,  // NEW
        flights: flights || [],
        buses: buses || [],
        trains: trains || [],
        accommodations: accommodations || [],
        meals: meals || null,
        activities: activities || [],
        overheads: overheads || [],
      }
    };
  } catch (error) {
    console.error('Error fetching trip:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Delete a trip and all related data
 */
export async function deleteTrip(tripId: string) {
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting trip:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch all trips for the current user
 */
export async function getUserTrips() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (tripsError) throw tripsError;

    return { success: true, data: trips || [] };
  } catch (error) {
    console.error('Error fetching trips:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: []
    };
  }
}