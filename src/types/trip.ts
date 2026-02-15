// src/types/trip.ts

/* =========================
   Auth / User Types
========================= */

export type UserRole = 'superadmin' | 'admin' | 'manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/* =========================
   Trip Classification
========================= */

export type TripCategory = 'domestic' | 'international';
export type TripType = 'institute' | 'commercial';

/* =========================
   Trip & Status
========================= */

export type TripStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'locked';

export interface Trip {
  id: string;
  name: string;
  institution: string;
  
  tripCategory: TripCategory;
  tripType: TripType;
  
  // CHANGED: Now supports multiple countries
  countries: string[];
  
  cities: string[];
  
  startDate: string;
  endDate: string;
  totalDays: number;
  totalNights: number;
  
  defaultCurrency: string;
  
  status: TripStatus;

  participants: Participants;
  transport: Transport;
  accommodation: Accommodation[];
  meals: Meals;
  activities: Activity[];
  overheads: Overhead[];
  
  extras?: TripExtras;

  subtotalBeforeTax: number;
  profit: number;

  gstPercentage: number;
  gstAmount: number;
  tcsPercentage: number;
  tcsAmount: number;
  
  grandTotal: number;
  grandTotalINR: number;
  costPerParticipant: number;

  createdAt: string;
  updatedAt: string;

  analysis?: PostTripAnalysis;
}

/* =========================
   Trip Extras (Visa, Tips, Insurance)
========================= */

export interface TripExtras {
  visaCostPerPerson: number;
  visaCurrency: string;
  visaTotalCost: number;
  visaTotalCostINR: number;
  
  tipsCostPerPerson: number;
  tipsCurrency: string;
  tipsTotalCost: number;
  tipsTotalCostINR: number;

  insuranceCostPerPerson: number;
  insuranceCurrency: string;
  insuranceTotalCost: number;
  insuranceTotalCostINR: number;
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
  
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  commercialMaleVXplorers: number;
  commercialFemaleVXplorers: number;

  totalStudents: number;
  totalFaculty: number;
  totalVXplorers: number;
  totalCommercial: number;
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

export interface RoomPreferences {
  students?: string[];
  faculty?: string[];
  vxplorers?: string[];
  participants?: string[];
  commercialVXplorers?: string[];
}

export interface Accommodation {
  id: string;
  hotelName: string;
  city: string;
  numberOfNights: number;
  roomTypes: RoomTypeConfig[];
  
  roomPreferences: RoomPreferences;
  
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

  commercialMaleRooms: number;
  commercialFemaleRooms: number;
  commercialOtherRooms: number;
  commercialMaleVXplorerRooms: number;
  commercialFemaleVXplorerRooms: number;
  
  totalRooms: number;
  breakdown?: {
    boys: RoomTypeBreakdown[];
    girls: RoomTypeBreakdown[];
    maleFaculty: RoomTypeBreakdown[];
    femaleFaculty: RoomTypeBreakdown[];
    maleVXplorers: RoomTypeBreakdown[];
    femaleVXplorers: RoomTypeBreakdown[];
    
    commercialMale: RoomTypeBreakdown[];
    commercialFemale: RoomTypeBreakdown[];
    commercialOther: RoomTypeBreakdown[];
    commercialMaleVXplorers: RoomTypeBreakdown[];
    commercialFemaleVXplorers: RoomTypeBreakdown[];
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
   Meals
========================= */

export interface Meals {
  breakfastCostPerPerson: number;
  lunchCostPerPerson: number;
  dinnerCostPerPerson: number;
  currency: string;
  totalDays: number;
  totalParticipants: number;
  dailyCostPerPerson: number;
  totalCost: number;
  totalCostINR: number;
}

/* =========================
   Activities
========================= */

export interface Activity {
  id: string;
  name: string;
  city?: string;
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
  amountPerParticipant: number;
  currency: string;
  hideFromClient: boolean;
  totalCost: number;
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

/* =========================
   NEW: Tax Rates
========================= */

export interface TaxRate {
  id: string;
  rate_type: 'gst' | 'tcs';
  rate_percentage: number;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}