/**
 * Platform Fee Calculation Service
 * Handles all platform fee calculations for different transaction types
 * 
 * Fee Structure:
 * - Marketplace Sales: 8%
 * - Digital Products: 6%
 * - Service Bookings: 10%
 * - Commission Work: 12%
 * - Subscriptions: 5%
 * - Tips/Donations: 3%
 * 
 * Payment Processing: 2.5% + USD 0.30 fixed fee (paid by buyer)
 */

export interface FeeCalculation {
  subtotal: number;
  platformFee: number;
  paymentProcessingFee: number;
  totalFees: number;
  creatorPayout: number;
  total: number;
  currency?: string; // Add currency support
}

export interface FeeConfig {
  marketplaceCommission: number; // Percentage (e.g., 0.08 for 8%)
  digitalProductCommission: number;
  serviceBookingCommission: number;
  commissionWorkCommission: number;
  paymentProcessingFee: number; // Percentage
  paymentProcessingFixedFee: number; // Fixed amount in USD
}

// Default fee configuration
const DEFAULT_FEES: FeeConfig = {
  marketplaceCommission: 0.08, // 8%
  digitalProductCommission: 0.06, // 6%
  serviceBookingCommission: 0.10, // 10%
  commissionWorkCommission: 0.12, // 12%
  paymentProcessingFee: 0.025, // 2.5%
  paymentProcessingFixedFee: 0.30, // USD 0.30
};

// Percentage-based fee configuration based on user's tier
// Updated with profitable rates and volume-based structure
const PERCENTAGE_TIER_FEES = {
  basic: {
    marketplaceCommission: 0.08, // 8%
    digitalProductCommission: 0.06, // 6%
    serviceBookingCommission: 0.10, // 10%
    commissionWorkCommission: 0.12, // 12%
  },
  premium: {
    marketplaceCommission: 0.06, // 6% (increased from 5% for profitability)
    digitalProductCommission: 0.05, // 5% (reduced from 6%)
    serviceBookingCommission: 0.08, // 8%
    commissionWorkCommission: 0.10, // 10%
  },
  pro: {
    marketplaceCommission: 0.05, // 5% (increased from 3% for profitability)
    digitalProductCommission: 0.04, // 4%
    serviceBookingCommission: 0.07, // 7% (increased from 6%)
    commissionWorkCommission: 0.09, // 9% (increased from 8%)
  }
};

// Subscription-based fee configuration (reduced fees for paying subscribers)
const SUBSCRIPTION_TIER_FEES = {
  free: {
    marketplaceCommission: 0.08, // 8% (same as percentage basic)
    digitalProductCommission: 0.06, // 6%
    serviceBookingCommission: 0.10, // 10%
    commissionWorkCommission: 0.12, // 12%
  },
  creator: {
    marketplaceCommission: 0.05, // 5% (reduced from 8% base)
    digitalProductCommission: 0.04, // 4% (reduced from 6% base)
    serviceBookingCommission: 0.07, // 7% (reduced from 10% base)
    commissionWorkCommission: 0.09, // 9% (reduced from 12% base)
  },
  professional: {
    marketplaceCommission: 0.04, // 4% (reduced from 8% base)
    digitalProductCommission: 0.03, // 3% (reduced from 6% base)
    serviceBookingCommission: 0.06, // 6% (reduced from 10% base)
    commissionWorkCommission: 0.08, // 8% (reduced from 12% base)
  },
  enterprise: {
    marketplaceCommission: 0.03, // 3% (best rates for enterprise)
    digitalProductCommission: 0.02, // 2%
    serviceBookingCommission: 0.05, // 5%
    commissionWorkCommission: 0.07, // 7%
  }
};

// Minimum platform fee per transaction (ensures profitability on small sales)
const MINIMUM_PLATFORM_FEE = 0.25; // $0.25 USD

// Currency-specific fixed fees (approximate values)
const CURRENCY_FIXED_FEES = {
  USD: 0.30,   // US Dollar
  EUR: 0.25,   // Euro
  GBP: 0.25,   // British Pound
  TZS: 750,    // Tanzanian Shilling (approximately $0.30 USD)
  KES: 33,     // Kenyan Shilling (approximately $0.30 USD)
  UGX: 1110,   // Ugandan Shilling (approximately $0.30 USD)
  RWF: 330,    // Rwandan Franc (approximately $0.30 USD)
  NGN: 450,    // Nigerian Naira (approximately $0.30 USD)
};

