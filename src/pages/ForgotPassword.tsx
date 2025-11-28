import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      await api.forgotPassword(email);
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "If an account exists with this email, you'll receive a password reset link shortly.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Forgot Password - BLINNO Platform"
        description="Reset your BLINNO account password. Enter your email to receive a password reset link."
        keywords={["BLINNO password reset", "forgot password", "account recovery", "reset account"]}
      />
      {/* Minimal Auth Header */}
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
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>Enter your email to receive a password reset link</CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-foreground">Check Your Email</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We've sent a password reset link to your email address if an account exists with that email.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => navigate("/auth")} className="w-full">
                      Back to Sign In
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    We'll send you a link to reset your password if an account exists with this email.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}