-- Add musician role to app_role enum
DO $$ 
BEGIN
  -- Add musician role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'musician' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'musician';
  END IF;
END $$;