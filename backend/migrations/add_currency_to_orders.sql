-- Add currency column to orders table if it doesn't exist
-- This migration is idempotent and safe to run multiple times

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN currency TEXT DEFAULT 'USD' NOT NULL;
        
        -- Update existing orders to have USD currency
        UPDATE public.orders 
        SET currency = 'USD' 
        WHERE currency IS NULL;
    END IF;
END $$;

-- Also add payment_pending status to orders if not in check constraint
DO $$
BEGIN
    -- Check if payment_pending is in the status check constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu 
            ON cc.constraint_name = ccu.constraint_name
        WHERE cc.table_schema = 'public'
        AND cc.table_name = 'orders'
        AND cc.constraint_name LIKE '%status%'
        AND cc.check_clause LIKE '%payment_pending%'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE public.orders 
        DROP CONSTRAINT IF EXISTS orders_status_check;
        
        -- Add new constraint with payment_pending
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'payment_pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'payment_failed'));
    END IF;
END $$;

