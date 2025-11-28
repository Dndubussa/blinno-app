# Vercel Frontend 404 Fix

## Issue
The root `index.html` was returning 404 because Vercel wasn't configured to serve the frontend static files.

## ✅ Fixed

Updated `vercel.json` to:
1. **Build the frontend**: Added `buildCommand` and `outputDirectory`
2. **Serve static files**: Added static build configuration
3. **Handle SPA routing**: All non-API routes now serve `index.html` for React Router
4. **Cache static assets**: Added cache headers for JS/CSS/images

## Configuration Changes

### Before:
- Only API routes were configured
- Frontend static files weren't being served
- SPA routing wasn't handled

### After:
- Frontend build is configured (`npm run build` → `dist/`)
- Static assets are served with proper caching
- All routes (except `/api/*`) serve `index.html` for client-side routing

## How It Works Now

1. **API Routes** (`/api/*`): Routed to serverless function
2. **Static Assets** (`.js`, `.css`, images): Served from `dist/` with caching
3. **All Other Routes**: Serve `index.html` (React Router handles routing)

## Deployment

After pushing this change:
1. Vercel will build the frontend (`npm run build`)
2. Serve static files from `dist/` directory
3. Route API calls to serverless functions
4. Handle client-side routing correctly

## Testing

After deployment, verify:
- ✅ Root URL loads: `https://www.blinno.app/`
- ✅ API endpoints work: `https://www.blinno.app/api/subscriptions/tiers`
- ✅ Client-side routing works: `https://www.blinno.app/music`, `/events`, etc.

