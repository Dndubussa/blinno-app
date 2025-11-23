-- Two-Factor Authentication (2FA)
-- TOTP-based 2FA implementation

-- 2FA settings table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  secret TEXT NOT NULL, -- TOTP secret
  is_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[], -- Array of backup codes
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2FA verification attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS two_factor_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_attempts_user_id ON two_factor_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_attempts_created_at ON two_factor_attempts(created_at);

