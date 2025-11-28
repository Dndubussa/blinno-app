-- Add terms_accepted and terms_accepted_at columns to profiles table
-- This tracks when users accepted the terms of service during signup

DO $$ 
BEGIN
    -- Add terms_accepted column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'terms_accepted'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN terms_accepted BOOLEAN DEFAULT false NOT NULL;
    END IF;

    -- Add terms_accepted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'terms_accepted_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN terms_accepted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add comment to explain the columns
COMMENT ON COLUMN public.profiles.terms_accepted IS 'Indicates whether the user has accepted the terms of service';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when the user accepted the terms of service';

