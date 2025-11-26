-- Add user preferences table for regional settings
-- This table stores user-specific preferences including currency, language, and regional settings

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'TZS',
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
  country TEXT NOT NULL DEFAULT 'TZ',
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_currency ON user_preferences(currency);
CREATE INDEX IF NOT EXISTS idx_user_preferences_country ON user_preferences(country);

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'User-specific preferences including currency, language, and regional settings';
COMMENT ON COLUMN user_preferences.currency IS 'Preferred currency code (e.g., TZS, USD, EUR)';
COMMENT ON COLUMN user_preferences.language IS 'Preferred language code (e.g., en, sw)';
COMMENT ON COLUMN user_preferences.timezone IS 'User timezone for date/time display';
COMMENT ON COLUMN user_preferences.country IS 'User country code (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN user_preferences.region IS 'User region/state within country';