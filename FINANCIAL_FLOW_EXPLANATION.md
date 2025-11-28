# Financial Flow and Payment Handling in BLINNO

## Overview
This document explains how money flows through the BLINNO platform after a payment is made, and how finances are handled throughout the system.

## Payment Flow: Step-by-Step

### 1. **Payment Initiation**
When a buyer makes a purchase:
- Buyer adds items to cart and proceeds to checkout
- Platform calculates fees using `platformFees.calculateMarketplaceFee()` or similar methods
- A payment record is created in the `payments` table with status `pending`
- Platform fees are recorded in the `platform_fees` table with status `pending`
- Payment is sent to **ClickPesa** (payment gateway) for processing

### 2. **Payment Processing (ClickPesa)**
- ClickPesa processes the payment from the buyer's account
- Payment amount includes:
  - **Subtotal**: Original product/service price
  - **Payment Processing Fee**: 2.5% + fixed fee (USD $0.30 or equivalent in local currency)
  - **Total**: Subtotal + Payment Processing Fee (paid by buyer)

### 3. **Payment Completion (Webhook)**
When ClickPesa confirms payment success:
- Webhook endpoint (`/api/payments/webhook`) receives notification
- Payment status is updated to `completed`
- Order status is updated to `paid`
- Platform fees status is updated to `collected`

### 4. **Money Distribution**

#### Where the Money Goes:

**Total Payment Amount** (paid by buyer) = Subtotal + Payment Processing Fee

This total is received by **ClickPesa** and then distributed as follows:

1. **Payment Processing Fee** (2.5% + fixed fee)
   - Goes to **ClickPesa** (payment gateway)
   - Covers transaction processing costs

2. **Platform Fee** (varies by tier: 5-9% for marketplace, 3-6% for digital products, etc.)
   - Goes to **BLINNO Platform** (your company)
   - Stored in platform's ClickPesa account
   - Minimum platform fee: $0.25 USD per transaction

3. **Creator Payout** (Subtotal - Platform Fee)
   - Goes to **Creator's Account Balance** (held in escrow)
   - Recorded in `user_balances` table as `pending_balance` initially
   - Moved to `available_balance` when payment is confirmed
   - Creator can request payout when ready

## Financial Tracking System

### Database Tables

1. **`payments`**
   - Records all payment transactions
   - Tracks payment status: `pending`, `initiated`, `completed`, `failed`
   - Links to orders and payment gateway transaction IDs

2. **`platform_fees`**
   - Records all platform fee calculations
   - Tracks: `subtotal`, `platform_fee`, `payment_processing_fee`, `creator_payout`
   - Status: `pending` → `collected` → `paid` (when creator requests payout)
   - Links fees to specific transactions and creators

3. **`user_balances`**
   - Tracks each creator's financial balance
   - Fields:
     - `available_balance`: Money ready for payout
     - `pending_balance`: Money from pending payments
     - `total_earned`: Lifetime earnings
     - `total_paid_out`: Lifetime payouts

4. **`financial_transactions`**
   - Complete audit trail of all financial movements
   - Records: earnings, payouts, refunds
   - Includes: `balance_before`, `balance_after`, `amount`, `transaction_type`

5. **`creator_payouts`**
   - Records payout requests from creators
   - Status: `pending` → `processing` → `completed` → `failed`
   - Links to payment methods and fee records

## Fee Calculation Examples

### Marketplace Sale Example:
- **Product Price**: $100 USD
- **Platform Fee** (Basic tier): 8% = $8.00
- **Payment Processing Fee**: 2.5% + $0.30 = $2.80
- **Total Paid by Buyer**: $100 + $2.80 = $102.80
- **Creator Payout**: $100 - $8.00 = $92.00

**Distribution:**
- ClickPesa receives: $102.80
- ClickPesa keeps: $2.80 (processing fee)
- BLINNO receives: $8.00 (platform fee)
- Creator balance increases: $92.00

### Digital Product Example:
- **Product Price**: $50 USD
- **Platform Fee** (Basic tier): 6% = $3.00
- **Payment Processing Fee**: 2.5% + $0.30 = $1.55
- **Total Paid by Buyer**: $50 + $1.55 = $51.55
- **Creator Payout**: $50 - $3.00 = $47.00

