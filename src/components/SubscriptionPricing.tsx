import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, Crown, Sparkles, Rocket, Building2, CreditCard, Percent, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AnimatedSection } from "./AnimatedSection";

interface SubscriptionTier {
  name: string;
  monthlyPrice: number;
  features: string[];
  limits: {
    products: number;
    portfolios: number;
  };
}

interface SubscriptionTiers {
  free: SubscriptionTier;
  creator: SubscriptionTier;
  professional: SubscriptionTier;
  enterprise: SubscriptionTier;
}

const tierIcons = {
  free: Sparkles,
  creator: Crown,
  professional: Rocket,
  enterprise: Building2,
};

const tierColors = {
  free: "border-border",
  creator: "border-primary/50",
  professional: "border-primary",
  enterprise: "border-primary border-2",
};

export function SubscriptionPricing() {
  // Safely access auth context
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const profile = authContext?.profile || null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<SubscriptionTiers | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState<any>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [pricingModel, setPricingModel] = useState<"subscription" | "percentage">("subscription");

  useEffect(() => {
    fetchTiers();
    if (user) {
      fetchCurrentSubscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Load user phone from profile if available
    if (profile?.phone) {
      setCustomerPhone(profile.phone);
    }
  }, [profile]);

  const fetchTiers = async () => {
    try {
      const data = await api.getSubscriptionTiers();
      setTiers(data);
    } catch (error: any) {
      console.error("Error fetching tiers:", error);
      // Fallback to default tiers if API fails
      setTiers({
        free: {
          name: 'Free',
          monthlyPrice: 0,
          features: [
            'Basic profile', 
            '5 product listings', 
            'Standard support',
            '8% marketplace fees',
            '6% digital product fees',
            '10% service booking fees',
            '12% commission work fees'
          ],
          limits: { products: 5, portfolios: 3 },
        },
        creator: {
          name: 'Creator',
          monthlyPrice: 15000,
          features: [
            'Unlimited listings', 
            'Advanced analytics', 
            'Priority support', 
            'Featured listings',
            'Reduced 5% subscription fees',
            'Standard transaction fees'
          ],
          limits: { products: -1, portfolios: -1 },
        },
        professional: {
          name: 'Professional',
          monthlyPrice: 40000,
          features: [
            'All Creator features', 
            'Marketing tools', 
            'API access', 
            'Custom branding',
            'Lower 5% subscription fees',
            'Priority transaction processing'
          ],
          limits: { products: -1, portfolios: -1 },
        },
        enterprise: {
          name: 'Enterprise',
          monthlyPrice: 0,
          features: [
            'All Professional features', 
            'Custom integrations', 
            'Dedicated support',
            'Custom fee structure',
            'White-label options',
            'Dedicated account manager'
          ],
          limits: { products: -1, portfolios: -1 },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const subscription = await api.getMySubscription();
      setCurrentSubscription(subscription);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSubscribing(tier);
    try {
      const result = await api.subscribeToTier(tier);
      
      // If payment is required, show payment dialog
      if (result.requiresPayment && result.paymentId) {
        setPendingSubscription(result);
        setShowPaymentDialog(true);
      } else {
        toast({
          title: "Subscription Created",
          description: `You've subscribed to the ${tier} tier!`,
        });
        await fetchCurrentSubscription();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe",
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  const handlePayment = async () => {
    if (!pendingSubscription || !customerPhone) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number for payment",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number (International format)
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    const cleanPhone = customerPhone.replace(/\s+/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid international phone number",
        variant: "destructive",
      });
      return;
    }

    setPaymentProcessing(true);
    try {
      const paymentResult = await api.createSubscriptionPayment({
        paymentId: pendingSubscription.paymentId,
        customerPhone: cleanPhone,
        customerEmail: user?.email,
        customerName: profile?.display_name || user?.email || 'Customer',
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

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Use fallback tiers if API hasn't loaded yet
  const displayTiers = tiers || {
    free: {
      name: 'Free',
      monthlyPrice: 0,
      features: [
        'Basic profile', 
        '5 product listings', 
        'Standard support',
        '8% marketplace fees',
        '6% digital product fees',
        '10% service booking fees',
        '12% commission work fees'
      ],
      limits: { products: 5, portfolios: 3 },
    },
    creator: {
      name: 'Creator',
      monthlyPrice: 15000,
      features: [
        'Unlimited listings', 
        'Advanced analytics', 
        'Priority support', 
        'Featured listings',
        'Reduced 5% subscription fees',
        'Standard transaction fees'
      ],
      limits: { products: -1, portfolios: -1 },
    },
    professional: {
      name: 'Professional',
      monthlyPrice: 40000,
      features: [
        'All Creator features', 
        'Marketing tools', 
        'API access', 
        'Custom branding',
        'Lower 5% subscription fees',
        'Priority transaction processing'
      ],
      limits: { products: -1, portfolios: -1 },
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 0,
      features: [
        'All Professional features', 
        'Custom integrations', 
        'Dedicated support',
        'Custom fee structure',
        'White-label options',
        'Dedicated account manager'
      ],
      limits: { products: -1, portfolios: -1 },
    },
  };

  // Always render the section, show loading state if needed
  // The component will use fallback tiers if API hasn't loaded

  const subscriptionTierList = [
    { key: "free" as const, ...displayTiers.free },
    { key: "creator" as const, ...displayTiers.creator },
    { key: "professional" as const, ...displayTiers.professional },
    { key: "enterprise" as const, ...displayTiers.enterprise },
  ];

  // Define percentage-based pricing options
  const percentageTiers = [
    {
      key: "basic",
      name: "Basic",
      feeRate: "8%",
      monthlyPrice: 0,
      features: [
        "Basic profile",
        "5 product listings",
        "Standard support",
        "8% marketplace fees",
        "6% digital product fees",
        "10% service booking fees",
        "12% commission work fees"
      ],
      limits: { products: 5, portfolios: 3 },
      icon: Sparkles
    },
    {
      key: "premium",
      name: "Premium",
      feeRate: "5%",
      monthlyPrice: 0,
      features: [
        "Unlimited listings",
        "Advanced analytics",
        "Priority support",
        "Featured listings",
        "Reduced 5% marketplace fees",
        "6% digital product fees",
        "8% service booking fees",
        "10% commission work fees"
      ],
      limits: { products: -1, portfolios: -1 },
      icon: Crown
    },
    {
      key: "pro",
      name: "Professional",
      feeRate: "3%",
      monthlyPrice: 0,
      features: [
        "All Premium features",
        "Marketing tools",
        "API access",
        "Custom branding",
        "Reduced 3% marketplace fees",
        "4% digital product fees",
        "6% service booking fees",
        "8% commission work fees"
      ],
      limits: { products: -1, portfolios: -1 },
      icon: Rocket
    }
  ];

  return (
    <>
      <section className="py-16 bg-gradient-to-b from-background to-muted/20" id="subscription-pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Choose Your Pricing Model</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select the pricing model that works best for you. Switch between models at any time.
            </p>
          </div>

          {/* Pricing Model Selector */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-lg border bg-muted p-1">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-all ${
                  pricingModel === "subscription"
                    ? "bg-background shadow"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setPricingModel("subscription")}
              >
                <Calendar className="h-4 w-4" />
                Subscription-Based
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-all ${
                  pricingModel === "percentage"
                    ? "bg-background shadow"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setPricingModel("percentage")}
              >
                <Percent className="h-4 w-4" />
                Percentage-Based
              </button>
            </div>
          </div>

          {/* Subscription-Based Pricing */}
          {pricingModel === "subscription" && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Subscription Plans</h3>
                <p className="text-muted-foreground">
                  Pay a monthly fee for access to features and reduced transaction fees.
                </p>
                <div className="mt-4 p-4 bg-primary/5 rounded-lg max-w-3xl mx-auto">
                  <p className="text-sm text-muted-foreground">
                    <strong>Transaction Fees:</strong> 8% on marketplace sales • 6% on digital products • 
                    10% on service bookings • 12% on commissions • 3% on tips
                    <br />
                    <strong>Payment Processing:</strong> 2.5% + USD 0.30 per transaction (paid by buyer)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {subscriptionTierList.map((tier) => {
                  const Icon = tierIcons[tier.key];
                  const isCurrentTier = currentSubscription?.tier === tier.key;
                  const isPopular = tier.key === "creator";
                  const isEnterprise = tier.key === "enterprise";

                  return (
                    <Card
                      key={tier.key}
                      className={`relative flex flex-col ${
                        isPopular
                          ? "border-primary shadow-lg scale-105"
                          : tierColors[tier.key]
                      } ${isEnterprise ? "lg:col-span-1" : ""}`}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-4 py-1">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-4">
                          <div
                            className={`p-3 rounded-full ${
                              isPopular
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                        </div>
                        <CardTitle className="text-2xl capitalize">{tier.name}</CardTitle>
                        <div className="mt-4">
                          <span className="text-4xl font-bold">
                            {formatPrice(tier.monthlyPrice)}
                          </span>
                          {tier.monthlyPrice > 0 && (
                            <span className="text-muted-foreground">/month</span>
                          )}
                        </div>
                        {isCurrentTier && (
                          <Badge variant="secondary" className="mt-2">
                            Current Plan
                          </Badge>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-3 mb-6 flex-1">
                          {tier.features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                          {tier.limits.products !== -1 && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <span>
                                Up to {tier.limits.products} product listings
                              </span>
                            </div>
                          )}
                          {tier.limits.products === -1 && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <span>Unlimited product listings</span>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          variant={isPopular ? "default" : "outline"}
                          onClick={() => handleSubscribe(tier.key)}
                          disabled={
                            subscribing !== null ||
                            isCurrentTier ||
                            (isEnterprise && !user)
                          }
                        >
                          {subscribing === tier.key ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentTier ? (
                            "Current Plan"
                          ) : isEnterprise ? (
                            "Contact Sales"
                          ) : (
                            tier.monthlyPrice === 0
                              ? "Get Started"
                              : "Subscribe Now"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Percentage-Based Pricing */}
          {pricingModel === "percentage" && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Percentage-Based Plans</h3>
                <p className="text-muted-foreground">
                  Pay only transaction fees based on your sales. No monthly subscription required.
                </p>
                <div className="mt-4 p-4 bg-primary/5 rounded-lg max-w-3xl mx-auto">
                  <p className="text-sm text-muted-foreground">
                    <strong>Payment Processing:</strong> 2.5% + USD 0.30 per transaction (paid by buyer)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {percentageTiers.map((tier) => {
                  const Icon = tier.icon;
                  const isCurrent = currentSubscription?.pricing_model === "percentage" && 
                                   currentSubscription?.percentage_tier === tier.key;

                  return (
                    <Card
                      key={tier.key}
                      className={`relative flex flex-col ${
                        tier.key === "premium" 
                          ? "border-primary shadow-lg" 
                          : "border-border"
                      }`}
                    >
                      {tier.key === "premium" && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-4 py-1">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-4">
                          <div
                            className={`p-3 rounded-full ${
                              tier.key === "premium"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                        </div>
                        <CardTitle className="text-2xl capitalize">{tier.name}</CardTitle>
                        <div className="mt-2">
                          <span className="text-3xl font-bold text-primary">{tier.feeRate}</span>
                          <span className="text-muted-foreground"> transaction fee</span>
                        </div>
                        {isCurrent && (
                          <Badge variant="secondary" className="mt-2">
                            Current Plan
                          </Badge>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-3 mb-6 flex-1">
                          {tier.features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                          {tier.limits.products !== -1 && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <span>
                                Up to {tier.limits.products} product listings
                              </span>
                            </div>
                          )}
                          {tier.limits.products === -1 && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <span>Unlimited product listings</span>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          variant={tier.key === "premium" ? "default" : "outline"}
                          onClick={() => handleSubscribe(`percentage-${tier.key}`)}
                          disabled={subscribing !== null || isCurrent}
                        >
                          {subscribing === `percentage-${tier.key}` ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrent ? (
                            "Current Plan"
                          ) : (
                            "Select Plan"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include secure payment processing via Click Pesa.{" "}
              <a href="/terms" className="text-primary hover:underline">
                View terms and conditions
              </a>
            </p>
          </div>
          
          {/* Get Started Today Button */}
          <div className="mt-12 text-center">
            <a 
              href="/auth?tab=signup" 
              className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
            >
              Get Started Today
            </a>
            <p className="mt-4 text-muted-foreground">Join thousands of creators already monetizing their content</p>
          </div>
        </div>
      </section>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Subscription Payment</DialogTitle>
            <DialogDescription>
              Enter your phone number to proceed with Click Pesa payment for your subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pendingSubscription && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subscription:</span>
                  <span className="font-bold capitalize">{pendingSubscription.tier} Tier</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Monthly Price:</span>
                  <span className="font-bold">{formatPrice(pendingSubscription.monthlyPrice)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-lg">{formatPrice(pendingSubscription.totalAmount)}</span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="sub-phone">Phone Number</Label>
              <Input
                id="sub-phone"
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
                  setPendingSubscription(null);
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
    </>
  );
}