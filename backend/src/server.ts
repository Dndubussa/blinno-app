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
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize Supabase Storage buckets on startup
initializeStorageBuckets().catch(err => {
  console.error('Failed to initialize storage buckets:', err);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;