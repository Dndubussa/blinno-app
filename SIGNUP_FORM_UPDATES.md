# Signup Form Updates

## Overview
This document describes the changes made to enhance the signup form with additional user information fields.

## Changes Made

### 1. Frontend Changes (Auth.tsx)
- Added first name, middle name, and last name fields
- Added country dropdown with all countries in the world
- Added phone number field with country code selection
- Updated form layout to accommodate new fields

### 2. Auth Context Updates
- Modified the signUp function to accept additional user data
- Updated the function signature to include firstName, middleName, lastName, phoneNumber, and country

### 3. API Client Updates
- Updated the register method to accept additional parameters
- Extended the data object to include new user information fields

### 4. Backend Registration Endpoint
- Modified the /auth/register endpoint to handle new user data
- Updated profile creation to include first_name, middle_name, last_name, phone, and location fields

### 5. Database Schema Updates
- Created migration script to add first_name, middle_name, and last_name columns to the profiles table
- The phone and location fields already existed in the profiles table

## New Fields Added

| Field | Type | Description |
|-------|------|-------------|
| first_name | TEXT | User's first name |
| middle_name | TEXT | User's middle name (optional) |
| last_name | TEXT | User's last name |
| phone | TEXT | User's phone number with country code |
| location | TEXT | User's country |

## Implementation Notes

1. The displayName is constructed from first, middle, and last names
2. Phone numbers are prefixed with the selected country code
3. Countries are displayed in a dropdown with all countries in the world
4. Country codes are automatically selected based on the chosen country

## Migration Script
The migration script `20251126010000_add_user_name_fields.sql` adds the new name fields to the profiles table:

```sql
-- Add first_name, middle_name, and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;
```

## Future Considerations
1. The migration needs to be run on the Supabase database
2. The .env file needs to be updated with correct Supabase credentials
3. The Supabase project needs to be linked for migrations to work