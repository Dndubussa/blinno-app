-- ============================================
-- Fix for Enum Already Exists Error
-- ============================================
-- Run this BEFORE running ALL_MIGRATIONS_COMBINED.sql
-- This ensures all enum values exist safely
-- ============================================

-- Create app_role enum if it doesn't exist (with base values)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator');
  END IF;
END $$;

-- Add all additional enum values safely
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
  
  -- Add moderator role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
  
  -- Add musician role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'musician' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'musician';
  END IF;
END $$;

-- Verify all enum values exist
SELECT enumlabel as role_name 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
ORDER BY enumsortorder;

