// src/services/masterDataService.ts
import { supabase } from '@/supabase/client';
import type { TaxRate } from '@/types/trip';

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

// Fetch all currencies
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

// Fetch all countries
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

// Fetch all cities
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

// Fetch cities by country
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

// Fetch all hotels
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

// Fetch hotels by city
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

// Fetch hotels by country
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

// Add a new hotel to master data
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

// NEW: Fetch cities by multiple countries
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
// TAX RATES FUNCTIONS - Using TaxRate type from trip.ts
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

// Helper functions
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
  return `${symbol}${amount.toLocaleString('en-IN')}`;
};

// UPDATED: Now accepts multiple countries and returns the first country's currency or INR
export const getCountryCurrency = (countries: Country[], countryIds: string[]): string => {
  if (!countryIds || countryIds.length === 0) {
    return 'INR';
  }
  
  const country = countries.find(c => c.id === countryIds[0]);
  return country?.default_currency ?? 'INR';
};

// NEW: Get currencies for multiple countries
export const getCountriesCurrencies = (countries: Country[], countryIds: string[]): string[] => {
  if (!countryIds || countryIds.length === 0) {
    return ['INR'];
  }
  
  const currencies = countryIds
    .map(countryId => {
      const country = countries.find(c => c.id === countryId);
      return country?.default_currency ?? null;
    })
    .filter((currency): currency is string => currency !== null);
  
  return currencies.length > 0 ? currencies : ['INR'];
};

/**
 * Calculate GST amount
 */
export const calculateGST = (subtotal: number, gstPercentage: number): number => {
  return (subtotal * gstPercentage) / 100;
};

/**
 * Calculate TCS amount - Only for international trips
 */
export const calculateTCS = (subtotalPlusGST: number, tcsPercentage: number): number => {
  return (subtotalPlusGST * tcsPercentage) / 100;
};

/**
 * Calculate grand total with GST and TCS
 * UPDATED: Now fetches current rates from database if not provided
 * @param subtotal - Total cost before taxes
 * @param profit - Profit amount
 * @param isInternational - Whether the trip is international
 * @param gstPercentage - GST percentage (optional, fetches from DB if not provided)
 * @param tcsPercentage - TCS percentage (optional, fetches from DB if not provided)
 * @returns Object with breakdown of costs
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
  // Fetch current rates from database if not provided
  const actualGstPercentage = gstPercentage ?? await getCurrentGSTRate();
  const actualTcsPercentage = tcsPercentage ?? await getCurrentTCSRate();
  const actualTdsPercentage = tdsPercentage ?? (isFTI ? await getCurrentTDSRate() : 0);

  // Admin subtotal = base subtotal + profit
  const adminSubtotal = subtotal + profit;

  // Calculate GST on admin subtotal
  const gstAmount = calculateGST(adminSubtotal, actualGstPercentage);
  const subtotalPlusGST = adminSubtotal + gstAmount;

  // TCS only applies to international trips
  const tcsAmount = isInternational ? calculateTCS(subtotalPlusGST, actualTcsPercentage) : 0;
  const subtotalPlusGSTPlusTCS = subtotalPlusGST + tcsAmount;

  // TDS only applies to FTI trips (deducted at end)
  // Domestic FTI: TDS on (subtotal + GST)
  // International FTI: TDS on (subtotal + GST + TCS)
  const tdsBaseAmount = isFTI ? subtotalPlusGSTPlusTCS : 0;
  const tdsAmount = isFTI ? (tdsBaseAmount * actualTdsPercentage) / 100 : 0;

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