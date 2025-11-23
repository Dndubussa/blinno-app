import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
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

// Get organized events for current organizer
router.get('/organized', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM organized_events WHERE organizer_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create event
router.post('/organized', authenticate, requireRole('event_organizer'), async (req: AuthRequest, res) => {
  try {
    const {
      title, description, category, venueName, venueAddress, city,
      startDate, endDate, startTime, endTime, coverImageUrl,
      ticketPrice, ticketUrl, maxAttendees, tags, isPublished, isFeatured, status
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO organized_events (
        organizer_id, title, description, category, venue_name, venue_address, city,
        start_date, end_date, start_time, end_time, cover_image_url,
        ticket_price, ticket_url, max_attendees, tags, is_published, is_featured, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        req.userId,
        title,
        description,
        category,
        venueName,
        venueAddress,
        city,
        startDate,
        endDate || null,
        startTime,
        endTime || null,
        coverImageUrl || null,
        ticketPrice ? parseFloat(ticketPrice) : null,
        ticketUrl || null,
        maxAttendees || null,
        tags || [],
        isPublished || false,
        isFeatured || false,
        status || 'draft',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * Delete organized event
 */
router.delete('/organized/:id', authenticate, requireRole('event_organizer'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if event belongs to user
    const result = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND organizer_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete event
    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get registrations
router.get('/registrations', authenticate, requireRole('event_organizer'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*, 
              e.title as event_title,
              u.email,
              p.display_name
       FROM event_registrations er
       JOIN organized_events e ON er.event_id = e.id
       JOIN users u ON er.attendee_id = u.id
       LEFT JOIN profiles p ON er.attendee_id = p.user_id
       WHERE e.organizer_id = $1
       ORDER BY er.registration_date DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

/**
 * Pay for event registration
 */
router.post('/registrations/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Get registration details
    const registrationResult = await pool.query(
      `SELECT er.*, 
              e.title as event_title, e.ticket_price, e.organizer_id,
              u.email, p.display_name, p.phone
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       JOIN users u ON er.attendee_id = u.id
       LEFT JOIN profiles p ON er.attendee_id = p.user_id
       WHERE er.id = $1 AND er.attendee_id = $2`,
      [id, req.userId]
    );

    if (registrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const registration = registrationResult.rows[0];

    if (!registration.ticket_price || registration.ticket_price <= 0) {
      return res.status(400).json({ error: 'Event has no ticket price' });
    }

    // Calculate total amount (ticket price * number of tickets)
    const totalAmount = parseFloat(registration.ticket_price) * parseInt(registration.number_of_tickets);

    // Calculate fees
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount);

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_type)
       VALUES ($1, $2, $3, $4, 'pending', 'clickpesa', 'event_registration')
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
        'event_registration',
        registration.organizer_id,
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
      orderId: `event_registration_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || registration.email,
      customerName: customerName || registration.display_name || 'Customer',
      description: `Payment for event registration: ${registration.event_title} (${registration.number_of_tickets} tickets)`,
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
    console.error('Create event registration payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Register for event - NEW
router.post('/registrations', async (req, res) => {
  try {
    const {
      eventId, attendeeName, attendeeEmail, attendeePhone,
      numberOfTickets, specialRequests
    } = req.body;

    // Validate required fields
    if (!eventId || !attendeeName || !attendeeEmail || !attendeePhone || !numberOfTickets) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventId, attendeeName, attendeeEmail, attendeePhone, numberOfTickets' 
      });
    }

    // Verify event exists and has available tickets
    const eventResult = await pool.query(
      `SELECT e.id, e.title, e.organizer_id, e.ticket_price, e.max_attendees, e.current_attendees,
              u.email as organizer_email, p.display_name as organizer_name
       FROM events e
       JOIN users u ON e.organizer_id = u.id
       LEFT JOIN profiles p ON e.organizer_id = p.user_id
       WHERE e.id = $1 AND e.status = 'published'`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not published' });
    }

    const event = eventResult.rows[0];
    
    // Check if there are enough tickets available
    const availableTickets = event.max_attendees - event.current_attendees;
    if (availableTickets < numberOfTickets) {
      return res.status(400).json({ error: `Not enough tickets available. Only ${availableTickets} left.` });
    }

    // Create registration
    const result = await pool.query(
      `INSERT INTO event_registrations (
        event_id, attendee_name, attendee_email, attendee_phone,
        number_of_tickets, special_requests, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        eventId, attendeeName, attendeeEmail, attendeePhone,
        parseInt(numberOfTickets), specialRequests || null
      ]
    );

    const registration = result.rows[0];

    // Update event's current attendees count
    await pool.query(
      'UPDATE events SET current_attendees = current_attendees + $1 WHERE id = $2',
      [parseInt(numberOfTickets), eventId]
    );

    res.status(201).json({
      ...registration,
      event_title: event.title,
      organizer_email: event.organizer_email,
      organizer_name: event.organizer_name,
      total_cost: event.ticket_price * parseInt(numberOfTickets)
    });
  } catch (error: any) {
    console.error('Create event registration error:', error);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

export default router;

