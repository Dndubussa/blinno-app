import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Refresh the user data to get the updated session
        await refreshUser();
        
        // Redirect to dashboard or home page
        navigate("/dashboard", { replace: true });
      } catch (error) {
        console.error("OAuth callback error:", error);
        // Redirect to auth page if there's an error
        navigate("/auth", { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, refreshUser]);

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