import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: "Passwords do not match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      toast({
        title: t("common.error"),
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await api.resetPassword(token!, password);
      setPasswordReset(true);
      toast({
        title: t("common.success"),
        description: "Your password has been reset successfully.",
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Reset Password - BLINNO Platform"
          description="Reset your BLINNO account password."
          keywords={["BLINNO password reset", "reset password", "account security"]}
        />
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            >
              <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
              <span className="text-xl font-bold text-primary">
                BLINNO
              </span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/signin")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </div>
        </header>
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Invalid Reset Link</CardTitle>
                <CardDescription>The password reset link is invalid or has expired</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-foreground">Invalid Reset Link</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The password reset link is invalid or has expired. Please request a new password reset link.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => navigate("/auth/forgot-password")} className="w-full">
                      Request New Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Reset Password - BLINNO Platform"
        description="Reset your BLINNO account password."
        keywords={["BLINNO password reset", "reset password", "account security"]}
      />
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
            <span className="text-xl font-bold text-primary">
              BLINNO
            </span>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/auth")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      </header>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Create a new password for your account</CardDescription>
            </CardHeader>
            <CardContent>
              {passwordReset ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-foreground">Password Reset Successful</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your password has been reset successfully. You can now sign in with your new password.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => navigate("/auth")} className="w-full">
                      Sign In
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter new password"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}