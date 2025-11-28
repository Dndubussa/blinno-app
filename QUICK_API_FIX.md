# Quick Fix for API 404 Error

## Issue
The `/api/subscriptions/tiers` endpoint is returning 404 because the `.env` file is pointing to production.

## ✅ Fixed
Updated `.env` file to use localhost for local development:
- Changed: `VITE_API_URL=https://www.blinno.app/api`
- To: `VITE_API_URL=http://localhost:3001/api`

## Next Steps

1. **Ensure backend is running**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Restart frontend dev server** (if running):
   - Stop the current server (Ctrl+C)
   - Run: `npm run dev`

3. **Verify the fix**:
   - Check browser console - 404 error should be gone
   - Subscription tiers should load correctly

## For Production Deployment

When deploying to production, update `.env` back to:
```env
VITE_API_URL=https://www.blinno.app/api
```

Or use environment variables in your hosting platform (Vercel, Netlify, etc.)

