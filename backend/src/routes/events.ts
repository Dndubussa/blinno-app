import express from 'express';
import { supabase } from '../config/supabase.js';
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
    const { data, error } = await supabase
      .from('organized_events')
      .select('*')
      .eq('organizer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
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
    
    const { data, error } = await supabase
      .from('organized_events')
      .insert({
        organizer_id: req.userId,
        title,
        description,
        category,
        venue_name: venueName,
        venue_address: venueAddress,
        city,
        start_date: startDate,
        end_date: endDate || null,
        start_time: startTime,
        end_time: endTime || null,
        cover_image_url: coverImageUrl || null,
        ticket_price: ticketPrice ? parseFloat(ticketPrice) : null,
        ticket_url: ticketUrl || null,
        max_attendees: maxAttendees || null,
        tags: tags || [],
        is_published: isPublished || false,
        is_featured: isFeatured || false,
        status: status || 'draft',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
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
    const { data: existing } = await supabase
      .from('organized_events')
      .select('id')
      .eq('id', id)
      .eq('organizer_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete event
    const { error } = await supabase
      .from('organized_events')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get registrations
router.get('/registrations', authenticate, requireRole('event_organizer'), async (req: AuthRequest, res) => {
  try {
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:organized_events!inner(title),
        attendee:users!event_registrations_attendee_id_fkey(email),
        attendee_profile:profiles!event_registrations_attendee_id_fkey(display_name)
      `)
      .eq('event.organizer_id', req.userId)
      .order('registration_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (registrations || []).map((er: any) => ({
      ...er,
      event_title: er.event?.title,
      email: er.attendee?.email,
      display_name: er.attendee_profile?.display_name,
    }));

    res.json(transformed);
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
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:organized_events!inner(title, ticket_price, organizer_id),
        attendee:users!event_registrations_attendee_id_fkey(email),
        attendee_profile:profiles!event_registrations_attendee_id_fkey(display_name, phone)
      `)
      .eq('id', id)
      .eq('attendee_id', req.userId)
      .single();

    if (regError || !registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (!registration.event?.ticket_price || registration.event.ticket_price <= 0) {
      return res.status(400).json({ error: 'Event has no ticket price' });
    }

    // Calculate total amount (ticket price * number of tickets)
    const totalAmount = parseFloat(registration.event.ticket_price.toString()) * parseInt(registration.number_of_tickets.toString());

    // Calculate fees
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount);

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `event_registration_${id}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: 'USD',
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'event_registration',
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
        transaction_id: `event_registration_${id}`,
        transaction_type: 'event_registration',
        user_id: registration.event.organizer_id,
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
      orderId: `event_registration_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || registration.attendee?.email || '',
      customerName: customerName || registration.attendee_profile?.display_name || 'Customer',
      description: `Payment for event registration: ${registration.event.title} (${registration.number_of_tickets} tickets)`,
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
    const { data: event, error: eventError } = await supabase
      .from('organized_events')
      .select(`
        *,
        organizer:users!organized_events_organizer_id_fkey(email),
        organizer_profile:profiles!organized_events_organizer_id_fkey(display_name)
      `)
      .eq('id', eventId)
      .eq('status', 'published')
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found or not published' });
    }
    
    // Check if there are enough tickets available
    const availableTickets = (event.max_attendees || 0) - (event.current_attendees || 0);
    if (availableTickets < numberOfTickets) {
      return res.status(400).json({ error: `Not enough tickets available. Only ${availableTickets} left.` });
    }

    // Create registration
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        number_of_tickets: parseInt(numberOfTickets),
        special_requests: specialRequests || null,
        status: 'pending',
      })
      .select()
      .single();

    if (regError || !registration) {
      throw regError;
    }

    // Update event's current attendees count
    await supabase.rpc('increment', {
      table_name: 'organized_events',
      column_name: 'current_attendees',
      id: eventId,
      increment_by: parseInt(numberOfTickets),
    }).catch(async () => {
      // Fallback if RPC doesn't exist
      const { data: currentEvent } = await supabase
        .from('organized_events')
        .select('current_attendees')
        .eq('id', eventId)
        .single();
      
      await supabase
        .from('organized_events')
        .update({
          current_attendees: (currentEvent?.current_attendees || 0) + parseInt(numberOfTickets),
        })
        .eq('id', eventId);
    });

    res.status(201).json({
      ...registration,
      event_title: event.title,
      organizer_email: event.organizer?.email,
      organizer_name: event.organizer_profile?.display_name,
      total_cost: (event.ticket_price || 0) * parseInt(numberOfTickets)
    });
  } catch (error: any) {
    console.error('Create event registration error:', error);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

export default router;
