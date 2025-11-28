# Fix for `/api/subscriptions/tiers` 404 Error

## Problem
The frontend is trying to call `/api/subscriptions/tiers` but getting a 404 error. This happens because the API URL is pointing to production (`https://www.blinno.app/api`) instead of your local backend.

## Solution

### Option 1: Create `.env` file (Recommended for Local Development)

1. **Create a `.env` file** in the project root (same level as `package.json`):
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

2. **Restart your frontend dev server**:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

### Option 2: Verify Backend is Running

1. **Check if backend is running**:
   ```bash
   cd backend
   npm run dev
   ```

   The backend should start on port 3001 (or the port specified in `backend/.env`)

2. **Test the endpoint directly**:
   ```bash
   curl http://localhost:3001/api/subscriptions/tiers
   ```

   You should see JSON response with tier data.

### Option 3: Check Production Backend

If you're testing against production:

1. **Verify the production backend is running** at `https://www.blinno.app`
2. **Check CORS configuration** - ensure your frontend origin is allowed
3. **Verify the endpoint exists** in production deployment

## Verification

After setting up `.env`, you should see:
- ✅ No more 404 errors in console
- ✅ Subscription tiers loading correctly
- ✅ API calls going to `http://localhost:3001/api` (check Network tab)

## Current API Configuration

The API base URL is set in `src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.blinno.app/api';
```

- If `VITE_API_URL` is set in `.env`, it uses that
- Otherwise, it defaults to production URL

## Quick Fix Command

```bash
# Create .env file with local API URL
echo "VITE_API_URL=http://localhost:3001/api" > .env

# Restart frontend
npm run dev
```

## Endpoint Verification

The endpoint exists at:
- **Route**: `GET /api/subscriptions/tiers`
- **File**: `backend/src/routes/subscriptions.ts` (line 625)
- **Registered in**: `backend/src/server.ts` (line 114)
- **Status**: Public endpoint (no authentication required)

## Troubleshooting

If still getting 404 after setting `.env`:

1. **Check `.env` file location**: Must be in project root
2. **Check `.env` syntax**: No spaces around `=`, no quotes needed
3. **Restart dev server**: Vite requires restart to pick up `.env` changes
4. **Check backend port**: Ensure backend is running on port 3001 (or update `.env` accordingly)
5. **Check browser console**: Look for CORS errors or network errors