## Creator Payout Process

### 1. **Earnings Accumulation**
- When payment completes, creator's `available_balance` increases
- Earnings are tracked in `financial_transactions` table
- Creator can view earnings in dashboard

### 2. **Payout Request**
- Creator must have minimum $25 USD available
- Creator selects payout method (mobile money, bank transfer, etc.)
- Payout request is created in `creator_payouts` table
- Status: `pending`

### 3. **Payout Processing**
- Admin reviews and approves payout request
- ClickPesa disbursement API is called to send money to creator
- Status updated to `processing` → `completed`
- Creator's `available_balance` decreases
- `total_paid_out` increases
- Transaction recorded in `financial_transactions`

### 4. **Payout Methods**
- **Mobile Money**: M-Pesa, Tigo Pesa, Airtel Money, etc.
- **Bank Transfer**: Direct bank account transfer
- **ClickPesa Wallet**: Creator's ClickPesa account

## Escrow/Holding Mechanism

### Pending Balance
- When payment is initiated but not yet confirmed
- Money is held in `pending_balance`
- Not available for payout until payment completes

### Available Balance
- When payment is confirmed (webhook received)
- Money moves from `pending_balance` to `available_balance`
- Creator can request payout from available balance

### Hold Periods
- Currently, there's no automatic hold period
- Money becomes available immediately after payment confirmation
- Future: Could implement 7-14 day hold for dispute resolution

## Currency Handling

### Multi-Currency Support
- Platform supports: USD, TZS, KES, UGX, RWF, NGN
- User's preferred currency is used for:
  - Fee calculations
  - Payment processing
  - Balance tracking
  - Payout requests

### Currency Conversion
- Products stored in USD base price
- Converted to user's currency for display
- Payment processed in user's preferred currency
- Platform fees calculated in transaction currency

## Financial Reporting

### For Creators:
- **Earnings Summary**: Total earned, pending, paid out
- **Transaction History**: All earnings and payouts
- **Breakdown by Type**: Marketplace, digital products, services, etc.
- **Balance Details**: Available, pending, lifetime totals

### For Platform (Admin):
- **Revenue Dashboard**: Total platform fees collected
- **Transaction Analytics**: By type, date, currency
- **Payout Management**: Review and process creator payouts
- **Financial Reports**: Monthly, quarterly, annual summaries

## Security & Compliance

### Payment Security
- All payments processed through ClickPesa (PCI-compliant)
- No credit card data stored on platform
- Webhook signature verification (optional)

### Financial Security
- All transactions recorded in immutable `financial_transactions` table
- Balance updates are atomic (database transactions)
- Payout requests require authentication
- Minimum payout amounts prevent micro-transactions

### Audit Trail
- Complete history in `financial_transactions`
- Every balance change is recorded
- Reference IDs link transactions to orders/payments
- Timestamps for all financial operations

## Key Services

### 1. `PlatformFeeService` (`backend/src/services/platformFees.ts`)
- Calculates fees for all transaction types
- Supports tier-based fee rates
- Handles minimum platform fees
- Multi-currency support

### 2. `FinancialTrackingService` (`backend/src/services/financialTracking.ts`)
- Manages user balances
- Records all financial transactions
- Provides financial summaries
- Handles pending/available balance transitions

### 3. `ClickPesaService` (`backend/src/services/clickpesa.ts`)
- Payment processing
- Payout/disbursement processing
- Webhook handling
- Transaction status checking

## Summary

**Money Flow:**
1. Buyer pays → ClickPesa receives total amount
2. ClickPesa keeps processing fee
3. Remaining amount goes to platform account
4. Platform keeps platform fee
5. Creator payout goes to creator's balance (escrow)
6. Creator requests payout → Money sent to creator's account

**Key Points:**
- Money is held in escrow (creator balance) until payout is requested
- Platform fees are collected immediately upon payment
- Payment processing fees are paid by the buyer
- All transactions are tracked and auditable
- Multi-currency support throughout the system

