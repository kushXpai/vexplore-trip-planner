// src/types/trip.ts

/* =========================
   Auth / User Types
========================= */

export type UserRole = 'admin' | 'manager';

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
  | 'completed'
  | 'locked';

export interface Trip {
  id: string;
  name: string;
  institution: string;
  
  // NEW: Trip classification
  tripCategory: TripCategory;  // domestic or international
  tripType: TripType;          // institute or commercial
  
  country: string;
  
  // CHANGED: Multi-city support (array of city names)
  cities: string[];  // ["Paris", "Lyon", "Nice"]
  
  startDate: string;
  endDate: string;
  totalDays: number;
  totalNights: number;
  
  // Default currency for the trip
  defaultCurrency: string;
  
  status: TripStatus;

  participants: Participants;
  transport: Transport;
  accommodation: Accommodation[];
  meals: Meals;
  activities: Activity[];
  overheads: Overhead[];
  
  // NEW: Extras (visa, tips, insurance)
  extras?: TripExtras;

  // Cost calculations
  subtotalBeforeTax: number;
  
  // NEW: Tax fields
  gstPercentage: number;
  gstAmount: number;
  tcsPercentage: number;  // Only for international
  tcsAmount: number;      // Only for international
  
  grandTotal: number;
  grandTotalINR: number;
  costPerParticipant: number;

  createdAt: string;
  updatedAt: string;

  analysis?: PostTripAnalysis;
}

/* =========================
   NEW: Trip Extras (Visa, Tips, Insurance)
========================= */

export interface TripExtras {
  // Visa (international only)
  visaCostPerPerson: number;
  visaCurrency: string;
  visaTotalCost: number;
  visaTotalCostINR: number;
  
  // Tips (international only)
  tipsCostPerPerson: number;
  tipsCurrency: string;
  tipsTotalCost: number;
  tipsTotalCostINR: number;
  
  // Insurance (both domestic and international)
  insuranceCostPerPerson: number;
  insuranceCurrency: string;
  insuranceTotalCost: number;
  insuranceTotalCostINR: number;
}

/* =========================
   Participants - UPDATED
========================= */

export interface Participants {
  // For INSTITUTE trips
  boys: number;
  girls: number;
  maleFaculty: number;
  femaleFaculty: number;
  maleVXplorers: number;
  femaleVXplorers: number;
  
  // For COMMERCIAL trips
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  commercialMaleVXplorers: number;  // NEW: Male VXplorers in commercial trips
  commercialFemaleVXplorers: number;  // NEW: Female VXplorers in commercial trips

  // Totals
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
  currency: string;  // Each item can have its own currency
  description: string;
  totalCost: number;
  totalCostINR: number;
}

export interface Bus {
  id: string;
  name: string;
  seatingCapacity: number;
  costPerBus: number;
  currency: string;  // Each item can have its own currency
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
  currency: string;  // Each item can have its own currency
  description: string;
  totalCost: number;
  totalCostINR: number;
}

/* =========================
   Accommodation - UPDATED
========================= */

export interface RoomTypeConfig {
  roomType: string;
  capacityPerRoom: number;
  costPerRoom: number;
}

// NEW: Room preferences for allocation
// NEW: Room preferences for allocation
export interface RoomPreferences {
  students?: string[];      // For institute: boys + girls combined
  faculty?: string[];       // For institute: always ["single"]
  vxplorers?: string[];     // For institute: male + female VXplorers combined
  participants?: string[];  // For commercial: male + female + other combined
  commercialVXplorers?: string[];  // For commercial: male + female VXplorers combined
}

export interface Accommodation {
  id: string;
  hotelName: string;
  city: string;  // Which city in the multi-city itinerary
  numberOfNights: number;
  roomTypes: RoomTypeConfig[];
  
  // NEW: Room preferences
  roomPreferences: RoomPreferences;
  
  currency: string;  // Each hotel can have its own currency
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
  
  // Commercial trip allocations
  commercialMaleRooms: number;
  commercialFemaleRooms: number;
  commercialOtherRooms: number;
  commercialMaleVXplorerRooms: number;  // NEW
  commercialFemaleVXplorerRooms: number;  // NEW
  
  totalRooms: number;
  breakdown?: {
    boys: RoomTypeBreakdown[];
    girls: RoomTypeBreakdown[];
    maleFaculty: RoomTypeBreakdown[];
    femaleFaculty: RoomTypeBreakdown[];
    maleVXplorers: RoomTypeBreakdown[];
    femaleVXplorers: RoomTypeBreakdown[];
    
    // NEW: Commercial breakdowns
    // Commercial breakdowns
    commercialMale: RoomTypeBreakdown[];
    commercialFemale: RoomTypeBreakdown[];
    commercialOther: RoomTypeBreakdown[];
    commercialMaleVXplorers: RoomTypeBreakdown[];  // NEW
    commercialFemaleVXplorers: RoomTypeBreakdown[];  // NEW
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
  currency: string;  // Can have its own currency
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
  city?: string;  // NEW: Which city in multi-city itinerary (optional)
  entryCost: number;
  transportCost: number;
  guideCost: number;
  currency: string;  // Each activity can have its own currency
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
  currency: string;  // Each overhead can have its own currency
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