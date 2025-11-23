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

class PlatformFeeService {
  private config: FeeConfig;

  constructor(config?: Partial<FeeConfig>) {
    this.config = { ...DEFAULT_FEES, ...config };
  }

  /**
   * Calculate fees for marketplace/product sale
   */
  calculateMarketplaceFee(amount: number): FeeCalculation {
    const platformFee = amount * this.config.marketplaceCommission;
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + this.config.paymentProcessingFixedFee;
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
    };
  }

  /**
   * Calculate fees for digital product sale
   */
  calculateDigitalProductFee(amount: number): FeeCalculation {
    const platformFee = amount * this.config.digitalProductCommission;
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + this.config.paymentProcessingFixedFee;
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
    };
  }

  /**
   * Calculate fees for service booking
   */
  calculateServiceBookingFee(amount: number): FeeCalculation {
    const platformFee = amount * this.config.serviceBookingCommission;
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + this.config.paymentProcessingFixedFee;
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
    };
  }

  /**
   * Calculate fees for commission work
   */
  calculateCommissionFee(amount: number): FeeCalculation {
    const platformFee = amount * this.config.commissionWorkCommission;
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + this.config.paymentProcessingFixedFee;
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
    };
  }

  /**
   * Calculate fees for subscription payment
   */
  calculateSubscriptionFee(amount: number): FeeCalculation {
    // Lower fee for subscriptions (recurring revenue)
    const platformFee = amount * 0.05; // 5% for subscriptions
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + this.config.paymentProcessingFixedFee;
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
    };
  }

  /**
   * Calculate fees for tip/donation
   */
  calculateTipFee(amount: number): FeeCalculation {
    // Minimal fee for tips (encourage giving)
    const platformFee = amount * 0.03; // 3% for tips
    const paymentProcessingFee = (amount * this.config.paymentProcessingFee) + this.config.paymentProcessingFixedFee;
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
    };
  }

  /**
   * Update fee configuration
   */
  updateConfig(newConfig: Partial<FeeConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current fee configuration
   */
  getConfig(): FeeConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const platformFees = new PlatformFeeService();

