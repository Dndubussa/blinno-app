# Quick Start Guide

## 🚀 Deploy BLINNO Platform Anywhere

The platform is now configured to deploy on **any platform** - not just Vercel!

### Option 1: Docker (Recommended for most platforms)

```bash
# Build and run
docker-compose up -d

# Or manually
docker build -t blinno-platform .
docker run -p 3001:3001 --env-file .env blinno-platform
```

### Option 2: PM2 (Traditional Servers)

```bash
# Build
npm run build:all

# Start with PM2
npm run start:pm2
# or
pm2 start ecosystem.config.js
```

### Option 3: Direct Node.js

```bash
# Build
npm run build:all

# Start
npm start
```

### Option 4: Vercel (Serverless)

Just push to GitHub - Vercel auto-deploys using `vercel.json`!

## 📋 Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your environment variables
3. Deploy!

## ✅ What's Included

- ✅ **Docker** support with multi-stage builds
- ✅ **PM2** configuration for process management
- ✅ **Static file serving** for frontend (non-serverless)
- ✅ **SPA routing** support
- ✅ **Health checks** at `/api/health`
- ✅ **Platform-agnostic** server code

## 📚 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions for all platforms.

