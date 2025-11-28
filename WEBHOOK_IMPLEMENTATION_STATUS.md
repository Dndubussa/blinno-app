# Webhook Implementation Status

This document tracks the implementation status of all webhook handlers for payment and payout events.

## Current Implementation Status

### ✅ Payment Webhooks (Implemented)

**Endpoint:** `POST /api/payments/webhook`

#### 1. Payment Received ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/payments.ts` (lines 209-504)
- **Event:** Payment status `completed`, `success`, or `paid`
- **Actions:**
  - Updates payment status to `completed`
  - Updates order status to `paid`
  - Marks platform fees as `collected`
  - Records creator earnings
  - Updates user balances
  - Sends notifications to creators and buyers

#### 2. Payment Failed ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/payments.ts` (lines 404-497)
- **Event:** Payment status `failed`, `cancelled`, or `rejected`
- **Actions:**
  - Updates payment status to `failed`
  - Updates order status to `payment_failed`
  - Marks platform fees as `refunded`
  - Cancels related bookings/subscriptions
  - Sends failure notifications

### ✅ Payout Webhooks (Implemented)

**Endpoint:** `POST /api/revenue/payouts/webhook`

#### 3. Payout Initiated ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/revenue.ts` (payout webhook handler)
- **Event:** Disbursement status `initiated`, `processing`, or `pending`
- **Actions:**
  - Updates payout status to `processing`
  - Marks associated fees as `processing`

#### 4. Payout Completed ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/revenue.ts` (payout webhook handler)
- **Event:** Disbursement status `success`, `completed`, or `paid`
- **Actions:**
  - Updates payout status to `paid`
  - Marks associated fees as `paid`
  - Records payout completion date
  - Updates transaction ID

#### 5. Payout Failed ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/revenue.ts` (payout webhook handler)
- **Event:** Disbursement status `failed`, `cancelled`, or `rejected`
- **Actions:**
  - Updates payout status to `failed`
  - Refunds amount back to creator's available balance
  - Marks associated fees back to `pending`
  - Records refund transaction
  - Updates notes with failure reason

#### 6. Payout Refunded ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/revenue.ts` (payout webhook handler)
- **Event:** Disbursement status `refunded`
- **Actions:**
  - Updates payout status to `refunded`
  - Refunds amount back to creator's available balance
  - Marks associated fees back to `pending`
  - Records refund transaction
  - Updates notes with refund reason

#### 7. Payout Reversed ✅
- **Status:** Implemented
- **Handler:** `backend/src/routes/revenue.ts` (payout webhook handler)
- **Event:** Disbursement status `reversed`
- **Actions:**
  - Updates payout status to `reversed`
  - Refunds amount back to creator's available balance
  - Marks associated fees back to `pending`
  - Records refund transaction
  - Updates notes with reversal reason

### ❌ Deposit Webhooks (Not Implemented)

#### 8. Deposit Received ❌
- **Status:** Not Implemented
- **Reason:** ClickPesa primarily handles payments (money coming in) and disbursements (money going out). Deposits to the platform account are typically handled through ClickPesa's merchant account, not as separate webhook events.
- **Note:** If you need to track deposits separately, you may need to:
  1. Check ClickPesa's API documentation for deposit webhook events
  2. Implement a separate webhook handler if such events exist
  3. Or manually reconcile deposits through ClickPesa's merchant dashboard

## Webhook Configuration

### ClickPesa Dashboard Setup

1. **Payment Webhooks:**
   - URL: `https://www.blinno.app/api/payments/webhook`
   - Events to subscribe:
     - `PAYMENT RECEIVED`
     - `PAYMENT FAILED`
     - `PAYMENT CANCELLED`

2. **Payout/Disbursement Webhooks:**
   - URL: `https://www.blinno.app/api/revenue/payouts/webhook`
   - Events to subscribe:
     - `DISBURSEMENT INITIATED`
     - `DISBURSEMENT COMPLETED`
     - `DISBURSEMENT FAILED`
     - `DISBURSEMENT REFUNDED`
     - `DISBURSEMENT REVERSED`

## Webhook Security

### Signature Verification
- Currently: Signature verification is commented out (line 215 in payments.ts, similar in revenue.ts)
- **Recommendation:** Implement signature verification when ClickPesa provides webhook signing
- The `verifyWebhookSignature` method exists in `ClickPesaService` but needs to be implemented based on ClickPesa's documentation

### Security Best Practices
1. ✅ Webhook endpoints are public (no authentication required) - this is standard for webhooks
2. ✅ Webhook URLs use HTTPS in production
3. ⚠️ Signature verification should be enabled when available
4. ✅ Webhook handlers are idempotent (safe to retry)
5. ✅ Error handling prevents webhook retry loops

## Testing Webhooks

### Local Development
Use a tool like [ngrok](https://ngrok.com/) to expose your local server:
```bash
ngrok http 3000
# Use the ngrok URL in ClickPesa webhook configuration
```

### Webhook Testing Checklist
- [ ] Payment received webhook
- [ ] Payment failed webhook
- [ ] Payout initiated webhook
- [ ] Payout completed webhook
- [ ] Payout failed webhook
- [ ] Payout refunded webhook
- [ ] Payout reversed webhook

## Error Handling

All webhook handlers:
- Return 200 status on success (even if payout not found, to prevent retries)
- Return 400 for invalid requests
- Return 500 for server errors
- Log errors for debugging
- Handle missing data gracefully

## Future Enhancements

1. **Webhook Signature Verification:** Implement when ClickPesa provides signing
2. **Webhook Event Logging:** Log all webhook events for audit trail
3. **Retry Logic:** Implement exponential backoff for failed webhook processing
4. **Webhook Monitoring:** Add monitoring/alerting for webhook failures
5. **Deposit Tracking:** If ClickPesa provides deposit webhooks, implement handler