class PlatformFeeService {
  private config: FeeConfig;

  constructor(config?: Partial<FeeConfig>) {
    this.config = { ...DEFAULT_FEES, ...config };
  }

  /**
   * Get fixed fee for a specific currency
   */
  private getFixedFeeForCurrency(currency: string): number {
    return CURRENCY_FIXED_FEES[currency as keyof typeof CURRENCY_FIXED_FEES] || this.config.paymentProcessingFixedFee;
  }

  /**
   * Calculate fees for marketplace/product sale
   * Now includes minimum platform fee to ensure profitability
   * Supports both percentage-based and subscription-based tiers
   */
  calculateMarketplaceFee(
    amount: number, 
    percentageTier?: keyof typeof PERCENTAGE_TIER_FEES,
    subscriptionTier?: keyof typeof SUBSCRIPTION_TIER_FEES,
    currency: string = 'USD'
  ): FeeCalculation {
    // Priority: subscription tier > percentage tier > default
    let commissionRate: number;
    
    if (subscriptionTier) {
      commissionRate = SUBSCRIPTION_TIER_FEES[subscriptionTier].marketplaceCommission;
    } else if (percentageTier) {
      commissionRate = PERCENTAGE_TIER_FEES[percentageTier].marketplaceCommission;
    } else {
      commissionRate = this.config.marketplaceCommission;
    }
      
    let platformFee = amount * commissionRate;
    
    // Apply minimum platform fee to ensure profitability on small transactions
    if (platformFee < MINIMUM_PLATFORM_FEE) {
      platformFee = MINIMUM_PLATFORM_FEE;
    }
    
    const fixedFee = this.getFixedFeeForCurrency(currency);
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + fixedFee;
    const totalFees = platformFee + paymentProcessingFee;
    const creatorPayout = amount - platformFee; // Payment processing fee paid by buyer
    const total = amount + paymentProcessingFee; // Buyer pays amount + processing fee

    return {
      subtotal: amount,
      platformFee,
      paymentProcessingFee,
      totalFees,
      creatorPayout,
      total,
      currency
    };
  }

  /**
   * Calculate fees for digital product sale
   * Now includes minimum platform fee to ensure profitability
   * Supports both percentage-based and subscription-based tiers
   */
  calculateDigitalProductFee(
    amount: number, 
    percentageTier?: keyof typeof PERCENTAGE_TIER_FEES,
    subscriptionTier?: keyof typeof SUBSCRIPTION_TIER_FEES,
    currency: string = 'USD'
  ): FeeCalculation {
    // Priority: subscription tier > percentage tier > default
    let commissionRate: number;
    
    if (subscriptionTier) {
      commissionRate = SUBSCRIPTION_TIER_FEES[subscriptionTier].digitalProductCommission;
    } else if (percentageTier) {
      commissionRate = PERCENTAGE_TIER_FEES[percentageTier].digitalProductCommission;
    } else {
      commissionRate = this.config.digitalProductCommission;
    }
      
    let platformFee = amount * commissionRate;
    
    // Apply minimum platform fee to ensure profitability on small transactions
    if (platformFee < MINIMUM_PLATFORM_FEE) {
      platformFee = MINIMUM_PLATFORM_FEE;
    }
    
    const fixedFee = this.getFixedFeeForCurrency(currency);
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + fixedFee;
    const totalFees = platformFee + paymentProcessingFee;
    const creatorPayout = amount - platformFee;
    const total = amount + paymentProcessingFee;

    return {
      subtotal: amount,
      platformFee,
      paymentProcessingFee,
      totalFees,
      creatorPayout,
      total,
      currency
    };
  }

