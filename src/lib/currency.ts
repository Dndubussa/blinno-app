/**
 * Currency formatting utilities for internationalization
 */

// Supported currencies and their locales
const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'en-EU',
  GBP: 'en-GB',
  TZS: 'en-TZ',
  KES: 'en-KE',
  UGX: 'en-UG',
  RWF: 'en-RW',
  NGN: 'en-NG',
};

// Default currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  TZS: 'TSh',
  KES: 'KSh',
  UGX: 'USh',
  RWF: 'RWF',
  NGN: '₦',
};

// Currency conversion rates (relative to USD) - approximate rates
export const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.85,    // 1 USD = 0.85 EUR
  GBP: 0.75,    // 1 USD = 0.75 GBP
  TZS: 2500,    // 1 USD = 2500 TZS (approximate)
  KES: 110,     // 1 USD = 110 KES
  UGX: 3700,    // 1 USD = 3700 UGX
  RWF: 1100,    // 1 USD = 1100 RWF
  NGN: 1500,    // 1 USD = 1500 NGN (approximate)
};

/**
 * Convert amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = CURRENCY_RATES[fromCurrency] || 1;
  const toRate = CURRENCY_RATES[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Format price with currency based on user's locale/currency preference
 * @param price - The amount to format
 * @param currency - The currency code (e.g., 'TZS', 'USD')
 * @param locale - Optional locale override
 * @returns Formatted currency string
 */
export function formatPrice(price: number, currency: string = 'USD', locale?: string): string {
  try {
    // Use provided locale or default to currency-based locale
    const formatLocale = locale || CURRENCY_LOCALES[currency] || 'en-US';
    
    // Format with Intl.NumberFormat
    return new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  } catch (error) {
    // Fallback to simple formatting if Intl fails
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

/**
 * Get currency symbol for a given currency code
 * @param currency - The currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Get supported currencies
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_LOCALES);
}

/**
 * Get locale for a given currency
 * @param currency - The currency code
 * @returns Locale string
 */
export function getCurrencyLocale(currency: string): string {
  return CURRENCY_LOCALES[currency] || 'en-US';
}

/**
 * Format price per unit (e.g., hourly rate)
 * @param price - The amount to format
 * @param currency - The currency code
 * @param unit - The unit (e.g., 'hour', 'day')
 * @returns Formatted price per unit
 */
export function formatPricePerUnit(price: number, currency: string = 'USD', unit: string = 'hour'): string {
  const formattedPrice = formatPrice(price, currency);
  return `${formattedPrice}/${unit}`;
}

/**
 * Get multiple currency prices for display
 * @param usdPrice - Price in USD
 * @param currencies - Array of currency codes to display
 * @returns Array of formatted prices
 */
export function getMultiCurrencyPrices(usdPrice: number, currencies: string[] = ['USD', 'TZS', 'KES', 'UGX', 'NGN']): Array<{ currency: string; amount: number; formatted: string }> {
  return currencies.map(currency => {
    const amount = convertCurrency(usdPrice, 'USD', currency);
    return {
      currency,
      amount,
      formatted: formatPrice(amount, currency),
    };
  });
}

/**
 * Country to currency mapping
 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'TZ': 'TZS',  // Tanzania
  'KE': 'KES',  // Kenya
  'UG': 'UGX',  // Uganda
  'RW': 'RWF',  // Rwanda
  'NG': 'NGN',  // Nigeria
  'US': 'USD',  // United States
  'GB': 'GBP',  // United Kingdom
  'DE': 'EUR',  // Germany
  'FR': 'EUR',  // France
  'IT': 'EUR',  // Italy
  'ES': 'EUR',  // Spain
  'AT': 'EUR',  // Austria
  'BE': 'EUR',  // Belgium
  'NL': 'EUR',  // Netherlands
  'PT': 'EUR',  // Portugal
  'IE': 'EUR',  // Ireland
  'FI': 'EUR',  // Finland
  'GR': 'EUR',  // Greece
};

/**
 * Regional currency groups (for showing related currencies)
 */
const REGIONAL_CURRENCIES: Record<string, string[]> = {
  'TZS': ['USD', 'KES', 'UGX'],  // East Africa
  'KES': ['USD', 'TZS', 'UGX'],  // East Africa
  'UGX': ['USD', 'KES', 'TZS'],  // East Africa
  'RWF': ['USD', 'KES', 'UGX'],  // East Africa
  'NGN': ['USD', 'KES'],         // West Africa
  'USD': ['KES', 'TZS'],         // Default to East Africa
  'GBP': ['USD', 'EUR'],
  'EUR': ['USD', 'GBP'],
};

/**
 * Detect user's country from browser locale/timezone
 * @returns Country code (e.g., 'KE', 'TZ', 'US')
 */
export function detectUserCountry(): string {
  try {
    // Try to detect from timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map timezones to countries
    const timezoneToCountry: Record<string, string> = {
      'Africa/Nairobi': 'KE',
      'Africa/Dar_es_Salaam': 'TZ',
      'Africa/Kampala': 'UG',
      'Africa/Kigali': 'RW',
      'Africa/Lagos': 'NG',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'Europe/London': 'GB',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
    };
    
    if (timezoneToCountry[timezone]) {
      return timezoneToCountry[timezone];
    }
    
    // Try to detect from locale
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const countryCode = locale.split('-')[1]?.toUpperCase();
    
    if (countryCode && COUNTRY_TO_CURRENCY[countryCode]) {
      return countryCode;
    }
    
    // Fallback: try to extract from locale string
    const localeMatch = locale.match(/-([A-Z]{2})/);
    if (localeMatch && localeMatch[1]) {
      return localeMatch[1];
    }
  } catch (error) {
    console.error('Error detecting user country:', error);
  }
  
  return 'US'; // Default to US
}

/**
 * Get relevant currencies based on user's location
 * @param countryCode - User's country code (optional, will be detected if not provided)
 * @param userCurrency - User's preferred currency (optional)
 * @returns Array of relevant currency codes to display
 */
export function getLocationBasedCurrencies(countryCode?: string, userCurrency?: string): string[] {
  // If user has a preferred currency, use that as primary
  if (userCurrency && userCurrency !== 'USD') {
    const regional = REGIONAL_CURRENCIES[userCurrency] || ['USD'];
    return [userCurrency, ...regional.filter(c => c !== userCurrency)];
  }
  
  // Otherwise, detect from country
  const detectedCountry = countryCode || detectUserCountry();
  const primaryCurrency = COUNTRY_TO_CURRENCY[detectedCountry] || 'USD';
  
  // Get regional currencies
  const regional = REGIONAL_CURRENCIES[primaryCurrency] || ['USD'];
  
  // Always include USD, then primary currency, then regional
  const currencies = ['USD'];
  if (primaryCurrency !== 'USD') {
    currencies.push(primaryCurrency);
  }
  
  // Add regional currencies (excluding duplicates)
  regional.forEach(currency => {
    if (!currencies.includes(currency)) {
      currencies.push(currency);
    }
  });
  
  // Limit to 3 currencies total (USD + 2 others)
  return currencies.slice(0, 3);
}

export default {
  formatPrice,
  getCurrencySymbol,
  getSupportedCurrencies,
  getCurrencyLocale,
  formatPricePerUnit,
  convertCurrency,
  getMultiCurrencyPrices,
  detectUserCountry,
  getLocationBasedCurrencies,
  CURRENCY_RATES,
};