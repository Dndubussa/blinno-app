# Multi-stage build for BLINNO Platform
# Supports deployment on any container platform (Docker, Kubernetes, etc.)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Exclude backend and api directories from frontend build
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy built backend
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/src ./src

# Copy built frontend (for serving static files if needed)
COPY --from=frontend-builder /app/dist ./public

# Copy necessary runtime files
COPY backend/tsconfig.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]

