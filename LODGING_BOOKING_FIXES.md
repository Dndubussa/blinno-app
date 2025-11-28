# Lodging Booking and Payment Fixes

## Issues Fixed

### 1. Payment Type Mismatch ✅
**Problem**: Payment was created with `payment_type: 'lodging_reservation'` but webhook handler checked for `paymentType === 'lodging_booking'`

**Fix**: Changed payment creation to use `payment_type: 'lodging_booking'` to match webhook handler

**Files Changed**:
- `backend/src/routes/lodging.ts` (line 311)

### 2. Order ID Prefix Mismatch ✅
**Problem**: Payment used `order_id: 'lodging_reservation_${id}'` but webhook expected `lodging_booking_${id}`

**Fix**: Changed order ID to use `lodging_booking_` prefix consistently

**Files Changed**:
- `backend/src/routes/lodging.ts` (lines 305, 324, 340)

### 3. Missing Currency in Platform Fees ✅
**Problem**: Platform fees insert was missing the `currency` field

**Fix**: Added `currency: currency` to platform_fees insert

**Files Changed**:
- `backend/src/routes/lodging.ts` (line 333)

### 4. Transaction Type Mismatch ✅
**Problem**: Platform fees used `transaction_type: 'lodging_reservation'` but should use standard type

**Fix**: Changed to `transaction_type: 'booking'` to match other booking types

**Files Changed**:
- `backend/src/routes/lodging.ts` (line 325)

### 5. Duplicate Route Removed ✅
**Problem**: Two `POST /bookings` routes existed (one authenticated, one not), causing conflicts

**Fix**: Removed the duplicate unauthenticated route that used non-existent database fields

**Files Changed**:
- `backend/src/routes/lodging.ts` (removed lines 387-472)

### 6. Webhook Handler Enhancement ✅
**Problem**: Webhook handler only checked `paymentType` but not `orderId` prefix

**Fix**: Added fallback check for `orderId.startsWith('lodging_booking_')` to handle both cases

**Files Changed**:
- `backend/src/routes/payments.ts` (lines 346, 475)

## Testing

### Test Script
A comprehensive test script has been created: `test-lodging-bookings.js`

### How to Run Tests

1. **Set up environment variables**:
   ```bash
   export API_URL=http://localhost:3000
   export AUTH_TOKEN=your_auth_token_here
   ```

2. **Run the test script**:
   ```bash
   node test-lodging-bookings.js
   ```

### Test Flow

The test script performs the following steps:

1. ✅ **Create Property**: Creates a test lodging property
2. ✅ **Create Room**: Creates a test room in the property
3. ✅ **Create Booking**: Creates a booking for the room
4. ✅ **Create Payment**: Initiates payment for the booking
5. ✅ **Verify Booking**: Checks booking status (should be 'pending')
6. ✅ **Simulate Webhook**: Simulates successful payment webhook
7. ✅ **Verify Confirmation**: Checks booking status after webhook (should be 'confirmed')

### Manual Testing

#### 1. Create a Property
```bash
curl -X POST http://localhost:3000/api/lodging/properties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hotel",
    "address": "123 Test St",
    "city": "Dar es Salaam",
    "country": "Tanzania",
    "propertyType": "hotel"
  }'
```

#### 2. Create a Room
```bash
curl -X POST http://localhost:3000/api/lodging/rooms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROPERTY_ID",
    "roomNumber": "101",
    "roomType": "Deluxe Suite",
    "pricePerNight": 50,
    "isAvailable": true
  }'
```

#### 3. Create a Booking
```bash
curl -X POST http://localhost:3000/api/lodging/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROPERTY_ID",
    "roomId": "ROOM_ID",
    "checkInDate": "2024-12-15",
    "checkOutDate": "2024-12-17"
  }'
```

#### 4. Create Payment
```bash
curl -X POST http://localhost:3000/api/lodging/bookings/BOOKING_ID/payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "+255712345678",
    "customerEmail": "test@example.com",
    "customerName": "Test Customer"
  }'
```

#### 5. Simulate Webhook (for testing)
```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-clickpesa-signature: test-signature" \
  -d '{
    "payment_id": "PAYMENT_ID",
    "order_id": "lodging_booking_BOOKING_ID",
    "status": "success",
    "transaction_id": "test_txn_123"
  }'
```

## Database Verification

After a successful payment webhook, verify:

1. **Payment Status**: `payments.status` should be `'completed'`
2. **Booking Status**: `lodging_bookings.status` should be `'confirmed'`
3. **Platform Fees**: `platform_fees.status` should be `'collected'`
4. **Creator Balance**: `user_balances.available_balance` should be updated
5. **Financial Transaction**: `financial_transactions` should have a new record

## Expected Behavior

### Booking Creation
- ✅ Booking is created with status `'pending'`
- ✅ Total amount is calculated based on nights × price per night
- ✅ Room availability is checked
- ✅ Date validation ensures check-out is after check-in

### Payment Creation
- ✅ Payment record is created with status `'pending'`
- ✅ Platform fees are calculated and recorded
- ✅ ClickPesa payment request is created
- ✅ Payment includes user's preferred currency

### Payment Webhook (Success)
- ✅ Payment status updated to `'completed'`
- ✅ Booking status updated to `'confirmed'`
- ✅ Platform fees marked as `'collected'`
- ✅ Creator earnings recorded in `user_balances`
- ✅ Financial transaction recorded
- ✅ Notifications sent to creator and buyer

### Payment Webhook (Failed)
- ✅ Payment status updated to `'failed'`
- ✅ Booking status updated to `'cancelled'`
- ✅ Platform fees remain `'pending'`
- ✅ No earnings recorded

## Notes

- The booking flow requires authentication for all endpoints
- Currency is automatically detected from user preferences
- Platform fees are calculated based on the user's subscription tier
- Payment processing fees are included in the total amount
- Creator payouts are held in escrow until payout is requested

