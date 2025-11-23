-- Refunds & Returns System
-- Comprehensive refund and return management

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- Buyer
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- Seller
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS' NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled')),
  refund_method TEXT CHECK (refund_method IN ('original_payment', 'store_credit', 'manual')),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  admin_notes TEXT,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_transit', 'received', 'completed', 'cancelled')),
  return_tracking_number TEXT,
  refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
  admin_notes TEXT,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Refund policy table
CREATE TABLE IF NOT EXISTS refund_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  policy_type TEXT DEFAULT 'platform' CHECK (policy_type IN ('platform', 'creator')),
  refund_window_days INTEGER DEFAULT 7,
  return_window_days INTEGER DEFAULT 14,
  refund_percentage DECIMAL(5, 2) DEFAULT 100.00, -- Percentage of order that can be refunded
  restocking_fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
  conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_creator_id ON refunds(creator_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_refund_policies_creator_id ON refund_policies(creator_id);

-- Insert default platform refund policy
INSERT INTO refund_policies (policy_type, refund_window_days, return_window_days, conditions)
VALUES (
  'platform',
  7,
  14,
  'Items must be returned in original condition. Refunds processed within 5-7 business days after return is received.'
)
ON CONFLICT DO NOTHING;

