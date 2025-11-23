# How to Run Migrations

## Current Migration Files

You have **10 migration files** that need to be applied:

1. `20251118060241_5503bc13-cad5-466e-870c-ec774d8ac14a.sql` - Base schema (profiles, portfolios, bookings, etc.)
2. `20251118060321_bd08fc71-a453-489e-89bb-04d92f969350.sql` - Fix update_updated_at_column function
3. `20251119104540_add_moderator_role.sql` - Add moderator role
4. `20251119104953_create_marketplace_tables.sql` - Marketplace tables (products, cart, orders)
5. `20251123000000_add_journalist_artisan_employer_event_organizer_roles.sql` - Add new roles
6. `20251123000001_create_journalist_tables.sql` - News articles tables
7. `20251123000002_create_artisan_tables.sql` - Artisan services tables
8. `20251123000003_create_employer_tables.sql` - Job postings tables
9. `20251123000004_create_event_organizer_tables.sql` - Event management tables
10. `20251124000000_create_creator_monetization_tables.sql` - Monetization features (digital products, commissions, tips, subscriptions, performance bookings)

---

## Option 1: Using Supabase Dashboard (Recommended - No Installation Required)

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account
   - Select your project (Project ID: `voxovqhyptopundvbtkc`)

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Apply Migrations in Order**
   - Open each migration file from `supabase/migrations/` folder
   - Copy the entire content
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for success message
   - Repeat for each migration file **in the order listed above**

4. **Verify Migrations**
   - Go to "Database" > "Tables" to see all created tables
   - Check that all tables are created successfully

---

## Option 2: Using Supabase CLI (For Developers)

### Install Supabase CLI:

**Windows (using Scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (using Chocolatey):**
```powershell
choco install supabase
```

**Or download directly:**
- Visit: https://github.com/supabase/cli/releases
- Download the Windows executable
- Add to PATH

### Link Your Project:

```bash
cd "G:\SAAS PLATFORMS\BLINNO"
supabase link --project-ref voxovqhyptopundvbtkc
```

### Run Migrations:

```bash
supabase db push
```

This will apply all pending migrations automatically.

---

## Option 3: Manual SQL Execution (Alternative)

If you prefer, you can also:

1. Open Supabase Dashboard > SQL Editor
2. Copy all migration files content
3. Combine them in order (separated by `;`)
4. Run as a single script

**⚠️ Warning:** Make sure to run migrations in the correct order!

---

## Verification Checklist

After running migrations, verify:

- [ ] All roles exist in `app_role` enum (admin, creator, user, moderator, freelancer, seller, lodging, restaurant, educator, journalist, artisan, employer, event_organizer)
- [ ] Tables created:
  - [ ] `profiles`, `user_roles`, `portfolios`, `bookings`, `reviews`
  - [ ] `products`, `cart_items`, `orders`, `order_items`
  - [ ] `news_articles`, `news_categories`
  - [ ] `artisan_services`, `artisan_bookings`
  - [ ] `job_postings`, `job_applications`
  - [ ] `organized_events`, `event_registrations`
  - [ ] `digital_products`, `commissions`, `tips`, `creator_subscriptions`, `subscription_tiers`, `performance_bookings`, `digital_product_purchases`
- [ ] RLS policies are enabled on all tables
- [ ] Functions exist: `has_role()`, `update_updated_at_column()`, `handle_new_user()`

---

## Troubleshooting

### Error: "type does not exist"
- Make sure base migration (file #1) ran first
- Check that enum types are created before they're used

### Error: "unsafe use of new enum value"
- Some migrations add enum values and use them in the same transaction
- Split the migration: add enum value first, then use it in a separate query

### Error: "relation already exists"
- Table already exists - this is okay if you're re-running
- You can use `CREATE TABLE IF NOT EXISTS` to make migrations idempotent

---

## Need Help?

If you encounter issues:
1. Check the Supabase Dashboard logs
2. Verify your database connection
3. Ensure you have proper permissions
4. Review migration file syntax

