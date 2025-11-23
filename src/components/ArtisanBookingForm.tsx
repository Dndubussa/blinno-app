import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';

interface ArtisanBookingFormProps {
  serviceId: string;
  serviceName: string;
  onBookingCreated?: (bookingId: string) => void;
}

export function ArtisanBookingForm({ 
  serviceId, 
  serviceName,
  onBookingCreated 
}: ArtisanBookingFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    notes: ''
  });
  const [paymentData, setPaymentData] = useState({
    customerPhone: '',
    customerEmail: '',
    customerName: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.createArtisanBooking({
        serviceId,
        ...formData
      });

      setBookingId(response.id);
      setShowPaymentForm(true);
      
      if (onBookingCreated) {
        onBookingCreated(response.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;
    
    setIsLoading(true);

    try {
      const response = await api.payArtisanBooking(bookingId, paymentData);
      
      if (response.success) {
        toast({
          title: "Payment Initiated",
          description: "You will be redirected to complete your payment.",
        });
        
        // Redirect to payment page
        window.location.href = response.checkoutUrl;
      } else {
        toast({
          title: "Payment Error",
          description: response.message || "Failed to initiate payment",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showPaymentForm && bookingId) {
    return (
      <form onSubmit={handlePayment} className="space-y-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Complete Payment for {serviceName}</h3>
          <p className="text-sm text-muted-foreground">Enter your payment details to complete the booking</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number for Payment</Label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              value={paymentData.customerPhone}
              onChange={handlePaymentChange}
              placeholder="e.g., +255XXXXXXXXX"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email (Optional)</Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={paymentData.customerEmail}
              onChange={handlePaymentChange}
              placeholder="e.g., your@email.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerName">Full Name (Optional)</Label>
            <Input
              id="customerName"
              name="customerName"
              value={paymentData.customerName}
              onChange={handlePaymentChange}
              placeholder="e.g., John Doe"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowPaymentForm(false)}
            disabled={isLoading}
          >
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Processing..." : "Pay Now"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientName">Full Name</Label>
          <Input
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientEmail">Email</Label>
          <Input
            id="clientEmail"
            name="clientEmail"
            type="email"
            value={formData.clientEmail}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientPhone">Phone Number</Label>
          <Input
            id="clientPhone"
            name="clientPhone"
            type="tel"
            value={formData.clientPhone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bookingDate">Date</Label>
          <Input
            id="bookingDate"
            name="bookingDate"
            type="date"
            value={formData.bookingDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            value={formData.startTime}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time (Optional)</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            value={formData.endTime}
            onChange={handleChange}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any additional information for the artisan?"
        />
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Requesting..." : "Request Booking"}
      </Button>
    </form>
  );
}