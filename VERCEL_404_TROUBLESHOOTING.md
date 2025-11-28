# Vercel 404 NOT_FOUND Troubleshooting Guide

## Issue
Getting `404: NOT_FOUND` errors on Vercel deployment.

## Recent Fixes Applied

### 1. Trust Proxy Configuration
Added `app.set('trust proxy', true)` to `backend/src/server.ts` to properly handle Vercel's proxy headers.

### 2. Vercel Configuration Update
Updated `vercel.json` to use the `functions` format instead of `builds` (newer Vercel format).

### 3. Enhanced Debugging
Added logging in `api/index.ts` to track incoming requests.

## How to Debug

### Step 1: Enable Debug Mode
In Vercel Dashboard → Settings → Environment Variables, add:
```
DEBUG=true
```

### Step 2: Check Function Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Click on `api/index.ts`
5. View the logs

Look for:
- `[Vercel Handler]` - Shows what Vercel passes to the function
- `[Express]` - Shows what Express receives
- `404 Not Found` - Shows the path that wasn't matched

### Step 3: Test Health Endpoint
```bash
curl https://www.blinno.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Step 4: Check Route Registration
Verify the route exists in:
- `backend/src/routes/subscriptions.ts` (for `/api/subscriptions/tiers`)
- `backend/src/server.ts` (route is mounted at line 150)

## Common Causes

### 1. Path Mismatch
**Symptom**: Logs show path without `/api` prefix
**Fix**: Vercel should pass full path including `/api`. If not, check `vercel.json` routing.

### 2. Route Not Registered
**Symptom**: 404 for specific endpoint
**Fix**: Check `backend/src/server.ts` to ensure route is mounted.

### 3. Build Error
**Symptom**: Function doesn't exist or fails to compile
**Fix**: Check build logs in Vercel dashboard.

### 4. Environment Variables Missing
**Symptom**: Function crashes on startup
**Fix**: Ensure all required env vars are set in Vercel.

## Verification Checklist

- [ ] `vercel.json` has correct routing configuration
- [ ] `api/index.ts` exports the Express app correctly
- [ ] `backend/src/server.ts` has `trust proxy` enabled
- [ ] All routes are registered in `backend/src/server.ts`
- [ ] Environment variables are set in Vercel
- [ ] Build completes successfully
- [ ] Function logs show requests being received

## Next Steps

If 404 persists after these fixes:

1. **Check the exact path** in the 404 response
2. **Compare with logs** to see what Express received
3. **Verify route exists** in the route files
4. **Test locally** with `npm run dev` to ensure routes work

## Contact

If issue persists, share:
- The exact endpoint returning 404
- Vercel function logs
- The 404 response body (includes `path`, `originalUrl`, `availableEndpoints`)

