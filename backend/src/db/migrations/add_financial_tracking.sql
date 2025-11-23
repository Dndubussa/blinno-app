-- Enhanced Financial Tracking System
-- This migration adds comprehensive financial tracking for all users

-- User balances table (tracks available balance for each user)
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  pending_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  total_earned DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  total_paid_out DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  currency TEXT DEFAULT 'TZS' NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Financial transactions table (detailed transaction history)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'earnings', 'payout', 'refund', 'fee', 'subscription', 'purchase', 
    'tip_sent', 'tip_received', 'commission_paid', 'commission_received',
    'booking_paid', 'booking_received', 'product_sale', 'product_purchase',
    'featured_listing', 'platform_fee', 'payment_processing_fee'
  )),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS' NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_id UUID, -- References the related record (order_id, payment_id, etc.)
  reference_type TEXT, -- Type of reference (order, payment, payout, etc.)
  description TEXT,
  metadata JSONB, -- Additional transaction details
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enhanced payout tracking
ALTER TABLE creator_payouts ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES financial_transactions(id);
ALTER TABLE creator_payouts ADD COLUMN IF NOT EXISTS balance_before DECIMAL(12, 2);
ALTER TABLE creator_payouts ADD COLUMN IF NOT EXISTS balance_after DECIMAL(12, 2);

-- Financial reports table (for caching aggregated data)
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_earnings DECIMAL(12, 2) DEFAULT 0.00,
  total_payouts DECIMAL(12, 2) DEFAULT 0.00,
  total_fees DECIMAL(12, 2) DEFAULT 0.00,
  transaction_count INTEGER DEFAULT 0,
  breakdown JSONB, -- Detailed breakdown by transaction type
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, report_type, period_start, period_end)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id ON financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at ON financial_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference ON financial_transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_user_id ON financial_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_period ON financial_reports(period_start, period_end);

-- Create function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_transaction_type TEXT,
  p_operation TEXT -- 'add' or 'subtract'
) RETURNS DECIMAL AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Get or create user balance
  INSERT INTO user_balances (user_id, available_balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current balance
  SELECT available_balance INTO v_current_balance
  FROM user_balances
  WHERE user_id = p_user_id;

  -- Calculate new balance
  IF p_operation = 'add' THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
  END IF;

  -- Update balance
  UPDATE user_balances
  SET 
    available_balance = v_new_balance,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Update total_earned if it's an earnings transaction
  IF p_transaction_type = 'earnings' AND p_operation = 'add' THEN
    UPDATE user_balances
    SET total_earned = total_earned + p_amount
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Create function to record financial transaction
CREATE OR REPLACE FUNCTION record_financial_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_balance_before DECIMAL;
  v_balance_after DECIMAL;
  v_transaction_id UUID;
  v_operation TEXT;
BEGIN
  -- Determine operation based on transaction type
  IF p_transaction_type IN ('earnings', 'tip_received', 'commission_received', 'booking_received', 'product_sale', 'refund') THEN
    v_operation := 'add';
  ELSE
    v_operation := 'subtract';
  END IF;

  -- Get current balance
  SELECT COALESCE(available_balance, 0) INTO v_balance_before
  FROM user_balances
  WHERE user_id = p_user_id;

  -- Update balance
  v_balance_after := update_user_balance(p_user_id, p_amount, p_transaction_type, v_operation);

  -- Create transaction record
  INSERT INTO financial_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    reference_id, reference_type, description, metadata
  )
  VALUES (
    p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
    p_reference_id, p_reference_type, p_description, p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for user financial summary
CREATE OR REPLACE VIEW user_financial_summary AS
SELECT 
  ub.user_id,
  ub.available_balance,
  ub.pending_balance,
  ub.total_earned,
  ub.total_paid_out,
  COUNT(ft.id) FILTER (WHERE ft.transaction_type = 'earnings' AND ft.created_at >= date_trunc('month', CURRENT_DATE)) as earnings_this_month,
  SUM(ft.amount) FILTER (WHERE ft.transaction_type = 'earnings' AND ft.created_at >= date_trunc('month', CURRENT_DATE)) as earnings_amount_this_month,
  COUNT(ft.id) FILTER (WHERE ft.transaction_type = 'payout' AND ft.created_at >= date_trunc('month', CURRENT_DATE)) as payouts_this_month,
  SUM(ft.amount) FILTER (WHERE ft.transaction_type = 'payout' AND ft.created_at >= date_trunc('month', CURRENT_DATE)) as payouts_amount_this_month
FROM user_balances ub
LEFT JOIN financial_transactions ft ON ub.user_id = ft.user_id
GROUP BY ub.user_id, ub.available_balance, ub.pending_balance, ub.total_earned, ub.total_paid_out;

