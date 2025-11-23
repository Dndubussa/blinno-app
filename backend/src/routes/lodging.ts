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

// Get properties for current owner
router.get('/properties', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lodging_properties WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

// Create property
router.post('/properties', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, address, city, country, propertyType, amenities, images } = req.body;
    const result = await pool.query(
      `INSERT INTO lodging_properties (owner_id, name, description, address, city, country, property_type, amenities, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.userId,
        name,
        description || null,
        address,
        city,
        country,
        propertyType || null,
        amenities || [],
        images || [],
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Get rooms
router.get('/rooms', authenticate, async (req: AuthRequest, res) => {
  try {
    const { propertyId } = req.query;
    let query = `
      SELECT lr.*, lp.owner_id
      FROM lodging_rooms lr
      JOIN lodging_properties lp ON lr.property_id = lp.id
      WHERE lp.owner_id = $1
    `;
    const params: any[] = [req.userId];
    
    if (propertyId) {
      query += ' AND lr.property_id = $2';
      params.push(propertyId);
    }
    
    query += ' ORDER BY lr.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Create room
router.post('/rooms', authenticate, async (req: AuthRequest, res) => {
  try {
    const { propertyId, roomNumber, roomType, description, pricePerNight, amenities, images, isAvailable } = req.body;
    
    // Verify property belongs to owner
    const propertyCheck = await pool.query(
      'SELECT id FROM lodging_properties WHERE id = $1 AND owner_id = $2',
      [propertyId, req.userId]
    );
    
    if (propertyCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Property not found or access denied' });
    }
    
    const result = await pool.query(
      `INSERT INTO lodging_rooms (property_id, room_number, room_type, description, price_per_night, amenities, images, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        propertyId,
        roomNumber,
        roomType,
        description || null,
        pricePerNight ? parseFloat(pricePerNight) : null,
        amenities || [],
        images || [],
        isAvailable !== undefined ? isAvailable : true,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get bookings
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT lb.*, 
              lp.name as property_name,
              lr.room_number,
              u.email,
              p.display_name
       FROM lodging_bookings lb
       JOIN lodging_properties lp ON lb.property_id = lp.id
       LEFT JOIN lodging_rooms lr ON lb.room_id = lr.id
       JOIN users u ON lb.guest_id = u.id
       LEFT JOIN profiles p ON lb.guest_id = p.user_id
       WHERE lp.owner_id = $1
       ORDER BY lb.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

/**
 * Create lodging booking
 */
router.post('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { propertyId, roomId, checkInDate, checkOutDate } = req.body;

    if (!propertyId || !roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'Property ID, room ID, check-in, and check-out dates are required' });
    }

    // Get room details and calculate total
    const roomResult = await pool.query(
      `SELECT r.*, lp.owner_id
       FROM lodging_rooms r
       JOIN lodging_properties lp ON r.property_id = lp.id
       WHERE r.id = $1 AND r.property_id = $2 AND r.is_available = true`,
      [roomId, propertyId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    const room = roomResult.rows[0];

    // Calculate number of nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const subtotal = parseFloat(room.price_per_night) * nights;

    // Create booking (pending payment)
    const bookingResult = await pool.query(
      `INSERT INTO lodging_bookings (property_id, room_id, guest_id, check_in_date, check_out_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [propertyId, roomId, req.userId, checkInDate, checkOutDate, subtotal]
    );

    const booking = bookingResult.rows[0];

    res.status(201).json({
      ...booking,
      nights,
      requiresPayment: true,
    });
  } catch (error: any) {
    console.error('Create lodging booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * Pay for lodging booking
 */
router.post('/bookings/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT lb.*, lp.name as property_name, lr.room_type, lr.price_per_night
       FROM lodging_bookings lb
       JOIN lodging_properties lp ON lb.property_id = lp.id
       JOIN lodging_rooms lr ON lb.room_id = lr.id
       WHERE lb.id = $1 AND lb.user_id = $2 AND lb.status = 'confirmed'`,
      [id, req.userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Calculate stay duration
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = nights * parseFloat(booking.price_per_night);

    // Calculate fees
    const feeCalculation = platformFees.calculateMarketplaceFee(totalAmount);

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'lodging_booking')
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
        'lodging_booking',
        booking.property_owner_id,
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
      customerEmail: customerEmail || booking.guest_email,
      customerName: customerName || booking.guest_name || 'Customer',
      description: `Lodging booking #${id} for ${booking.property_name}`,
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
    console.error('Create lodging booking payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * Pay for lodging reservation
 */
router.post('/bookings/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT lb.*, 
              lp.name as property_name, lr.room_type, lr.price_per_night, lp.owner_id,
              u.email, p.display_name, p.phone
       FROM lodging_bookings lb
       JOIN lodging_properties lp ON lb.property_id = lp.id
       JOIN lodging_rooms lr ON lb.room_id = lr.id
       JOIN users u ON lb.guest_id = u.id
       LEFT JOIN profiles p ON lb.guest_id = p.user_id
       WHERE lb.id = $1 AND lb.guest_id = $2`,
      [id, req.userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Calculate stay duration
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return res.status(400).json({ error: 'Invalid check-in/check-out dates' });
    }

    const totalAmount = nights * parseFloat(booking.price_per_night);

    // Calculate fees
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount);

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'lodging_reservation')
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
        'lodging_reservation',
        booking.owner_id,
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
      orderId: `lodging_reservation_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.email,
      customerName: customerName || booking.display_name || 'Customer',
      description: `Payment for lodging reservation: ${booking.property_name} (${booking.room_type}) for ${nights} night(s)`,
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
    console.error('Create lodging reservation payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Create lodging reservation - NEW
router.post('/bookings', async (req, res) => {
  try {
    const {
      propertyId, roomId, guestName, guestEmail, guestPhone,
      checkInDate, checkOutDate, numberOfGuests, specialRequests
    } = req.body;

    // Validate required fields
    if (!propertyId || !roomId || !guestName || !guestEmail || !guestPhone || 
        !checkInDate || !checkOutDate || !numberOfGuests) {
      return res.status(400).json({ 
        error: 'Missing required fields: propertyId, roomId, guestName, guestEmail, guestPhone, checkInDate, checkOutDate, numberOfGuests' 
      });
    }

    // Verify property and room exist and are available
    const roomResult = await pool.query(
      `SELECT lr.id, lr.property_id, lr.room_type, lr.price_per_night, lr.max_guests,
              lp.name as property_name, lp.owner_id,
              u.email as owner_email, p.display_name as owner_name
       FROM lodging_rooms lr
       JOIN lodging_properties lp ON lr.property_id = lp.id
       JOIN users u ON lp.owner_id = u.id
       LEFT JOIN profiles p ON lp.owner_id = p.user_id
       WHERE lr.id = $1 AND lr.property_id = $2 AND lr.availability_status = 'available'`,
      [roomId, propertyId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    const room = roomResult.rows[0];

    // Check guest capacity
    if (parseInt(numberOfGuests) > room.max_guests) {
      return res.status(400).json({ error: `Maximum ${room.max_guests} guests allowed for this room` });
    }

    // Check for date conflicts
    const conflictResult = await pool.query(
      `SELECT id FROM lodging_bookings 
       WHERE room_id = $1 
       AND status IN ('confirmed', 'pending') 
       AND (
         (check_in_date <= $2 AND check_out_date >= $2) OR
         (check_in_date <= $3 AND check_out_date >= $3) OR
         (check_in_date >= $2 AND check_out_date <= $3)
       )`,
      [roomId, checkInDate, checkOutDate]
    );

    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ error: 'Selected dates are not available' });
    }

    // Create booking
    const result = await pool.query(
      `INSERT INTO lodging_bookings (
        property_id, room_id, guest_name, guest_email, guest_phone,
        check_in_date, check_out_date, number_of_guests, special_requests, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [
        propertyId, roomId, guestName, guestEmail, guestPhone,
        checkInDate, checkOutDate, parseInt(numberOfGuests), specialRequests || null
      ]
    );

    const booking = result.rows[0];

    res.status(201).json({
      ...booking,
      property_name: room.property_name,
      room_type: room.room_type,
      price_per_night: room.price_per_night,
      owner_email: room.owner_email,
      owner_name: room.owner_name
    });
  } catch (error: any) {
    console.error('Create lodging booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;

