-- Add new roles to app_role enum
DO $$ 
BEGIN
  -- Add journalist role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'journalist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'journalist';
  END IF;
  
  -- Add artisan role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'artisan' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'artisan';
  END IF;
  
  -- Add employer role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'employer';
  END IF;
  
  -- Add event_organizer role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'event_organizer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'event_organizer';
  END IF;
END $$;

