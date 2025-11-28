import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getDashboardRoute } from "@/lib/dashboardRoutes";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, refreshUser } = useAuth();
  // Handle multiple possible query parameters from ClickPesa
  const paymentId = searchParams.get("paymentId") || searchParams.get("payment_id") || searchParams.get("order_id");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | "pending" | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (!paymentId || !user) {
        // If no paymentId but user is logged in, check if they have a recent subscription
        if (user && !paymentId) {
          try {
            const subscriptionData = await api.getMySubscription();
            if (subscriptionData && (subscriptionData.status === "active" || subscriptionData.payment_status === "paid")) {
              setPaymentStatus("success");
              setSubscription(subscriptionData);
              const dashboardRoute = getDashboardRoute(profile?.roles);
              setTimeout(() => {
                navigate(dashboardRoute, { replace: true });
              }, 2000);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching subscription:", error);
          }
        }
        setPaymentStatus("failed");
        setLoading(false);
        return;
      }

      try {
        // Check payment status
        const payment = await api.getPaymentStatus(paymentId);
        
        // Wait a bit for webhook to process if payment just completed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch updated subscription info
        const subscriptionData = await api.getMySubscription();
        setSubscription(subscriptionData);

        // Refresh user data to get updated subscription
        await refreshUser();

        const paymentStatus = payment?.status;
        if (paymentStatus === "completed" || paymentStatus === "success") {
          setPaymentStatus("success");

          // Determine redirect based on pricing model
          const pricingModel = subscriptionData?.pricing_model || subscriptionData?.pricingModel;

          if (pricingModel === "subscription") {
            // Subscription users: redirect to dashboard
            const dashboardRoute = getDashboardRoute(profile?.roles);
            setTimeout(() => {
              navigate(dashboardRoute, { replace: true });
            }, 2000);
          } else if (pricingModel === "percentage") {
            // Percentage users: redirect to dashboard (tier features are already active)
            const dashboardRoute = getDashboardRoute(profile?.roles);
            setTimeout(() => {
              navigate(dashboardRoute, { replace: true });
            }, 2000);
          } else {
            // Default: redirect to dashboard
            const dashboardRoute = getDashboardRoute(profile?.roles);
            setTimeout(() => {
              navigate(dashboardRoute, { replace: true });
            }, 2000);
          }
        } else if (paymentStatus === "failed") {
          setPaymentStatus("failed");
        } else {
          setPaymentStatus("pending");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setPaymentStatus("failed");
      } finally {
        setLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [paymentId, user, navigate, profile, refreshUser]);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Processing payment...</h2>
              <p className="text-muted-foreground">Please wait while we verify your payment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your subscription has been activated. Redirecting you to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {subscription && (
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="font-semibold">
                  {subscription.pricing_model === "subscription" 
                    ? subscription.name || subscription.tier 
                    : `${subscription.name || subscription.percentage_tier} (Percentage-Based)`}
                </p>
              </div>
            )}
            <Button onClick={() => {
              const dashboardRoute = getDashboardRoute(profile?.roles);
              navigate(dashboardRoute);
            }} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Payment Failed</CardTitle>
            <CardDescription>
              There was an issue processing your payment. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button onClick={() => navigate("/#subscription-pricing")} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Processing payment...</h2>
            <p className="text-muted-foreground">Please wait while we verify your payment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
