import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';
import { userPreferences } from '../services/userPreferences.js';

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
      // Check ownership - different tables have different owner/creator columns
      let ownerColumn = 'creator_id';
      if (['restaurants', 'lodging_properties'].includes(tableName)) {
        ownerColumn = 'owner_id';
      }

      const { data: listing } = await supabase
        .from(tableName)
        .select(ownerColumn)
        .eq('id', listingId)
        .single();

      if (listing && (listing as any)[ownerColumn] === req.userId) {
        listingExists = true;
      }
    }

    if (!listingExists) {
      return res.status(404).json({ error: 'Listing not found or access denied' });
    }

    // Calculate fees (featured listings - platform keeps all, just processing fee)
    const paymentProcessingFee = (totalPrice * 0.025) + 500;
    const totalWithFees = totalPrice + paymentProcessingFee;

    // Create featured listing (pending payment)
    const { data: featuredListing, error: listingError } = await supabase
      .from('featured_listings')
      .insert({
        user_id: req.userId,
        listing_type: listingType,
        listing_id: listingId,
        placement_type: placementType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        price_paid: totalPrice,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (listingError || !featuredListing) {
      throw listingError;
    }

    // Record platform fee for featured listing
    await supabase
      .from('platform_fees')
      .insert({
        transaction_id: `featured_${featuredListing.id}`,
        transaction_type: 'featured_listing',
        user_id: req.userId,
        subtotal: totalPrice,
        platform_fee: 0, // No platform fee on featured listings (revenue is the listing itself)
        payment_processing_fee: paymentProcessingFee,
        total_fees: paymentProcessingFee,
        creator_payout: totalPrice,
        status: 'pending',
      });

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `featured_${featuredListing.id}`,
        user_id: req.userId,
        amount: totalWithFees,
        currency: 'TZS',
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'featured_listing',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

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

    let query = supabase
      .from('featured_listings')
      .select(`
        *,
        user:users!featured_listings_user_id_fkey(email),
        profile:profiles!featured_listings_user_id_fkey(display_name)
      `)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .order('start_date', { ascending: false });

    if (placementType) {
      query = query.eq('placement_type', placementType as string);
    }
    if (listingType) {
      query = query.eq('listing_type', listingType as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((fl: any) => ({
      ...fl,
      email: fl.user?.email,
      display_name: fl.profile?.display_name,
    }));

    res.json(transformed);
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
    const { data, error } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
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

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'TZS';

    // Get featured listing
    const { data: listing, error: listingError } = await supabase
      .from('featured_listings')
      .select(`
        *,
        user:users!featured_listings_user_id_fkey(email),
        profile:profiles!featured_listings_user_id_fkey(display_name)
      `)
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('payment_status', 'pending')
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Featured listing not found or already paid' });
    }

    // Calculate total with fees using user's currency
    const fixedFee = platformFees['getFixedFeeForCurrency'] ? 
      platformFees['getFixedFeeForCurrency'](currency) : 500;
    const paymentProcessingFee = (parseFloat(listing.price_paid.toString()) * 0.025) + fixedFee;
    const totalWithFees = parseFloat(listing.price_paid.toString()) + paymentProcessingFee;

    // Get or create payment record
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', `featured_${id}`)
      .eq('user_id', req.userId)
      .single();

    let payment;
    if (!existingPayment) {
      // Create payment record with user's currency
      const { data: newPayment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: `featured_${id}`,
          user_id: req.userId,
          amount: totalWithFees,
          currency: currency,
          status: 'pending',
          payment_method: 'clickpesa',
          payment_type: 'featured_listing',
        })
        .select()
        .single();

      if (paymentError || !newPayment) {
        throw paymentError;
      }
      payment = newPayment;
    } else {
      payment = existingPayment;
      if (payment.status !== 'pending') {
        return res.status(400).json({ error: 'Payment already processed' });
      }
    }

    // Create Click Pesa payment request with user's currency
    const paymentRequest: PaymentRequest = {
      amount: totalWithFees,
      currency: currency,
      orderId: `featured_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || listing.user?.email || '',
      customerName: customerName || listing.profile?.display_name || 'Customer',
      description: `Featured listing: ${listing.placement_type} placement`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: clickPesaResponse.error || 'Payment creation failed',
        })
        .eq('id', payment.id);

      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await supabase
      .from('payments')
      .update({
        payment_id: clickPesaResponse.paymentId,
        transaction_id: clickPesaResponse.transactionId,
        checkout_url: clickPesaResponse.checkoutUrl,
        status: 'initiated',
      })
      .eq('id', payment.id);

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
