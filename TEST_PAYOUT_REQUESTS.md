# Testing Payout Requests

This guide explains how to test the payout request functionality in the BLINNO platform.

## Prerequisites

1. **User Account**: You need a user account with:
   - At least USD 25 in pending earnings
   - At least one payout method configured (Mobile Money or Bank Transfer)

2. **Earnings**: To have earnings available:
   - Complete transactions (bookings, sales, commissions, etc.)
   - Wait for payments to be processed
   - Earnings become available once payment status is `collected`

3. **Payout Method**: Add a payout method:
   - Go to Dashboard > Settings > Payout Methods
   - Add either Mobile Money or Bank Transfer
   - Set one as default

## Running the Test Script

### Option 1: Using Environment Variables

```bash
# Set your test credentials
export TEST_EMAIL="your-email@example.com"
export TEST_PASSWORD="your-password"
export VITE_API_URL="https://www.blinno.app/api"  # or http://localhost:3001/api for local

# Run the test
npm run test:payout-requests
```

### Option 2: Direct Node Execution

```bash
# Edit test-payout-requests.js and update TEST_EMAIL and TEST_PASSWORD
node test-payout-requests.js
```

## What the Test Does

The test script performs the following steps:

1. **Login**: Authenticates with the provided credentials
2. **Check Earnings**: Fetches and displays:
   - Total earnings
   - Pending earnings (available for payout)
   - Paid out amount
   - Earnings breakdown by transaction type
3. **Get Payout Methods**: Lists all configured payout methods
4. **View Payout History**: Shows existing payout requests
5. **Create Payout Request**: Creates a new payout request (up to $50 or available amount)
6. **Verify**: Checks that the payout request was created and earnings were updated

## Expected Output

```
🧪 Testing Payout Request Flow
==================================================
🔐 Logging in...
✅ Login successful
   User: test@example.com

💰 Fetching earnings...
✅ Earnings retrieved:
   Total Earnings: USD 150.00
   Pending Earnings: USD 75.00
   Paid Out: USD 75.00
   Pending Count: 5
   Paid Count: 3

   Earnings by Type:
     service_booking: USD 50.00 (2 transactions)
     commission: USD 25.00 (3 transactions)

💳 Fetching payout methods...
✅ Found 2 payout method(s):

   Method 1:
     ID: abc123...
     Type: mobile_money
     Default: Yes
     Operator: Tigo
     Number: +255123456789

📋 Fetching payout history...
✅ Found 1 payout(s) in history:

   Payout 1:
     ID: xyz789...
     Amount: USD 50.00
     Status: pending
     Created: 1/15/2025, 10:30:00 AM

==================================================
📝 Creating Test Payout Request
==================================================
   Using method: mobile_money
   Mobile: Tigo - +255123456789

📤 Creating payout request...
   Amount: USD 50.00
   Method ID: abc123...
✅ Payout request created successfully!
   Payout ID: new123...
   Status: pending
   Amount: USD 50.00
   Currency: USD

📋 Fetching payout history...
✅ Found 2 payout(s) in history:
   ...

==================================================
✅ Payout Request Test Completed Successfully!
==================================================

📊 Summary:
   Initial Pending: USD 75.00
   Current Pending: USD 25.00
   Requested: USD 50.00
```

## Payout Requirements

- **Minimum Amount**: USD 25.00
- **Available Balance**: Must have sufficient pending earnings
- **Payment Method**: Must have at least one payout method configured
- **Status**: Earnings must be in `collected` status with `payout_status` = `pending`

## Payout Status Flow

1. **pending**: Payout request created, awaiting processing
2. **processing**: Payout is being processed
3. **completed**: Payout successfully processed
4. **failed**: Payout processing failed
5. **cancelled**: Payout request was cancelled

## Troubleshooting

### "Insufficient funds"
- Ensure you have completed transactions
- Wait for payments to be processed
- Check that earnings are in `collected` status

### "No payout methods found"
- Add a payout method in your dashboard
- Go to Settings > Payout Methods
- Add Mobile Money or Bank Transfer details

### "Minimum payout amount is 25 USD"
- The minimum payout amount is USD 25.00
- Request a larger amount or wait for more earnings

### "Invalid payment method"
- Ensure the payment method ID is correct
- Verify the payment method belongs to your account
- Check that the payment method is active

## API Endpoints Used

- `POST /api/auth/login` - Authentication
- `GET /api/revenue/earnings` - Get earnings summary
- `GET /api/revenue/payout-methods` - Get payout methods
- `GET /api/revenue/my-payouts` - Get payout history
- `POST /api/revenue/request-payout` - Create payout request

## Manual Testing via UI

1. Navigate to Dashboard > Revenue > Request Payout
2. View your available earnings
3. Select a payout method
4. Enter payout amount (minimum $25)
5. Submit the request
6. Check payout history to verify

## Notes

- Payout requests are processed manually by administrators
- Processing time may vary
- Multiple payout requests can be pending simultaneously
- The test script creates a real payout request (use test account)

