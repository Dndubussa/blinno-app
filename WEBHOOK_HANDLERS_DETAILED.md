# Detailed Webhook Handlers Documentation

This document provides detailed information about each webhook handler, including endpoints, request/response formats, and code locations.

---

## 1. Payment Received Webhook

### Endpoint
```
POST /api/payments/webhook
```

### Location
`backend/src/routes/payments.ts` (lines 209-403)

### Description
Handles successful payment notifications from ClickPesa. Updates payment status, records creator earnings, and sends notifications.

### Request Format
```json
{
  "payment_id": "cp_1234567890",
  "order_id": "order_abc123",
  "status": "success",
  "transaction_id": "txn_1234567890"
}
```

### Headers
```
x-clickpesa-signature: <signature> (optional, for verification)
Content-Type: application/json
```

### Processing Logic
1. Finds payment record by `payment_id`
2. Updates payment status to `completed`
3. Handles different payment types:
   - Subscription payments → Activates subscription
   - Bookings → Confirms booking
   - Digital products → Generates download URL
   - Tips → Marks tip as paid
   - Commissions → Marks commission as paid
   - Performance bookings → Confirms booking
   - Featured listings → Activates listing
   - Lodging bookings → Confirms booking
   - Restaurant orders → Updates order status
   - Regular orders → Updates order status
4. Marks platform fees as `collected`
5. Records creator earnings
6. Updates user balances
7. Sends notifications to creators and buyers

### Response
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

### Code Snippet
```typescript
if (status === 'success' || status === 'completed' || status === 'paid') {
  newStatus = 'completed';
  
  // Handle subscription payments
  if (orderId.startsWith('subscription_')) {
    await supabase
      .from('platform_subscriptions')
      .update({
        status: 'active',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payment.user_id)
      .eq('status', 'pending');
  }
  
  // Mark platform fees as collected and record earnings
  const { data: fees } = await supabase
    .from('platform_fees')
    .update({
      status: 'collected',
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_id', orderId)
    .eq('status', 'pending')
    .select('user_id, creator_payout, transaction_type, transaction_id');

  // Record earnings for creators
  if (fees) {
    for (const fee of fees) {
      if (fee.creator_payout > 0) {
        await financialTracking.recordEarnings(
          fee.user_id,
          parseFloat(fee.creator_payout.toString()),
          fee.transaction_id,
          fee.transaction_type,
          `Earnings from ${fee.transaction_type}`,
          { transaction_id: fee.transaction_id }
        );
      }
    }
  }
}
```

---

## 2. Payment Failed Webhook

### Endpoint
```
POST /api/payments/webhook
```

### Location
`backend/src/routes/payments.ts` (lines 404-497)

### Description
Handles failed, cancelled, or rejected payment notifications from ClickPesa. Updates payment status, cancels related orders/bookings, and marks fees as refunded.

### Request Format
```json
{
  "payment_id": "cp_1234567890",
  "order_id": "order_abc123",
  "status": "failed",
  "transaction_id": "txn_1234567890"
}
```

### Processing Logic
1. Finds payment record by `payment_id`
2. Updates payment status to `failed`
3. Handles different payment types:
   - Subscription payments → Marks subscription as expired
   - Bookings → Cancels booking
   - Digital products → Marks purchase as failed
   - Tips → Marks tip as failed
   - Commissions → Marks commission as failed
   - Performance bookings → Cancels booking
   - Featured listings → Cancels listing
   - Lodging bookings → Cancels booking
   - Restaurant orders → Updates order status to `payment_failed`
   - Regular orders → Updates order status to `payment_failed`
4. Marks platform fees as `refunded`

### Response
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

### Code Snippet
```typescript
else if (status === 'failed' || status === 'cancelled' || status === 'rejected') {
  newStatus = 'failed';
  
  // Handle subscription payment failures
  if (orderId.startsWith('subscription_')) {
    await supabase
      .from('platform_subscriptions')
      .update({
        status: 'expired',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payment.user_id)
      .eq('status', 'pending');
  }
  
  // Mark platform fees as refunded/cancelled
  await supabase
    .from('platform_fees')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_id', orderId)
    .eq('status', 'pending');
}
```

---

## 3. Payout Initiated Webhook

### Endpoint
```
POST /api/revenue/payouts/webhook
```

### Location
`backend/src/routes/revenue.ts` (lines 927-1122)

### Description
Handles disbursement initiation notifications from ClickPesa. Updates payout status to `processing`.

### Request Format
```json
{
  "disbursement_id": "disb_1234567890",
  "transaction_id": "txn_1234567890",
  "status": "initiated",
  "order_id": "payout_abc123",
  "amount": 100.00,
  "currency": "USD"
}
```

### Processing Logic
1. Finds payout record by `disbursement_id` (searches in `transaction_id`, `payment_reference`, and `metadata`)
2. Updates payout status to `processing`
3. Marks associated platform fees as `processing`

### Response
```json
{
  "success": true,
  "message": "Payout webhook processed",
  "status": "processing"
}
```

