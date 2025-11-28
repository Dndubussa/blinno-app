import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';
import { userPreferences } from '../services/userPreferences.js';

dotenv.config();

const router = express.Router();

const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

// Get restaurants for current owner
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Failed to get restaurants' });
  }
});

// Create restaurant
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      name, description, cuisineType, address, city, country, phone, email, website,
      priceRange, acceptsReservations, deliveryAvailable, images
    } = req.body;
    
    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        owner_id: req.userId,
        name,
        description: description || null,
        cuisine_type: cuisineType,
        address,
        city,
        country,
        phone: phone || null,
        email: email || null,
        website: website || null,
        price_range: priceRange || null,
        accepts_reservations: acceptsReservations !== undefined ? acceptsReservations : true,
        delivery_available: deliveryAvailable || false,
        images: images || [],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// Get menu items
router.get('/menu-items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { restaurantId } = req.query;
    
    let query = supabase
      .from('menu_items')
      .select(`
        *,
        restaurant:restaurants!inner(owner_id)
      `)
      .eq('restaurant.owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to get menu items' });
  }
});

// Create menu item
router.post('/menu-items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { restaurantId, name, description, price, category, isAvailable, imageUrl } = req.body;
    
    // Verify restaurant belongs to owner
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', req.userId)
      .single();
    
    if (!restaurant) {
      return res.status(403).json({ error: 'Restaurant not found or access denied' });
    }
    
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        name,
        description: description || null,
        price: price ? parseFloat(price) : null,
        category: category || null,
        is_available: isAvailable !== undefined ? isAvailable : true,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Get reservations
router.get('/reservations', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: reservations, error } = await supabase
      .from('restaurant_reservations')
      .select(`
        *,
        restaurant:restaurants!inner(name),
        guest:users!restaurant_reservations_guest_id_fkey(email),
        guest_profile:profiles!restaurant_reservations_guest_id_fkey(display_name)
      `)
      .eq('restaurant.owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (reservations || []).map((rr: any) => ({
      ...rr,
      restaurant_name: rr.restaurant?.name,
      email: rr.guest?.email,
      display_name: rr.guest_profile?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Failed to get reservations' });
  }
});

/**
 * Create restaurant order
 */
