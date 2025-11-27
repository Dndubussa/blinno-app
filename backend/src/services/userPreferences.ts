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
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('currency, language, timezone, country, region')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return defaults
          return DEFAULT_PREFERENCES;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return DEFAULT_PREFERENCES;
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
   * Detect currency based on user's country/IP
   */
  detectCurrencyByCountry(countryCode: string): string {
    const currencyMap: Record<string, string> = {
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
    };

    return currencyMap[countryCode.toUpperCase()] || DEFAULT_PREFERENCES.currency;
  }
}

// Create and export singleton instance
export const userPreferences = new UserPreferencesService();

export default UserPreferencesService;