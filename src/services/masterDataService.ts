// src/services/masterDataService.ts
import { supabase } from '@/supabase/client';

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
 * Calculate GST amount (5% of subtotal)
 */
export const calculateGST = (subtotal: number, gstPercentage: number = 5): number => {
  return (subtotal * gstPercentage) / 100;
};

/**
 * Calculate TCS amount (5% of subtotal + GST) - Only for international trips
 */
export const calculateTCS = (subtotalPlusGST: number, tcsPercentage: number = 5): number => {
  return (subtotalPlusGST * tcsPercentage) / 100;
};

/**
 * Calculate grand total with GST and TCS
 * @param subtotal - Total cost before taxes
 * @param isInternational - Whether the trip is international
 * @returns Object with breakdown of costs
 */
export const calculateGrandTotal = (
  subtotal: number,
  isInternational: boolean,
  gstPercentage: number = 5,
  tcsPercentage: number = 5
): {
  subtotal: number;
  gstAmount: number;
  tcsAmount: number;
  grandTotal: number;
} => {
  const gstAmount = calculateGST(subtotal, gstPercentage);
  const subtotalPlusGST = subtotal + gstAmount;
  
  // TCS only applies to international trips
  const tcsAmount = isInternational ? calculateTCS(subtotalPlusGST, tcsPercentage) : 0;
  
  const grandTotal = subtotalPlusGST + tcsAmount;

  return {
    subtotal,
    gstAmount,
    tcsAmount,
    grandTotal,
  };
};