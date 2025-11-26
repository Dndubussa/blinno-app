# Quick Fix for API Connection Error

## Problem
The frontend is trying to connect to `www.blinno.app/api` instead of `localhost:3000/api`, causing connection errors.

## Solution

### 1. Create Frontend `.env` File

The `.env` file has been created. Make sure it contains:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Important**: After creating/updating `.env`, restart your Vite dev server!

### 2. Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3000
```

### 3. Restart Frontend Dev Server

After updating `.env`, restart Vite:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Verify

- Backend should be running on `http://localhost:3000`
- Frontend should be running on `http://localhost:5173`
- Check browser console - errors should be gone

## Why This Happened

- The frontend `.env` file was missing
- Without `.env`, the code uses the default production URL: `https://www.blinno.app/api`
- The backend wasn't running, so even with correct URL it would fail

## Notes

- Vite requires a restart to pick up new `.env` variables
- Make sure `VITE_API_URL` matches your backend port (default: 3000)
- Never commit `.env` files to git (they're in `.gitignore`)

