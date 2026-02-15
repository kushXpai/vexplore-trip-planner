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

export const getCountryCurrency = (countries: Country[], countryId: string): string => {
  const country = countries.find(c => c.id === countryId);
  return country?.default_currency ?? 'INR';
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
  gstPercentage?: number,
  tcsPercentage?: number
): Promise<{
  subtotal: number;
  profit: number;
  adminSubtotal: number;
  gstAmount: number;
  tcsAmount: number;
  grandTotal: number;
  gstPercentage: number;
  tcsPercentage: number;
}> => {
  // Fetch current rates from database if not provided
  const actualGstPercentage = gstPercentage ?? await getCurrentGSTRate();
  const actualTcsPercentage = tcsPercentage ?? await getCurrentTCSRate();

  // Admin subtotal = base subtotal + profit
  const adminSubtotal = subtotal + profit;
  
  // Calculate GST on admin subtotal (subtotal + profit)
  const gstAmount = calculateGST(adminSubtotal, actualGstPercentage);
  const subtotalPlusGST = adminSubtotal + gstAmount;
  
  // TCS only applies to international trips
  const tcsAmount = isInternational ? calculateTCS(subtotalPlusGST, actualTcsPercentage) : 0;
  
  const grandTotal = subtotalPlusGST + tcsAmount;

  return {
    subtotal,
    profit,
    adminSubtotal,
    gstAmount,
    tcsAmount,
    grandTotal,
    gstPercentage: actualGstPercentage,
    tcsPercentage: actualTcsPercentage,
  };
};