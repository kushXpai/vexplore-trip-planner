// src/types/trip.ts

/* =========================
   Auth / User Types
========================= */

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/* =========================
   Trip & Status
========================= */

export type TripStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'completed'
  | 'locked';

export interface Trip {
  id: string;
  name: string;
  institution: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalNights: number;
  currency: string;
  status: TripStatus;

  participants: Participants;
  transport: Transport;
  accommodation: Accommodation[];
  meals: Meals;
  activities: Activity[];
  overheads: Overhead[];

  totalCost: number;
  totalCostINR: number;
  costPerStudent: number;

  createdAt: string;
  updatedAt: string;

  analysis?: PostTripAnalysis;
}

/* =========================
   Participants
========================= */

export interface Participants {
  boys: number;
  girls: number;
  maleFaculty: number;
  femaleFaculty: number;
  maleVXplorers: number;
  femaleVXplorers: number;

  totalStudents: number;
  totalFaculty: number;
  totalVXplorers: number;
  totalParticipants: number;
}

/* =========================
   Transport
========================= */

export interface Transport {
  flights: Flight[];
  buses: Bus[];
  trains: Train[];
}

export interface Flight {
  id: string;
  from: string;
  to: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  costPerPerson: number;
  currency: string;
  description: string;
  totalCost: number;
  totalCostINR: number;
}

export interface Bus {
  id: string;
  name: string;
  seatingCapacity: number;
  costPerBus: number;
  currency: string;
  numberOfDays: number;
  quantity: number;
  description: string;
  totalCost: number;
  totalCostINR: number;
}

export interface Train {
  id: string;
  name: string;
  trainNumber: string;
  class: string;
  timing: string;
  costPerPerson: number;
  currency: string;
  description: string;
  totalCost: number;
  totalCostINR: number;
}

/* =========================
   Accommodation
========================= */

export interface RoomTypeConfig {
  roomType: string;
  capacityPerRoom: number;
  costPerRoom: number;
}

export interface Accommodation {
  id: string;
  hotelName: string;
  city: string;
  numberOfNights: number;
  roomTypes: RoomTypeConfig[];
  currency: string;
  breakfastIncluded: boolean;
  roomAllocation: RoomAllocation;
  totalRooms: number;
  totalCost: number;
  totalCostINR: number;
}

export interface RoomAllocation {
  boysRooms: number;
  girlsRooms: number;
  maleFacultyRooms: number;
  femaleFacultyRooms: number;
  maleVXplorerRooms: number;
  femaleVXplorerRooms: number;
  totalRooms: number;
  breakdown?: {
    boys: RoomTypeBreakdown[];
    girls: RoomTypeBreakdown[];
    maleFaculty: RoomTypeBreakdown[];
    femaleFaculty: RoomTypeBreakdown[];
    maleVXplorers: RoomTypeBreakdown[];
    femaleVXplorers: RoomTypeBreakdown[];
  };
}

export interface RoomTypeBreakdown {
  roomType: string;
  capacityPerRoom: number;
  numberOfRooms: number;
  peopleAccommodated: number;
  costPerRoom: number;
}

/* =========================
   Meals - UPDATED WITH BREAKFAST
========================= */

export interface Meals {
  breakfastCostPerPerson: number;  // NEW FIELD - Cost of breakfast per person
  lunchCostPerPerson: number;
  dinnerCostPerPerson: number;
  currency: string;
  totalDays: number;
  totalParticipants: number;
  dailyCostPerPerson: number;  // breakfast + lunch + dinner
  totalCost: number;            // dailyCostPerPerson * totalDays * totalParticipants
  totalCostINR: number;
}

/* =========================
   Activities
========================= */

export interface Activity {
  id: string;
  name: string;
  entryCost: number;
  transportCost: number;
  guideCost: number;
  currency: string;
  description: string;
  totalCost: number;
  totalCostINR: number;
}

/* =========================
   Overheads
========================= */

export interface Overhead {
  id: string;
  name: string;
  amount: number;
  currency: string;
  hideFromClient: boolean;
  totalCostINR: number;
}

/* =========================
   Post-Trip Analysis
========================= */

export interface PostTripAnalysis {
  categories: AnalysisCategory[];
  totalExpected: number;
  totalActual: number;
  profitLoss: number;
  profitLossPercentage: number;
  varianceExplanation: string;
  isFinalized: boolean;
}

export interface AnalysisCategory {
  name: string;
  expected: number;
  actual: number;
  difference: number;
  variancePercentage: number;
}

/* =========================
   Master Data
========================= */

export interface Country {
  id: string;
  name: string;
  code: string;
  defaultCurrency: string;
}

export interface City {
  id: string;
  name: string;
  countryId: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rateToINR: number;
  effectiveDate: string;
}

export interface Institution {
  id: string;
  name: string;
  type: 'school' | 'college';
  city: string;
}