# BLINNO Platform - Multi-Platform Deployment Guide

This guide covers deploying the BLINNO platform on various hosting providers and platforms.

## 🚀 Supported Deployment Platforms

- ✅ **Vercel** (Serverless Functions)
- ✅ **Docker** (Any container platform)
- ✅ **Traditional Servers** (PM2, systemd, etc.)
- ✅ **Kubernetes**
- ✅ **AWS EC2/ECS/Lambda**
- ✅ **Google Cloud Run**
- ✅ **Azure App Service**
- ✅ **DigitalOcean App Platform**
- ✅ **Railway**
- ✅ **Render**
- ✅ **Fly.io**

## 📋 Prerequisites

- Node.js 20+ 
- npm or yarn
- Environment variables configured
- Supabase project set up

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
APP_URL=https://www.blinno.app

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ClickPesa Payment Gateway
CLICKPESA_CLIENT_ID=your_client_id
CLICKPESA_API_KEY=your_api_key
CLICKPESA_BASE_URL=https://api.clickpesa.com

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=BLINNO <noreply@blinno.app>

# Optional: Set to '1' for serverless platforms (Vercel, Lambda)
# VERCEL=1
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t blinno-platform .

# Run the container
docker run -d \
  --name blinno-app \
  -p 3001:3001 \
  --env-file .env \
  blinno-platform

# Or use docker-compose
docker-compose up -d
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Deployment

```bash
# Build for production
docker build -t blinno-platform:latest .

# Tag for registry
docker tag blinno-platform:latest your-registry/blinno-platform:latest

# Push to registry
docker push your-registry/blinno-platform:latest

# Deploy to server
docker pull your-registry/blinno-platform:latest
docker run -d \
  --name blinno-app \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  your-registry/blinno-platform:latest
```

## 🔄 PM2 Deployment (Traditional Servers)

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Build the project
npm run build
cd backend && npm run build && cd ..
```

### Start with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions provided

# View logs
pm2 logs blinno-backend

# Monitor
pm2 monit

# Restart
pm2 restart blinno-backend

# Stop
pm2 stop blinno-backend
```

## ☁️ Cloud Platform Deployments

### Vercel (Serverless)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy (automatic on push)

The `vercel.json` and `api/index.ts` files handle Vercel-specific configuration.

### Railway

1. Connect GitHub repository
2. Railway auto-detects Dockerfile
3. Set environment variables
4. Deploy

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Build command: `npm run build && cd backend && npm run build`
4. Start command: `node backend/dist/server.js`
5. Set environment variables
6. Deploy

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Deploy
fly deploy
```

### AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/your-org/blinno-app.git
cd blinno-app

# Install dependencies
npm install
cd backend && npm install && npm run build && cd ..

# Install PM2
sudo npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT-ID/blinno-platform

# Deploy to Cloud Run
gcloud run deploy blinno-platform \
  --image gcr.io/PROJECT-ID/blinno-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3001 \
  --set-env-vars NODE_ENV=production
```

### Azure App Service

1. Create App Service in Azure Portal
2. Configure deployment from GitHub
3. Set environment variables in Configuration
4. Deploy

## 🔒 Reverse Proxy Setup (Nginx)

For production deployments, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name www.blinno.app blinno.app;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.blinno.app blinno.app;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend static files
    location / {
        root /app/dist;
        try_files $uri $uri/ /index.html;
    }

    # API backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /api/health {
        proxy_pass http://localhost:3001/api/health;
        access_log off;
    }
}
```

## 📊 Monitoring & Logging

### Health Check Endpoint

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Logging

- **PM2**: Logs stored in `./logs/` directory
- **Docker**: `docker logs blinno-app`
- **Systemd**: `journalctl -u blinno-app`

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build
cd backend && npm run build && cd ..

# Restart
pm2 restart blinno-backend
# or
docker-compose restart
```

### Database Migrations

```bash
# Run migrations using Supabase CLI or MCP
# See backend/migrations/ directory
```

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Kill process
kill -9 <PID>
```

### Check Server Status

```bash
# PM2
pm2 status
pm2 logs

# Docker
docker ps
docker logs blinno-app

# Health check
curl http://localhost:3001/api/health
```

### Environment Variables

Ensure all required environment variables are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLICKPESA_CLIENT_ID`
- `CLICKPESA_API_KEY`
- `APP_URL`

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Vercel Documentation](https://vercel.com/docs)

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build completed successfully
- [ ] Health check endpoint responding
- [ ] CORS configured correctly
- [ ] SSL/TLS certificates installed (production)
- [ ] Reverse proxy configured (if needed)
- [ ] Monitoring set up
- [ ] Logs accessible
- [ ] Backup strategy in place
