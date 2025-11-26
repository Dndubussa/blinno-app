/**
 * User Preferences Service
 * Handles user-specific preferences including currency, language, and regional settings
 */

import { pool } from '../config/database.js';

export interface UserPreferences {
  currency: string;
  language: string;
  timezone: string;
  country: string;
  region?: string;
}

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'TZS',
  language: 'en',
  timezone: 'Africa/Dar_es_Salaam',
  country: 'TZ',
};

class UserPreferencesService {
  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const result = await pool.query(
        `SELECT currency, language, timezone, country, region
         FROM user_preferences
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Return default preferences if none found
      return DEFAULT_PREFERENCES;
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
      const result = await pool.query(
        `INSERT INTO user_preferences (user_id, currency, language, timezone, country, region)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id)
         DO UPDATE SET
           currency = COALESCE($2, user_preferences.currency),
           language = COALESCE($3, user_preferences.language),
           timezone = COALESCE($4, user_preferences.timezone),
           country = COALESCE($5, user_preferences.country),
           region = COALESCE($6, user_preferences.region),
           updated_at = NOW()
         RETURNING currency, language, timezone, country, region`,
        [
          userId,
          preferences.currency,
          preferences.language,
          preferences.timezone,
          preferences.country,
          preferences.region
        ]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      return DEFAULT_PREFERENCES;
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
      'TZ': 'TZS',
      'KE': 'KES',
      'UG': 'UGX',
      'RW': 'RWF',
      'US': 'USD',
      'GB': 'GBP',
      'DE': 'EUR',
      'FR': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
    };

    return currencyMap[countryCode.toUpperCase()] || DEFAULT_PREFERENCES.currency;
  }
}

// Create and export singleton instance
export const userPreferences = new UserPreferencesService();

export default UserPreferencesService;