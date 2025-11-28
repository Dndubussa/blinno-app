import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Route imports
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import portfolioRoutes from './routes/portfolios.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import messageRoutes from './routes/messages.js';
import bookingRoutes from './routes/bookings.js';
import freelancerRoutes from './routes/freelancer.js';
import dashboardRoutes from './routes/dashboards.js';
import uploadRoutes from './routes/upload.js';
import paymentRoutes from './routes/payments.js';
import subscriptionRoutes from './routes/subscriptions.js';
import revenueRoutes from './routes/revenue.js';
import featuredRoutes from './routes/featured.js';
import digitalProductRoutes from './routes/digitalProducts.js';
import tipRoutes from './routes/tips.js';
import commissionRoutes from './routes/commissions.js';
import performanceBookingRoutes from './routes/performanceBookings.js';
import lodgingRoutes from './routes/lodging.js';
import restaurantRoutes from './routes/restaurants.js';
import financialRoutes from './routes/financial.js';
import courseRoutes from './routes/courses.js';
import newsRoutes from './routes/news.js';
import artisanRoutes from './routes/artisan.js';
import jobRoutes from './routes/jobs.js';
import eventRoutes from './routes/events.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import orderRoutes from './routes/orders.js';
import refundRoutes from './routes/refunds.js';
import disputeRoutes from './routes/disputes.js';
import socialRoutes from './routes/social.js';
import wishlistRoutes from './routes/wishlist.js';
import twoFactorRoutes from './routes/twoFactor.js';
import moderationRoutes from './routes/moderation.js';
import analyticsRoutes from './routes/analytics.js';
import emailTemplateRoutes from './routes/emailTemplates.js';
import serviceRoutes from './routes/services.js';
import musicRoutes from './routes/music.js';
import { initializeStorageBuckets } from './middleware/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS with specific origins - production only
const corsOptions = {
  origin: [
    'https://www.blinno.app',
    'https://blinno.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply different CORS settings based on environment
const env = process.env.NODE_ENV || 'development';
let corsConfig = corsOptions;

if (env === 'development') {
  corsConfig = {
    origin: [
      'https://www.blinno.app',
      'https://blinno.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:5173',
      'https://localhost:3000',
      'https://localhost:3001'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  };
} else {
  // Additional security headers for production
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware (only in development or for troubleshooting)
if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.path}`, {
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
      query: req.query
    });
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/digital-products', digitalProductRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/performance-bookings', performanceBookingRoutes);
app.use('/api/featured', featuredRoutes);
app.use('/api/lodging', lodgingRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/music', musicRoutes);

// Health check endpoint (accessible at /api/health or /health)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'BLINNO API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      subscriptions: '/api/subscriptions',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      revenue: '/api/revenue',
      music: '/api/music',
      services: '/api/services'
    }
  });
});

// 404 handler - must be before error handler
app.use((req: express.Request, res: express.Response) => {
  console.error('404 Not Found:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url
  });
  
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/health',
      '/api/subscriptions/tiers',
      '/api/products',
      '/api/cart',
      '/api/orders',
      '/api/payments'
    ]
  });
});

// Error handler - must be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  // Ensure response hasn't been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Send proper error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize Supabase Storage buckets on startup
initializeStorageBuckets().catch(err => {
  console.error('Failed to initialize storage buckets:', err);
});

// Only start listening if not in Vercel (serverless) environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;