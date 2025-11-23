const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://www.blinno.app/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // For 401 errors, try to get error message, but don't log as critical
      if (response.status === 401) {
        const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
        const errorObj = new Error(error.error || 'Unauthorized');
        (errorObj as any).status = 401;
        throw errorObj;
      }
      
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; password: string; displayName: string; role?: string }) {
    const result = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.token);
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async getCurrentUser() {
    // If no token, don't make the request - return null immediately
    if (!this.token) {
      return null;
    }
    
    try {
      return await this.request<any>('/auth/me');
    } catch (error: any) {
      // 401 is expected when user is not logged in or token is invalid - don't throw
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        // Clear invalid token
        this.setToken(null);
        return null;
      }
      throw error;
    }
  }

  logout() {
    this.setToken(null);
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

  async subscribeToTier(tier: string) {
    return this.request<any>('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ tier }),
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

  // Payouts
  async requestPayout(data: {
    amount: number;
    paymentMethodId: string;
  }) {
    return this.request<any>('/revenue/request-payout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyPayouts() {
    return this.request<any[]>('/revenue/my-payouts');
  }

  async getEarnings() {
    return this.request<any>('/revenue/earnings');
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

  async getUnreadCount() {
    return this.request<{ count: number }>('/messages/unread/count');
  }

  // Bookings
  async getBookings(type?: 'user' | 'creator') {
    const params = type ? `?type=${type}` : '';
    return this.request<any[]>(`/bookings${params}`);
  }

  // General booking endpoint
  async createBooking(data: {
    creatorId: string;
    serviceType: string;
    startDate: string;
    totalAmount: number;
    notes?: string;
  }) {
    return this.request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBooking(id: string) {
    return this.request<any>(`/bookings/${id}`);
  }

  async updateBookingStatus(bookingId: string, status: string) {
    return this.request<any>(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteBooking(id: string) {
    return this.request<any>(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  async createBookingPayment(bookingId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Digital Products
  async getDigitalProducts(filters?: { creatorId?: string; category?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.creatorId) params.append('creatorId', filters.creatorId);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    return this.request<any[]>(`/digital-products${query ? `?${query}` : ''}`);
  }

  async getDigitalProduct(id: string) {
    return this.request<any>(`/digital-products/${id}`);
  }

  async purchaseDigitalProduct(productId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/digital-products/${productId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Digital Products update and delete methods
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

  async getMyPurchases() {
    return this.request<any[]>('/digital-products/my/purchases');
  }

  // Tips
  async sendTip(data: {
    creatorId: string;
    amount: number;
    message?: string;
    isAnonymous?: boolean;
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; tipId: string; checkoutUrl: string; message: string }>('/tips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReceivedTips() {
    return this.request<any[]>('/tips/received');
  }

  async getSentTips() {
    return this.request<any[]>('/tips/sent');
  }

  // Tips update and delete methods
  async updateTip(id: string, data: any) {
    return this.request<any>(`/tips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTip(id: string) {
    return this.request<any>(`/tips/${id}`, {
      method: 'DELETE',
    });
  }

  // Commissions
  async getMyCommissions() {
    return this.request<any[]>('/commissions/my-commissions');
  }

  async getMyCommissionRequests() {
    return this.request<any[]>('/commissions/my-requests');
  }

  async createCommission(data: {
    creatorId: string;
    title: string;
    description?: string;
    budget: number;
    deadline?: string;
    requirements?: string;
  }) {
    return this.request<any>('/commissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCommissionStatus(commissionId: string, status: string) {
    return this.request<any>(`/commissions/${commissionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Commissions update and delete methods
  async updateCommission(id: string, data: any) {
    return this.request<any>(`/commissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCommission(id: string) {
    return this.request<any>(`/commissions/${id}`, {
      method: 'DELETE',
    });
  }

  async payCommission(commissionId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/commissions/${commissionId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Performance Bookings
  async getMyPerformanceBookings() {
    return this.request<any[]>('/performance-bookings/my-bookings');
  }

  async getMyPerformanceRequests() {
    return this.request<any[]>('/performance-bookings/my-requests');
  }

  async createPerformanceBooking(data: {
    performerId: string;
    performanceType: string;
    eventName?: string;
    venue?: string;
    performanceDate: string;
    durationHours?: number;
    fee: number;
    requirements?: string;
    notes?: string;
  }) {
    return this.request<any>('/performance-bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePerformanceBookingStatus(bookingId: string, status: string) {
    return this.request<any>(`/performance-bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Performance Bookings update and delete methods
  async updatePerformanceBooking(id: string, data: any) {
    return this.request<any>(`/performance-bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePerformanceBooking(id: string) {
    return this.request<any>(`/performance-bookings/${id}`, {
      method: 'DELETE',
    });
  }

  async payPerformanceBooking(bookingId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/performance-bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Featured Listings
  async createFeaturedListingPayment(listingId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/featured/${listingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Lodging
  async createLodgingBooking(data: {
    propertyId: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
  }) {
    return this.request<any>('/lodging/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payLodgingBooking(bookingId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/lodging/bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Lodging booking - NEW
  async createLodgingReservation(data: {
    propertyId: string;
    roomId: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    specialRequests?: string;
  }) {
    return this.request<any>('/lodging/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Lodging reservation payment
  async payLodgingReservation(bookingId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/lodging/bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Lodging Bookings update and delete methods
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

  // Lodging-specific endpoints
  async getLodgingProperties() {
    return this.request<any[]>('/lodging/properties');
  }

  async getLodgingRooms(propertyId?: string) {
    const query = propertyId ? `?propertyId=${propertyId}` : '';
    return this.request<any[]>(`/lodging/rooms${query}`);
  }

  async getLodgingBookings() {
    return this.request<any[]>('/lodging/bookings');
  }

  async createLodgingProperty(data: any) {
    return this.request<any>('/lodging/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createLodgingRoom(data: any) {
    return this.request<any>('/lodging/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLodgingBookingStatus(bookingId: string, status: string) {
    return this.request<any>(`/lodging/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Lodging update and delete methods
  async updateLodgingProperty(id: string, data: any) {
    return this.request<any>(`/lodging/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLodgingProperty(id: string) {
    return this.request<any>(`/lodging/properties/${id}`, {
      method: 'DELETE',
    });
  }

  async updateLodgingRoom(id: string, data: any) {
    return this.request<any>(`/lodging/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLodgingRoom(id: string) {
    return this.request<any>(`/lodging/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  // Restaurants
  async createRestaurantOrder(data: {
    restaurantId: string;
    items: Array<{ menuItemId: string; quantity: number }>;
  }) {
    return this.request<any>('/restaurants/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payRestaurantOrder(orderId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/restaurants/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Restaurant-specific endpoints
  async getRestaurants() {
    return this.request<any[]>('/restaurants');
  }

  async getMenuItems() {
    return this.request<any[]>('/restaurants/menu-items');
  }

  async getRestaurantReservations() {
    return this.request<any[]>('/restaurants/reservations');
  }

  async createRestaurant(data: any) {
    return this.request<any>('/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createMenuItem(data: any) {
    return this.request<any>('/restaurants/menu-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRestaurantReservationStatus(reservationId: string, status: string) {
    return this.request<any>(`/restaurants/reservations/${reservationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Restaurant reservations - NEW
  async createRestaurantReservation(data: {
    restaurantId: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    reservationDate: string;
    reservationTime: string;
    numberOfGuests: number;
    specialRequests?: string;
  }) {
    return this.request<any>('/restaurants/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Restaurant reservation payment
  async payRestaurantReservation(reservationId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/restaurants/reservations/${reservationId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Restaurant update and delete methods
  async updateRestaurant(id: string, data: any) {
    return this.request<any>(`/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRestaurant(id: string) {
    return this.request<any>(`/restaurants/${id}`, {
      method: 'DELETE',
    });
  }

  async updateMenuItem(id: string, data: any) {
    return this.request<any>(`/restaurants/menu-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMenuItem(id: string) {
    return this.request<any>(`/restaurants/menu-items/${id}`, {
      method: 'DELETE',
    });
  }

  // Financial Tracking
  async getFinancialSummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const query = params.toString();
    return this.request<any>(`/financial/summary${query ? `?${query}` : ''}`);
  }

  async getBalance() {
    return this.request<any>('/financial/balance');
  }

  async getTransactions(options?: {
    limit?: number;
    offset?: number;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.transactionType) params.append('transactionType', options.transactionType);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    
    const query = params.toString();
    return this.request<{ transactions: any[]; total: number }>(`/financial/transactions${query ? `?${query}` : ''}`);
  }

  async getFinancialReport(period?: 'week' | 'month' | 'year', startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const query = params.toString();
    return this.request<any>(`/financial/report${query ? `?${query}` : ''}`);
  }

  // Financial update and delete methods
  async updateFinancial(id: string, data: any) {
    return this.request<any>(`/financial/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFinancial(id: string) {
    return this.request<any>(`/financial/${id}`, {
      method: 'DELETE',
    });
  }

  async exportTransactions(startDate?: string, endDate?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const query = params.toString();
    const response = await fetch(`${this.baseUrl}/financial/transactions/export${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to export transactions');
    }
    
    return response.blob();
  }

  // Reviews
  async getCreatorReviews(creatorId: string, options?: { limit?: number; offset?: number; sort?: string }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.sort) params.append('sort', options.sort);
    
    const query = params.toString();
    return this.request<{ reviews: any[]; stats: any }>(`/reviews/creator/${creatorId}${query ? `?${query}` : ''}`);
  }

  async submitReview(data: {
    creatorId: string;
    bookingId?: string;
    productId?: string;
    rating: number;
    comment?: string;
  }) {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyReviews() {
    return this.request<any[]>('/reviews/my-reviews');
  }

  async updateReview(reviewId: string, data: { rating?: number; comment?: string }) {
    return this.request<any>(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReview(reviewId: string) {
    return this.request<any>(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  // Notifications
  async getNotifications(options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    
    const query = params.toString();
    return this.request<{ notifications: any[]; unreadCount: number }>(`/notifications${query ? `?${query}` : ''}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Notifications update and delete methods
  async updateNotification(notificationId: string, data: any) {
    return this.request<any>(`/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getNotificationPreferences() {
    return this.request<any>('/notifications/preferences');
  }

  // Users update and delete methods
  async updateUser(userId: string, data: any) {
    return this.request<any>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string) {
    return this.request<any>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateNotificationPreferences(data: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    push_enabled?: boolean;
    in_app_enabled?: boolean;
    preferences?: any;
  }) {
    return this.request<any>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Orders
  async getOrders(options?: { status?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const query = params.toString();
    return this.request<any[]>(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrderDetails(orderId: string) {
    return this.request<any>(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, data: {
    status: string;
    trackingNumber?: string;
    shippingCarrier?: string;
    estimatedDeliveryDate?: string;
    notes?: string;
  }) {
    return this.request<any>(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Orders update and delete methods
  async updateOrder(orderId: string, data: any) {
    return this.request<any>(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOrder(orderId: string) {
    return this.request<any>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  async cancelOrder(orderId: string, reason?: string) {
    return this.request<any>(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async confirmDelivery(orderId: string) {
    return this.request<any>(`/orders/${orderId}/confirm-delivery`, {
      method: 'POST',
    });
  }

  async getShippingAddresses() {
    return this.request<any[]>('/orders/shipping-addresses');
  }

  async createShippingAddress(data: {
    label?: string;
    recipient_name: string;
    phone: string;
    street: string;
    city: string;
    region?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean;
  }) {
    return this.request<any>('/orders/shipping-addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Refunds
  async requestRefund(data: {
    orderId: string;
    reason: string;
    amount?: number;
    items?: Array<{ orderItemId: string; quantity: number }>;
  }) {
    return this.request<any>('/refunds/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyRefunds() {
    return this.request<any[]>('/refunds/my-refunds');
  }

  async getCreatorRefunds() {
    return this.request<any[]>('/refunds/creator-refunds');
  }

  async approveRefund(refundId: string, notes?: string) {
    return this.request<any>(`/refunds/${refundId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async rejectRefund(refundId: string, reason: string) {
    return this.request<any>(`/refunds/${refundId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getRefundPolicy(creatorId?: string) {
    const params = creatorId ? `?creatorId=${creatorId}` : '';
    return this.request<any>(`/refunds/policy${params}`);
  }

  // Refunds (Admin)
  async getRefunds(options?: { status?: string; creatorId?: string }) {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.creatorId) params.append('creatorId', options.creatorId);
    
    const query = params.toString();
    return this.request<any[]>(`/refunds${query ? `?${query}` : ''}`);
  }

  async processRefund(refundId: string, data: { notes?: string; paymentReference?: string }) {
    return this.request<any>(`/refunds/${refundId}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeRefund(refundId: string, data: { notes?: string; paymentReference?: string }) {
    return this.request<any>(`/refunds/${refundId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Disputes
  async createDispute(data: {
    orderId?: string;
    bookingId?: string;
    paymentId?: string;
    disputeType: string;
    respondentId: string;
    title: string;
    description: string;
  }) {
    return this.request<any>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyDisputes(options?: { status?: string; type?: string }) {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.type) params.append('type', options.type);
    
    const query = params.toString();
    return this.request<any[]>(`/disputes/my-disputes${query ? `?${query}` : ''}`);
  }

  async getDispute(disputeId: string) {
    return this.request<any>(`/disputes/${disputeId}`);
  }

  async addDisputeEvidence(disputeId: string, data: {
    fileUrl: string;
    fileType?: string;
    description?: string;
  }) {
    return this.request<any>(`/disputes/${disputeId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addDisputeMessage(disputeId: string, data: {
    message: string;
    isInternal?: boolean;
  }) {
    return this.request<any>(`/disputes/${disputeId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Social Features
  async followUser(userId: string) {
    return this.request<any>(`/social/follow/${userId}`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string) {
    return this.request<any>(`/social/unfollow/${userId}`, {
      method: 'POST',
    });
  }

  async getFollowers(userId: string, options?: { limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString();
    return this.request<any[]>(`/social/followers/${userId}${query ? `?${query}` : ''}`);
  }

  async getFollowing(userId: string, options?: { limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString();
    return this.request<any[]>(`/social/following/${userId}${query ? `?${query}` : ''}`);
  }

  async isFollowing(userId: string) {
    return this.request<{ isFollowing: boolean }>(`/social/is-following/${userId}`);
  }

  async getSocialStats(userId: string) {
    return this.request<{ followers: number; following: number }>(`/social/stats/${userId}`);
  }

  async createSocialPost(data: {
    content: string;
    mediaUrls?: string[];
    postType?: string;
    portfolioId?: string;
  }) {
    return this.request<any>('/social/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSocialFeed(options?: { limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString();
    return this.request<any[]>(`/social/feed${query ? `?${query}` : ''}`);
  }

  async likePost(postId: string) {
    return this.request<{ liked: boolean }>(`/social/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async commentOnPost(postId: string, data: {
    content: string;
    parentCommentId?: string;
  }) {
    return this.request<any>(`/social/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPostComments(postId: string, options?: { limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString();
    return this.request<any[]>(`/social/posts/${postId}/comments${query ? `?${query}` : ''}`);
  }

  // Wishlist
  async getWishlists() {
    return this.request<any[]>('/wishlist');
  }

  async createWishlist(data: {
    name: string;
    isPublic?: boolean;
  }) {
    return this.request<any>('/wishlist', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addWishlistItem(wishlistId: string, data: {
    itemType: string;
    itemId: string;
    notes?: string;
  }) {
    return this.request<any>(`/wishlist/${wishlistId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeWishlistItem(wishlistId: string, itemId: string, options?: { itemType: string }) {
    const params = new URLSearchParams();
    if (options?.itemType) params.append('itemType', options.itemType);
    const query = params.toString();
    return this.request<any>(`/wishlist/${wishlistId}/items/${itemId}${query ? `?${query}` : ''}`, {
      method: 'DELETE',
    });
  }

  async getWishlistItems(wishlistId: string) {
    return this.request<any[]>(`/wishlist/${wishlistId}/items`);
  }

  async checkWishlist(itemType: string, itemId: string) {
    return this.request<{ inWishlist: boolean; wishlist: any }>(`/wishlist/check/${itemType}/${itemId}`);
  }

  // 2FA
  async get2FAStatus() {
    return this.request<{ isEnabled: boolean }>('/2fa/status');
  }

  async setup2FA() {
    return this.request<{ secret: string; qrCode: string; manualEntryKey: string }>('/2fa/setup', {
      method: 'POST',
    });
  }

  async verify2FA(token: string) {
    return this.request<{ success: boolean; backupCodes?: string[] }>('/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getBackupCodes() {
    return this.request<{ backupCodes: string[] }>('/2fa/backup-codes');
  }

  // 2FA methods
  async disable2FA(password: string) {
    return this.request<any>('/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async update2FA(data: any) {
    return this.request<any>('/2fa/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete2FA() {
    return this.request<any>('/2fa/delete', {
      method: 'DELETE',
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

  // Artisan-specific endpoints
  async getArtisanServices() {
    return this.request<any[]>('/artisan/services');
  }

  async getArtisanBookings() {
    return this.request<any[]>('/artisan/bookings');
  }

  async createArtisanService(data: any) {
    return this.request<any>('/artisan/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteArtisanService(id: string) {
    return this.request<any>(`/artisan/services/${id}`, {
      method: 'DELETE',
    });
  }

  async updateArtisanBookingStatus(bookingId: string, status: string) {
    return this.request<any>(`/artisan/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateArtisanService(id: string, data: any) {
    return this.request<any>(`/artisan/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Artisan service booking - NEW
  async createArtisanBooking(data: {
    serviceId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    bookingDate: string;
    startTime: string;
    endTime?: string;
    notes?: string;
  }) {
    return this.request<any>('/artisan/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Artisan service booking payment
  async payArtisanBooking(bookingId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/artisan/bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Educator-specific endpoints
  async getCourses() {
    return this.request<any[]>('/education/courses');
  }

  async getCourseEnrollments() {
    return this.request<any[]>('/education/enrollments');
  }

  async getLessons(courseId?: string) {
    const url = courseId ? `/education/lessons?courseId=${courseId}` : '/education/lessons';
    return this.request<any[]>(url);
  }

  async createCourse(data: any) {
    return this.request<any>('/education/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createLesson(data: any) {
    return this.request<any>('/education/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourseEnrollmentStatus(enrollmentId: string, status: string) {
    return this.request<any>(`/education/enrollments/${enrollmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Educator update and delete methods
  async updateCourse(id: string, data: any) {
    return this.request<any>(`/education/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(id: string) {
    return this.request<any>(`/education/courses/${id}`, {
      method: 'DELETE',
    });
  }

  async updateLesson(id: string, data: any) {
    return this.request<any>(`/education/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLesson(id: string) {
    return this.request<any>(`/education/lessons/${id}`, {
      method: 'DELETE',
    });
  }

  // Event Organizer-specific endpoints
  async getOrganizedEvents() {
    return this.request<any[]>('/events/organized');
  }

  async getEventRegistrations() {
    return this.request<any[]>('/events/registrations');
  }

  async createOrganizedEvent(data: any) {
    return this.request<any>('/events/organized', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganizedEvent(id: string) {
    return this.request<any>(`/events/organized/${id}`, {
      method: 'DELETE',
    });
  }

  async updateEventRegistrationStatus(registrationId: string, status: string) {
    return this.request<any>(`/events/registrations/${registrationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateOrganizedEventStatus(eventId: string, status: string) {
    return this.request<any>(`/events/organized/${eventId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Event registration - NEW
  async registerForEvent(data: {
    eventId: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    numberOfTickets: number;
    specialRequests?: string;
  }) {
    return this.request<any>('/events/registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Event registration payment
  async payEventRegistration(registrationId: string, data: {
    customerPhone: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.request<{ success: boolean; paymentId: string; checkoutUrl: string; message: string }>(`/events/registrations/${registrationId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Event organizer update method
  async updateOrganizedEvent(id: string, data: any) {
    return this.request<any>(`/events/organized/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Employer-specific endpoints
  async getJobPostings() {
    return this.request<any[]>('/jobs/postings');
  }

  async getJobApplications() {
    return this.request<any[]>('/jobs/applications');
  }

  async createJobPosting(data: any) {
    return this.request<any>('/jobs/postings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteJobPosting(id: string) {
    return this.request<any>(`/jobs/postings/${id}`, {
      method: 'DELETE',
    });
  }

  async updateJobApplicationStatus(applicationId: string, status: string) {
    return this.request<any>(`/jobs/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateJobPosting(id: string, data: any) {
    return this.request<any>(`/jobs/postings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // News Articles (Admin)
  async createNewsArticle(data: any) {
    return this.request<any>('/news/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNewsArticles(filters?: { category?: string; authorId?: string; startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.authorId) params.append('authorId', filters.authorId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const query = params.toString();
    return this.request<any[]>(`/news/articles${query ? `?${query}` : ''}`);
  }

  async getNewsArticle(id: string) {
    return this.request<any>(`/news/articles/${id}`);
  }

  async deleteNewsArticle(id: string) {
    return this.request<any>(`/news/articles/${id}`, {
      method: 'DELETE',
    });
  }

  async updateNewsArticle(id: string, data: any) {
    return this.request<any>(`/news/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Services
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
}

export const api = new ApiClient(API_BASE_URL);

