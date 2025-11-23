-- Add payment statuses to orders table
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'payment_pending', 'paid', 'payment_failed', 'confirmed', 'shipped', 'delivered', 'cancelled'));

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'initiated', 'completed', 'failed', 'cancelled')),
  payment_method TEXT DEFAULT 'clickpesa',
  payment_id TEXT, -- Click Pesa payment ID
  transaction_id TEXT, -- Click Pesa transaction ID
  checkout_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

