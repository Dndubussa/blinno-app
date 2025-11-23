import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';

interface RestaurantReservationFormProps {
  restaurantId: string;
  restaurantName: string;
  onReservationCreated?: () => void;
}

export function RestaurantReservationForm({ 
  restaurantId, 
  restaurantName,
  onReservationCreated 
}: RestaurantReservationFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    reservationDate: '',
    reservationTime: '',
    numberOfGuests: '2',
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
      await api.createRestaurantReservation({
        restaurantId,
        ...formData,
        numberOfGuests: parseInt(formData.numberOfGuests)
      });

      toast({
        title: "Reservation Requested",
        description: `Your reservation at ${restaurantName} has been submitted successfully!`,
      });

      // Reset form
      setFormData({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        reservationDate: '',
        reservationTime: '',
        numberOfGuests: '2',
        specialRequests: ''
      });

      if (onReservationCreated) {
        onReservationCreated();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create reservation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guestName">Full Name</Label>
          <Input
            id="guestName"
            name="guestName"
            value={formData.guestName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guestEmail">Email</Label>
          <Input
            id="guestEmail"
            name="guestEmail"
            type="email"
            value={formData.guestEmail}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guestPhone">Phone Number</Label>
          <Input
            id="guestPhone"
            name="guestPhone"
            type="tel"
            value={formData.guestPhone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="numberOfGuests">Number of Guests</Label>
          <Input
            id="numberOfGuests"
            name="numberOfGuests"
            type="number"
            min="1"
            max="20"
            value={formData.numberOfGuests}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reservationDate">Date</Label>
          <Input
            id="reservationDate"
            name="reservationDate"
            type="date"
            value={formData.reservationDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reservationTime">Time</Label>
          <Input
            id="reservationTime"
            name="reservationTime"
            type="time"
            value={formData.reservationTime}
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
          placeholder="Any special requests or dietary restrictions?"
        />
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Requesting..." : "Request Reservation"}
      </Button>
    </form>
  );
}