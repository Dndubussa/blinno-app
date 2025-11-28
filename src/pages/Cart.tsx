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
import { useTranslation } from "react-i18next";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

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
  const { t } = useTranslation();
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
      navigate("/signin");
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
        title: t("common.error"),
        description: t("cart.failedToLoad"),
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
        title: t("cart.itemRemoved"),
        description: t("cart.itemRemovedFromCart"),
      });
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast({
        title: t("common.error"),
        description: t("cart.failedToRemove"),
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
      navigate("/signin");
      return;
    }

    if (!shippingAddress.street || !shippingAddress.city) {
      toast({
        title: t("cart.shippingAddressRequired"),
        description: t("cart.provideShippingAddress"),
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
        title: t("cart.checkoutError"),
        description: error.message || t("cart.failedToProcessCheckout"),
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePayment = async () => {
    if (!currentOrder || !customerPhone) {
      toast({
        title: t("cart.phoneRequired"),
        description: t("cart.enterPhoneForPayment"),
        variant: "destructive",
      });
      return;
    }

    // Validate phone number (generic international format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = customerPhone.replace(/\s+/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: t("cart.invalidPhone"),
        description: t("cart.enterValidPhone"),
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
        title: t("cart.paymentError"),
        description: error.message || t("cart.failedToInitiatePayment"),
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
            <h1 className="text-4xl font-bold text-foreground mb-2">{t("cart.title")}</h1>
            <p className="text-muted-foreground">
              {cartItems.length === 0
                ? t("cart.empty")
                : t("cart.itemsInCart", { count: cartItems.length })}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">{t("cart.empty")}</p>
                    <Button onClick={() => navigate("/marketplace")}>
                      {t("cart.browseMarketplace")}
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
                            src={item.image_url || PLACEHOLDER_IMAGE.PRODUCT_THUMB}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE.PRODUCT_THUMB;
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
                    <CardTitle>{t("cart.orderSummary")}</CardTitle>
                    <CardDescription>{t("cart.reviewOrderDetails")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                        <MultiCurrencyPrice usdPrice={calculateTotal()} size="sm" />
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>{t("cart.total")}</span>
                        <MultiCurrencyPrice usdPrice={calculateTotal()} size="md" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="street">{t("cart.streetAddress")}</Label>
                        <Input
                          id="street"
                          value={shippingAddress.street}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, street: e.target.value })
                          }
                          placeholder={t("cart.enterStreetAddress")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">{t("common.city")}</Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, city: e.target.value })
                            }
                            placeholder={t("common.city")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">{t("cart.postalCode")}</Label>
                          <Input
                            id="postalCode"
                            value={shippingAddress.postalCode}
                            onChange={(e) =>
                              setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                            }
                            placeholder={t("cart.postalCode")}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="country">{t("common.country")}</Label>
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
                          {t("cart.processing")}
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          {t("cart.proceedToPayment")}
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
            <DialogTitle>{t("cart.completePayment")}</DialogTitle>
            <DialogDescription>
              {t("cart.enterPhoneForClickPesa")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentOrder && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">{t("cart.orderTotal")}:</span>
                  <div className="font-bold text-lg">
                    <MultiCurrencyPrice usdPrice={parseFloat(currentOrder.total_amount)} size="lg" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t("orders.orderNumber")} {currentOrder.id.slice(0, 8)}...</p>
              </div>
            )}
            <div>
              <Label htmlFor="phone">{t("common.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (XXX) XXX-XXXX or XXX-XXX-XXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("cart.enterMobileMoneyNumber")}
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
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handlePayment}
                disabled={paymentProcessing || !customerPhone}
                className="flex-1"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("cart.processing")}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t("cart.payWithClickPesa")}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {t("cart.redirectToClickPesa")}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Cart;
