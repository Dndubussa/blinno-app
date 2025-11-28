import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  // Don't show if user is not logged in, email is verified, or banner is dismissed
  if (!user || user.email_verified || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!user.email) return;
    
    setIsResending(true);
    try {
      // Request a new verification email through backend API
      await api.resendVerificationEmail();
      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert variant="destructive" className="border-t-0 rounded-none border-x-0">
      <div className="container mx-auto px-4 flex items-start">
        <AlertCircle className="h-4 w-4 mt-0.5" />
        <div className="ml-3 flex-1">
          <AlertTitle>Email Verification Required</AlertTitle>
          <AlertDescription>
            Please check your email ({user.email}) and click the verification link to activate your account. 
            You won't be able to access the full platform until your email is verified.
          </AlertDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResendVerification}
              className="h-8"
              disabled={isResending}
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-2"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};