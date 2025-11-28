import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleUnsubscribe = async () => {
    if (!email) {
      setError("Email address is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://www.blinno.app/api'}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setSuccess(true);
      toast({
        title: t("common.unsubscribed"),
        description: "You have been unsubscribed from marketing emails.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to unsubscribe. Please try again.");
      toast({
        title: t("common.error"),
        description: err.message || "Failed to unsubscribe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Unsubscribe - BLINNO"
        description="Unsubscribe from BLINNO marketing emails"
        keywords={["unsubscribe", "email preferences", "BLINNO"]}
      />
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Unsubscribe from Marketing Emails</CardTitle>
              <CardDescription>
                We're sorry to see you go. You can unsubscribe from marketing emails below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Successfully Unsubscribed</h3>
                  <p className="text-muted-foreground mb-6">
                    You have been unsubscribed from marketing emails. You will still receive important account notifications.
                  </p>
                  <Button onClick={() => navigate("/")}>
                    Return to Homepage
                  </Button>
                </div>
              ) : (
                <>
                  {email && (
                    <div className="mb-4 p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Unsubscribing: <strong>{email}</strong>
                      </p>
                    </div>
                  )}

                  {!email && (
                    <div className="mb-4">
                      <Label htmlFor="email">Email Address</Label>
                      <input
                        id="email"
                        type="email"
                        className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  )}

                  <div className="mb-6">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Help us improve by telling us why you're unsubscribing..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleUnsubscribe}
                    disabled={loading || (!email && !document.getElementById('email')?.value)}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Unsubscribe"
                    )}
                  </Button>

                  <p className="mt-4 text-xs text-muted-foreground text-center">
                    You will still receive important account notifications, order confirmations, and security alerts.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate("/")}>
              Return to Homepage
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

