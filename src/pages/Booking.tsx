import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const creatorId = searchParams.get("creator");
  
  const [creator, setCreator] = useState<any>(null);
  const [date, setDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    if (creatorId) {
      fetchCreator();
    }
  }, [user, creatorId]);

  const fetchCreator = async () => {
    if (!creatorId) return;
    
    try {
      const profile = await api.getProfile(creatorId);
      setCreator(profile);
    } catch (error: any) {
      console.error("Error fetching creator:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load creator information",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !creatorId || !date) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      // Create a general booking through the API
      await api.createBooking({
        creatorId: creatorId,
        serviceType: formData.get("serviceType") as string,
        startDate: date.toISOString(),
        totalAmount: parseFloat(formData.get("amount") as string) || 0,
        notes: formData.get("notes") as string,
      });

      toast({ title: t("common.success"), description: t("common.bookingRequestSent") });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: t("common.error"),
        description: error.message || "Failed to send booking request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Book a Service</CardTitle>
              {creator && (
                <p className="text-muted-foreground">
                  Booking with {creator.display_name}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Input
                    id="serviceType"
                    name="serviceType"
                    placeholder="e.g., Photography Session, Event Planning"
                    required
                  />
                </div>

                <div>
                  <Label>Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date()}
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount (TZS)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any special requirements or details..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !date}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Booking Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}