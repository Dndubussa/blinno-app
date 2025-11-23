-- Order Tracking & Management Enhancement
-- Adds tracking information and status history to orders

-- Add tracking fields to orders table if they don't exist
DO $$ 
BEGIN
  -- Add shipping tracking number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
    ALTER TABLE orders ADD COLUMN tracking_number TEXT;
  END IF;

  -- Add shipping carrier
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'shipping_carrier') THEN
    ALTER TABLE orders ADD COLUMN shipping_carrier TEXT;
  END IF;

  -- Add estimated delivery date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'estimated_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN estimated_delivery_date TIMESTAMPTZ;
  END IF;

  -- Add actual delivery date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- Order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Shipping addresses table (normalized)
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  label TEXT, -- e.g., "Home", "Work"
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Tanzania',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON shipping_addresses(user_id);

-- Function to update order status and log history
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_changed_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update order status
  UPDATE orders
  SET status = p_new_status,
      updated_at = now(),
      delivered_at = CASE WHEN p_new_status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = p_order_id;

  -- Log status change
  INSERT INTO order_status_history (order_id, status, changed_by, notes)
  VALUES (p_order_id, p_new_status, p_changed_by, p_notes);
END;
$$ LANGUAGE plpgsql;

