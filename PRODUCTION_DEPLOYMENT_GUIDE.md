# Production Deployment Guide

This guide provides step-by-step instructions for deploying the BLINNO platform to a production environment.

## Environment Configuration

### Backend Environment (.env)

The backend environment file has been updated for production:

```env
# Supabase Configuration
SUPABASE_URL=https://mzwopjynqugexusmklxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
VITE_API_URL=https://www.blinno.app/api

# Email Configuration
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.app>
# ... other email configurations

# Payment Configuration
CLICKPESA_API_KEY=your-clickpesa-api-key
CLICKPESA_PUBLIC_KEY=your-clickpesa-public-key

# Application Settings
NODE_ENV=production
PORT=3001
APP_URL=https://www.blinno.app
```

### Frontend Environment (.env)

The frontend environment file has been updated for production:

```env
VITE_API_URL=https://www.blinno.app/api
VITE_SUPABASE_URL=https://mzwopjynqugexusmklxt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment Steps

### 1. Backend Deployment

1. **Install production dependencies**:
   ```bash
   cd backend
   npm install --production
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Start the backend server**:
   ```bash
   npm start
   ```

   Or use PM2 for process management:
   ```bash
   pm2 start npm --name "blinno-backend" -- start
   ```

### 2. Frontend Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Deploy the dist folder** to your web server

### 3. Reverse Proxy Configuration (Nginx)

Configure Nginx to serve both frontend and backend:

```nginx
server {
    listen 80;
    server_name www.blinno.app;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.blinno.app;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # API routes
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

    # Frontend static files
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. SSL Certificate

Set up SSL certificate for HTTPS:

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d www.blinno.app
```

## Security Considerations

### CORS Configuration

The backend now uses environment-specific CORS settings:
- **Production**: Only allows requests from `https://www.blinno.app` and `https://blinno.app`
- **Development**: Allows requests from localhost domains for development

### Environment Variables

Never commit `.env` files to version control. Use secure methods to manage secrets:
- Environment variables in deployment platform
- Secret management services
- Encrypted configuration files

## Monitoring and Maintenance

### Health Check

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

### Database Backups

Regularly backup your Supabase database:
- Use Supabase's built-in backup features
- Set up automated backup schedules
- Test restore procedures periodically

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify CORS origins match your domain
   - Check browser console for specific errors
   - Ensure `NODE_ENV` is set to `production`

2. **API Not Accessible**:
   - Check if backend server is running
   - Verify reverse proxy configuration
   - Check firewall settings

3. **Frontend Not Loading**:
   - Verify static files are in correct location
   - Check Nginx configuration
   - Ensure all routes redirect to `index.html`

### Debugging Steps

1. **Check backend logs**:
   ```bash
   pm2 logs blinno-backend
   ```

2. **Test API endpoints directly**:
   ```bash
   curl https://www.blinno.app/api/health
   ```

3. **Verify environment variables**:
   ```bash
   echo $NODE_ENV
   ```

## Scaling Considerations

For high-traffic production environments:

1. **Load Balancing**:
   - Use multiple backend instances
   - Configure load balancer
   - Implement session affinity if needed

2. **Database Optimization**:
   - Monitor query performance
   - Add database indexes as needed
   - Consider read replicas for heavy read workloads

3. **Caching**:
   - Implement Redis for session storage
   - Use CDN for static assets
   - Cache API responses where appropriate

## Updates and Maintenance

### Deployment Process

1. **Backup**: Always backup before updates
2. **Test**: Test in staging environment first
3. **Deploy**: Deploy to production during low-traffic periods
4. **Monitor**: Monitor for issues after deployment

### Version Management

- Use semantic versioning
- Tag releases in version control
- Maintain changelogs
- Document breaking changes

## Support

For deployment issues:
- Check server logs
- Review error messages
- Verify environment variables
- Test API endpoints directly