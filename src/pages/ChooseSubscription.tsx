import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionPricing } from "@/components/SubscriptionPricing";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

export default function ChooseSubscription() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || loading) return;

      try {
        const { api } = await import("@/lib/api");
        const subscription = await api.getMySubscription();
        
        // Check if user has an actual subscription (not just default)
        // Backend returns default object without 'id' when no subscription exists
        // If subscription has an 'id', it means it was explicitly created
        if (subscription && subscription.id && subscription.created_at) {
          setHasSubscription(true);
          // Get fresh profile data for accurate dashboard route
          const updatedProfile = await api.getCurrentUser();
          // Redirect to dashboard if they already have a subscription
          const { getDashboardRoute } = await import("@/lib/dashboardRoutes");
          const dashboardRoute = getDashboardRoute(updatedProfile?.roles || profile?.roles);
          navigate(dashboardRoute, { replace: true });
        } else {
          setHasSubscription(false);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // If error, assume they need to select
        setHasSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, profile, loading, navigate]);

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/signin", { replace: true });
    return null;
  }

  return (
    <>
      <SEO
        title="Choose Your Pricing Model - BLINNO"
        description="Select between percentage-based or subscription-based pricing models for your account"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-6xl mx-auto mb-8">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-2">
                Welcome to BLINNO!
              </CardTitle>
              <CardDescription className="text-lg">
                Before you get started, please choose your pricing model. You can switch between models at any time.
              </CardDescription>
            </CardHeader>
          </Card>
          <SubscriptionPricing />
        </div>
      </div>
    </>
  );
}

