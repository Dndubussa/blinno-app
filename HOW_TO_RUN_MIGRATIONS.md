# How to Run Supabase Migrations

This guide will walk you through running the database migrations for the BLINNO platform.

## Prerequisites

1. **Supabase Account**: You need a Supabase account and project
   - Sign up at https://supabase.com
   - Create a new project (or use existing one)

2. **Get Your Project Reference**
   - Go to your Supabase project dashboard
   - The project reference is in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - Or find it in Project Settings > General > Reference ID

## Method 1: Using Supabase Dashboard (Recommended for Beginners)

This is the easiest method - no CLI installation needed.

### Step 1: Open SQL Editor

1. Go to your Supabase project dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### Step 2: Run the Combined Migration

1. Open the file `supabase/migrations/ALL_MIGRATIONS_COMBINED.sql` in your code editor
2. **Copy the entire contents** of the file (Ctrl+A, Ctrl+C)
3. **Paste it** into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

### Step 3: Verify Migration

1. Check the results panel - you should see "Success" message
2. Go to **"Table Editor"** in the left sidebar
3. You should see tables like:
   - `profiles`
   - `user_roles`
   - `products`
   - `portfolios`
   - `orders`
   - And many more...

### Step 4: Check for Errors

If you see any errors:
- **"relation already exists"**: Some tables might already exist - this is usually OK
- **"type already exists"**: The `app_role` enum might already exist - this is OK
- **Other errors**: Check the error message and fix any issues

## Method 2: Using Supabase CLI (Advanced)

This method is better for automation and version control.

### Step 1: Install Supabase CLI

```bash
# Using npm (recommended)
npm install -g supabase

# Or using Homebrew (Mac)
brew install supabase/tap/supabase

# Or using Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

### Step 3: Link Your Project

```bash
# Replace YOUR_PROJECT_REF with your actual project reference
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project reference in:
- Project Settings > General > Reference ID
- Or in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 4: Push Migrations

```bash
# Push all migrations from supabase/migrations/ folder
supabase db push
```

This will run all migration files in order.

### Alternative: Run Individual Migrations

If you want to run migrations one by one:

```bash
# Run a specific migration file
supabase db push --file supabase/migrations/20251118060241_5503bc13-cad5-466e-870c-ec774d8ac14a.sql
```

## Method 3: Using psql (If You Have Direct Database Access)

If you have direct PostgreSQL access to your Supabase database:

```bash
# Get connection string from Supabase Dashboard > Settings > Database > Connection string
# Use the "URI" format

psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/ALL_MIGRATIONS_COMBINED.sql
```

## Verification Checklist

After running migrations, verify:

- [ ] Tables created:
  - [ ] `profiles`
  - [ ] `user_roles`
  - [ ] `products`
  - [ ] `portfolios`
  - [ ] `orders`
  - [ ] `cart_items`
  - [ ] `platform_fees`
  - [ ] `creator_payouts`
  - [ ] And all other tables from the migration

- [ ] Enums created:
  - [ ] `app_role` enum with all roles

- [ ] Functions created (if any):
  - [ ] Check Supabase Dashboard > Database > Functions

- [ ] Indexes created:
  - [ ] Check Supabase Dashboard > Database > Indexes

## Troubleshooting

### Error: "relation already exists"

**Solution**: Some tables might already exist. You can:
1. Drop existing tables and re-run (⚠️ **WARNING**: This deletes data!)
2. Or modify the migration to use `CREATE TABLE IF NOT EXISTS`

### Error: "type already exists"

**Solution**: The `app_role` enum might already exist. You can:
1. Drop it first: `DROP TYPE IF EXISTS app_role CASCADE;`
2. Or modify the migration to use `CREATE TYPE IF NOT EXISTS`

### Error: "permission denied"

**Solution**: Make sure you're using the correct database user. In Supabase:
- Use the SQL Editor (runs as postgres user with full permissions)
- Or use the service role key for CLI operations

### Error: "connection refused" (CLI)

**Solution**: 
1. Check your project reference is correct
2. Make sure you're logged in: `supabase login`
3. Try linking again: `supabase link --project-ref YOUR_PROJECT_REF`

## Next Steps

After migrations are complete:

1. **Set up Storage Buckets** (if not auto-created):
   - Go to Supabase Dashboard > Storage
   - Create buckets: `avatars`, `portfolios`, `products`, `images`
   - Set them as public

2. **Configure Environment Variables**:
   - Add Supabase credentials to `backend/.env`
   - Add Supabase URL and anon key to root `.env`

3. **Test the Application**:
   - Start backend: `cd backend && npm run dev`
   - Start frontend: `npm run dev`
   - Try registering a new user

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)

---

**Quick Reference**:
- Migration file: `supabase/migrations/ALL_MIGRATIONS_COMBINED.sql`
- SQL Editor: Supabase Dashboard > SQL Editor
- CLI command: `supabase db push`

