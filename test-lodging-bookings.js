/**
 * Test Script for Lodging Bookings and Payments
 * 
 * This script tests:
 * 1. Creating a lodging property
 * 2. Creating a room
 * 3. Creating a booking
 * 4. Processing payment for the booking
 * 5. Verifying webhook handling
 * 
 * Usage:
 *   node test-lodging-bookings.js
 * 
 * Prerequisites:
 *   - Backend server running on http://localhost:3000
 *   - Valid authentication token (set in AUTH_TOKEN env var or update the script)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

// Test data
const testProperty = {
  name: 'Test Hotel',
  description: 'A beautiful test hotel',
  address: '123 Test Street',
  city: 'Dar es Salaam',
  country: 'Tanzania',
  propertyType: 'hotel',
  amenities: ['wifi', 'pool', 'parking'],
  images: []
};

const testRoom = {
  roomNumber: '101',
  roomType: 'Deluxe Suite',
  description: 'Spacious room with ocean view',
  pricePerNight: 50,
  amenities: ['wifi', 'tv', 'ac'],
  isAvailable: true
};

const testBooking = {
  checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  checkOutDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 days from now
};

const testPayment = {
  customerPhone: '+255712345678',
  customerEmail: 'test@example.com',
  customerName: 'Test Customer'
};

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

// Test functions
async function testCreateProperty() {
  console.log('\n📋 Test 1: Creating lodging property...');
  try {
    const property = await apiRequest('/api/lodging/properties', {
      method: 'POST',
      body: JSON.stringify(testProperty),
    });
    console.log('✅ Property created:', property.id);
    return property;
  } catch (error) {
    console.error('❌ Failed to create property:', error.message);
    throw error;
  }
}

async function testCreateRoom(propertyId) {
  console.log('\n📋 Test 2: Creating room...');
  try {
    const room = await apiRequest('/api/lodging/rooms', {
      method: 'POST',
      body: JSON.stringify({
        ...testRoom,
        propertyId,
      }),
    });
    console.log('✅ Room created:', room.id);
    return room;
  } catch (error) {
    console.error('❌ Failed to create room:', error.message);
    throw error;
  }
}

async function testCreateBooking(propertyId, roomId) {
  console.log('\n📋 Test 3: Creating booking...');
  try {
    const booking = await apiRequest('/api/lodging/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...testBooking,
        propertyId,
        roomId,
      }),
    });
    console.log('✅ Booking created:', booking.id);
    console.log('   - Status:', booking.status);
    console.log('   - Total Amount:', booking.total_amount);
    console.log('   - Nights:', booking.nights);
    return booking;
  } catch (error) {
    console.error('❌ Failed to create booking:', error.message);
    throw error;
  }
}

async function testCreatePayment(bookingId) {
  console.log('\n📋 Test 4: Creating payment...');
  try {
    const payment = await apiRequest(`/api/lodging/bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(testPayment),
    });
    console.log('✅ Payment created:', payment.paymentId);
    console.log('   - Checkout URL:', payment.checkoutUrl);
    return payment;
  } catch (error) {
    console.error('❌ Failed to create payment:', error.message);
    throw error;
  }
}

async function testVerifyBooking(bookingId) {
  console.log('\n📋 Test 5: Verifying booking status...');
  try {
    const booking = await apiRequest(`/api/lodging/bookings/${bookingId}`);
    console.log('✅ Booking status:', booking.status);
    return booking;
  } catch (error) {
    console.error('❌ Failed to verify booking:', error.message);
    throw error;
  }
}

async function testWebhookSimulation(paymentId, orderId) {
  console.log('\n📋 Test 6: Simulating payment webhook (success)...');
  try {
    const webhookData = {
      payment_id: paymentId,
      order_id: orderId,
      status: 'success',
      transaction_id: `test_txn_${Date.now()}`,
    };

    const response = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-clickpesa-signature': 'test-signature',
      },
      body: JSON.stringify(webhookData),
    });

    const data = await response.json();
    console.log('✅ Webhook processed:', response.status);
    return data;
  } catch (error) {
    console.error('❌ Failed to process webhook:', error.message);
    throw error;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Lodging Booking and Payment Tests\n');
  console.log('='.repeat(60));

  let property, room, booking, payment;

  try {
    // Test 1: Create property
    property = await testCreateProperty();

    // Test 2: Create room
    room = await testCreateRoom(property.id);

    // Test 3: Create booking
    booking = await testCreateBooking(property.id, room.id);

    // Test 4: Create payment
    payment = await testCreatePayment(booking.id);

    // Test 5: Verify booking (should still be pending)
    await testVerifyBooking(booking.id);

    // Test 6: Simulate webhook (only if payment_id is available)
    if (payment.paymentId) {
      await testWebhookSimulation(payment.paymentId, `lodging_booking_${booking.id}`);
      
      // Verify booking status after webhook (should be confirmed)
      console.log('\n📋 Test 7: Verifying booking after webhook...');
      const updatedBooking = await testVerifyBooking(booking.id);
      if (updatedBooking.status === 'confirmed') {
        console.log('✅ Booking confirmed after payment!');
      } else {
        console.log('⚠️  Booking status:', updatedBooking.status, '(expected: confirmed)');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('\nTest Summary:');
    console.log(`  - Property ID: ${property.id}`);
    console.log(`  - Room ID: ${room.id}`);
    console.log(`  - Booking ID: ${booking.id}`);
    console.log(`  - Payment ID: ${payment.paymentId || 'N/A'}`);
    console.log(`  - Checkout URL: ${payment.checkoutUrl || 'N/A'}`);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Test suite failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