### Code Snippet
```typescript
else if (status === 'initiated' || status === 'processing' || status === 'pending') {
  // Payout initiated/processing
  newStatus = 'processing';
}

// Update payout status
await supabase
  .from('creator_payouts')
  .update({
    status: newStatus,
    updated_at: new Date().toISOString(),
  })
  .eq('id', payout.id);
```

---

## 4. Payout Completed Webhook

### Endpoint
```
POST /api/revenue/payouts/webhook
```

### Location
`backend/src/routes/revenue.ts` (lines 927-1122)

### Description
Handles successful payout completion notifications from ClickPesa. Updates payout status to `paid` and marks associated fees as paid.

### Request Format
```json
{
  "disbursement_id": "disb_1234567890",
  "transaction_id": "txn_1234567890",
  "status": "completed",
  "order_id": "payout_abc123",
  "amount": 100.00,
  "currency": "USD"
}
```

### Processing Logic
1. Finds payout record by `disbursement_id`
2. Updates payout status to `paid`
3. Records `processed_at` and `payout_date`
4. Updates `transaction_id` if provided
5. Marks associated platform fees as `paid`

### Response
```json
{
  "success": true,
  "message": "Payout webhook processed",
  "status": "paid"
}
```

### Code Snippet
```typescript
if (status === 'success' || status === 'completed' || status === 'paid') {
  // Payout completed successfully
  newStatus = 'paid';
  shouldUpdateBalance = true;
  // Balance was already deducted when payout was initiated, so no adjustment needed
}

// Update payout status
const updateData: any = {
  status: newStatus,
  updated_at: new Date().toISOString(),
};

if (newStatus === 'paid') {
  updateData.processed_at = new Date().toISOString();
  updateData.payout_date = new Date().toISOString();
}

await supabase
  .from('creator_payouts')
  .update(updateData)
  .eq('id', payout.id);

// Mark associated fees as paid
if (payout.fee_ids && payout.fee_ids.length > 0) {
  await supabase
    .from('platform_fees')
    .update({
      payout_status: 'paid',
      payout_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', payout.fee_ids);
}
```

---

## 5. Payout Failed Webhook

### Endpoint
```
POST /api/revenue/payouts/webhook
```

### Location
`backend/src/routes/revenue.ts` (lines 927-1122)

### Description
Handles failed payout notifications from ClickPesa. Refunds the payout amount back to creator's balance and marks fees as pending.

### Request Format
```json
{
  "disbursement_id": "disb_1234567890",
  "transaction_id": "txn_1234567890",
  "status": "failed",
  "order_id": "payout_abc123",
  "amount": 100.00,
  "currency": "USD",
  "reason": "Insufficient funds",
  "error_message": "Payment failed"
}
```

### Processing Logic
1. Finds payout record by `disbursement_id`
2. Updates payout status to `failed`
3. Refunds amount back to creator's available balance
4. Records refund transaction
5. Marks associated fees back to `pending`
6. Updates notes with failure reason

### Response
```json
{
  "success": true,
  "message": "Payout webhook processed",
  "status": "failed"
}
```

### Code Snippet
```typescript
else if (status === 'failed' || status === 'cancelled' || status === 'rejected') {
  // Payout failed - refund the amount back to creator's balance
  newStatus = 'failed';
  shouldUpdateBalance = true;
  balanceAdjustment = parseFloat(payout.amount.toString()); // Refund the amount
}

// Handle balance adjustments for failed payouts
if (shouldUpdateBalance && balanceAdjustment > 0) {
  // Get current balance
  const { data: balanceData } = await supabase
    .from('user_balances')
    .select('available_balance, pending_balance')
    .eq('user_id', payout.creator_id)
    .single();

  if (balanceData) {
    const currentAvailable = parseFloat(balanceData.available_balance?.toString() || '0');
    const newAvailable = currentAvailable + balanceAdjustment;

    // Update balance
    await supabase
      .from('user_balances')
      .update({
        available_balance: newAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payout.creator_id);

    // Record financial transaction for refund
    await supabase
      .from('financial_transactions')
      .insert({
        user_id: payout.creator_id,
        transaction_type: 'payout_refund',
        amount: balanceAdjustment,
        currency: payout.currency || 'USD',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: 'completed',
        reference_id: payout.id,
        reference_type: 'payout',
        description: `Payout ${status}: ${payout.id}`,
        metadata: JSON.stringify({
          payout_id: payout.id,
          disbursement_id: disbursement_id,
          reason: reason || error_message || `Payout ${status}`,
        }),
      });
  }
}
```

---

## 6. Payout Refunded Webhook

### Endpoint
```
POST /api/revenue/payouts/webhook
```

### Location
`backend/src/routes/revenue.ts` (lines 927-1122)

### Description
Handles payout refund notifications from ClickPesa. Refunds the payout amount back to creator's balance and marks fees as pending.

