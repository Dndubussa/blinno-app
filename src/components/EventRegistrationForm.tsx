import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';

interface EventRegistrationFormProps {
  eventId: string;
  eventName: string;
  ticketPrice: number;
  onRegistrationCreated?: () => void;
}

export function EventRegistrationForm({ 
  eventId, 
  eventName,
  ticketPrice,
  onRegistrationCreated 
}: EventRegistrationFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    numberOfTickets: '1',
    specialRequests: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.registerForEvent({
        eventId,
        ...formData,
        numberOfTickets: parseInt(formData.numberOfTickets)
      });

      toast({
        title: "Registration Submitted",
        description: `Your registration for ${eventName} has been submitted successfully!`,
      });

      // Reset form
      setFormData({
        attendeeName: '',
        attendeeEmail: '',
        attendeePhone: '',
        numberOfTickets: '1',
        specialRequests: ''
      });

      if (onRegistrationCreated) {
        onRegistrationCreated();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register for event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalCost = ticketPrice * parseInt(formData.numberOfTickets);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="attendeeName">Full Name</Label>
          <Input
            id="attendeeName"
            name="attendeeName"
            value={formData.attendeeName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="attendeeEmail">Email</Label>
          <Input
            id="attendeeEmail"
            name="attendeeEmail"
            type="email"
            value={formData.attendeeEmail}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="attendeePhone">Phone Number</Label>
          <Input
            id="attendeePhone"
            name="attendeePhone"
            type="tel"
            value={formData.attendeePhone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="numberOfTickets">Number of Tickets</Label>
          <Input
            id="numberOfTickets"
            name="numberOfTickets"
            type="number"
            min="1"
            max="10"
            value={formData.numberOfTickets}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="specialRequests">Special Requests</Label>
        <Textarea
          id="specialRequests"
          name="specialRequests"
          value={formData.specialRequests}
          onChange={handleChange}
          placeholder="Any special requests or accessibility needs?"
        />
      </div>
      
      {ticketPrice > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span>Ticket Price:</span>
            <span className="font-semibold">TZS {ticketPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span>Number of Tickets:</span>
            <span className="font-semibold">{formData.numberOfTickets}</span>
          </div>
          <div className="flex justify-between items-center mt-2 border-t pt-2">
            <span className="font-semibold">Total Cost:</span>
            <span className="font-bold text-lg">TZS {totalCost.toLocaleString()}</span>
          </div>
        </div>
      )}
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Registering..." : "Register for Event"}
      </Button>
    </form>
  );
}