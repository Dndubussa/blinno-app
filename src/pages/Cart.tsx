import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatPrice as formatCurrency } from "@/lib/currency";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ShoppingCart, Plus, Minus, X, MapPin, User, Phone, ShoppingBag, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  title: string;
  price: number;
  image_url: string | null;
  stock_quantity: number | null;
};

const Cart = () => {
  const { user, profile } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    street: "",
    city: "",
    postalCode: "",
    country: "United States",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchCartItems();
    // Load user phone from profile if available
    if (profile?.phone) {
      setCustomerPhone(profile.phone);
    }
  }, [user, navigate, profile]);

  const fetchCartItems = async () => {
    if (!user) return;
    try {
      const items = await api.getCart();
      setCartItems(items || []);
    } catch (error: any) {
      console.error("Error fetching cart items:", error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    setUpdating(itemId);
    try {
      await api.updateCartItem(itemId, newQuantity);
      await fetchCartItems();
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await api.removeFromCart(itemId);
      await fetchCartItems();
      toast({
        title: "Item removed",
        description: "Item removed from cart",
      });
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + parseFloat(item.price.toString()) * item.quantity;
    }, 0);
  };

  const formatPrice = (price: number) => {
    return formatCurrency(price, 'USD'); // Default to USD
  };

  const handleCheckout = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!shippingAddress.street || !shippingAddress.city) {
      toast({
        title: "Shipping address required",
        description: "Please provide your shipping address",
        variant: "destructive",
      });
      return;
    }

    setCheckingOut(true);
    try {
      // Create order
      const order = await api.checkout({
        shippingAddress,
        notes: "",
      });

      setCurrentOrder(order);
      setShowPaymentDialog(true);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to process checkout",
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePayment = async () => {
    if (!currentOrder || !customerPhone) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number for payment",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number (generic international format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = customerPhone.replace(/\s+/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setPaymentProcessing(true);
    try {
      const paymentResult = await api.createPayment({
        orderId: currentOrder.id,
        customerPhone: cleanPhone,
        customerEmail: user?.email,
        customerName: profile?.display_name || user?.email,
      });

      if (paymentResult.success && paymentResult.checkoutUrl) {
        // Redirect to Click Pesa checkout
        window.location.href = paymentResult.checkoutUrl;
      } else {
        throw new Error(paymentResult.message || "Failed to create payment");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground">
              {cartItems.length === 0
                ? "Your cart is empty"
                : `${cartItems.length} item${cartItems.length > 1 ? "s" : ""} in your cart`}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Your cart is empty</p>
                    <Button onClick={() => navigate("/marketplace")}>
                      Browse Marketplace
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                cartItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={item.image_url || "https://via.placeholder.com/150?text=No+Image"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=No+Image";
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                          <div className="text-muted-foreground text-sm mb-2">
                            <MultiCurrencyPrice 
                              usdPrice={parseFloat(item.price.toString())} 
                              size="sm"
                            />
                            <span className="text-xs"> each</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={updating === item.id}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={updating === item.id || (item.stock_quantity !== null && item.quantity >= item.stock_quantity)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="font-bold">
                              <MultiCurrencyPrice 
                                usdPrice={parseFloat(item.price.toString()) * item.quantity} 
                                size="sm"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              disabled={updating === item.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Checkout Summary */}
            {cartItems.length > 0 && (
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                    <CardDescription>Review your order details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <MultiCurrencyPrice usdPrice={calculateTotal()} size="sm" />
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <MultiCurrencyPrice usdPrice={calculateTotal()} size="md" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          value={shippingAddress.street}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, street: e.target.value })
                          }
                          placeholder="Enter street address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, city: e.target.value })
                            }
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={shippingAddress.postalCode}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                            }
                            placeholder="Postal Code"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={shippingAddress.country}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, country: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={checkingOut || !shippingAddress.street || !shippingAddress.city}
                    >
                      {checkingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Enter your phone number to proceed with Click Pesa payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentOrder && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Order Total:</span>
                  <div className="font-bold text-lg">
                    <MultiCurrencyPrice usdPrice={parseFloat(currentOrder.total_amount)} size="lg" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Order ID: {currentOrder.id.slice(0, 8)}...</p>
              </div>
            )}
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (XXX) XXX-XXXX or XXX-XXX-XXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your mobile money number (M-Pesa, Tigo Pesa, Airtel Money, etc.)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentDialog(false);
                  setCurrentOrder(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={paymentProcessing || !customerPhone}
                className="flex-1"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay with Click Pesa
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              You will be redirected to Click Pesa to complete your payment securely
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Cart;
