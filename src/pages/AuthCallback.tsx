import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardRoute } from "@/lib/dashboardRoutes";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser, profile } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for email verification tokens (from Supabase email confirmation)
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const hash = searchParams.get('hash');

        if (token && type && hash) {
          // This is an email verification callback
          // Supabase automatically handles the verification when the user clicks the link
          // We just need to wait for the session to be established
          
          // Wait a moment for Supabase to process the verification
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the current session (should be established after email verification)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Session error:", sessionError);
            navigate("/signin?error=verification_failed", { replace: true });
            return;
          }

          if (session?.user) {
            // Email verified successfully
            // Refresh user data to get updated profile
            await refreshUser();
            
            // Get user profile and check subscription
            try {
              const { api } = await import("@/lib/api");
              const profileData = await api.getCurrentUser();
              
            // Check if user has selected a subscription
            try {
              const subscription = await api.getMySubscription();
              // Backend returns default object without 'id' when no subscription exists
              // If subscription doesn't have an 'id' or 'created_at', it's a default and user needs to choose
              if (!subscription?.id || !subscription?.created_at) {
                navigate("/choose-subscription", { replace: true });
                return;
              }
            } catch (subError) {
              // If error getting subscription, assume they need to choose
              console.error("Error checking subscription:", subError);
              navigate("/choose-subscription", { replace: true });
              return;
            }
              
              if (profileData?.roles) {
                const primaryRole = Array.isArray(profileData.roles) 
                  ? profileData.roles[0] 
                  : profileData.roles;
                const dashboardRoute = getDashboardRoute(primaryRole);
                navigate(dashboardRoute, { replace: true });
              } else {
                navigate("/dashboard", { replace: true });
              }
            } catch (profileError) {
              console.error("Error fetching profile:", profileError);
              navigate("/dashboard", { replace: true });
            }
          } else {
            // No session - verification might have failed
            navigate("/signin?error=verification_failed", { replace: true });
          }
        } else {
          // This is an OAuth callback or other auth callback
          // Refresh the user data to get the updated session
          await refreshUser();
          
          // Get user profile and check subscription
          try {
            const { api } = await import("@/lib/api");
            const profileData = await api.getCurrentUser();
            
            // Check if user has selected a subscription
            try {
              const subscription = await api.getMySubscription();
              // Backend returns default object without 'id' when no subscription exists
              // If subscription doesn't have an 'id' or 'created_at', it's a default and user needs to choose
              if (!subscription?.id || !subscription?.created_at) {
                navigate("/choose-subscription", { replace: true });
                return;
              }
            } catch (subError) {
              // If error getting subscription, assume they need to choose
              console.error("Error checking subscription:", subError);
              navigate("/choose-subscription", { replace: true });
              return;
            }
            
            if (profileData?.roles) {
              const primaryRole = Array.isArray(profileData.roles) 
                ? profileData.roles[0] 
                : profileData.roles;
              const dashboardRoute = getDashboardRoute(primaryRole);
              navigate(dashboardRoute, { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
          } catch (profileError) {
            console.error("Error fetching profile:", profileError);
            navigate("/dashboard", { replace: true });
          }
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        // Redirect to auth page if there's an error
        navigate("/signin?error=callback_failed", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, refreshUser, searchParams, profile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we complete your authentication</p>
      </div>
    </div>
  );
}