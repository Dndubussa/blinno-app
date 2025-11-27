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

export default {
  formatPrice,
  getCurrencySymbol,
  getSupportedCurrencies,
  getCurrencyLocale,
  formatPricePerUnit,
  convertCurrency,
  getMultiCurrencyPrices,
  CURRENCY_RATES,
};