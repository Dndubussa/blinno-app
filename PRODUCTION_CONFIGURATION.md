# Production Configuration

## ✅ Current Configuration

### Frontend API URL
- **File**: `.env`
- **Setting**: `VITE_API_URL=https://www.blinno.app/api`
- **Status**: ✅ Configured for production

### Backend Server
- **CORS**: Automatically configured based on `NODE_ENV`
- **Production Origins**: `https://www.blinno.app`, `https://blinno.app`
- **Security Headers**: Enabled in production mode

## Production Deployment Checklist

### 1. Environment Variables

#### Frontend (Vercel/Netlify/etc.)
```env
VITE_API_URL=https://www.blinno.app/api
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

#### Backend (Hosting Platform)
```env
NODE_ENV=production
PORT=3001
APP_URL=https://www.blinno.app

# ClickPesa
CLICKPESA_CLIENT_ID=your_production_client_id
CLICKPESA_API_KEY=your_production_api_key
CLICKPESA_BASE_URL=https://api.clickpesa.com  # Production URL

# Supabase
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

### 2. Backend Server Configuration

The backend automatically detects production mode via `NODE_ENV=production`:

- ✅ **CORS**: Only allows `https://www.blinno.app` and `https://blinno.app`
- ✅ **Security Headers**: Enabled (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- ✅ **Rate Limiting**: Enabled (100 requests per 15 minutes per IP)

### 3. API Endpoints Verification

Ensure these endpoints are accessible in production:

- ✅ `GET /api/subscriptions/tiers` - Public endpoint
- ✅ `GET /api/subscriptions/current` - Requires authentication
- ✅ `POST /api/subscriptions/subscribe` - Requires authentication
- ✅ `POST /api/payments/webhook` - ClickPesa webhook
- ✅ `POST /api/revenue/payouts/webhook` - Payout webhook

### 4. Database Migrations

All migrations have been applied:
- ✅ Currency column in orders table
- ✅ RLS policies optimized
- ✅ Foreign key indexes added

### 5. Webhook Configuration

Update ClickPesa webhook URLs to production:
- **Payment Webhook**: `https://www.blinno.app/api/payments/webhook`
- **Payout Webhook**: `https://www.blinno.app/api/revenue/payouts/webhook`

## Troubleshooting 404 Errors

If you're getting 404 for `/api/subscriptions/tiers` in production:

1. **Verify backend is deployed and running**
   ```bash
   curl https://www.blinno.app/api/subscriptions/tiers
   ```

2. **Check backend logs** for any errors

3. **Verify route registration**:
   - Route exists: `backend/src/routes/subscriptions.ts` (line 625)
   - Registered in: `backend/src/server.ts` (line 114)

4. **Check CORS configuration**:
   - Ensure frontend origin is in allowed list
   - Check browser console for CORS errors

5. **Verify environment variables**:
   - `NODE_ENV=production` is set
   - All required env vars are configured

## Current Status

✅ **Frontend**: Configured for production (`https://www.blinno.app/api`)
✅ **Backend**: Production-ready (auto-detects `NODE_ENV`)
✅ **Database**: All migrations applied
✅ **Webhooks**: Configured for production URLs

## Next Steps

1. **Deploy backend** to production server
2. **Set environment variables** in hosting platform
3. **Update ClickPesa webhooks** to production URLs
4. **Test endpoints** after deployment
5. **Monitor logs** for any errors

