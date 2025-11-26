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
 * Payment Processing: 2.5% + TZS 500 fixed fee (paid by buyer)
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
  paymentProcessingFixedFee: number; // Fixed amount in TZS
}

// Default fee configuration
const DEFAULT_FEES: FeeConfig = {
  marketplaceCommission: 0.08, // 8%
  digitalProductCommission: 0.06, // 6%
  serviceBookingCommission: 0.10, // 10%
  commissionWorkCommission: 0.12, // 12%
  paymentProcessingFee: 0.025, // 2.5%
  paymentProcessingFixedFee: 500, // TZS 500
};

// Percentage-based fee configuration based on user's tier
const PERCENTAGE_TIER_FEES = {
  basic: {
    marketplaceCommission: 0.08, // 8%
    digitalProductCommission: 0.06, // 6%
    serviceBookingCommission: 0.10, // 10%
    commissionWorkCommission: 0.12, // 12%
  },
  premium: {
    marketplaceCommission: 0.05, // 5%
    digitalProductCommission: 0.06, // 6%
    serviceBookingCommission: 0.08, // 8%
    commissionWorkCommission: 0.10, // 10%
  },
  pro: {
    marketplaceCommission: 0.03, // 3%
    digitalProductCommission: 0.04, // 4%
    serviceBookingCommission: 0.06, // 6%
    commissionWorkCommission: 0.08, // 8%
  }
};

// Currency-specific fixed fees (approximate values)
const CURRENCY_FIXED_FEES = {
  TZS: 500,    // Tanzanian Shilling
  KES: 20,     // Kenyan Shilling
  UGX: 500,    // Ugandan Shilling
  RWF: 400,    // Rwandan Franc
  USD: 0.20,   // US Dollar
  EUR: 0.18,   // Euro
  GBP: 0.15,   // British Pound
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
   */
  calculateMarketplaceFee(amount: number, percentageTier?: keyof typeof PERCENTAGE_TIER_FEES, currency: string = 'TZS'): FeeCalculation {
    // Use percentage tier rate if provided, otherwise use default
    const commissionRate = percentageTier 
      ? PERCENTAGE_TIER_FEES[percentageTier].marketplaceCommission
      : this.config.marketplaceCommission;
      
    const platformFee = amount * commissionRate;
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
   */
  calculateDigitalProductFee(amount: number, percentageTier?: keyof typeof PERCENTAGE_TIER_FEES, currency: string = 'TZS'): FeeCalculation {
    // Use percentage tier rate if provided, otherwise use default
    const commissionRate = percentageTier 
      ? PERCENTAGE_TIER_FEES[percentageTier].digitalProductCommission
      : this.config.digitalProductCommission;
      
    const platformFee = amount * commissionRate;
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
   */
  calculateServiceBookingFee(amount: number, percentageTier?: keyof typeof PERCENTAGE_TIER_FEES, currency: string = 'TZS'): FeeCalculation {
    // Use percentage tier rate if provided, otherwise use default
    const commissionRate = percentageTier 
      ? PERCENTAGE_TIER_FEES[percentageTier].serviceBookingCommission
      : this.config.serviceBookingCommission;
      
    const platformFee = amount * commissionRate;
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
   */
  calculateCommissionFee(amount: number, percentageTier?: keyof typeof PERCENTAGE_TIER_FEES, currency: string = 'TZS'): FeeCalculation {
    // Use percentage tier rate if provided, otherwise use default
    const commissionRate = percentageTier 
      ? PERCENTAGE_TIER_FEES[percentageTier].commissionWorkCommission
      : this.config.commissionWorkCommission;
      
    const platformFee = amount * commissionRate;
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
  calculateSubscriptionFee(amount: number, currency: string = 'TZS'): FeeCalculation {
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
  calculateTipFee(amount: number, currency: string = 'TZS'): FeeCalculation {
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
export default PlatformFeeService;