import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import dotenv from 'dotenv';

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
    const result = await pool.query(
      'SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
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
    
    const result = await pool.query(
      `INSERT INTO restaurants (
        owner_id, name, description, cuisine_type, address, city, country,
        phone, email, website, price_range, accepts_reservations, delivery_available, images
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        req.userId,
        name,
        description || null,
        cuisineType,
        address,
        city,
        country,
        phone || null,
        email || null,
        website || null,
        priceRange || null,
        acceptsReservations !== undefined ? acceptsReservations : true,
        deliveryAvailable || false,
        images || [],
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// Get menu items
router.get('/menu-items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { restaurantId } = req.query;
    let query = `
      SELECT mi.*, r.owner_id
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.id
      WHERE r.owner_id = $1
    `;
    const params: any[] = [req.userId];
    
    if (restaurantId) {
      query += ' AND mi.restaurant_id = $2';
      params.push(restaurantId);
    }
    
    query += ' ORDER BY mi.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
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
    const restaurantCheck = await pool.query(
      'SELECT id FROM restaurants WHERE id = $1 AND owner_id = $2',
      [restaurantId, req.userId]
    );
    
    if (restaurantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Restaurant not found or access denied' });
    }
    
    const result = await pool.query(
      `INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        restaurantId,
        name,
        description || null,
        price ? parseFloat(price) : null,
        category || null,
        isAvailable !== undefined ? isAvailable : true,
        imageUrl || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Get reservations
router.get('/reservations', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.*, 
              r.name as restaurant_name,
              u.email,
              p.display_name
       FROM restaurant_reservations rr
       JOIN restaurants r ON rr.restaurant_id = r.id
       JOIN users u ON rr.guest_id = u.id
       LEFT JOIN profiles p ON rr.guest_id = p.user_id
       WHERE r.owner_id = $1
       ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
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
    let subtotal = 0;
    const menuItemIds = items.map((item: any) => item.menuItemId);

    const menuItemsResult = await pool.query(
      `SELECT mi.*, r.owner_id
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = ANY($1::uuid[]) AND mi.restaurant_id = $2 AND mi.is_available = true`,
      [menuItemIds, restaurantId]
    );

    if (menuItemsResult.rows.length !== items.length) {
      return res.status(400).json({ error: 'Some menu items not found or unavailable' });
    }

    const menuItems = menuItemsResult.rows;
    const ownerId = menuItems[0].owner_id;

    // Calculate subtotal
    for (const item of items) {
      const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
      if (menuItem) {
        subtotal += parseFloat(menuItem.price) * item.quantity;
      }
    }

    // Create order (we'll use orders table for restaurant orders)
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total_amount, status, notes)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [req.userId, subtotal, JSON.stringify({ restaurantId, items, type: 'restaurant_order' })]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of items) {
      const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
      if (menuItem) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.menuItemId, item.quantity, menuItem.price]
        );
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
    const orderResult = await pool.query(
      `SELECT o.*, u.email, p.display_name, o.notes::jsonb->>'restaurantId' as restaurant_id
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN profiles p ON o.user_id = p.user_id
       WHERE o.id = $1 AND o.user_id = $2 AND o.status = 'pending'
       AND o.notes::jsonb->>'type' = 'restaurant_order'`,
      [id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get restaurant owner
    const restaurantResult = await pool.query(
      `SELECT owner_id FROM restaurants WHERE id = $1`,
      [order.restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const ownerId = restaurantResult.rows[0].owner_id;

    // Calculate fees
    const feeCalculation = platformFees.calculateMarketplaceFee(parseFloat(order.total_amount));

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'restaurant_order')
       RETURNING *`,
      [id, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        id,
        'restaurant_order',
        ownerId,
        req.userId,
        feeCalculation.subtotal,
        feeCalculation.platformFee,
        feeCalculation.paymentProcessingFee,
        feeCalculation.totalFees,
        feeCalculation.creatorPayout,
      ]
    );

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: 'TZS',
      orderId: id,
      customerPhone: customerPhone,
      customerEmail: customerEmail || order.email,
      customerName: customerName || order.display_name || 'Customer',
      description: `Restaurant order #${id}`,
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

    // Get reservation details
    const reservationResult = await pool.query(
      `SELECT rr.*, 
              r.name as restaurant_name, r.owner_id,
              u.email, p.display_name, p.phone
       FROM restaurant_reservations rr
       JOIN restaurants r ON rr.restaurant_id = r.id
       JOIN users u ON rr.guest_id = u.id
       LEFT JOIN profiles p ON rr.guest_id = p.user_id
       WHERE rr.id = $1 AND rr.guest_id = $2`,
      [id, req.userId]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservationResult.rows[0];

    // For restaurant reservations, we might need to define pricing
    // For now, we'll use a default amount or get it from the restaurant
    const restaurantResult = await pool.query(
      'SELECT reservation_fee FROM restaurants WHERE id = $1',
      [reservation.restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = restaurantResult.rows[0];
    let totalAmount = 0;

    // Use restaurant reservation fee or default to 0
    if (restaurant.reservation_fee) {
      totalAmount = parseFloat(restaurant.reservation_fee);
    }

    // If no reservation fee, we might want to charge for the reservation
    // For now, we'll allow free reservations
    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Restaurant does not charge for reservations' });
    }

    // Calculate fees
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount);

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'restaurant_reservation')
       RETURNING *`,
      [id, req.userId, feeCalculation.total, 'TZS']
    );

    const payment = paymentResult.rows[0];

    // Record platform fee
    await pool.query(
      `INSERT INTO platform_fees (
        transaction_id, transaction_type, user_id, buyer_id,
        subtotal, platform_fee, payment_processing_fee, total_fees, creator_payout, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        id,
        'restaurant_reservation',
        reservation.owner_id,
        req.userId,
        feeCalculation.subtotal,
        feeCalculation.platformFee,
        feeCalculation.paymentProcessingFee,
        feeCalculation.totalFees,
        feeCalculation.creatorPayout,
      ]
    );

    // Create Click Pesa payment request
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: 'TZS',
      orderId: `restaurant_reservation_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || reservation.email,
      customerName: customerName || reservation.display_name || 'Customer',
      description: `Payment for restaurant reservation: ${reservation.restaurant_name}`,
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
    const restaurantResult = await pool.query(
      'SELECT id, owner_id, name FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = restaurantResult.rows[0];

    // Create reservation
    const result = await pool.query(
      `INSERT INTO restaurant_reservations (
        restaurant_id, guest_name, guest_email, guest_phone,
        reservation_date, reservation_time, number_of_guests, special_requests, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [
        restaurantId, guestName, guestEmail, guestPhone,
        reservationDate, reservationTime, parseInt(numberOfGuests), specialRequests || null
      ]
    );

    const reservation = result.rows[0];

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

