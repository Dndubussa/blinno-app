# Quick Setup Instructions

## Step 1: Set Up Supabase

### Option A: Using Supabase Dashboard

1. Go to https://supabase.com and create an account
2. Create a new project
3. Get your project credentials from Settings > API:
   - Project URL
   - anon/public key
   - service_role key

### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Create a new project:
   ```bash
   supabase projects create
   ```

## Step 2: Configure Backend

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create .env file**:
   ```bash
   copy .env.example .env
   ```

4. **Edit .env** with your Supabase credentials:
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-public-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Other configuration
   JWT_SECRET=your_super_secret_jwt_key_change_this
   JWT_EXPIRES_IN=7d
   
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   ```

## Step 3: Run Database Migrations

1. **Run migrations in Supabase**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Open and run the migration files from `supabase/migrations/`

   OR use Supabase CLI:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

## Step 4: Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ Connected to Supabase database
🚀 Server running on port 3001
```

## Step 5: Configure Frontend

1. **Create/update .env** in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_API_URL=http://localhost:3001/api
   ```

2. **Install dependencies** (if not done):
   ```bash
   npm install
   ```

## Step 6: Start Frontend

```bash
npm run dev
```

## Step 7: Test

1. Open http://localhost:5173
2. Try registering a new user
3. Try logging in
4. Browse the marketplace

## Troubleshooting

### Supabase connection errors
- Verify your Supabase credentials are correct
- Check that your project is active
- Ensure you're using the correct project URL and keys

### Port already in use
- Change PORT in backend/.env
- Update VITE_API_URL in frontend .env

### CORS errors
- Ensure CORS_ORIGIN in backend/.env matches frontend URL
- Default: `http://localhost:5173`

### Authentication issues
- Check that your Supabase Auth is properly configured
- Verify email templates are set up correctly