  /**
   * Calculate fees for service booking
   * Now includes minimum platform fee to ensure profitability
   * Supports both percentage-based and subscription-based tiers
   */
  calculateServiceBookingFee(
    amount: number, 
    percentageTier?: keyof typeof PERCENTAGE_TIER_FEES,
    subscriptionTier?: keyof typeof SUBSCRIPTION_TIER_FEES,
    currency: string = 'USD'
  ): FeeCalculation {
    // Priority: subscription tier > percentage tier > default
    let commissionRate: number;
    
    if (subscriptionTier) {
      commissionRate = SUBSCRIPTION_TIER_FEES[subscriptionTier].serviceBookingCommission;
    } else if (percentageTier) {
      commissionRate = PERCENTAGE_TIER_FEES[percentageTier].serviceBookingCommission;
    } else {
      commissionRate = this.config.serviceBookingCommission;
    }
      
    let platformFee = amount * commissionRate;
    
    // Apply minimum platform fee to ensure profitability on small transactions
    if (platformFee < MINIMUM_PLATFORM_FEE) {
      platformFee = MINIMUM_PLATFORM_FEE;
    }
    
    const fixedFee = this.getFixedFeeForCurrency(currency);
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + fixedFee;
    const totalFees = platformFee + paymentProcessingFee;
    const creatorPayout = amount - platformFee;
    const total = amount + paymentProcessingFee;

    return {
      subtotal: amount,
      platformFee,
      paymentProcessingFee,
      totalFees,
      creatorPayout,
      total,
      currency
    };
  }

  /**
   * Calculate fees for commission work
   * Now includes minimum platform fee to ensure profitability
   * Supports both percentage-based and subscription-based tiers
   */
  calculateCommissionFee(
    amount: number, 
    percentageTier?: keyof typeof PERCENTAGE_TIER_FEES,
    subscriptionTier?: keyof typeof SUBSCRIPTION_TIER_FEES,
    currency: string = 'USD'
  ): FeeCalculation {
    // Priority: subscription tier > percentage tier > default
    let commissionRate: number;
    
    if (subscriptionTier) {
      commissionRate = SUBSCRIPTION_TIER_FEES[subscriptionTier].commissionWorkCommission;
    } else if (percentageTier) {
      commissionRate = PERCENTAGE_TIER_FEES[percentageTier].commissionWorkCommission;
    } else {
      commissionRate = this.config.commissionWorkCommission;
    }
      
    let platformFee = amount * commissionRate;
    
    // Apply minimum platform fee to ensure profitability on small transactions
    if (platformFee < MINIMUM_PLATFORM_FEE) {
      platformFee = MINIMUM_PLATFORM_FEE;
    }
    
    const fixedFee = this.getFixedFeeForCurrency(currency);
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + fixedFee;
    const totalFees = platformFee + paymentProcessingFee;
    const creatorPayout = amount - platformFee;
    const total = amount + paymentProcessingFee;

    return {
      subtotal: amount,
      platformFee,
      paymentProcessingFee,
      totalFees,
      creatorPayout,
      total,
      currency
    };
  }

  /**
   * Calculate fees for subscription payment
   */
  calculateSubscriptionFee(amount: number, currency: string = 'USD'): FeeCalculation {
    // Lower fee for subscriptions (recurring revenue)
    const platformFee = amount * 0.05; // 5% for subscriptions
    const fixedFee = this.getFixedFeeForCurrency(currency);
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + fixedFee;
    const totalFees = platformFee + paymentProcessingFee;
    const creatorPayout = amount - platformFee;
    const total = amount + paymentProcessingFee;

    return {
      subtotal: amount,
      platformFee,
      paymentProcessingFee,
      totalFees,
      creatorPayout,
      total,
      currency
    };
  }

  /**
   * Calculate fees for tip/donation
   */
  calculateTipFee(amount: number, currency: string = 'USD'): FeeCalculation {
    // Minimal fee for tips (encourage giving)
    const platformFee = amount * 0.03; // 3% for tips
    const fixedFee = this.getFixedFeeForCurrency(currency);
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + fixedFee;
    const totalFees = platformFee + paymentProcessingFee;
    const creatorPayout = amount - platformFee;
    const total = amount + paymentProcessingFee;

    return {
      subtotal: amount,
      platformFee,
      paymentProcessingFee,
      totalFees,
      creatorPayout,
      total,
      currency
    };
  }
}

export const platformFees = new PlatformFeeService();
export { MINIMUM_PLATFORM_FEE };
export default PlatformFeeService;