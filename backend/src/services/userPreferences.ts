/**
 * User Preferences Service
 * Handles user-specific preferences including currency, language, and regional settings
 */

import { supabase } from '../config/supabase.js';

export interface UserPreferences {
  currency: string;
  language: string;
  timezone: string;
  country: string;
  region?: string;
}

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'USD',
  language: 'en',
  timezone: 'UTC',
  country: 'US',
};

class UserPreferencesService {
  /**
   * Get user preferences
   * If currency is not set, derive it from user's country in profile
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('currency, language, timezone, country, region')
        .eq('user_id', userId)
        .single();

      let preferences: UserPreferences;

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, try to get from profile
          preferences = { ...DEFAULT_PREFERENCES };
        } else {
          throw error;
        }
      } else {
        preferences = data;
      }

      // If currency is not set, try to get from user's profile country
      if (!preferences.currency || preferences.currency === DEFAULT_PREFERENCES.currency) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('location')
          .eq('user_id', userId)
          .single();

        if (profile?.location) {
          // Get country code from country name
          const countryCode = this.getCountryCodeFromName(profile.location);
          if (countryCode) {
            preferences.currency = this.detectCurrencyByCountry(countryCode);
          }
        }
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Get country code from country name
   * Maps common country names to ISO country codes
   */
  private getCountryCodeFromName(countryName: string): string | null {
    try {
      // Comprehensive country name to code mappings
      // Focus on Clickpesa-supported countries and major countries
      const countryNameMap: Record<string, string> = {
        // Clickpesa-supported countries (priority)
        'tanzania': 'TZ',
        'kenya': 'KE',
        'uganda': 'UG',
        'rwanda': 'RW',
        'nigeria': 'NG',
        // Major countries
        'united states': 'US',
        'united states of america': 'US',
        'usa': 'US',
        'united kingdom': 'GB',
        'uk': 'GB',
        'great britain': 'GB',
        // Eurozone countries
        'germany': 'DE',
        'france': 'FR',
        'italy': 'IT',
        'spain': 'ES',
        'austria': 'AT',
        'belgium': 'BE',
        'netherlands': 'NL',
        'portugal': 'PT',
        'ireland': 'IE',
        'finland': 'FI',
        'greece': 'GR',
        'luxembourg': 'LU',
        'malta': 'MT',
        'cyprus': 'CY',
        'slovakia': 'SK',
        'slovenia': 'SI',
        'estonia': 'EE',
        'latvia': 'LV',
        'lithuania': 'LT',
      };

      const normalizedName = countryName.toLowerCase().trim();
      
      // Direct match
      if (countryNameMap[normalizedName]) {
        return countryNameMap[normalizedName];
      }

      // Try partial match (e.g., "United States" matches "united states")
      for (const [name, code] of Object.entries(countryNameMap)) {
        if (normalizedName.includes(name) || name.includes(normalizedName)) {
          return code;
        }
      }

      return null;
    } catch (error) {
      console.error('Error mapping country name to code:', error);
      return null;
    }
  }

  /**
   * Set user preferences
   */
  async setUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          currency: preferences.currency,
          language: preferences.language,
          timezone: preferences.timezone,
          country: preferences.country,
          region: preferences.region,
          updated_at: new Date().toISOString()
        })
        .select('currency, language, timezone, country, region')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error setting user preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Get user currency preference
   */
  async getUserCurrency(userId: string): Promise<string> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.currency;
    } catch (error) {
      console.error('Error getting user currency:', error);
      return DEFAULT_PREFERENCES.currency;
    }
  }

  /**
   * Set user currency preference
   */
  async setUserCurrency(userId: string, currency: string): Promise<void> {
    try {
      await this.setUserPreferences(userId, { currency });
    } catch (error) {
      console.error('Error setting user currency:', error);
    }
  }

  /**
   * Detect currency based on user's country code
   * Aligns with Clickpesa supported currencies: USD, EUR, GBP, TZS, KES, UGX, RWF, NGN
   */
  detectCurrencyByCountry(countryCode: string): string {
    const currencyMap: Record<string, string> = {
      // Clickpesa fully supported currencies
      'TZ': 'TZS',  // Tanzania
      'KE': 'KES',  // Kenya
      'UG': 'UGX',  // Uganda
      'RW': 'RWF',  // Rwanda
      'NG': 'NGN',  // Nigeria
      'US': 'USD',  // United States
      'GB': 'GBP',  // United Kingdom
      // Eurozone countries
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
    };

    return currencyMap[countryCode.toUpperCase()] || DEFAULT_PREFERENCES.currency;
  }
}

// Create and export singleton instance
export const userPreferences = new UserPreferencesService();

export default UserPreferencesService;