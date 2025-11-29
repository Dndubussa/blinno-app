import { supabase } from '@/integrations/supabase/client';
import { retry, withTimeout, isRetryableError, AppError } from './errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.blinno.app/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get current Supabase session token
   */
  private async getToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting session token:', error);
      return null;
    }
  }

  setToken(token: string | null) {
    // Deprecated: Token is now retrieved from Supabase session
    // Keeping for backward compatibility
    console.warn('setToken is deprecated. Token is now retrieved from Supabase session.');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOptions?: { maxRetries?: number; retryable?: boolean }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const shouldRetry = retryOptions?.retryable !== false;
    const maxRetries = retryOptions?.maxRetries ?? 3;

    const makeRequest = async (): Promise<T> => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Get token from Supabase session
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Create fetch promise with timeout
      const fetchPromise = fetch(url, {
        ...options,
        headers,
      });

      // Apply timeout
      const response = await withTimeout(
        fetchPromise,
        REQUEST_TIMEOUT,
        `Request to ${endpoint} timed out after ${REQUEST_TIMEOUT}ms`
      ) as Response;

      if (!response.ok) {
        // Try to parse error response
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Request failed' };
        }

        // Create error object
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        const errorObj = new AppError(
          errorMessage,
          errorData.code || `HTTP_${response.status}`,
          response.status,
          {
            component: 'ApiClient',
            action: 'request',
            additionalData: {
              endpoint,
              method: options.method || 'GET',
              status: response.status,
            }
          },
          shouldRetry && isRetryableError({ status: response.status })
        );

        // Preserve additional error properties
        Object.assign(errorObj, errorData);
        (errorObj as any).status = response.status;
        (errorObj as any).statusCode = response.status;

        throw errorObj;
      }

      return response.json();
    };

    // Retry logic for retryable errors
    if (shouldRetry) {
      return retry(makeRequest, {
        maxRetries,
        delay: 1000,
        backoff: true,
        retryableCheck: (error) => {
          // Don't retry 4xx errors (except 429)
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            return false;
          }
          return isRetryableError(error);
        }
      });
    }

    return makeRequest();
  }

  // Auth
  async register(data: { email: string; password: string; displayName: string; role?: string; firstName?: string; middleName?: string; lastName?: string; phoneNumber?: string; country?: string; termsAccepted?: boolean }) {
    try {
      const result = await this.request<{ user: any; token: string | null; session: any; warning?: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.token) {
        this.setToken(result.token);
      }
      return result;
    } catch (error: any) {
      // Preserve all error properties including userExists flag
      const errorMessage = error?.message || 'Registration failed';
      const apiError = new Error(errorMessage);
      // Copy all properties from the original error
      Object.assign(apiError, error);
      (apiError as any).response = error?.response || { data: { error: errorMessage } };
      throw apiError;
    }
  }

  async login(email: string, password: string) {
    try {
      const result = await this.request<{ user: any; token: string | null; session: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.token) {
        this.setToken(result.token);
      }
      return result;
    } catch (error: any) {
      // Re-throw with better error message
      const errorMessage = error?.message || 'Login failed';
      const apiError = new Error(errorMessage);
      (apiError as any).response = error?.response || { data: { error: errorMessage } };
      throw apiError;
    }
  }

  async resendVerificationEmail() {
    return await this.request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    // Check if we have a session token
    const token = await this.getToken();
    if (!token) {
      return null;
    }
    
    try {
      return await this.request<any>('/auth/me');
    } catch (error: any) {
      // 401 is expected when user is not logged in or token is invalid - don't throw
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return null;
      }
      throw error;
    }
  }

  logout() {
    this.setToken(null);
  }

  // Featured Creators
  async getFeaturedCreators(limit = 10) {
    return this.request<any[]>(`/creators/featured?limit=${limit}`);
  }

  // Creators Gallery
  async getCreatorsGallery(limit = 20, offset = 0, category?: string) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (category) params.append('category', category);
    return this.request<any[]>(`/creators/gallery?${params.toString()}`);
  }

  // Testimonials
  async getTestimonials(limit = 5) {
    return this.request<any[]>(`/testimonials?limit=${limit}`);
  }

  // Public Jobs
  async getPublicJobs(limit = 50, offset = 0) {
    return this.request<any[]>(`/jobs/public?limit=${limit}&offset=${offset}`);
  }

  // Public Courses
  async getPublicCourses(limit = 50, offset = 0) {
    return this.request<any[]>(`/courses/public?limit=${limit}&offset=${offset}`);
  }

  // Search
  async search(query: string, limit = 8) {
    return this.request<any[]>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Profiles
  async getProfile(userId: string) {
    return this.request<any>(`/profiles/${userId}`);
  }

  async updateProfile(data: FormData) {
    return this.request<any>('/profiles/me', {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateProfilePreferences(preferences: { currency?: string; language?: string; country?: string }) {
    const formData = new FormData();
    
    if (preferences.currency) {
      formData.append('currency', preferences.currency);
    }
    
    if (preferences.language) {
      formData.append('language', preferences.language);
    }
    
    if (preferences.country) {
      formData.append('country', preferences.country);
    }
    
    return this.request<any>('/profiles/me', {
      method: 'PUT',
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  // Portfolios
  async getPortfolios(filters?: { category?: string; creatorId?: string; featured?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.creatorId) params.append('creatorId', filters.creatorId);
    if (filters?.featured) params.append('featured', 'true');
    
    const query = params.toString();
    return this.request<any[]>(`/portfolios${query ? `?${query}` : ''}`);
  }

  async getPortfolio(id: string) {
    return this.request<any>(`/portfolios/${id}`);
  }

  async createPortfolio(data: FormData) {
    return this.request<any>('/portfolios', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deletePortfolio(id: string) {
    return this.request<any>(`/portfolios/${id}`, {
      method: 'DELETE',
    });
  }

  async updatePortfolio(id: string, data: FormData) {
    return this.request<any>(`/portfolios/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  // Products
  async getProducts(filters?: { category?: string; location?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    return this.request<any[]>(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async createProduct(data: FormData) {
    return this.request<any>('/products', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateProduct(id: string, data: FormData) {
    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Cart
  async getCart() {
    return this.request<any[]>('/cart');
  }

  async getCartItems() {
    return this.request<any[]>('/cart');
  }

  async addToCart(productId: string, quantity: number = 1) {
    return this.request<any>('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(id: string, quantity: number) {
    return this.request<any>(`/cart/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(id: string) {
    return this.request<any>(`/cart/${id}`, {
      method: 'DELETE',
    });
  }

  // Cart update and delete methods
  async deleteCartItem(id: string) {
    return this.request<any>(`/cart/${id}`, {
      method: 'DELETE',
    });
  }

  async checkout(data: { shippingAddress?: any; notes?: string }) {
    return this.request<any>('/cart/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payments
  async createPayment(data: { orderId: string; customerPhone: string; customerEmail?: string; customerName?: string }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>('/payments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request<any>(`/payments/${paymentId}/status`);
  }

  async getPaymentHistory() {
    return this.request<any[]>('/payments/history');
  }

  // Payments update and delete methods
  async updatePayment(id: string, data: any) {
    return this.request<any>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: string) {
    return this.request<any>(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions
  async getMySubscription() {
    return this.request<any>('/subscriptions/me');
  }

  async subscribeToTier(tier: string, pricingModel?: 'percentage' | 'subscription') {
    return this.request<any>('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ tier, pricingModel }),
    });
  }

  async createSubscriptionPayment(data: {
    paymentId: string;
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; checkoutUrl: string; paymentId: string; message: string }>('/subscriptions/payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription() {
    return this.request<any>('/subscriptions/cancel', {
      method: 'POST',
    });
  }

  async getSubscriptionTiers() {
    return this.request<any>('/subscriptions/tiers');
  }

  async getVolumeStats() {
    return this.request<any>('/subscriptions/volume');
  }

  // Subscription Tiers update and delete methods
  async updateSubscriptionTier(id: string, data: any) {
    return this.request<any>(`/subscriptions/tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubscriptionTier(id: string) {
    return this.request<any>(`/subscriptions/tiers/${id}`, {
      method: 'DELETE',
    });
  }

  // Featured Listings
  async createFeaturedListing(data: {
    listingType: string;
    listingId: string;
    placementType: string;
    durationWeeks: number;
  }) {
    return this.request<any>('/featured', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFeaturedListings(filters?: { placementType?: string; listingType?: string }) {
    const params = new URLSearchParams();
    if (filters?.placementType) params.append('placementType', filters.placementType);
    if (filters?.listingType) params.append('listingType', filters.listingType);
    
    const query = params.toString();
    return this.request<any[]>(`/featured${query ? `?${query}` : ''}`);
  }

  async getMyFeaturedListings() {
    return this.request<any[]>('/featured/my-listings');
  }

  async getFeaturedPricing() {
    return this.request<any>('/featured/pricing');
  }

  // Featured Listings update and delete methods
  async updateFeaturedListing(id: string, data: any) {
    return this.request<any>(`/featured/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFeaturedListing(id: string) {
    return this.request<any>(`/featured/${id}`, {
      method: 'DELETE',
    });
  }

  // Payout Methods
  async getPayoutMethods() {
    return this.request<any[]>('/revenue/payout-methods');
  }

  async addPayoutMethod(data: {
    methodType: 'mobile_money' | 'bank_transfer';
    isDefault?: boolean;
    mobileOperator?: string;
    mobileNumber?: string;
    bankName?: string;
    bankAddress?: string;
    accountName?: string;
    accountNumber?: string;
    swiftCode?: string;
  }) {
    return this.request<any>('/revenue/payout-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayoutMethod(methodId: string, data: {
    isDefault?: boolean;
    mobileOperator?: string;
    mobileNumber?: string;
    bankName?: string;
    bankAddress?: string;
    accountName?: string;
    accountNumber?: string;
    swiftCode?: string;
  }) {
    return this.request<any>(`/revenue/payout-methods/${methodId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePayoutMethod(methodId: string) {
    return this.request<any>(`/revenue/payout-methods/${methodId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultPayoutMethod(methodId: string) {
    return this.request<any>(`/revenue/payout-methods/${methodId}/default`, {
      method: 'POST',
    });
  }

  // Payout Requests
  async getRequestPayout() {
    return this.request<any[]>('/revenue/payout-requests');
  }

  async createPayoutRequest(data: {
    methodId: string;
    amount: number;
    currency: string;
    description?: string;
  }) {
    return this.request<any>('/revenue/request-payout', {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        paymentMethodId: data.methodId,
      }),
    });
  }

  async cancelPayoutRequest(requestId: string) {
    return this.request<any>(`/revenue/payout-requests/${requestId}/cancel`, {
      method: 'POST',
    });
  }

  // Payout History
  async getPayoutHistory() {
    return this.request<any[]>('/revenue/my-payouts');
  }

  // Earnings
  async getEarnings() {
    return this.request<any>('/revenue/earnings');
  }

  async getEarningDetails(earningId: string) {
    return this.request<any>(`/revenue/earnings/${earningId}`);
  }

  // Financial Tracking
  async getFinancialSummary(options?: { period?: string; startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (options?.period) params.append('period', options.period);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    
    const query = params.toString();
    return this.request<any>(`/financial${query ? `?${query}` : ''}`);
  }

  async getFinancialTransactions(filters?: { type?: string; status?: string; startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const query = params.toString();
    return this.request<any[]>(`/financial/transactions${query ? `?${query}` : ''}`);
  }

  async getBalance() {
    return this.request<any>('/financial/balance');
  }

  async getTransactions(options?: { limit?: number; offset?: number; type?: string; status?: string }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.type) params.append('type', options.type);
    if (options?.status) params.append('status', options.status);
    
    const query = params.toString();
    return this.request<{ transactions: any[]; total?: number }>(`/financial/transactions${query ? `?${query}` : ''}`);
  }

  async getMyPayouts() {
    return this.request<any[]>('/revenue/my-payouts');
  }

  // Commissions
  async getCommissions(filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/commissions${query ? `?${query}` : ''}`);
  }

  async getCommission(id: string) {
    return this.request<any>(`/commissions/${id}`);
  }

  async createCommission(data: FormData) {
    return this.request<any>('/commissions', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateCommission(id: string, data: FormData) {
    return this.request<any>(`/commissions/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteCommission(id: string) {
    return this.request<any>(`/commissions/${id}`, {
      method: 'DELETE',
    });
  }

  async acceptCommission(id: string) {
    return this.request<any>(`/commissions/${id}/accept`, {
      method: 'POST',
    });
  }

  async rejectCommission(id: string, reason: string) {
    return this.request<any>(`/commissions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async completeCommission(id: string) {
    return this.request<any>(`/commissions/${id}/complete`, {
      method: 'POST',
    });
  }

  async cancelCommission(id: string, reason: string) {
    return this.request<any>(`/commissions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Tips
  async getTips(filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/tips${query ? `?${query}` : ''}`);
  }

  async sendTip(data: { creatorId: string; amount: number; currency?: string; message?: string; isAnonymous?: boolean }) {
    return this.request<any>('/tips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTip(id: string) {
    return this.request<any>(`/tips/${id}`);
  }

  // Performance Bookings
  async getPerformanceBookings(filters?: { status?: string; performerId?: string; clientId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.performerId) params.append('performerId', filters.performerId);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    
    const query = params.toString();
    return this.request<any[]>(`/performance-bookings${query ? `?${query}` : ''}`);
  }

  async getPerformanceBooking(id: string) {
    return this.request<any>(`/performance-bookings/${id}`);
  }

  async createPerformanceBooking(data: FormData) {
    return this.request<any>('/performance-bookings', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updatePerformanceBooking(id: string, data: FormData) {
    return this.request<any>(`/performance-bookings/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deletePerformanceBooking(id: string) {
    return this.request<any>(`/performance-bookings/${id}`, {
      method: 'DELETE',
    });
  }

  async acceptPerformanceBooking(id: string) {
    return this.request<any>(`/performance-bookings/${id}/accept`, {
      method: 'POST',
    });
  }

  async rejectPerformanceBooking(id: string, reason: string) {
    return this.request<any>(`/performance-bookings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async completePerformanceBooking(id: string) {
    return this.request<any>(`/performance-bookings/${id}/complete`, {
      method: 'POST',
    });
  }

  async cancelPerformanceBooking(id: string, reason: string) {
    return this.request<any>(`/performance-bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Courses
  async getCourses(filters?: { category?: string; educatorId?: string; published?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.educatorId) params.append('educatorId', filters.educatorId);
    if (filters?.published !== undefined) params.append('published', filters.published.toString());
    
    const query = params.toString();
    return this.request<any[]>(`/courses${query ? `?${query}` : ''}`);
  }

  async getCourse(id: string) {
    return this.request<any>(`/courses/${id}`);
  }

  async createCourse(data: FormData) {
    return this.request<any>('/courses', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateCourse(id: string, data: FormData) {
    return this.request<any>(`/courses/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteCourse(id: string) {
    return this.request<any>(`/courses/${id}`, {
      method: 'DELETE',
    });
  }

  async publishCourse(id: string) {
    return this.request<any>(`/courses/${id}/publish`, {
      method: 'POST',
    });
  }

  async unpublishCourse(id: string) {
    return this.request<any>(`/courses/${id}/unpublish`, {
      method: 'POST',
    });
  }

  // Course Lessons
  async getLessons(courseId: string) {
    return this.request<any[]>(`/courses/${courseId}/lessons`);
  }

  async getLesson(id: string) {
    return this.request<any>(`/lessons/${id}`);
  }

  async createLesson(data: FormData) {
    return this.request<any>('/lessons', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateLesson(id: string, data: FormData) {
    return this.request<any>(`/lessons/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteLesson(id: string) {
    return this.request<any>(`/lessons/${id}`, {
      method: 'DELETE',
    });
  }

  // Course Enrollments
  async getEnrollments(courseId: string) {
    return this.request<any[]>(`/courses/${courseId}/enrollments`);
  }

  async enrollInCourse(courseId: string) {
    return this.request<any>('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    });
  }

  async getMyEnrollments() {
    return this.request<any[]>('/enrollments/my-enrollments');
  }

  async getEnrollment(enrollmentId: string) {
    return this.request<any>(`/enrollments/${enrollmentId}`);
  }

  // Digital Products
  async getDigitalProducts(filters?: { category?: string; creatorId?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.creatorId) params.append('creatorId', filters.creatorId);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    return this.request<any[]>(`/digital-products${query ? `?${query}` : ''}`);
  }

  async getDigitalProduct(id: string) {
    return this.request<any>(`/digital-products/${id}`);
  }

  async getMyDigitalProducts() {
    return this.request<any[]>('/digital-products/my');
  }

  async createDigitalProduct(data: FormData) {
    return this.request<any>('/digital-products', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateDigitalProduct(id: string, data: FormData) {
    return this.request<any>(`/digital-products/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteDigitalProduct(id: string) {
    return this.request<any>(`/digital-products/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadDigitalProduct(id: string) {
    return this.request<{ downloadUrl: string; title: string; fileName: string }>(`/digital-products/${id}/download`);
  }

  async purchaseDigitalProduct(productId: string, customerPhone: string, customerEmail?: string, customerName?: string) {
    return this.request<any>(`/digital-products/${productId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ customerPhone, customerEmail, customerName }),
    });
  }

  async getMyPurchasedProducts() {
    return this.request<any[]>('/digital-products/my/purchases');
  }

  // News Articles
  async getNewsArticles(filters?: { category?: string; featured?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.featured) params.append('featured', 'true');
    
    const query = params.toString();
    return this.request<any[]>(`/news${query ? `?${query}` : ''}`);
  }

  async getNewsArticle(id: string) {
    return this.request<any>(`/news/${id}`);
  }

  async createNewsArticle(data: FormData) {
    return this.request<any>('/news', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateNewsArticle(id: string, data: FormData) {
    return this.request<any>(`/news/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteNewsArticle(id: string) {
    return this.request<any>(`/news/${id}`, {
      method: 'DELETE',
    });
  }

  async publishNewsArticle(id: string) {
    return this.request<any>(`/news/${id}/publish`, {
      method: 'POST',
    });
  }

  async unpublishNewsArticle(id: string) {
    return this.request<any>(`/news/${id}/unpublish`, {
      method: 'POST',
    });
  }

  // Artisan Services
  async getArtisanServices(filters?: { category?: string; artisanId?: string; available?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.artisanId) params.append('artisanId', filters.artisanId);
    if (filters?.available !== undefined) params.append('available', filters.available.toString());
    
    const query = params.toString();
    return this.request<any[]>(`/artisan-services${query ? `?${query}` : ''}`);
  }

  async getArtisanService(id: string) {
    return this.request<any>(`/artisan-services/${id}`);
  }

  async createArtisanService(data: FormData) {
    return this.request<any>('/artisan-services', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateArtisanService(id: string, data: FormData) {
    return this.request<any>(`/artisan-services/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteArtisanService(id: string) {
    return this.request<any>(`/artisan-services/${id}`, {
      method: 'DELETE',
    });
  }

  async bookArtisanService(serviceId: string, data: { startDate: string; endDate?: string; notes?: string }) {
    return this.request<any>(`/artisan-services/${serviceId}/book`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Job Postings
  async getJobPostings(filters?: { category?: string; employerId?: string; active?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.employerId) params.append('employerId', filters.employerId);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    
    const query = params.toString();
    return this.request<any[]>(`/jobs${query ? `?${query}` : ''}`);
  }

  async getJobPosting(id: string) {
    return this.request<any>(`/jobs/${id}`);
  }

  async createJobPosting(data: FormData) {
    return this.request<any>('/jobs', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateJobPosting(id: string, data: FormData) {
    return this.request<any>(`/jobs/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteJobPosting(id: string) {
    return this.request<any>(`/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async applyForJob(jobId: string, data: FormData) {
    return this.request<any>(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async getJobApplications(jobId: string) {
    return this.request<any[]>(`/jobs/${jobId}/applications`);
  }

  async getMyJobApplications() {
    return this.request<any[]>('/jobs/my-applications');
  }

  // Organized Events
  async getOrganizedEvents(filters?: { category?: string; organizerId?: string; published?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.organizerId) params.append('organizerId', filters.organizerId);
    if (filters?.published !== undefined) params.append('published', filters.published.toString());
    
    const query = params.toString();
    return this.request<any[]>(`/events${query ? `?${query}` : ''}`);
  }

  async getOrganizedEvent(id: string) {
    return this.request<any>(`/events/${id}`);
  }

  async createOrganizedEvent(data: FormData) {
    return this.request<any>('/events', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateOrganizedEvent(id: string, data: FormData) {
    return this.request<any>(`/events/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteOrganizedEvent(id: string) {
    return this.request<any>(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async publishOrganizedEvent(id: string) {
    return this.request<any>(`/events/${id}/publish`, {
      method: 'POST',
    });
  }

  async unpublishOrganizedEvent(id: string) {
    return this.request<any>(`/events/${id}/unpublish`, {
      method: 'POST',
    });
  }

  async registerForEvent(eventId: string, data: { ticketCount?: number; notes?: string }) {
    return this.request<any>(`/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEventRegistrations(eventId: string) {
    return this.request<any[]>(`/events/${eventId}/registrations`);
  }

  async getMyEventRegistrations() {
    return this.request<any[]>('/events/my-registrations');
  }

  // Reviews
  async getReviews(filters?: { creatorId?: string; reviewerId?: string; bookingId?: string }) {
    const params = new URLSearchParams();
    if (filters?.creatorId) params.append('creatorId', filters.creatorId);
    if (filters?.reviewerId) params.append('reviewerId', filters.reviewerId);
    if (filters?.bookingId) params.append('bookingId', filters.bookingId);
    
    const query = params.toString();
    return this.request<any[]>(`/reviews${query ? `?${query}` : ''}`);
  }

  async getReview(id: string) {
    return this.request<any>(`/reviews/${id}`);
  }

  async createReview(data: { creatorId: string; bookingId?: string; rating: number; comment?: string }) {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReview(id: string, data: { rating?: number; comment?: string }) {
    return this.request<any>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReview(id: string) {
    return this.request<any>(`/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  // Messages
  async getConversations() {
    return this.request<any[]>('/messages/conversations');
  }

  async getMessages(userId: string) {
    return this.request<any[]>(`/messages/${userId}`);
  }

  async sendMessage(recipientId: string, content: string) {
    return this.request<any>('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, content }),
    });
  }

  async createConversation(participantIds: string[], initialMessage?: string) {
    return this.request<any>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantIds, initialMessage }),
    });
  }

  async markMessageAsRead(messageId: string) {
    return this.request<any>(`/messages/${messageId}/read`, {
      method: 'POST',
    });
  }

  // Notifications
  async getNotifications(filters?: { read?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.read !== undefined) params.append('read', filters.read.toString());
    
    const query = params.toString();
    return this.request<any[]>(`/notifications${query ? `?${query}` : ''}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<any>('/notifications/read-all', {
      method: 'POST',
    });
  }

  // Orders
  async getOrders(filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request<any>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Refunds
  async getRefunds(filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/refunds${query ? `?${query}` : ''}`);
  }

  async getRefund(id: string) {
    return this.request<any>(`/refunds/${id}`);
  }

  async requestRefund(data: { orderId: string; reason: string; amount?: number; notes?: string }) {
    return this.request<any>('/refunds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveRefund(id: string) {
    return this.request<any>(`/refunds/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectRefund(id: string, reason: string) {
    return this.request<any>(`/refunds/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Disputes
  async getDisputes(filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/disputes${query ? `?${query}` : ''}`);
  }

  async getDispute(id: string) {
    return this.request<any>(`/disputes/${id}`);
  }

  async createDispute(data: { orderId: string; reason: string; description: string }) {
    return this.request<any>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resolveDispute(id: string, resolution: string) {
    return this.request<any>(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
  }

  // Social Feed
  async getSocialFeed(filters?: { creatorId?: string }) {
    const params = new URLSearchParams();
    if (filters?.creatorId) params.append('creatorId', filters.creatorId);
    
    const query = params.toString();
    return this.request<any[]>(`/social/feed${query ? `?${query}` : ''}`);
  }

  async createSocialPost(data: FormData) {
    return this.request<any>('/social/posts', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async getSocialPost(id: string) {
    return this.request<any>(`/social/posts/${id}`);
  }

  async updateSocialPost(id: string, data: FormData) {
    return this.request<any>(`/social/posts/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteSocialPost(id: string) {
    return this.request<any>(`/social/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async likeSocialPost(postId: string) {
    return this.request<any>(`/social/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async unlikeSocialPost(postId: string) {
    return this.request<any>(`/social/posts/${postId}/unlike`, {
      method: 'POST',
    });
  }

  async getSocialComments(postId: string) {
    return this.request<any[]>(`/social/posts/${postId}/comments`);
  }

  async createSocialComment(postId: string, content: string) {
    return this.request<any>(`/social/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteSocialComment(commentId: string) {
    return this.request<any>(`/social/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Wishlist
  async getWishlist() {
    return this.request<any[]>('/wishlist');
  }

  async addToWishlist(productId: string) {
    return this.request<any>('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request<any>(`/wishlist/${productId}`, {
      method: 'DELETE',
    });
  }

  // Two-Factor Authentication
  async enableTwoFactor() {
    return this.request<any>('/2fa/enable', {
      method: 'POST',
    });
  }

  async disableTwoFactor() {
    return this.request<any>('/2fa/disable', {
      method: 'POST',
    });
  }

  async verifyTwoFactorToken(token: string) {
    return this.request<any>('/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async backupTwoFactorCodes() {
    return this.request<any>('/2fa/backup-codes', {
      method: 'POST',
    });
  }

  // Content Moderation
  async reportContent(data: {
    contentType: string;
    contentId: string;
    reason: string;
    description?: string;
  }) {
    return this.request<any>('/moderation/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getModerationReports(options?: { status?: string; contentType?: string }) {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.contentType) params.append('contentType', options.contentType);
    const query = params.toString();
    return this.request<any[]>(`/moderation${query ? `?${query}` : ''}`);
  }

  async takeModerationAction(reportId: string, data: {
    actionType: string;
    reason: string;
    durationDays?: number;
    notes?: string;
  }) {
    return this.request<any>(`/moderation/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Moderation Reports update and delete methods
  async updateModerationReport(id: string, data: any) {
    return this.request<any>(`/moderation/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteModerationReport(id: string) {
    return this.request<any>(`/moderation/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalytics(options?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const query = params.toString();
    return this.request<any>(`/analytics${query ? `?${query}` : ''}`);
  }

  async getProductAnalytics() {
    return this.request<any[]>('/analytics/products');
  }

  // Analytics update and delete methods
  async updateAnalytics(id: string, data: any) {
    return this.request<any>(`/analytics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnalytics(id: string) {
    return this.request<any>(`/analytics/${id}`, {
      method: 'DELETE',
    });
  }

  // Email Templates (admin)
  async getEmailTemplates(category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.request<any[]>(`/email-templates${params}`);
  }

  async getEmailTemplate(name: string) {
    return this.request<any>(`/email-templates/${name}`);
  }

  async renderEmailTemplate(name: string, variables: any) {
    return this.request<{ subject: string; bodyHtml: string; bodyText?: string }>(`/email-templates/${name}/render`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    });
  }

  // Email Templates update and delete methods
  async updateEmailTemplate(name: string, data: any) {
    return this.request<any>(`/email-templates/${name}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmailTemplate(name: string) {
    return this.request<any>(`/email-templates/${name}`, {
      method: 'DELETE',
    });
  }

  // Dashboard Stats - Role-based
  async getDashboardStats(role: string) {
    return this.request<any>(`/dashboard/stats/${role}`);
  }

  // Dashboard Stats update and delete methods
  async updateDashboardStats(role: string, data: any) {
    return this.request<any>(`/dashboard/stats/${role}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDashboardStats(role: string) {
    return this.request<any>(`/dashboard/stats/${role}`, {
      method: 'DELETE',
    });
  }

  // Freelancer-specific endpoints
  async getFreelancerProjects() {
    return this.request<any[]>('/freelancer/projects');
  }

  async getFreelancerProposals() {
    return this.request<any[]>('/freelancer/proposals');
  }

  async getFreelancerClients() {
    return this.request<any[]>('/freelancer/clients');
  }

  async getFreelancerInvoices() {
    return this.request<any[]>('/freelancer/invoices');
  }

  async getFreelancerServices() {
    return this.request<any[]>('/freelancer/services');
  }

  async createFreelancerProject(data: any) {
    return this.request<any>('/freelancer/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createFreelancerProposal(data: any) {
    return this.request<any>('/freelancer/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createFreelancerClient(data: any) {
    return this.request<any>('/freelancer/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createFreelancerService(data: any) {
    return this.request<any>('/freelancer/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Freelancer update and delete methods
  async updateFreelancerProject(id: string, data: any) {
    return this.request<any>(`/freelancer/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFreelancerProject(id: string) {
    return this.request<any>(`/freelancer/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async updateFreelancerProposal(id: string, data: any) {
    return this.request<any>(`/freelancer/proposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFreelancerProposal(id: string) {
    return this.request<any>(`/freelancer/proposals/${id}`, {
      method: 'DELETE',
    });
  }

  async updateFreelancerClient(id: string, data: any) {
    return this.request<any>(`/freelancer/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFreelancerClient(id: string) {
    return this.request<any>(`/freelancer/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async updateFreelancerService(id: string, data: any) {
    return this.request<any>(`/freelancer/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFreelancerService(id: string) {
    return this.request<any>(`/freelancer/services/${id}`, {
      method: 'DELETE',
    });
  }

  async createFreelancerInvoice(data: any) {
    return this.request<any>('/freelancer/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFreelancerInvoice(id: string, data: any) {
    return this.request<any>(`/freelancer/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFreelancerInvoice(id: string) {
    return this.request<any>(`/freelancer/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async createFreelancerTimeEntry(data: any) {
    return this.request<any>('/freelancer/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFreelancerTimeEntry(id: string, data: any) {
    return this.request<any>(`/freelancer/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFreelancerTimeEntry(id: string) {
    return this.request<any>(`/freelancer/time-entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Lodging Properties
  async getLodgingProperties(filters?: { location?: string; propertyType?: string }) {
    const params = new URLSearchParams();
    if (filters?.location) params.append('location', filters.location);
    if (filters?.propertyType) params.append('propertyType', filters.propertyType);
    
    const query = params.toString();
    return this.request<any[]>(`/lodging${query ? `?${query}` : ''}`);
  }

  async getLodgingProperty(id: string) {
    return this.request<any>(`/lodging/${id}`);
  }

  async createLodgingProperty(data: FormData) {
    return this.request<any>('/lodging', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateLodgingProperty(id: string, data: FormData) {
    return this.request<any>(`/lodging/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteLodgingProperty(id: string) {
    return this.request<any>(`/lodging/${id}`, {
      method: 'DELETE',
    });
  }

  // Lodging Rooms
  async getLodgingRooms(propertyId: string) {
    return this.request<any[]>(`/lodging/${propertyId}/rooms`);
  }

  async getLodgingRoom(id: string) {
    return this.request<any>(`/lodging/rooms/${id}`);
  }

  async createLodgingRoom(propertyId: string, data: FormData) {
    return this.request<any>(`/lodging/${propertyId}/rooms`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateLodgingRoom(id: string, data: FormData) {
    return this.request<any>(`/lodging/rooms/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteLodgingRoom(id: string) {
    return this.request<any>(`/lodging/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  // Lodging Bookings
  async getLodgingBookings(filters?: { propertyId?: string; roomId?: string; guestId?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.propertyId) params.append('propertyId', filters.propertyId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.guestId) params.append('guestId', filters.guestId);
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/lodging/bookings${query ? `?${query}` : ''}`);
  }

  async getLodgingBooking(id: string) {
    return this.request<any>(`/lodging/bookings/${id}`);
  }

  async createLodgingBooking(data: { propertyId: string; roomId: string; checkInDate: string; checkOutDate: string }) {
    return this.request<any>('/lodging/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLodgingBooking(id: string, data: any) {
    return this.request<any>(`/lodging/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLodgingBooking(id: string) {
    return this.request<any>(`/lodging/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  async confirmLodgingBooking(id: string) {
    return this.request<any>(`/lodging/bookings/${id}/confirm`, {
      method: 'POST',
    });
  }

  async cancelLodgingBooking(id: string) {
    return this.request<any>(`/lodging/bookings/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Restaurant Listings
  async getRestaurants(filters?: { location?: string; cuisineType?: string }) {
    const params = new URLSearchParams();
    if (filters?.location) params.append('location', filters.location);
    if (filters?.cuisineType) params.append('cuisineType', filters.cuisineType);
    
    const query = params.toString();
    return this.request<any[]>(`/restaurants${query ? `?${query}` : ''}`);
  }

  async getRestaurant(id: string) {
    return this.request<any>(`/restaurants/${id}`);
  }

  async createRestaurant(data: FormData) {
    return this.request<any>('/restaurants', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateRestaurant(id: string, data: FormData) {
    return this.request<any>(`/restaurants/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteRestaurant(id: string) {
    return this.request<any>(`/restaurants/${id}`, {
      method: 'DELETE',
    });
  }

  // Menu Items
  async getMenuItems(restaurantId: string) {
    return this.request<any[]>(`/restaurants/${restaurantId}/menu-items`);
  }

  async getMenuItem(id: string) {
    return this.request<any>(`/restaurants/menu-items/${id}`);
  }

  async createMenuItem(restaurantId: string, data: FormData) {
    return this.request<any>(`/restaurants/${restaurantId}/menu-items`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateMenuItem(id: string, data: FormData) {
    return this.request<any>(`/restaurants/menu-items/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteMenuItem(id: string) {
    return this.request<any>(`/restaurants/menu-items/${id}`, {
      method: 'DELETE',
    });
  }

  // Restaurant Reservations
  async getRestaurantReservations(filters?: { restaurantId?: string; guestId?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.restaurantId) params.append('restaurantId', filters.restaurantId);
    if (filters?.guestId) params.append('guestId', filters.guestId);
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return this.request<any[]>(`/restaurants/reservations${query ? `?${query}` : ''}`);
  }

  async getRestaurantReservation(id: string) {
    return this.request<any>(`/restaurants/reservations/${id}`);
  }

  async createRestaurantReservation(data: { restaurantId: string; reservationDate: string; partySize: number; notes?: string }) {
    return this.request<any>('/restaurants/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRestaurantReservation(id: string, data: any) {
    return this.request<any>(`/restaurants/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRestaurantReservation(id: string) {
    return this.request<any>(`/restaurants/reservations/${id}`, {
      method: 'DELETE',
    });
  }

  async confirmRestaurantReservation(id: string) {
    return this.request<any>(`/restaurants/reservations/${id}/confirm`, {
      method: 'POST',
    });
  }

  async cancelRestaurantReservation(id: string) {
    return this.request<any>(`/restaurants/reservations/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Services (generic services marketplace)
  async getServices(filters?: { category?: string; location?: string; serviceType?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.serviceType) params.append('serviceType', filters.serviceType);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    return this.request<any[]>(`/services${query ? `?${query}` : ''}`);
  }

  // Revenue Summary (Admin)
  async getRevenueSummary(options?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    
    const query = params.toString();
    return this.request<any>(`/revenue/summary${query ? `?${query}` : ''}`);
  }

  // Music tracks
  async getTracks(filters?: { genre?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.genre) params.append('genre', filters.genre);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    return this.request<any[]>(`/music${query ? `?${query}` : ''}`);
  }

  async getTrack(id: string) {
    return this.request<any>(`/music/${id}`);
  }

  async createTrack(data: FormData) {
    return this.request<any>('/music', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async updateTrack(id: string, data: FormData) {
    return this.request<any>(`/music/${id}`, {
      method: 'PUT',
      body: data,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  async deleteTrack(id: string) {
    return this.request<any>(`/music/${id}`, {
      method: 'DELETE',
    });
  }

  async getMyTracks() {
    return this.request<any[]>('/music/my/tracks');
  }

  async getMyTrackStats() {
    return this.request<any>('/music/my/stats');
  }

  // Password Reset
  async forgotPassword(email: string) {
    return this.request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);