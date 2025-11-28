# Vercel Configuration Complete

## ✅ Configuration Files Created

### 1. `vercel.json`
- Routes all `/api/*` requests to the serverless function
- Configures build for Node.js serverless functions
- Sets `NODE_ENV=production`

### 2. `api/index.ts`
- Serverless function entry point
- Exports the Express app for Vercel

### 3. `backend/src/server.ts`
- Updated to conditionally start listening (only when not in Vercel)
- Checks for `VERCEL=1` environment variable

## How Vercel Handles This

1. **Vercel detects** `api/index.ts` as a serverless function
2. **All `/api/*` routes** are automatically routed to this function
3. **Express app** handles routing internally
4. **Supabase** is used for database (already configured)

## Current Status

✅ **Frontend**: Configured for production (`https://www.blinno.app/api`)
✅ **Backend**: Configured for Vercel serverless functions
✅ **Database**: Supabase (already configured)
✅ **API Routes**: All routes registered and ready

## Next Steps

1. **Push to GitHub** (if not already done)
2. **Vercel will auto-deploy** on push to main/master
3. **Verify deployment** in Vercel Dashboard
4. **Test endpoint**: `https://www.blinno.app/api/subscriptions/tiers`

## Environment Variables in Vercel

Ensure these are set in Vercel Dashboard:

**Required:**
- `NODE_ENV=production`
- `SUPABASE_URL` (your Supabase project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (your service role key)
- `CLICKPESA_CLIENT_ID`
- `CLICKPESA_API_KEY`
- `CLICKPESA_BASE_URL` (production: `https://api.clickpesa.com`)
- `APP_URL=https://www.blinno.app`

**Optional but Recommended:**
- `VERCEL=1` (automatically set by Vercel)
- Any other environment-specific variables

## Testing After Deployment

Once deployed, test:
```bash
curl https://www.blinno.app/api/subscriptions/tiers
```

Expected response:
```json
{
  "percentage": {
    "basic": {...},
    "premium": {...},
    "pro": {...}
  },
  "subscription": {
    "free": {...},
    "creator": {...},
    "professional": {...},
    "enterprise": {...}
  }
}
```

## Troubleshooting

If you still get 404 after deployment:

1. **Check Vercel Function Logs**:
   - Vercel Dashboard → Deployments → Latest → Functions → `api/index.ts`
   - Look for import errors or runtime errors

2. **Verify Build Success**:
   - Check that TypeScript compiled successfully
   - Ensure all dependencies are installed

3. **Check Route Registration**:
   - The `/tiers` route exists in `backend/src/routes/subscriptions.ts`
   - It's registered in `backend/src/server.ts` as `/api/subscriptions`

4. **Test Locally with Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel dev
   ```
   Then test: `http://localhost:3000/api/subscriptions/tiers`

## Notes

- The Express app runs as a single serverless function
- All API routes are handled by the same function instance
- Cold starts may occur but are typically fast
- Supabase connection is handled per-request

