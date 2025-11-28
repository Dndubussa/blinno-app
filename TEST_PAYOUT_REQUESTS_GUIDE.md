# Testing Payout Requests

This guide explains how to test the payout request functionality.

## Prerequisites

1. **Valid User Account**: You need a user account with:
   - Email verification completed
   - At least $25 USD in pending earnings
   - At least one payout method configured

2. **Payout Method**: Add a payout method in your dashboard:
   - Go to Settings > Payout Methods
   - Add either Mobile Money or Bank Transfer

3. **Pending Earnings**: You need earnings from completed transactions:
   - Bookings (services, lodging, restaurants, etc.)
   - Product sales
   - Commissions
   - Digital product purchases

## Running the Test

### Option 1: Using Environment Variables

```bash
# Set your test credentials
export TEST_EMAIL="your-email@example.com"
export TEST_PASSWORD="your-password"
export API_URL="https://www.blinno.app/api"  # or http://localhost:3001/api for local

# Run the test
npm run test:payout-requests
```

### Option 2: Edit the Script Directly

Edit `test-payout-requests.js` and update:
- `TEST_EMAIL`: Your registered email
- `TEST_PASSWORD`: Your password
- `API_BASE_URL`: API endpoint (defaults to production)

Then run:
```bash
node test-payout-requests.js
```

## What the Test Does

1. **Login**: Authenticates with the provided credentials
2. **Check Earnings**: Retrieves available pending earnings
3. **Get Payout Methods**: Lists configured payout methods
4. **View History**: Shows existing payout requests
5. **Create Request**: Creates a new payout request (up to $50 or available amount)
6. **Verify**: Checks that earnings were updated correctly

## Expected Results

### Success Case
```
✅ Login successful
✅ Earnings retrieved:
   Total Earnings: USD 150.00
   Pending Earnings: USD 75.00
   Paid Out: USD 75.00

✅ Found 1 payout method(s)
✅ Payout request created successfully!
   Payout ID: abc123...
   Status: pending
   Amount: USD 50.00
```

### Common Issues

1. **Insufficient Earnings**
   - Error: "Insufficient funds. Available: X USD"
   - Solution: Complete more transactions or wait for payments to process

2. **No Payout Methods**
   - Error: "No payout methods found"
   - Solution: Add a payout method in your dashboard

3. **Minimum Amount Not Met**
   - Error: "Minimum payout amount is 25 USD"
   - Solution: Ensure you have at least $25 in pending earnings

4. **Invalid Credentials**
   - Error: "Invalid credentials" or "HTTP error! status: 401"
   - Solution: Check your email and password

5. **Server Error**
   - Error: "HTTP error! status: 500"
   - Solution: Check server logs or try again later

## Testing Locally

If testing against a local server:

1. Start the backend server:
   ```bash
   npm run start
   # or
   cd backend && npm run dev
   ```

2. Update API_BASE_URL in the script:
   ```javascript
   const API_BASE_URL = 'http://localhost:3001/api';
   ```

3. Run the test:
   ```bash
   node test-payout-requests.js
   ```

## Manual Testing via API

You can also test manually using curl or Postman:

### 1. Login
```bash
curl -X POST https://www.blinno.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### 2. Get Earnings (use token from login)
```bash
curl -X GET https://www.blinno.app/api/revenue/earnings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Payout Methods
```bash
curl -X GET https://www.blinno.app/api/revenue/payout-methods \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Create Payout Request
```bash
curl -X POST https://www.blinno.app/api/revenue/request-payout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50,"paymentMethodId":"method-id-here"}'
```

## Notes

- The minimum payout amount is **$25 USD**
- Payout requests are processed manually by admins
- Earnings must be from completed transactions (status: 'collected')
- Only pending earnings (payout_status: 'pending') can be requested