router.post('/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const { restaurantId, items } = req.body; // items: [{menuItemId, quantity}]

    if (!restaurantId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Restaurant ID and items are required' });
    }

    // Calculate total from menu items
    const menuItemIds = items.map((item: any) => item.menuItemId);

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select(`
        *,
        restaurant:restaurants!inner(owner_id)
      `)
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true);

    if (menuError || !menuItems || menuItems.length !== items.length) {
      return res.status(400).json({ error: 'Some menu items not found or unavailable' });
    }

    const ownerId = (menuItems[0] as any).restaurant?.owner_id;

    // Calculate subtotal
    let subtotal = 0;
    for (const item of items) {
      const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
      if (menuItem) {
        subtotal += parseFloat(menuItem.price.toString()) * item.quantity;
      }
    }

    // Create order (we'll use orders table for restaurant orders)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: req.userId,
        total_amount: subtotal,
        status: 'pending',
        notes: JSON.stringify({ restaurantId, items, type: 'restaurant_order' }),
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError;
    }

    // Create order items
    for (const item of items) {
      const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
      if (menuItem) {
        await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.menuItemId,
            quantity: item.quantity,
            price_at_purchase: menuItem.price,
          });
      }
    }

    res.status(201).json({
      ...order,
      requiresPayment: true,
    });
  } catch (error: any) {
    console.error('Create restaurant order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Pay for restaurant order
 */
router.post('/orders/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        user:users!orders_user_id_fkey(email),
        user_profile:profiles!orders_user_id_fkey(display_name)
      `)
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('status', 'pending')
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Parse notes to get restaurant ID
    let restaurantId = null;
    try {
      const notes = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
      if (notes?.type === 'restaurant_order' && notes?.restaurantId) {
        restaurantId = notes.restaurantId;
      }
    } catch (e) {
      // Notes might not be JSON
    }

    if (!restaurantId) {
      return res.status(400).json({ error: 'Invalid restaurant order' });
    }

    // Get restaurant owner
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const ownerId = restaurant.owner_id;

    // Calculate fees
    const feeCalculation = platformFees.calculateMarketplaceFee(parseFloat(order.total_amount.toString()));

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: id,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: 'USD',
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'restaurant_order',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

    // Record platform fee
    await supabase
      .from('platform_fees')
      .insert({
        transaction_id: id,
        transaction_type: 'restaurant_order',
        user_id: ownerId,
        buyer_id: req.userId,
        subtotal: feeCalculation.subtotal,
        platform_fee: feeCalculation.platformFee,
        payment_processing_fee: feeCalculation.paymentProcessingFee,
        total_fees: feeCalculation.totalFees,
        creator_payout: feeCalculation.creatorPayout,
        status: 'pending',
      });

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: 'USD',
      orderId: id,
      customerPhone: customerPhone,
      customerEmail: customerEmail || order.user?.email || '',
      customerName: customerName || order.user_profile?.display_name || 'Customer',
      description: `Restaurant order #${id}`,
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
    console.error('Create restaurant order payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * Pay for restaurant reservation
 */
router.post('/reservations/:id/payment', authenticate, async (req: AuthRequest, res) => {
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
    const currency = userPrefs.currency || 'USD';

    // Get reservation details
    const { data: reservation, error: reservationError } = await supabase
      .from('restaurant_reservations')
      .select(`
        *,
        restaurant:restaurants!inner(name, reservation_fee, owner_id),
        guest:users!restaurant_reservations_guest_id_fkey(email),
        guest_profile:profiles!restaurant_reservations_guest_id_fkey(display_name, phone)
      `)
      .eq('id', id)
      .eq('guest_id', req.userId)
      .single();

    if (reservationError || !reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Use reservation fee or default to 0
    let totalAmount = 0;
    if (reservation.restaurant?.reservation_fee) {
      totalAmount = parseFloat(reservation.restaurant.reservation_fee.toString());
    }

    // If no reservation fee, we might want to charge for the reservation
    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Restaurant does not charge for reservations' });
    }

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount, undefined, undefined, currency);

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `restaurant_reservation_${id}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'restaurant_reservation',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

    // Record platform fee
    await supabase
      .from('platform_fees')
      .insert({
        transaction_id: `restaurant_reservation_${id}`,
        transaction_type: 'restaurant_reservation',
        user_id: reservation.restaurant.owner_id,
        buyer_id: req.userId,
        subtotal: feeCalculation.subtotal,
        platform_fee: feeCalculation.platformFee,
        payment_processing_fee: feeCalculation.paymentProcessingFee,
        total_fees: feeCalculation.totalFees,
        creator_payout: feeCalculation.creatorPayout,
        status: 'pending',
      });

    // Create Click Pesa payment request with user's currency
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: currency,
      orderId: `restaurant_reservation_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || reservation.guest?.email || '',
      customerName: customerName || reservation.guest_profile?.display_name || 'Customer',
      description: `Payment for restaurant reservation: ${reservation.restaurant.name}`,
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
    console.error('Create restaurant reservation payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Create restaurant reservation - NEW
router.post('/reservations', async (req, res) => {
  try {
    const {
      restaurantId, guestName, guestEmail, guestPhone,
      reservationDate, reservationTime, numberOfGuests, specialRequests
    } = req.body;

    // Validate required fields
    if (!restaurantId || !guestName || !guestEmail || !guestPhone || 
        !reservationDate || !reservationTime || !numberOfGuests) {
      return res.status(400).json({ 
        error: 'Missing required fields: restaurantId, guestName, guestEmail, guestPhone, reservationDate, reservationTime, numberOfGuests' 
      });
    }

    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, owner_id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Create reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('restaurant_reservations')
      .insert({
        restaurant_id: restaurantId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        number_of_guests: parseInt(numberOfGuests),
        special_requests: specialRequests || null,
        status: 'pending',
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      throw reservationError;
    }

    res.status(201).json({
      ...reservation,
      restaurant_name: restaurant.name
    });
  } catch (error: any) {
    console.error('Create restaurant reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

export default router;
