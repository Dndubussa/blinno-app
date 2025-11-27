import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is not logged in, email is verified, or banner is dismissed
  if (!user || user.email_verified || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!user.email) return;
    
    try {
      // Request a new verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      
      if (error) {
        console.error('Error resending verification email:', error);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
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
            >
              Resend Verification Email
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