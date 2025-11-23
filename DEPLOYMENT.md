# Deployment Guide - BLINNO Platform

This guide covers deploying the BLINNO platform to production at **www.blinno.app**.

## Production Domain

- **Frontend**: `https://www.blinno.app`
- **Backend API**: `https://www.blinno.app/api` (or separate subdomain)
- **Database**: PostgreSQL (configured separately)

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` with the following:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=blinno
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,image/gif

# CORS Configuration
CORS_ORIGIN=https://www.blinno.app

# Click Pesa Configuration
CLICKPESA_CLIENT_ID=your_clickpesa_client_id
CLICKPESA_API_KEY=your_clickpesa_api_key
CLICKPESA_BASE_URL=https://api.clickpesa.com
APP_URL=https://www.blinno.app
```

### Frontend Environment Variables

Create `.env` in the root directory:

```env
VITE_API_URL=https://www.blinno.app/api
```

## Deployment Steps

### 1. Database Setup

1. **Create production database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE blinno;"
   ```

2. **Run schema migration**:
   ```bash
   psql -U postgres -d blinno -f backend/src/db/schema.sql
   ```

3. **Run payment tables migration**:
   ```bash
   psql -U postgres -d blinno -f backend/src/db/migrations/add_payments.sql
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

Ensure the uploads directory is writable:

```bash
mkdir -p backend/uploads/{avatars,portfolios,products,images}
chmod -R 755 backend/uploads
```

## Production Checklist

- [ ] Database created and migrations run
- [ ] Environment variables configured
- [ ] Backend server running
- [ ] Frontend built and deployed
- [ ] SSL certificate installed
- [ ] CORS configured correctly
- [ ] Click Pesa credentials configured
- [ ] Webhook URL configured in Click Pesa
- [ ] File uploads directory configured
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
6. **Database**: Use strong passwords and restrict access
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
- Check directory permissions
- Verify `UPLOAD_DIR` path is correct
- Check disk space

## Support

For deployment issues:
- Check server logs
- Review error messages
- Verify environment variables
- Test API endpoints directly

