import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';

dotenv.config();

const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

const router = express.Router();

// Featured listing pricing
const FEATURED_PRICING = {
  homepage: 30000, // TZS 30,000/week
  category: 15000, // TZS 15,000/week
  search: 10000, // TZS 10,000/week
  event_page: 20000, // TZS 20,000/week
};

/**
 * Create featured listing
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { listingType, listingId, placementType, durationWeeks } = req.body;

    if (!listingType || !listingId || !placementType || !durationWeeks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!FEATURED_PRICING[placementType as keyof typeof FEATURED_PRICING]) {
      return res.status(400).json({ error: 'Invalid placement type' });
    }

    const pricePerWeek = FEATURED_PRICING[placementType as keyof typeof FEATURED_PRICING];
    const totalPrice = pricePerWeek * parseInt(durationWeeks);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (parseInt(durationWeeks) * 7));

    // Verify listing exists and belongs to user
    let listingExists = false;
    const listingTypes: { [key: string]: string } = {
      product: 'products',
      portfolio: 'portfolios',
      service: 'artisan_services',
      event: 'organized_events',
      restaurant: 'restaurants',
      lodging: 'lodging_properties',
    };

    const tableName = listingTypes[listingType];
    if (tableName) {
      const checkResult = await pool.query(
        `SELECT creator_id, owner_id FROM ${tableName} WHERE id = $1`,
        [listingId]
      );

      if (checkResult.rows.length > 0) {
        const ownerId = checkResult.rows[0].creator_id || checkResult.rows[0].owner_id;
        if (ownerId === req.userId) {
          listingExists = true;
        }
      }
    }

    if (!listingExists) {
      return res.status(404).json({ error: 'Listing not found or access denied' });
    }

    // Calculate fees (featured listings - platform keeps all, just processing fee)
    const paymentProcessingFee = (totalPrice * 0.025) + 500;
    const totalWithFees = totalPrice + paymentProcessingFee;

    // Create featured listing (pending payment)
    const result = await pool.query(
      `INSERT INTO featured_listings (
        user_id, listing_type, listing_id, placement_type,
        start_date, end_date, price_paid, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending')
      RETURNING *`,
      [req.userId, listingType, listingId, placementType, startDate, endDate, totalPrice]
    );

    const featuredListing = result.rows[0];

    // Record platform fee for featured listing
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [
        `featured_${featuredListing.id}`,
        'featured_listing',
        req.userId,
        totalPrice,
        0, // No platform fee on featured listings (revenue is the listing itself)
        paymentProcessingFee,
        paymentProcessingFee,
        totalPrice,
      ]
    );

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'featured_listing')
       RETURNING *`,
      [`featured_${featuredListing.id}`, req.userId, totalWithFees, 'TZS']
    );

    const payment = paymentResult.rows[0];

    res.status(201).json({
      ...featuredListing,
      totalPrice,
      totalWithFees,
      paymentId: payment.id,
      requiresPayment: true,
    });
  } catch (error: any) {
    console.error('Create featured listing error:', error);
    res.status(500).json({ error: 'Failed to create featured listing' });
  }
});

/**
 * Get active featured listings
 */
router.get('/', async (req, res) => {
  try {
    const { placementType, listingType } = req.query;

    let query = `
      SELECT fl.*, u.email, p.display_name
      FROM featured_listings fl
      JOIN users u ON fl.user_id = u.id
      LEFT JOIN profiles p ON fl.user_id = p.user_id
      WHERE fl.status = 'active' AND fl.end_date > now()
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (placementType) {
      query += ` AND fl.placement_type = $${paramCount++}`;
      params.push(placementType);
    }
    if (listingType) {
      query += ` AND fl.listing_type = $${paramCount++}`;
      params.push(listingType);
    }

    query += ` ORDER BY fl.start_date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get featured listings error:', error);
    res.status(500).json({ error: 'Failed to get featured listings' });
  }
});

/**
 * Get user's featured listings
 */
router.get('/my-listings', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM featured_listings
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my featured listings error:', error);
    res.status(500).json({ error: 'Failed to get featured listings' });
  }
});

/**
 * Get featured listing pricing
 */
router.get('/pricing', async (req, res) => {
  try {
    res.json(FEATURED_PRICING);
  } catch (error: any) {
    console.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

/**
 * Create payment for featured listing
 */
router.post('/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get featured listing
    const listingResult = await pool.query(
      `SELECT fl.*, u.email, p.display_name
       FROM featured_listings fl
       JOIN users u ON fl.user_id = u.id
       LEFT JOIN profiles p ON fl.user_id = p.user_id
       WHERE fl.id = $1 AND fl.user_id = $2 AND fl.payment_status = 'pending'`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Featured listing not found or already paid' });
    }

    const listing = listingResult.rows[0];

    // Calculate total with fees
    const paymentProcessingFee = (listing.price_paid * 0.025) + 500;
    const totalWithFees = listing.price_paid + paymentProcessingFee;

    // Get or create payment record
    let paymentResult = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1 AND user_id = $2`,
      [`featured_${id}`, req.userId]
    );

    let payment;
    if (paymentResult.rows.length === 0) {
      // Create payment record
      const newPaymentResult = await pool.query(
        `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
         VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'featured_listing')
         RETURNING *`,
        [`featured_${id}`, req.userId, totalWithFees, 'TZS']
      );
      payment = newPaymentResult.rows[0];
    } else {
      payment = paymentResult.rows[0];
      if (payment.status !== 'pending') {
        return res.status(400).json({ error: 'Payment already processed' });
      }
    }

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: totalWithFees,
      currency: 'TZS',
      orderId: `featured_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || listing.email,
      customerName: customerName || listing.display_name || 'Customer',
      description: `Featured listing: ${listing.placement_type} placement`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      await pool.query(
        `UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [clickPesaResponse.error || 'Payment creation failed', payment.id]
      );
      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await pool.query(
      `UPDATE payments 
       SET payment_id = $1, transaction_id = $2, checkout_url = $3, status = 'initiated'
       WHERE id = $4`,
      [
        clickPesaResponse.paymentId,
        clickPesaResponse.transactionId,
        clickPesaResponse.checkoutUrl,
        payment.id,
      ]
    );

    res.json({
      success: true,
      paymentId: payment.id,
      checkoutUrl: clickPesaResponse.checkoutUrl,
      message: 'Payment initiated successfully',
    });
  } catch (error: any) {
    console.error('Create featured listing payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;

