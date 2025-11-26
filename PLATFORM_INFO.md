# BLINNO Platform Information

## Production Website

**Official Website**: https://www.blinno.app

## Platform Overview

BLINNO is a multi-sided marketplace SaaS platform for Tanzanian creators, businesses, and service providers.

## Production URLs

- **Frontend**: `https://www.blinno.app`
- **Backend API**: `https://www.blinno.app/api`
- **Database**: Supabase (managed PostgreSQL)

## Development URLs

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000/api`

## Environment Configuration

### Production Environment Variables

**Backend** (`backend/.env`):
```env
NODE_ENV=production
PORT=3000
APP_URL=https://www.blinno.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLICKPESA_BASE_URL=https://api.clickpesa.com
```

**Frontend** (root `.env`):
```env
VITE_API_URL=https://www.blinno.app/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development Environment Variables

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLICKPESA_BASE_URL=https://sandbox.clickpesa.com
```

**Frontend** (root `.env`):
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Webhook URLs

When configuring webhooks (e.g., Click Pesa), use:

- **Payment Webhooks**: `https://www.blinno.app/api/payments/webhook`
- **Revenue/Payout Webhooks**: `https://www.blinno.app/api/revenue/payouts/webhook`

## Domain Configuration

Ensure your DNS is configured to point:
- `www.blinno.app` → Frontend hosting
- `www.blinno.app/api` → Backend API server

Or use subdomains:
- `www.blinno.app` → Frontend
- `api.blinno.app` → Backend API

## SSL/HTTPS

Production must use HTTPS. Ensure SSL certificates are configured for:
- `www.blinno.app`
- `api.blinno.app` (if using subdomain)

## Contact & Support

- **Website**: https://www.blinno.app
- **Support**: Available through the platform

