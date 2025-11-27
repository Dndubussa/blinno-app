/**
 * Currency formatting utilities for internationalization
 */

// Supported currencies and their locales
const CURRENCY_LOCALES: Record<string, string> = {
  // TZS: 'en-TZ', // Removed for worldwide platform
  // KES: 'en-KE', // Removed for worldwide platform
  // UGX: 'en-UG', // Removed for worldwide platform
  // RWF: 'en-RW', // Removed for worldwide platform
  USD: 'en-US',
  EUR: 'en-EU',
  GBP: 'en-GB',
};

// Default currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  // TZS: 'TSh', // Removed for worldwide platform
  // KES: 'KSh', // Removed for worldwide platform
  // UGX: 'USh', // Removed for worldwide platform
  // RWF: 'RWF', // Removed for worldwide platform
  USD: '$',
  EUR: '€',
  GBP: '£',
};

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

export default {
  formatPrice,
  getCurrencySymbol,
  getSupportedCurrencies,
  getCurrencyLocale,
  formatPricePerUnit,
};