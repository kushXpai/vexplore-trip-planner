// src/services/masterDataService.ts
import { supabase } from '@/supabase/client';
import type { TaxRate, PackageOccupancyRow, TripPackageCost } from '@/types/trip';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate_to_inr: number;
  effective_date: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  default_currency: string;
}

export interface City {
  id: string;
  name: string;
  country_id: string;
}

export interface Hotel {
  id: string;
  hotelname: string;
  countryid: string | null;
  cityid: string | null;
  breakfastincluded: boolean;
  remarks: string | null;
  createdat: string;
  updatedat: string;
}

export interface Restaurant {
  id: string;
  name: string;
  city?: string | null;
  country_id?: string | null;
  city_id?: string | null;
  /** '1'–'5' */
  star_rating?: string | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// CURRENCIES
// =====================================================

export const fetchCurrencies = async () => {
  const { data, error } = await supabase
    .from('currencies')
    .select('*')
    .order('code');

  if (error) {
    console.error('Error fetching currencies:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

// =====================================================
// COUNTRIES
// =====================================================

export const fetchCountries = async () => {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching countries:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

// =====================================================
// CITIES
// =====================================================

export const fetchCities = async () => {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching cities:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

export const fetchCitiesByCountry = async (countryId: string) => {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('country_id', countryId)
    .order('name');

  if (error) {
    console.error('Error fetching cities by country:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

export const fetchCitiesByCountries = async (countryIds: string[]) => {
  if (!countryIds || countryIds.length === 0) {
    return { success: true, data: [], error: null };
  }

  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .in('country_id', countryIds)
    .order('name');

  if (error) {
    console.error('Error fetching cities by countries:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

// =====================================================
// HOTELS
// =====================================================

export const fetchHotels = async () => {
  const { data, error } = await supabase
    .from('hotel')
    .select('*')
    .order('hotelname');

  if (error) {
    console.error('Error fetching hotels:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

export const fetchHotelsByCity = async (cityId: string) => {
  const { data, error } = await supabase
    .from('hotel')
    .select('*')
    .eq('cityid', cityId)
    .order('hotelname');

  if (error) {
    console.error('Error fetching hotels by city:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

export const fetchHotelsByCountry = async (countryId: string) => {
  const { data, error } = await supabase
    .from('hotel')
    .select('*')
    .eq('countryid', countryId)
    .order('hotelname');

  if (error) {
    console.error('Error fetching hotels by country:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

export const addHotel = async (hotel: {
  hotelname: string;
  countryid?: string;
  cityid?: string;
  breakfastincluded?: boolean;
  remarks?: string;
}) => {
  const { data, error } = await supabase
    .from('hotel')
    .insert({
      hotelname: hotel.hotelname,
      countryid: hotel.countryid || null,
      cityid: hotel.cityid || null,
      breakfastincluded: hotel.breakfastincluded ?? false,
      remarks: hotel.remarks || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding hotel:', error);
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
};

// =====================================================
// RESTAURANTS
// =====================================================

export const fetchRestaurants = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching restaurants:', error);
    return { success: false, data: null, error };
  }
  return { success: true, data: data as Restaurant[], error: null };
};

export const fetchRestaurantsByCity = async (cityId: string) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('city_id', cityId)
    .order('name');

  if (error) {
    console.error('Error fetching restaurants by city:', error);
    return { success: false, data: null, error };
  }
  return { success: true, data: data as Restaurant[], error: null };
};

export const addRestaurant = async (restaurant: {
  name: string;
  city?: string;
  country_id?: string;
  city_id?: string;
  star_rating?: string;
  remarks?: string;
}) => {
  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name: restaurant.name,
      city: restaurant.city || null,
      country_id: restaurant.country_id || null,
      city_id: restaurant.city_id || null,
      star_rating: restaurant.star_rating || null,
      remarks: restaurant.remarks || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding restaurant:', error);
    return { success: false, data: null, error };
  }
  return { success: true, data: data as Restaurant, error: null };
};

// =====================================================
// TAX RATES
// =====================================================

/**
 * Get current GST rate from database
 */
export const getCurrentGSTRate = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('tax_rates')
    .select('rate_percentage')
    .eq('rate_type', 'gst')
    .eq('is_current', true)
    .single();

  if (error) {
    console.error('Error fetching current GST rate:', error);
    return 5; // Fallback to 5%
  }

  return data?.rate_percentage ?? 5;
};

/**
 * Get current TCS rate from database
 */
export const getCurrentTCSRate = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('tax_rates')
    .select('rate_percentage')
    .eq('rate_type', 'tcs')
    .eq('is_current', true)
    .single();

  if (error) {
    console.error('Error fetching current TCS rate:', error);
    return 5; // Fallback to 5%
  }

  return data?.rate_percentage ?? 5;
};

/**
 * Get current TDS rate from database
 */
export const getCurrentTDSRate = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('tax_rates')
    .select('rate_percentage')
    .eq('rate_type', 'tds')
    .eq('is_current', true)
    .single();

  if (error) {
    console.error('Error fetching current TDS rate:', error);
    return 2; // Fallback to 2%
  }

  return data?.rate_percentage ?? 2;
};

// =====================================================
// CURRENCY HELPERS
// =====================================================

export const getCurrencyRate = (currencies: Currency[], code: string): number => {
  const currency = currencies.find(c => c.code === code);
  return currency?.rate_to_inr ?? 1;
};

export const convertToINR = (currencies: Currency[], amount: number, currencyCode: string): number => {
  return amount * getCurrencyRate(currencies, currencyCode);
};

export const formatCurrency = (currencies: Currency[], amount: number, currencyCode: string): string => {
  const currency = currencies.find(c => c.code === currencyCode);
  const symbol = currency?.symbol ?? '₹';
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// =====================================================
// COUNTRY / CURRENCY HELPERS
// =====================================================

/**
 * Returns the default currency for the first country in the list, or INR.
 */
export const getCountryCurrency = (countries: Country[], countryIds: string[]): string => {
  if (!countryIds || countryIds.length === 0) return 'INR';
  const country = countries.find(c => c.id === countryIds[0]);
  return country?.default_currency ?? 'INR';
};

/**
 * Returns an array of default currencies for the given country IDs.
 */
export const getCountriesCurrencies = (countries: Country[], countryIds: string[]): string[] => {
  if (!countryIds || countryIds.length === 0) return ['INR'];

  const currencies = countryIds
    .map(countryId => {
      const country = countries.find(c => c.id === countryId);
      return country?.default_currency ?? null;
    })
    .filter((currency): currency is string => currency !== null);

  return currencies.length > 0 ? currencies : ['INR'];
};

// =====================================================
// TAX CALCULATION HELPERS
// =====================================================

/**
 * Calculate GST amount
 */
export const calculateGST = (subtotal: number, gstPercentage: number): number => {
  return (subtotal * gstPercentage) / 100;
};

/**
 * Calculate TCS amount — only for international trips
 */
export const calculateTCS = (subtotalPlusGST: number, tcsPercentage: number): number => {
  return (subtotalPlusGST * tcsPercentage) / 100;
};

/**
 * Calculate the full grand total with GST, TCS, and optional TDS.
 *
 * Fetches current tax rates from the database when not explicitly provided.
 *
 * @param subtotal         - Total cost before profit
 * @param profit           - Profit amount
 * @param isInternational  - Whether the trip is international (TCS applies)
 * @param isFTI            - Whether this is an FTI trip (TDS applies)
 * @param gstPercentage    - Override GST %; fetched from DB if omitted
 * @param tcsPercentage    - Override TCS %; fetched from DB if omitted
 * @param tdsPercentage    - Override TDS %; fetched from DB if omitted
 */
export const calculateGrandTotal = async (
  subtotal: number,
  profit: number,
  isInternational: boolean,
  isFTI: boolean = false,
  gstPercentage?: number,
  tcsPercentage?: number,
  tdsPercentage?: number
): Promise<{
  subtotal: number;
  profit: number;
  adminSubtotal: number;
  gstAmount: number;
  tcsAmount: number;
  tdsAmount: number;
  grandTotal: number;
  gstPercentage: number;
  tcsPercentage: number;
  tdsPercentage: number;
}> => {
  const actualGstPercentage = gstPercentage ?? (await getCurrentGSTRate());
  const actualTcsPercentage = tcsPercentage ?? (await getCurrentTCSRate());
  const actualTdsPercentage = tdsPercentage ?? (isFTI ? await getCurrentTDSRate() : 0);

  // Admin subtotal = base subtotal + profit
  const adminSubtotal = subtotal + profit;

  // GST on admin subtotal
  const gstAmount = calculateGST(adminSubtotal, actualGstPercentage);
  const subtotalPlusGST = adminSubtotal + gstAmount;

  // TCS only on international trips
  const tcsAmount = isInternational ? calculateTCS(subtotalPlusGST, actualTcsPercentage) : 0;
  const subtotalPlusGSTPlusTCS = subtotalPlusGST + tcsAmount;

  // TDS only on FTI trips — deducted at the end
  // Domestic FTI: TDS on (subtotal + GST)
  // International FTI: TDS on (subtotal + GST + TCS)
  const tdsAmount = isFTI
    ? (subtotalPlusGSTPlusTCS * actualTdsPercentage) / 100
    : 0;

  const grandTotal = subtotalPlusGSTPlusTCS - tdsAmount;

  return {
    subtotal,
    profit,
    adminSubtotal,
    gstAmount,
    tcsAmount,
    tdsAmount,
    grandTotal,
    gstPercentage: actualGstPercentage,
    tcsPercentage: actualTcsPercentage,
    tdsPercentage: actualTdsPercentage,
  };
};

// =====================================================
// PACKAGE COST UTILITIES  (Tour Planner mode)
// =====================================================

/**
 * Recalculate the derived fields for a single occupancy row.
 * Call this every time occupancySize, costPerRoom, or roomCount changes.
 */
export const calcOccupancyRow = (
  row: Omit<PackageOccupancyRow, 'peopleCovered' | 'rowCost'>
): PackageOccupancyRow => ({
  ...row,
  peopleCovered: row.occupancySize * row.roomCount,
  rowCost: row.costPerRoom * row.roomCount,
});

/**
 * Aggregate all occupancy rows into a TripPackageCost summary.
 *
 * @param rows         - Array of fully-calculated PackageOccupancyRows
 * @param currencyCode - The trip's default currency code
 * @param currencies   - Full currency list (from fetchCurrencies)
 */
export const calcPackageCost = (
  rows: PackageOccupancyRow[],
  currencyCode: string,
  currencies: Currency[]
): TripPackageCost => {
  const totalPeople  = rows.reduce((sum, r) => sum + r.peopleCovered, 0);
  const totalCost    = rows.reduce((sum, r) => sum + r.rowCost, 0);
  const totalCostINR = convertToINR(currencies, totalCost, currencyCode);
  const costPerPerson = totalPeople > 0 ? totalCost / totalPeople : 0;

  return { rows, totalPeople, totalCost, totalCostINR, costPerPerson };
};

/**
 * Validate that the total people covered by all occupancy rows
 * equals the trip's total participants.
 *
 * @returns { valid: true } on success, or { valid: false, message: string } on failure.
 */
export const validateOccupancyTotal = (
  rows: PackageOccupancyRow[],
  totalParticipants: number
): { valid: boolean; message?: string } => {
  const covered = rows.reduce((sum, r) => sum + r.peopleCovered, 0);

  if (covered !== totalParticipants) {
    return {
      valid: false,
      message: `People covered by occupancy rows (${covered}) must equal total participants (${totalParticipants}).`,
    };
  }

  return { valid: true };
};

/**
 * Build a blank occupancy row with sensible defaults.
 * Pass a client-generated id (e.g. crypto.randomUUID()).
 */
export const createBlankOccupancyRow = (id: string): PackageOccupancyRow => ({
  id,
  occupancySize: 2,
  costPerRoom: 0,
  roomCount: 1,
  peopleCovered: 2,   // 2 × 1
  rowCost: 0,         // 0 × 1
});