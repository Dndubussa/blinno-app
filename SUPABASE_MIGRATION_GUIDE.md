# Supabase Migration Guide

This guide will help you migrate from self-managed PostgreSQL to Supabase (managed PostgreSQL).

## Why Migrate to Supabase?

✅ **No PostgreSQL Management** - Supabase manages the database for you  
✅ **Built-in Authentication** - No need to manage JWT tokens manually  
✅ **File Storage** - Built-in storage for uploads  
✅ **Real-time Features** - WebSocket support for messaging/notifications  
✅ **Dashboard** - Visual interface to manage your database  
✅ **Automatic Backups** - No need to set up backup systems  
✅ **Free Tier** - Great for development and small projects  

## Prerequisites

1. **Create a Supabase Account**
   - Go to https://supabase.com
   - Sign up for free
   - Create a new project

2. **Get Your Supabase Credentials**
   - Go to Project Settings > API
   - Copy:
     - `Project URL` (SUPABASE_URL)
     - `anon/public` key (SUPABASE_ANON_KEY)
     - `service_role` key (SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

## Step 1: Set Up Supabase Database

1. **Run Migrations in Supabase**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Open `supabase/migrations/ALL_MIGRATIONS_COMBINED.sql`
   - Copy and paste the entire file
   - Click "Run" to execute

   OR use Supabase CLI:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Push migrations
   supabase db push
   ```

## Step 2: Configure Environment Variables

### Backend `.env` file

Add these variables to `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Remove or comment out these (no longer needed):
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=blinno
# DB_USER=postgres
# DB_PASSWORD=
# JWT_SECRET= (Supabase handles auth now)
```

### Frontend `.env` file

Add to root `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 3: Update Backend Code

The backend has been updated to use Supabase:
- ✅ Supabase client configured (`backend/src/config/supabase.ts`)
- ✅ Authentication uses Supabase Auth
- ✅ All routes use Supabase client instead of direct PostgreSQL

## Step 4: Update Frontend Code

The frontend needs to be updated to use Supabase client directly. This will be done in the next steps.

## Step 5: Migrate File Storage (Optional but Recommended)

1. **Set up Supabase Storage**
   - Go to Storage in Supabase dashboard
   - Create buckets:
     - `avatars` (public)
     - `images` (public)
     - `portfolios` (public)
     - `products` (public)

2. **Update Upload Routes**
   - The backend will be updated to use Supabase Storage
   - Files will be stored in Supabase instead of local `uploads/` folder

## Step 6: Test the Migration

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Features:**
   - Register a new user
   - Login
   - Create a profile
   - Upload files
   - Create products/portfolios
   - Test all major features

## Step 7: Data Migration (If You Have Existing Data)

If you have existing data in your PostgreSQL database:

1. **Export Data:**
   ```bash
   pg_dump -U postgres -d blinno > backup.sql
   ```

2. **Import to Supabase:**
   - Use Supabase dashboard SQL Editor
   - Or use `psql` with Supabase connection string

## Key Differences

| Feature | Old (PostgreSQL) | New (Supabase) |
|---------|------------------|----------------|
| Database | Direct connection | Supabase client |
| Authentication | JWT tokens | Supabase Auth |
| File Storage | Local filesystem | Supabase Storage |
| User Management | Custom `users` table | `auth.users` table |
| Real-time | Not available | Built-in |

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you've set all three Supabase keys in `backend/.env`

### "User not found" errors
- Make sure you've run the migrations in Supabase
- Check that `auth.users` table exists

### CORS errors
- Add your frontend URL to Supabase dashboard > Settings > API > CORS

### File upload errors
- Make sure Storage buckets are created in Supabase
- Check bucket policies allow uploads

## Next Steps After Migration

1. ✅ Remove old PostgreSQL dependencies (optional)
2. ✅ Set up Row Level Security (RLS) policies in Supabase
3. ✅ Configure storage bucket policies
4. ✅ Set up real-time subscriptions for messaging
5. ✅ Remove local `uploads/` folder (files now in Supabase)

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

