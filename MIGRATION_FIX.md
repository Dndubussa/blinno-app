# Fix for "enum label already exists" Error

## Problem
You're getting an error: `ERROR: 42710: enum label "moderator" already exists`

This happens because the `app_role` enum already exists in your database with some values, but the migration is trying to add them again.

## Solution

I've fixed the migration file, but here's what to do:

### Option 1: Run the Fix Script First (Recommended)

1. **Open Supabase SQL Editor**
2. **Run the fix script**: Copy and paste the contents of `supabase/migrations/FIX_ENUM_ISSUE.sql`
3. **Click Run**
4. **Then run the main migration**: Copy and paste `supabase/migrations/ALL_MIGRATIONS_COMBINED.sql` (the updated version)

### Option 2: Skip the Enum Creation (If Enum Already Has All Values)

If your enum already has all the values you need, you can:

1. **Check what enum values you have**:
   ```sql
   SELECT enumlabel as role_name 
   FROM pg_enum 
   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
   ORDER BY enumsortorder;
   ```

2. **If all values exist**, you can comment out or skip the enum creation parts in the migration

3. **Continue with the rest of the migration**

### Option 3: Use the Updated Migration File

The `ALL_MIGRATIONS_COMBINED.sql` file has been updated to:
- Check if enum exists before creating
- Check if each enum value exists before adding
- Use `CREATE TABLE IF NOT EXISTS` for tables

**Just re-run the updated migration file** - it should now handle existing enums gracefully.

## Quick Fix SQL

Run this in Supabase SQL Editor to ensure all enum values exist:

```sql
-- Ensure all enum values exist
DO $$ 
BEGIN
  -- Add moderator if missing
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
  
  -- Add musician if missing
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'musician' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'musician';
  END IF;
  
  -- Add other roles if missing
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'journalist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'journalist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'artisan' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'artisan';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'employer';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'event_organizer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'event_organizer';
  END IF;
END $$;
```

Then continue with the rest of the migration.

## What I Fixed

1. ✅ Updated `ALL_MIGRATIONS_COMBINED.sql` to check if enum exists before creating
2. ✅ Added checks before adding each enum value
3. ✅ Made table creation use `IF NOT EXISTS` where applicable
4. ✅ Created `FIX_ENUM_ISSUE.sql` as a standalone fix script

## Next Steps

After fixing the enum issue:
1. Re-run the migration file
2. If you get "relation already exists" errors for tables, that's OK - those tables already exist
3. Continue with the rest of the setup (storage buckets, environment variables)