### Request Format
```json
{
  "disbursement_id": "disb_1234567890",
  "transaction_id": "txn_1234567890",
  "status": "refunded",
  "order_id": "payout_abc123",
  "amount": 100.00,
  "currency": "USD",
  "reason": "Refund requested by recipient"
}
```

### Processing Logic
1. Finds payout record by `disbursement_id`
2. Updates payout status to `refunded`
3. Refunds amount back to creator's available balance
4. Records refund transaction
5. Marks associated fees back to `pending`
6. Updates notes with refund reason

### Response
```json
{
  "success": true,
  "message": "Payout webhook processed",
  "status": "refunded"
}
```

### Code Snippet
```typescript
else if (status === 'refunded') {
  // Payout was refunded - refund the amount back to creator's balance
  newStatus = 'refunded';
  shouldUpdateBalance = true;
  balanceAdjustment = parseFloat(payout.amount.toString()); // Refund the amount
}
```

---

## 7. Payout Reversed Webhook

### Endpoint
```
POST /api/revenue/payouts/webhook
```

### Location
`backend/src/routes/revenue.ts` (lines 927-1122)

### Description
Handles payout reversal notifications from ClickPesa. Refunds the payout amount back to creator's balance and marks fees as pending.

### Request Format
```json
{
  "disbursement_id": "disb_1234567890",
  "transaction_id": "txn_1234567890",
  "status": "reversed",
  "order_id": "payout_abc123",
  "amount": 100.00,
  "currency": "USD",
  "reason": "Transaction reversed by bank"
}
```

### Processing Logic
1. Finds payout record by `disbursement_id`
2. Updates payout status to `reversed`
3. Refunds amount back to creator's available balance
4. Records refund transaction
5. Marks associated fees back to `pending`
6. Updates notes with reversal reason

### Response
```json
{
  "success": true,
  "message": "Payout webhook processed",
  "status": "reversed"
}
```

### Code Snippet
```typescript
else if (status === 'reversed') {
  // Payout was reversed - refund the amount back to creator's balance
  newStatus = 'reversed';
  shouldUpdateBalance = true;
  balanceAdjustment = parseFloat(payout.amount.toString()); // Refund the amount
}
```

---

## Webhook Security

### Signature Verification
All webhook handlers check for `x-clickpesa-signature` header, but verification is currently commented out. To enable:

```typescript
const signature = req.headers['x-clickpesa-signature'] as string;
clickPesa.verifyWebhookSignature(webhookData, signature);
```

### Error Handling
- All webhooks return `200 OK` even if payout/payment not found (to prevent retries)
- Errors are logged for debugging
- Webhook handlers are idempotent (safe to retry)

### Testing

#### Using cURL
```bash
# Test Payment Received
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-clickpesa-signature: test-signature" \
  -d '{
    "payment_id": "cp_test123",
    "order_id": "order_test123",
    "status": "success",
    "transaction_id": "txn_test123"
  }'

# Test Payout Completed
curl -X POST http://localhost:3000/api/revenue/payouts/webhook \
  -H "Content-Type: application/json" \
  -H "x-clickpesa-signature: test-signature" \
  -d '{
    "disbursement_id": "disb_test123",
    "transaction_id": "txn_test123",
    "status": "completed",
    "order_id": "payout_test123",
    "amount": 100.00,
    "currency": "USD"
  }'
```

---

## Webhook Configuration in ClickPesa

### Payment Webhooks
- **URL:** `https://www.blinno.app/api/payments/webhook`
- **Events:**
  - `PAYMENT RECEIVED`
  - `PAYMENT FAILED`
  - `PAYMENT CANCELLED`

### Payout Webhooks
- **URL:** `https://www.blinno.app/api/revenue/payouts/webhook`
- **Events:**
  - `DISBURSEMENT INITIATED`
  - `DISBURSEMENT COMPLETED`
  - `DISBURSEMENT FAILED`
  - `DISBURSEMENT REFUNDED`
  - `DISBURSEMENT REVERSED`

---

## Database Tables Affected

### Payment Webhooks
- `payments` - Payment status updates
- `orders` - Order status updates
- `platform_fees` - Fee status updates
- `user_balances` - Balance updates
- `financial_transactions` - Transaction records
- `platform_subscriptions` - Subscription activation
- `bookings` - Booking confirmation
- `digital_product_purchases` - Purchase status
- `tips` - Tip status
- `commissions` - Commission status
- `performance_bookings` - Booking confirmation
- `featured_listings` - Listing activation
- `lodging_bookings` - Booking confirmation

### Payout Webhooks
- `creator_payouts` - Payout status updates
- `platform_fees` - Fee payout status updates
- `user_balances` - Balance refunds for failed/reversed payouts
- `financial_transactions` - Refund transaction records

---

## Monitoring and Logging

All webhook handlers log:
- Webhook receipt
- Payment/payout lookup results
- Status updates
- Balance adjustments
- Errors

Check backend logs for webhook activity:
```bash
# View webhook logs
tail -f logs/webhook.log

# Or check application logs
tail -f logs/app.log | grep webhook
```

