# Click Pesa Payment Gateway Integration

This document describes the Click Pesa payment gateway integration for the BLINNO platform.

## Overview

Click Pesa is a Tanzanian payment gateway that enables secure payments via mobile money (M-Pesa, Tigo Pesa, Airtel Money) and other payment methods. This integration allows users to pay for orders directly through the platform.

## Setup Instructions

### 1. Get Click Pesa Credentials

1. Register for a Click Pesa account at [Click Pesa](https://clickpesa.com)
2. Navigate to Settings > Developers in the Click Pesa Dashboard
3. Create a new application
4. Copy your **Client ID** and **API Key**
5. Note your webhook URL (you'll need to configure this)

### 2. Configure Backend Environment

Add the following to your `backend/.env` file:

```env
# Click Pesa Configuration
CLICKPESA_CLIENT_ID=your_clickpesa_client_id
CLICKPESA_API_KEY=your_clickpesa_api_key
CLICKPESA_BASE_URL=https://sandbox.clickpesa.com
# For production, use: https://api.clickpesa.com
APP_URL=https://www.blinno.app

# CORS Configuration
CORS_ORIGIN=https://www.blinno.app
```

**Important:**
- Use `https://sandbox.clickpesa.com` for testing
- Use `https://api.clickpesa.com` for production
- Production domain: `https://www.blinno.app`

### 3. Run Database Migration

Execute the payment tables migration:

```bash
psql -U postgres -d blinno -f backend/src/db/migrations/add_payments.sql
```

This creates:
- `payments` table for tracking payment transactions
- Updates `orders` table to include payment statuses

### 4. Configure Webhooks

1. In Click Pesa Dashboard, go to Settings > Developers > Webhooks
2. Add webhook URL: `https://www.blinno.app/api/payments/webhook`
3. Select events to subscribe to:
   - `PAYMENT RECEIVED`
   - `PAYMENT FAILED`
   - `PAYMENT CANCELLED`

## How It Works

### Payment Flow

1. **User adds items to cart** → Cart page
2. **User clicks "Proceed to Payment"** → Creates order
3. **Payment dialog opens** → User enters phone number
4. **User clicks "Pay with Click Pesa"** → Payment request created
5. **User redirected to Click Pesa** → Completes payment
6. **Webhook receives notification** → Updates order status
7. **User redirected back** → Order confirmation

### API Endpoints

#### Create Payment
```
POST /api/payments/create
Body: {
  orderId: string,
  customerPhone: string,
  customerEmail?: string,
  customerName?: string
}
Response: {
  success: boolean,
  paymentId: string,
  checkoutUrl: string,
  message: string
}
```

#### Check Payment Status
```
GET /api/payments/:paymentId/status
Response: {
  id: string,
  order_id: string,
  amount: number,
  status: 'pending' | 'initiated' | 'completed' | 'failed' | 'cancelled',
  checkout_url: string,
  ...
}
```

#### Payment History
```
GET /api/payments/history
Response: Array of payment objects
```

#### Webhook Endpoint
```
POST /api/payments/webhook
Headers: {
  'x-clickpesa-signature': string (if provided)
}
Body: Click Pesa webhook payload
```

## Payment Statuses

### Order Statuses
- `pending` - Order created, payment not initiated
- `payment_pending` - Payment initiated, awaiting completion
- `paid` - Payment completed successfully
- `payment_failed` - Payment failed or was cancelled
- `confirmed` - Order confirmed after payment
- `shipped` - Order shipped
- `delivered` - Order delivered
- `cancelled` - Order cancelled

### Payment Statuses
- `pending` - Payment record created
- `initiated` - Payment request sent to Click Pesa
- `completed` - Payment successful
- `failed` - Payment failed
- `cancelled` - Payment cancelled

## Testing

### Sandbox Testing

1. Use sandbox credentials in `.env`
2. Use test phone numbers provided by Click Pesa
3. Test payment flow end-to-end
4. Verify webhook receives notifications

### Test Scenarios

- ✅ Successful payment
- ✅ Payment cancellation
- ✅ Payment failure
- ✅ Webhook processing
- ✅ Payment status checking

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Webhook Verification**: Implement signature verification if Click Pesa provides it
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Already implemented in backend
5. **Input Validation**: Phone numbers and amounts are validated

## Troubleshooting

### Payment Creation Fails
- Check API credentials are correct
- Verify base URL matches environment (sandbox vs production)
- Check network connectivity to Click Pesa API
- Review backend logs for detailed error messages

### Webhook Not Receiving Notifications
- Verify webhook URL is accessible from internet
- Check webhook configuration in Click Pesa Dashboard
- Ensure webhook endpoint is not behind firewall
- Check backend logs for incoming requests

### Payment Status Not Updating
- Verify webhook is processing correctly
- Check payment status manually via API
- Review order and payment records in database
- Check for any error messages in logs

## Frontend Integration

The Cart page (`src/pages/Cart.tsx`) has been updated to:
- Use the new API client
- Show payment dialog after checkout
- Collect customer phone number
- Redirect to Click Pesa checkout
- Handle payment flow

## Database Schema

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'TZS',
  status TEXT,
  payment_method TEXT DEFAULT 'clickpesa',
  payment_id TEXT, -- Click Pesa payment ID
  transaction_id TEXT,
  checkout_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Support

For Click Pesa API issues:
- Documentation: https://docs.clickpesa.com
- Support: Contact Click Pesa support team

For integration issues:
- Check backend logs
- Review API responses
- Verify database records

