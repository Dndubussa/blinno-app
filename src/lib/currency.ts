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
 * Country to currency mapping (by country code)
 * Maps all countries to supported currencies or USD as fallback
 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // East Africa - Supported currencies
  'TZ': 'TZS',  // Tanzania
  'KE': 'KES',  // Kenya
  'UG': 'UGX',  // Uganda
  'RW': 'RWF',  // Rwanda
  
  // West Africa
  'NG': 'NGN',  // Nigeria
  'GH': 'USD',  // Ghana (fallback to USD)
  'SN': 'USD',  // Senegal (fallback to USD)
  'CI': 'USD',  // Côte d'Ivoire (fallback to USD)
  'CM': 'USD',  // Cameroon (fallback to USD)
  'ML': 'USD',  // Mali (fallback to USD)
  'BF': 'USD',  // Burkina Faso (fallback to USD)
  'NE': 'USD',  // Niger (fallback to USD)
  'TD': 'USD',  // Chad (fallback to USD)
  'BJ': 'USD',  // Benin (fallback to USD)
  'TG': 'USD',  // Togo (fallback to USD)
  'GN': 'USD',  // Guinea (fallback to USD)
  'GW': 'USD',  // Guinea-Bissau (fallback to USD)
  'LR': 'USD',  // Liberia (fallback to USD)
  'SL': 'USD',  // Sierra Leone (fallback to USD)
  'GM': 'USD',  // Gambia (fallback to USD)
  'MR': 'USD',  // Mauritania (fallback to USD)
  
  // North America
  'US': 'USD',  // United States
  'CA': 'USD',  // Canada
  'MX': 'USD',  // Mexico
  'GT': 'USD',  // Guatemala
  'BZ': 'USD',  // Belize
  'SV': 'USD',  // El Salvador
  'HN': 'USD',  // Honduras
  'NI': 'USD',  // Nicaragua
  'CR': 'USD',  // Costa Rica
  'PA': 'USD',  // Panama
  'CU': 'USD',  // Cuba
  'JM': 'USD',  // Jamaica
  'HT': 'USD',  // Haiti
  'DO': 'USD',  // Dominican Republic
  'BS': 'USD',  // Bahamas
  'BB': 'USD',  // Barbados
  'AG': 'USD',  // Antigua and Barbuda
  'GD': 'USD',  // Grenada
  'DM': 'USD',  // Dominica
  'LC': 'USD',  // Saint Lucia
  'VC': 'USD',  // Saint Vincent and the Grenadines
  'KN': 'USD',  // Saint Kitts and Nevis
  'TT': 'USD',  // Trinidad and Tobago
  
  // South America
  'BR': 'USD',  // Brazil
  'AR': 'USD',  // Argentina
  'CO': 'USD',  // Colombia
  'PE': 'USD',  // Peru
  'VE': 'USD',  // Venezuela
  'CL': 'USD',  // Chile
  'EC': 'USD',  // Ecuador
  'BO': 'USD',  // Bolivia
  'PY': 'USD',  // Paraguay
  'UY': 'USD',  // Uruguay
  'GY': 'USD',  // Guyana
  'SR': 'USD',  // Suriname
  
  // Europe - EUR zone
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
  'LU': 'EUR',  // Luxembourg
  'MT': 'EUR',  // Malta
  'CY': 'EUR',  // Cyprus
  'SK': 'EUR',  // Slovakia
  'SI': 'EUR',  // Slovenia
  'EE': 'EUR',  // Estonia
  'LV': 'EUR',  // Latvia
  'LT': 'EUR',  // Lithuania
  
  // Europe - Other
  'GB': 'GBP',  // United Kingdom
  'CH': 'EUR',  // Switzerland (fallback to EUR)
  'NO': 'EUR',  // Norway (fallback to EUR)
  'SE': 'EUR',  // Sweden (fallback to EUR)
  'DK': 'EUR',  // Denmark (fallback to EUR)
  'PL': 'EUR',  // Poland (fallback to EUR)
  'CZ': 'EUR',  // Czechia (fallback to EUR)
  'HU': 'EUR',  // Hungary (fallback to EUR)
  'RO': 'EUR',  // Romania (fallback to EUR)
  'BG': 'EUR',  // Bulgaria (fallback to EUR)
  'HR': 'EUR',  // Croatia (fallback to EUR)
  'RS': 'EUR',  // Serbia (fallback to EUR)
  'BA': 'EUR',  // Bosnia and Herzegovina (fallback to EUR)
  'MK': 'EUR',  // North Macedonia (fallback to EUR)
  'AL': 'EUR',  // Albania (fallback to EUR)
  'ME': 'EUR',  // Montenegro (fallback to EUR)
  'IS': 'EUR',  // Iceland (fallback to EUR)
  'UA': 'EUR',  // Ukraine (fallback to EUR)
  'BY': 'EUR',  // Belarus (fallback to EUR)
  'MD': 'EUR',  // Moldova (fallback to EUR)
  'GE': 'EUR',  // Georgia (fallback to EUR)
  'AM': 'EUR',  // Armenia (fallback to EUR)
  'AZ': 'EUR',  // Azerbaijan (fallback to EUR)
  'KZ': 'EUR',  // Kazakhstan (fallback to EUR)
  'RU': 'EUR',  // Russia (fallback to EUR)
  
  // Middle East
  'SA': 'USD',  // Saudi Arabia
  'AE': 'USD',  // United Arab Emirates
  'QA': 'USD',  // Qatar
  'KW': 'USD',  // Kuwait
  'BH': 'USD',  // Bahrain
  'OM': 'USD',  // Oman
  'JO': 'USD',  // Jordan
  'LB': 'USD',  // Lebanon
  'IL': 'USD',  // Israel
  'PS': 'USD',  // Palestine State
  'IQ': 'USD',  // Iraq
  'IR': 'USD',  // Iran
  'YE': 'USD',  // Yemen
  'SY': 'USD',  // Syria
  'TR': 'EUR',  // Turkey (fallback to EUR)
  
  // Asia
  'CN': 'USD',  // China
  'IN': 'USD',  // India
  'JP': 'USD',  // Japan
  'KR': 'USD',  // South Korea
  'ID': 'USD',  // Indonesia
  'PH': 'USD',  // Philippines
  'TH': 'USD',  // Thailand
  'VN': 'USD',  // Vietnam
  'MY': 'USD',  // Malaysia
  'SG': 'USD',  // Singapore
  'BD': 'USD',  // Bangladesh
  'PK': 'USD',  // Pakistan
  'AF': 'USD',  // Afghanistan
  'LK': 'USD',  // Sri Lanka
  'MM': 'USD',  // Myanmar
  'KH': 'USD',  // Cambodia
  'LA': 'USD',  // Laos
  'BN': 'USD',  // Brunei
  'MN': 'USD',  // Mongolia
  'NP': 'USD',  // Nepal
  'BT': 'USD',  // Bhutan
  'MV': 'USD',  // Maldives
  'TL': 'USD',  // Timor-Leste
  
  // Oceania
  'AU': 'USD',  // Australia
  'NZ': 'USD',  // New Zealand
  'FJ': 'USD',  // Fiji
  'PG': 'USD',  // Papua New Guinea
  'SB': 'USD',  // Solomon Islands
  'VU': 'USD',  // Vanuatu
  'NC': 'USD',  // New Caledonia
  'PF': 'USD',  // French Polynesia
  'WS': 'USD',  // Samoa
  'TO': 'USD',  // Tonga
  'KI': 'USD',  // Kiribati
  'MH': 'USD',  // Marshall Islands
  'FM': 'USD',  // Micronesia
  'PW': 'USD',  // Palau
  'NR': 'USD',  // Nauru
  'TV': 'USD',  // Tuvalu
  
  // Africa - Other
  'ZA': 'USD',  // South Africa
  'EG': 'USD',  // Egypt
  'ET': 'USD',  // Ethiopia
  'DZ': 'USD',  // Algeria
  'MA': 'USD',  // Morocco
  'TN': 'USD',  // Tunisia
  'LY': 'USD',  // Libya
  'SD': 'USD',  // Sudan
  'SS': 'USD',  // South Sudan
  'SO': 'USD',  // Somalia
  'DJ': 'USD',  // Djibouti
  'ER': 'USD',  // Eritrea
  'MW': 'USD',  // Malawi
  'ZM': 'USD',  // Zambia
  'ZW': 'USD',  // Zimbabwe
  'BW': 'USD',  // Botswana
  'NA': 'USD',  // Namibia
  'LS': 'USD',  // Lesotho
  'SZ': 'USD',  // Eswatini
  'MZ': 'USD',  // Mozambique
  'MG': 'USD',  // Madagascar
  'MU': 'USD',  // Mauritius
  'SC': 'USD',  // Seychelles
  'KM': 'USD',  // Comoros
  'CV': 'USD',  // Cabo Verde
  'ST': 'USD',  // São Tomé and Príncipe
  'GQ': 'USD',  // Equatorial Guinea
  'GA': 'USD',  // Gabon
  'CG': 'USD',  // Congo
  'CD': 'USD',  // Democratic Republic of the Congo
  'CF': 'USD',  // Central African Republic
  'AO': 'USD',  // Angola
  'BI': 'USD',  // Burundi
  
  // Other
  'AD': 'EUR',  // Andorra
  'MC': 'EUR',  // Monaco
  'SM': 'EUR',  // San Marino
  'VA': 'EUR',  // Holy See
  'LI': 'EUR',  // Liechtenstein
};

/**
 * Get currency code from country name
 * @param countryName - Full country name (e.g., "Tanzania", "Kenya")
 * @returns Currency code (e.g., "TZS", "KES") or "USD" as default
 */
export function getCurrencyFromCountry(countryName?: string | null): string {
  if (!countryName) return 'USD';
  
  // Import countries list dynamically to avoid circular dependency
  try {
    const { countries } = require('./countries');
    const country = countries.find((c: { name: string; code: string }) => 
      c.name.toLowerCase() === countryName.toLowerCase()
    );
    
    if (country && COUNTRY_TO_CURRENCY[country.code]) {
      return COUNTRY_TO_CURRENCY[country.code];
    }
  } catch (error) {
    console.error('Error getting currency from country:', error);
  }
  
  // Fallback to USD
  return 'USD';
}

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
  getCurrencyFromCountry,
  CURRENCY_RATES,
};