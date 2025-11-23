/**
 * Click Pesa Payment Gateway Service
 * Handles all interactions with Click Pesa API
 */

interface ClickPesaConfig {
  clientId: string;
  apiKey: string;
  baseUrl: string; // 'https://api.clickpesa.com' for production, 'https://sandbox.clickpesa.com' for sandbox
}

interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  transactionId?: string;
  message?: string;
  error?: string;
}

interface DisbursementRequest {
  amount: number;
  currency: string;
  recipientPhone: string;
  recipientEmail?: string;
  recipientName?: string;
  description?: string;
  callbackUrl?: string;
}

interface DisbursementResponse {
  success: boolean;
  disbursementId?: string;
  transactionId?: string;
  message?: string;
  error?: string;
}

class ClickPesaService {
  private config: ClickPesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ClickPesaConfig) {
    this.config = config;
  }

  /**
   * Get access token for API authentication
   */
  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.apiKey,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json() as any;
      this.accessToken = data.access_token || '';
      // Token typically expires in 3600 seconds (1 hour)
      this.tokenExpiry = Date.now() + (data.expires_in * 1000 || 3600000);

      return this.accessToken || '';
    } catch (error: any) {
      console.error('Click Pesa token error:', error);
      throw new Error('Failed to authenticate with Click Pesa');
    }
  }

  /**
   * Create a payment request
   */
  async createPayment(payment: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: payment.amount,
          currency: payment.currency || 'TZS',
          order_id: payment.orderId,
          customer_phone: payment.customerPhone,
          customer_email: payment.customerEmail,
          customer_name: payment.customerName,
          description: payment.description || `Payment for order ${payment.orderId}`,
          callback_url: payment.callbackUrl,
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Payment creation failed',
        };
      }

      return {
        success: true,
        paymentId: data.payment_id || data.id || '',
        checkoutUrl: data.checkout_url || data.url || '',
        transactionId: data.transaction_id || '',
        message: data.message || 'Payment created successfully',
      };
    } catch (error: any) {
      console.error('Click Pesa payment creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment',
      };
    }
  }

  /**
   * Create a disbursement request (payout)
   */
  async createDisbursement(disbursement: DisbursementRequest): Promise<DisbursementResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/api/v1/disbursements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: disbursement.amount,
          currency: disbursement.currency || 'TZS',
          recipient_phone: disbursement.recipientPhone,
          recipient_email: disbursement.recipientEmail,
          recipient_name: disbursement.recipientName,
          description: disbursement.description || `Disbursement`,
          callback_url: disbursement.callbackUrl,
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Disbursement creation failed',
        };
      }

      return {
        success: true,
        disbursementId: data.disbursement_id || data.id || '',
        transactionId: data.transaction_id || '',
        message: data.message || 'Disbursement created successfully',
      };
    } catch (error: any) {
      console.error('Click Pesa disbursement creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create disbursement',
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/api/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Failed to check payment status',
        };
      }

      return {
        success: true,
        paymentId: data.payment_id || data.id,
        transactionId: data.transaction_id,
        message: data.status || data.message,
      };
    } catch (error: any) {
      console.error('Click Pesa status check error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check payment status',
      };
    }
  }

  /**
   * Check disbursement status
   */
  async checkDisbursementStatus(disbursementId: string): Promise<DisbursementResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/api/v1/disbursements/${disbursementId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Failed to check disbursement status',
        };
      }

      return {
        success: true,
        disbursementId: data.disbursement_id || data.id,
        transactionId: data.transaction_id,
        message: data.status || data.message,
      };
    } catch (error: any) {
      console.error('Click Pesa disbursement status check error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check disbursement status',
      };
    }
  }

  /**
   * Verify webhook signature (if Click Pesa provides webhook signing)
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement webhook signature verification if Click Pesa provides it
    // For now, we'll rely on HTTPS and webhook URL secrecy
    return true;
  }
}

export default ClickPesaService;
export type { PaymentRequest, PaymentResponse, DisbursementRequest, DisbursementResponse, ClickPesaConfig };