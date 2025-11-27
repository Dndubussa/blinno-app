import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Crown, Sparkles, Rocket, TrendingUp, Calendar, Percent, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AnimatedSection } from "./AnimatedSection";
import { Progress } from "@/components/ui/progress";

interface VolumeRequirement {
  salesAmount: number;
  transactionCount: number;
}

interface PercentageTier {
  name: string;
  feeRate: number; // Percentage as decimal (e.g., 0.08 for 8%)
  volumeRequirement?: VolumeRequirement | null;
  features: string[];
  limits: {
    products: number;
    portfolios: number;
  };
}

interface PercentageTiers {
  basic: PercentageTier;
  premium: PercentageTier;
  pro: PercentageTier;
}

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
  basic: Sparkles,
  premium: Crown,
  pro: Rocket,
  free: Sparkles,
  creator: Crown,
  professional: Rocket,
  enterprise: Crown,
};

const tierColors = {
  basic: "border-border",
  premium: "border-primary shadow-lg",
  pro: "border-primary border-2",
  free: "border-border",
  creator: "border-primary shadow-lg",
  professional: "border-primary border-2",
  enterprise: "border-primary border-2",
};

export function SubscriptionPricing() {
  // Safely access auth context
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const profile = authContext?.profile || null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<{ percentage: PercentageTiers; subscription: SubscriptionTiers } | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState<"percentage" | "subscription">("percentage");
  const [volumeStats, setVolumeStats] = useState<{
    currentVolume: { salesAmount: number; transactionCount: number };
    eligibility: Record<string, { eligible: boolean; reason?: string }>;
  } | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState<any>(null);
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    fetchTiers();
    if (user) {
      fetchCurrentSubscription();
      fetchVolumeStats();
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
        percentage: {
          basic: {
            name: 'Basic',
            feeRate: 0.08,
            volumeRequirement: null,
            features: [
              'Basic profile',
              '5 product listings',
              'Standard support',
              '8% marketplace transaction fees',
              '6% digital product fees',
              '10% service booking fees',
              '12% commission work fees',
              '3% tips/donations fees'
            ],
            limits: { products: 5, portfolios: 3 },
          },
          premium: {
            name: 'Premium',
            feeRate: 0.06,
            volumeRequirement: {
              salesAmount: 500,
              transactionCount: 50,
            },
            features: [
              'Unlimited listings',
              'Advanced analytics',
              'Priority support',
              'Featured listings',
              'Reduced 6% marketplace fees',
              '5% digital product fees',
              '8% service booking fees',
              '10% commission work fees',
              '3% tips/donations fees'
            ],
            limits: { products: -1, portfolios: -1 },
          },
          pro: {
            name: 'Professional',
            feeRate: 0.05,
            volumeRequirement: {
              salesAmount: 2000,
              transactionCount: 200,
            },
            features: [
              'All Premium features',
              'Marketing tools',
              'API access',
              'Custom branding',
              'Reduced 5% marketplace fees',
              '4% digital product fees',
              '7% service booking fees',
              '9% commission work fees',
              '3% tips/donations fees'
            ],
            limits: { products: -1, portfolios: -1 },
          },
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

  const fetchVolumeStats = async () => {
    try {
      const stats = await api.getVolumeStats();
      setVolumeStats(stats);
    } catch (error: any) {
      console.error("Error fetching volume stats:", error);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSubscribing(tier);
    try {
      const result = await api.subscribeToTier(tier, pricingModel);
      
      // If payment is required, show payment dialog
      if (result.requiresPayment && result.paymentId) {
        setPendingSubscription(result);
        setShowPaymentDialog(true);
      } else {
        toast({
          title: "Tier Updated",
          description: `You've switched to the ${result.percentage_tier || result.tier || tier} tier!`,
        });
        await fetchCurrentSubscription();
        await fetchVolumeStats();
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update tier";
      const errorData = error.response?.data || {};
      
      toast({
        title: errorData.error || "Error",
        description: errorData.message || errorMessage,
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

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(0)}%`;
  };

  // Use fallback tiers if API hasn't loaded yet
  const displayTiers = tiers || {
    percentage: {
      basic: {
        name: 'Basic',
        feeRate: 0.08,
        volumeRequirement: null,
        features: [
          'Basic profile',
          '5 product listings',
          'Standard support',
          '8% marketplace transaction fees',
          '6% digital product fees',
          '10% service booking fees',
          '12% commission work fees',
          '3% tips/donations fees'
        ],
        limits: { products: 5, portfolios: 3 },
      },
      premium: {
        name: 'Premium',
        feeRate: 0.06,
        volumeRequirement: {
          salesAmount: 500,
          transactionCount: 50,
        },
        features: [
          'Unlimited listings',
          'Advanced analytics',
          'Priority support',
          'Featured listings',
          'Reduced 6% marketplace fees',
          '5% digital product fees',
          '8% service booking fees',
          '10% commission work fees',
          '3% tips/donations fees'
        ],
        limits: { products: -1, portfolios: -1 },
      },
      pro: {
        name: 'Professional',
        feeRate: 0.05,
        volumeRequirement: {
          salesAmount: 2000,
          transactionCount: 200,
        },
        features: [
          'All Premium features',
          'Marketing tools',
          'API access',
          'Custom branding',
          'Reduced 5% marketplace fees',
          '4% digital product fees',
          '7% service booking fees',
          '9% commission work fees',
          '3% tips/donations fees'
        ],
        limits: { products: -1, portfolios: -1 },
      },
    },
    subscription: {
      free: {
        name: 'Free',
        monthlyPrice: 0,
        features: [
          'Basic profile',
          '5 product listings',
          'Standard support',
          '8% marketplace transaction fees',
          '6% digital product fees',
          '10% service booking fees',
          '12% commission work fees',
          '3% tips/donations fees'
        ],
        limits: { products: 5, portfolios: 3 },
      },
      creator: {
        name: 'Creator',
        monthlyPrice: 15,
        features: [
          'Unlimited listings',
          'Advanced analytics',
          'Priority support',
          'Featured listings',
          'Reduced 5% marketplace fees',
          '4% digital product fees',
          '7% service booking fees',
          '9% commission work fees',
          '3% tips/donations fees'
        ],
        limits: { products: -1, portfolios: -1 },
      },
      professional: {
        name: 'Professional',
        monthlyPrice: 40,
        features: [
          'All Creator features',
          'Marketing tools',
          'API access',
          'Custom branding',
          'Reduced 4% marketplace fees',
          '3% digital product fees',
          '6% service booking fees',
          '8% commission work fees',
          '3% tips/donations fees'
        ],
        limits: { products: -1, portfolios: -1 },
      },
      enterprise: {
        name: 'Enterprise',
        monthlyPrice: 100,
        features: [
          'All Professional features',
          'Custom integrations',
          'Dedicated support',
          'Best transaction rates (3% marketplace)',
          'White-label options',
          'Dedicated account manager',
          'Priority feature requests',
          'Custom API access'
        ],
        limits: { products: -1, portfolios: -1 },
      },
    },
  };

  // Convert tiers object to array for rendering based on selected model
  const percentageTierList = pricingModel === 'percentage' && displayTiers?.percentage ? [
    { key: "basic" as const, ...displayTiers.percentage.basic },
    { key: "premium" as const, ...displayTiers.percentage.premium },
    { key: "pro" as const, ...displayTiers.percentage.pro },
  ] : [];

  const subscriptionTierList = pricingModel === 'subscription' && displayTiers?.subscription ? [
    { key: "free" as const, ...displayTiers.subscription.free },
    { key: "creator" as const, ...displayTiers.subscription.creator },
    { key: "professional" as const, ...displayTiers.subscription.professional },
    { key: "enterprise" as const, ...displayTiers.subscription.enterprise },
  ] : [];

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
                  pricingModel === "percentage"
                    ? "bg-background shadow"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setPricingModel("percentage")}
              >
                <Percent className="h-4 w-4" />
                Percentage-Based
              </button>
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
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="mt-4 p-4 bg-primary/5 rounded-lg max-w-3xl mx-auto">
              <p className="text-sm text-muted-foreground">
                <strong>Payment Processing:</strong> 2.5% + USD 0.30 per transaction (paid by buyer)
                <br />
                <strong>Platform Fees:</strong> Vary by tier and transaction type (see tier details below)
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pricingModel === "percentage" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {percentageTierList.map((tier) => {
                const Icon = tierIcons[tier.key];
                const isCurrent = currentSubscription?.pricing_model === "percentage" && 
                                 currentSubscription?.percentage_tier === tier.key;
                const isPopular = tier.key === "premium";

                return (
                  <Card
                    key={tier.key}
                    className={`relative flex flex-col ${
                      isPopular 
                        ? "border-primary shadow-lg scale-105" 
                        : tierColors[tier.key]
                    }`}
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
                        <span className="text-4xl font-bold text-primary">
                          {formatPercentage(tier.feeRate)}
                        </span>
                        <span className="text-muted-foreground text-lg"> transaction fee</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        No monthly fees • Pay only when you sell
                      </p>
                      {isCurrent && (
                        <Badge variant="secondary" className="mt-2">
                          Current Plan
                        </Badge>
                      )}
                      {tier.volumeRequirement && volumeStats && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold">Volume Requirement</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            ${tier.volumeRequirement.salesAmount}/month OR {tier.volumeRequirement.transactionCount} transactions/month
                          </p>
                          {(() => {
                            const current = volumeStats.currentVolume;
                            const req = tier.volumeRequirement;
                            const salesProgress = Math.min((current.salesAmount / req.salesAmount) * 100, 100);
                            const transactionProgress = Math.min((current.transactionCount / req.transactionCount) * 100, 100);
                            const maxProgress = Math.max(salesProgress, transactionProgress);
                            const isEligible = volumeStats.eligibility[tier.key]?.eligible || false;
                            
                            return (
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>Sales: ${current.salesAmount.toFixed(2)}</span>
                                    <span className={isEligible ? "text-green-600" : ""}>
                                      ${req.salesAmount}
                                    </span>
                                  </div>
                                  <Progress value={salesProgress} className="h-1.5" />
                                </div>
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>Transactions: {current.transactionCount}</span>
                                    <span className={isEligible ? "text-green-600" : ""}>
                                      {req.transactionCount}
                                    </span>
                                  </div>
                                  <Progress value={transactionProgress} className="h-1.5" />
                                </div>
                                {isEligible && (
                                  <Badge variant="outline" className="text-xs w-full justify-center bg-green-50 text-green-700 border-green-200">
                                    ✓ Eligible
                                  </Badge>
                                )}
                                {!isEligible && maxProgress > 0 && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    {Math.round(100 - maxProgress)}% remaining
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
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

                      {(() => {
                        const isEligible = !tier.volumeRequirement || volumeStats?.eligibility[tier.key]?.eligible;
                        const isDisabled = subscribing !== null || isCurrent || !isEligible;
                        
                        return (
                          <Button
                            className="w-full"
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSubscribe(tier.key)}
                            disabled={isDisabled}
                          >
                            {subscribing === tier.key ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : isCurrent ? (
                              "Current Plan"
                            ) : !isEligible ? (
                              "Volume Requirement Not Met"
                            ) : (
                              "Select Plan"
                            )}
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : subscriptionTierList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {subscriptionTierList.map((tier) => {
                const Icon = tierIcons[tier.key];
                const isCurrent = currentSubscription?.pricing_model === "subscription" && 
                                 currentSubscription?.tier === tier.key;
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
                        {tier.monthlyPrice === 0 ? (
                          <span className="text-4xl font-bold">Free</span>
                        ) : (
                          <div>
                            <MultiCurrencyPrice usdPrice={tier.monthlyPrice} size="lg" />
                            <span className="text-muted-foreground text-lg">/month</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {tier.monthlyPrice === 0 
                          ? "Free forever" 
                          : "Reduced transaction fees"}
                      </p>
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
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleSubscribe(tier.key)}
                        disabled={
                          subscribing !== null ||
                          isCurrent
                        }
                      >
                        {subscribing === tier.key ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrent ? (
                          "Current Plan"
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
          )}

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All tiers include secure payment processing via Click Pesa.{" "}
              <button
                onClick={() => navigate("/terms")}
                className="text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                View terms and conditions
              </button>
            </p>
          </div>
          
          {/* Get Started Today Button */}
          <div className="mt-12 text-center">
            <button 
              onClick={() => navigate("/auth?tab=signup")}
              className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
            >
              Get Started Today
            </button>
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
                  <div className="font-bold">
                    <MultiCurrencyPrice usdPrice={pendingSubscription.monthlyPrice} size="sm" />
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <div className="font-bold text-lg">
                    <MultiCurrencyPrice usdPrice={pendingSubscription.totalAmount} size="md" />
                  </div>
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