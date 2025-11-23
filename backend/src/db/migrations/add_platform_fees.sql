-- Platform fee tracking and revenue management tables

-- Platform fees table - tracks all fees collected
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL, -- References order_id, payment_id, etc.
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('marketplace', 'digital_product', 'service_booking', 'commission', 'subscription', 'tip', 'event_booking')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Creator/seller
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Buyer/customer
  subtotal DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  payment_processing_fee DECIMAL(10, 2) NOT NULL,
  total_fees DECIMAL(10, 2) NOT NULL,
  creator_payout DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'paid_out', 'refunded')),
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Creator payouts table - tracks payouts to creators
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  payment_method TEXT, -- 'clickpesa', 'bank_transfer', etc.
  payment_reference TEXT,
  fee_ids UUID[], -- Array of platform_fees.id that make up this payout
  payout_date TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User payout methods table - stores user's payout information
CREATE TABLE IF NOT EXISTS user_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('mobile_money', 'bank_transfer')),
  is_default BOOLEAN DEFAULT false,
  mobile_operator TEXT CHECK (mobile_operator IN ('M-Pesa', 'Mixx by Yas', 'Airtel Money', 'Halopesa')),
  mobile_number TEXT,
  bank_name TEXT,
  bank_address TEXT,
  account_name TEXT,
  account_number TEXT,
  swift_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, mobile_number) WHERE method_type = 'mobile_money',
  UNIQUE(user_id, account_number) WHERE method_type = 'bank_transfer'
);

-- Platform subscriptions table - tracks creator platform subscriptions
CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'creator', 'professional', 'enterprise')),
  monthly_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Featured listings table - tracks paid featured placements
CREATE TABLE IF NOT EXISTS featured_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('product', 'portfolio', 'service', 'event', 'restaurant', 'lodging')),
  listing_id UUID NOT NULL, -- References the actual product/portfolio/etc.
  placement_type TEXT NOT NULL CHECK (placement_type IN ('homepage', 'category', 'search', 'event_page')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  price_paid DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Revenue analytics view (for reporting)
CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(subtotal) as total_revenue,
  SUM(platform_fee) as total_platform_fees,
  SUM(payment_processing_fee) as total_processing_fees,
  SUM(creator_payout) as total_payouts
FROM platform_fees
WHERE status = 'collected'
GROUP BY DATE_TRUNC('day', created_at), transaction_type;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_fees_user_id ON platform_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_transaction_id ON platform_fees(transaction_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_status ON platform_fees(status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_created_at ON platform_fees(created_at);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_id ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX IF NOT EXISTS idx_user_payout_methods_user_id ON user_payout_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payout_methods_method_type ON user_payout_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_user_id ON platform_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_user_id ON featured_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_status ON featured_listings(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_dates ON featured_listings(start_date, end_date);