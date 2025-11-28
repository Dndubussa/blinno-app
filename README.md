# BLINNO Platform

A comprehensive multi-sided marketplace platform for creators, businesses, and service providers.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Start frontend dev server
npm run dev

# Start backend dev server (in another terminal)
cd backend && npm run dev
```

### Production Build

```bash
# Build frontend and backend
npm run build:all

# Start production server
npm start
```

## 📦 Deployment Options

The platform can be deployed on **any platform**:

- 🐳 **Docker**: `docker-compose up -d`
- ☁️ **Vercel**: Automatic via `vercel.json`
- 🔄 **PM2**: `pm2 start ecosystem.config.js`
- ☸️ **Kubernetes**: Use provided Dockerfile
- 🌐 **Traditional Servers**: Direct Node.js deployment
- ☁️ **Cloud Platforms**: AWS, GCP, Azure, Railway, Render, Fly.io, etc.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Payments**: ClickPesa
- **Email**: Resend

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Multi-platform deployment
- [API Documentation](./API_DOCS.md) - API endpoints
- [Developer Guide](./DEVELOPER_GUIDE.md) - Development setup

## 🔧 Environment Variables

See `.env.example` for required environment variables.

## 📝 License

Proprietary - All rights reserved
