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

// Get properties for current owner
router.get('/properties', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('lodging_properties')
      .select('*')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

// Create property
router.post('/properties', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, address, city, country, propertyType, amenities, images } = req.body;
    
    const { data, error } = await supabase
      .from('lodging_properties')
      .insert({
        owner_id: req.userId,
        name,
        description: description || null,
        address,
        city,
        country,
        property_type: propertyType || null,
        amenities: amenities || [],
        images: images || [],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Get rooms
router.get('/rooms', authenticate, async (req: AuthRequest, res) => {
  try {
    const { propertyId } = req.query;
    
    let query = supabase
      .from('lodging_rooms')
      .select(`
        *,
        property:lodging_properties!inner(owner_id)
      `)
      .eq('property.owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data || []);
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
    const { data: property } = await supabase
      .from('lodging_properties')
      .select('id')
      .eq('id', propertyId)
      .eq('owner_id', req.userId)
      .single();
    
    if (!property) {
      return res.status(403).json({ error: 'Property not found or access denied' });
    }
    
    const { data, error } = await supabase
      .from('lodging_rooms')
      .insert({
        property_id: propertyId,
        room_number: roomNumber,
        room_type: roomType,
        description: description || null,
        price_per_night: pricePerNight ? parseFloat(pricePerNight) : null,
        amenities: amenities || [],
        images: images || [],
        is_available: isAvailable !== undefined ? isAvailable : true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get bookings
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('lodging_bookings')
      .select(`
        *,
        property:lodging_properties!inner(name),
        room:lodging_rooms(room_number),
        guest:users!lodging_bookings_guest_id_fkey(email),
        guest_profile:profiles!lodging_bookings_guest_id_fkey(display_name)
      `)
      .eq('property.owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (bookings || []).map((lb: any) => ({
      ...lb,
      property_name: lb.property?.name,
      room_number: lb.room?.room_number,
      email: lb.guest?.email,
      display_name: lb.guest_profile?.display_name,
    }));

    res.json(transformed);
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
    const { data: room, error: roomError } = await supabase
      .from('lodging_rooms')
      .select(`
        *,
        property:lodging_properties!inner(owner_id)
      `)
      .eq('id', roomId)
      .eq('property_id', propertyId)
      .eq('is_available', true)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    // Calculate number of nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const subtotal = parseFloat(room.price_per_night.toString()) * nights;

    // Create booking (pending payment)
    const { data: booking, error: bookingError } = await supabase
      .from('lodging_bookings')
      .insert({
        property_id: propertyId,
        room_id: roomId,
        guest_id: req.userId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_amount: subtotal,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw bookingError;
    }

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

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('lodging_bookings')
      .select(`
        *,
        property:lodging_properties!inner(name, owner_id),
        room:lodging_rooms!inner(room_type, price_per_night),
        guest:users!lodging_bookings_guest_id_fkey(email),
        guest_profile:profiles!lodging_bookings_guest_id_fkey(display_name, phone)
      `)
      .eq('id', id)
      .eq('guest_id', req.userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Calculate stay duration
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return res.status(400).json({ error: 'Invalid check-in/check-out dates' });
    }

    const totalAmount = nights * parseFloat(booking.room.price_per_night.toString());

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateServiceBookingFee(totalAmount, undefined, currency);

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `lodging_reservation_${id}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'lodging_reservation',
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
        transaction_id: `lodging_reservation_${id}`,
        transaction_type: 'lodging_reservation',
        user_id: booking.property.owner_id,
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
      orderId: `lodging_reservation_${id}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || booking.guest?.email || '',
      customerName: customerName || booking.guest_profile?.display_name || 'Customer',
      description: `Payment for lodging reservation: ${booking.property.name} (${booking.room.room_type}) for ${nights} night(s)`,
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
    const { data: room, error: roomError } = await supabase
      .from('lodging_rooms')
      .select(`
        *,
        property:lodging_properties!inner(name, owner_id),
        owner:users!lodging_properties_owner_id_fkey(email),
        owner_profile:profiles!lodging_properties_owner_id_fkey(display_name)
      `)
      .eq('id', roomId)
      .eq('property_id', propertyId)
      .eq('availability_status', 'available')
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    // Check guest capacity
    if (parseInt(numberOfGuests) > (room.max_guests || 0)) {
      return res.status(400).json({ error: `Maximum ${room.max_guests} guests allowed for this room` });
    }

    // Check for date conflicts
    const { data: conflicts } = await supabase
      .from('lodging_bookings')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['confirmed', 'pending'])
      .or(`check_in_date.lte.${checkOutDate},check_out_date.gte.${checkInDate}`);

    if (conflicts && conflicts.length > 0) {
      return res.status(400).json({ error: 'Selected dates are not available' });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('lodging_bookings')
      .insert({
        property_id: propertyId,
        room_id: roomId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_of_guests: parseInt(numberOfGuests),
        special_requests: specialRequests || null,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw bookingError;
    }

    res.status(201).json({
      ...booking,
      property_name: room.property?.name,
      room_type: room.room_type,
      price_per_night: room.price_per_night,
      owner_email: room.owner?.email,
      owner_name: room.owner_profile?.display_name
    });
  } catch (error: any) {
    console.error('Create lodging booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
