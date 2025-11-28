# Vercel Deployment Configuration

## Current Setup

The backend is configured to work with Vercel serverless functions:

### Files Created:
1. **`vercel.json`** - Vercel configuration
2. **`api/index.ts`** - Serverless function entry point

### Changes Made:
- Updated `backend/src/server.ts` to conditionally start listening (only when not in Vercel)
- Created Vercel routing configuration

## How It Works

1. **Vercel detects** the `api/` directory and treats it as serverless functions
2. **All `/api/*` routes** are routed to `api/index.ts`
3. **The Express app** is exported and handles all API routes
4. **Supabase** is used for database (already configured)

## Deployment Steps

### 1. Ensure Environment Variables in Vercel

Set these in Vercel Dashboard → Settings → Environment Variables:

```env
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLICKPESA_CLIENT_ID=your_clickpesa_client_id
CLICKPESA_API_KEY=your_clickpesa_api_key
CLICKPESA_BASE_URL=https://api.clickpesa.com
APP_URL=https://www.blinno.app
```

### 2. Build Configuration

Vercel will automatically:
- Build the TypeScript backend
- Deploy the Express app as serverless functions
- Route `/api/*` requests to the serverless function

### 3. Verify Deployment

After deployment, test the endpoint:
```bash
curl https://www.blinno.app/api/subscriptions/tiers
```

## Troubleshooting

### If `/api/subscriptions/tiers` still returns 404:

1. **Check Vercel deployment logs**:
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Check for build errors

2. **Verify route registration**:
   - The route exists in `backend/src/routes/subscriptions.ts` (line 625)
   - It's registered in `backend/src/server.ts` (line 114)

3. **Check function logs**:
   - Vercel Dashboard → Functions → View logs
   - Look for any runtime errors

4. **Verify environment variables**:
   - Ensure all required env vars are set in Vercel
   - Check that Supabase connection is working

5. **Test locally with Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel dev
   ```

## API Endpoint Structure

All API routes are accessible at:
- `https://www.blinno.app/api/subscriptions/tiers`
- `https://www.blinno.app/api/payments/webhook`
- `https://www.blinno.app/api/revenue/payouts/webhook`
- etc.

## Notes

- The Express app is deployed as a single serverless function
- All routes are handled by the same function instance
- Supabase handles database operations
- Webhooks should point to production URLs

