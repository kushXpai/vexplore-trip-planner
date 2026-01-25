// src/services/tripService.ts
import { supabase } from '@/supabase/client';
import type { 
  Trip, 
  Flight, 
  Bus, 
  Train, 
  Accommodation, 
  Activity, 
  Overhead,
  Participants 
} from '@/types/trip';

/**
 * Database Type Mappings
 * Maps from frontend types to database snake_case columns
 */

interface DbTrip {
  id?: string;
  name: string;
  institution: string;
  country: string;
  city: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_nights: number;
  currency: string;
  status: string;
  total_cost: number;
  total_cost_inr: number;
  cost_per_student: number;
  created_by?: string;
}

interface DbParticipants {
  trip_id: string;
  boys: number;
  girls: number;
  male_faculty: number;
  female_faculty: number;
  male_vxplorers: number;
  female_vxplorers: number;
  total_students: number;
  total_faculty: number;
  total_vxplorers: number;
  total_participants: number;
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
  cost_per_room: number;
  currency: string;
  breakfast_included: boolean;
  total_rooms: number;
  total_cost: number;
  total_cost_inr: number;
}

interface DbActivity {
  id?: string;
  trip_id: string;
  name: string;
  entry_cost: number;
  transport_cost: number;
  guide_cost: number;
  currency: string;
  description: string;
  total_cost: number;
  total_cost_inr: number;
}

/**
 * Create a new trip with all related data
 */
export async function createTrip(tripData: {
  // Basic Info
  name: string;
  institution: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalNights: number;
  currency: string;
  
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
    lunchCostPerPerson: number;
    dinnerCostPerPerson: number;
    currency: string;
    totalDays: number;
    totalParticipants: number;
    dailyCost: number;
    totalCost: number;
    totalCostINR: number;
  };
  
  // Activities
  activities: Activity[];
  
  // Overheads
  overheads: Overhead[];
  
  // Totals
  totalCost: number;
  totalCostINR: number;
  costPerStudent: number;
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
      country: tripData.country,
      city: tripData.city,
      start_date: tripData.startDate,
      end_date: tripData.endDate,
      total_days: tripData.totalDays,
      total_nights: tripData.totalNights,
      currency: tripData.currency,
      status: 'draft',
      total_cost: tripData.totalCost,
      total_cost_inr: tripData.totalCostINR,
      cost_per_student: tripData.costPerStudent,
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

    // 2. Insert participants
    const dbParticipants: DbParticipants = {
      trip_id: tripId,
      boys: tripData.participants.boys,
      girls: tripData.participants.girls,
      male_faculty: tripData.participants.maleFaculty,
      female_faculty: tripData.participants.femaleFaculty,
      male_vxplorers: tripData.participants.maleVXplorers,
      female_vxplorers: tripData.participants.femaleVXplorers,
      total_students: tripData.participants.totalStudents,
      total_faculty: tripData.participants.totalFaculty,
      total_vxplorers: tripData.participants.totalVXplorers,
      total_participants: tripData.participants.totalParticipants,
    };

    const { error: participantsError } = await supabase
      .from('trip_participants')
      .insert(dbParticipants);

    if (participantsError) throw participantsError;

    // 3. Insert flights
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

    // 4. Insert buses
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

    // 5. Insert trains
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

    // 6. Insert accommodations
    if (tripData.accommodations.length > 0) {
      const dbAccommodations: DbAccommodation[] = tripData.accommodations.map(acc => ({
        trip_id: tripId,
        hotel_name: acc.hotelName,
        city: acc.city,
        number_of_nights: acc.numberOfNights,
        cost_per_room: acc.costPerRoom,
        currency: acc.currency,
        breakfast_included: acc.breakfastIncluded,
        total_rooms: acc.totalRooms,
        total_cost: acc.totalCost,
        total_cost_inr: acc.totalCostINR,
      }));

      const { error: accommodationsError } = await supabase
        .from('trip_accommodations')
        .insert(dbAccommodations);

      if (accommodationsError) throw accommodationsError;
    }

    // 7. Insert activities
    if (tripData.activities.length > 0) {
      const dbActivities: DbActivity[] = tripData.activities.map(activity => ({
        trip_id: tripId,
        name: activity.name,
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

    // Note: Meals and Overheads tables don't exist in your schema
    // You may want to add these tables or handle them differently
    // For now, they will be stored in the total costs

    return { success: true, tripId: trip.id, trip };
  } catch (error) {
    console.error('Error creating trip:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Update an existing trip
 */
export async function updateTrip(
  tripId: string,
  tripData: Parameters<typeof createTrip>[0]
) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // 1. Update the main trip record
    const dbTrip: Partial<DbTrip> = {
      name: tripData.name,
      institution: tripData.institution,
      country: tripData.country,
      city: tripData.city,
      start_date: tripData.startDate,
      end_date: tripData.endDate,
      total_days: tripData.totalDays,
      total_nights: tripData.totalNights,
      currency: tripData.currency,
      total_cost: tripData.totalCost,
      total_cost_inr: tripData.totalCostINR,
      cost_per_student: tripData.costPerStudent,
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
      total_students: tripData.participants.totalStudents,
      total_faculty: tripData.participants.totalFaculty,
      total_vxplorers: tripData.participants.totalVXplorers,
      total_participants: tripData.participants.totalParticipants,
    };

    const { error: participantsError } = await supabase
      .from('trip_participants')
      .upsert(dbParticipants, { onConflict: 'trip_id' });

    if (participantsError) throw participantsError;

    // 3. Delete and re-insert flights
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

    // 4. Delete and re-insert buses
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

    // 5. Delete and re-insert trains
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

    // 6. Delete and re-insert accommodations
    await supabase.from('trip_accommodations').delete().eq('trip_id', tripId);
    if (tripData.accommodations.length > 0) {
      const dbAccommodations: DbAccommodation[] = tripData.accommodations.map(acc => ({
        trip_id: tripId,
        hotel_name: acc.hotelName,
        city: acc.city,
        number_of_nights: acc.numberOfNights,
        cost_per_room: acc.costPerRoom,
        currency: acc.currency,
        breakfast_included: acc.breakfastIncluded,
        total_rooms: acc.totalRooms,
        total_cost: acc.totalCost,
        total_cost_inr: acc.totalCostINR,
      }));
      await supabase.from('trip_accommodations').insert(dbAccommodations);
    }

    // 7. Delete and re-insert activities
    await supabase.from('trip_activities').delete().eq('trip_id', tripId);
    if (tripData.activities.length > 0) {
      const dbActivities: DbActivity[] = tripData.activities.map(activity => ({
        trip_id: tripId,
        name: activity.name,
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

    // Fetch activities
    const { data: activities, error: activitiesError } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId);

    if (activitiesError) throw activitiesError;

    // Transform to frontend format
    return {
      success: true,
      data: {
        trip,
        participants,
        flights: flights || [],
        buses: buses || [],
        trains: trains || [],
        accommodations: accommodations || [],
        activities: activities || [],
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