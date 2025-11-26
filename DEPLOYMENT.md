# Deployment Guide

This guide covers deploying the BLINNO platform to production with Supabase.

## Prerequisites

1. **Supabase Account**: Create an account at https://supabase.com
2. **Domain**: A domain name (e.g., www.blinno.app)
3. **Server**: A server/VPS for backend (Node.js 18+)
4. **Click Pesa Account**: For payment processing (optional)

## Deployment Steps

### 1. Supabase Setup

1. **Create Supabase project**:
   - Go to Supabase Dashboard
   - Create new project
   - Note your project credentials

2. **Run database migrations**:
   - Go to SQL Editor in Supabase Dashboard
   - Run migration files from `supabase/migrations/`

   OR use Supabase CLI:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

### 2. Backend Deployment

1. **Install dependencies**:
   ```bash
   cd backend
   npm install --production
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Start backend server**:
   ```bash
   npm start
   ```

   Or use a process manager like PM2:
   ```bash
   pm2 start npm --name "blinno-backend" -- start
   ```

4. **Configure reverse proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name www.blinno.app;

       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### 3. Frontend Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Deploy dist folder**:
   - Copy `dist/` folder to your web server
   - Configure Nginx/Apache to serve static files
   - Ensure all routes redirect to `index.html` for SPA routing

### 4. SSL Certificate

Set up SSL certificate for HTTPS:

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d www.blinno.app
```

### 5. Click Pesa Webhook Configuration

1. Log in to Click Pesa Dashboard
2. Navigate to Settings > Developers > Webhooks
3. Add webhook URL: `https://www.blinno.app/api/payments/webhook`
4. Select events:
   - `PAYMENT RECEIVED`
   - `PAYMENT FAILED`
   - `PAYMENT CANCELLED`

### 6. File Uploads

For production, consider using cloud storage (S3, Cloudinary, etc.) instead of local file storage.

## Production Checklist

- [ ] Supabase project created and migrations run
- [ ] Environment variables configured
- [ ] Backend server running
- [ ] Frontend built and deployed
- [ ] SSL certificate installed
- [ ] CORS configured correctly
- [ ] Click Pesa credentials configured
- [ ] Webhook URL configured in Click Pesa
- [ ] Error logging configured
- [ ] Backup strategy in place
- [ ] Monitoring set up

## Monitoring

### Health Check Endpoint

Monitor backend health:
```
GET https://www.blinno.app/api/health
```

### Logs

Monitor application logs:
```bash
# PM2 logs
pm2 logs blinno-backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use a strong, random secret
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Already configured in backend
5. **CORS**: Restrict to production domain only
6. **Database**: Supabase handles security, but use strong passwords
7. **File Uploads**: Validate file types and sizes

## Troubleshooting

### Backend not accessible
- Check firewall rules
- Verify reverse proxy configuration
- Check backend logs

### CORS errors
- Verify `CORS_ORIGIN` matches frontend domain
- Check browser console for specific errors

### Payment webhooks not working
- Verify webhook URL is accessible
- Check Click Pesa dashboard for webhook status
- Review backend logs for incoming requests

### File uploads failing
- Check directory permissions (if using local storage)
- Verify file storage configuration
- Check disk space

## Support

For deployment issues:
- Check server logs
- Review error messages
- Verify environment variables
- Test API endpoints directly