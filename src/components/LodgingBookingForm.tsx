import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";

interface LodgingBookingFormProps {
  propertyId: string;
  roomId: string;
  propertyName: string;
  roomType: string;
  pricePerNight: number;
  onBookingCreated?: () => void;
}

export function LodgingBookingForm({ 
  propertyId,
  roomId,
  propertyName,
  roomType,
  pricePerNight,
  onBookingCreated 
}: LodgingBookingFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkInDate: '',
    checkOutDate: '',
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
      await api.createLodgingReservation({
        propertyId,
        roomId,
        ...formData,
        numberOfGuests: parseInt(formData.numberOfGuests)
      });

      toast({
        title: "Booking Requested",
        description: `Your booking at ${propertyName} has been submitted successfully!`,
      });

      // Reset form
      setFormData({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        checkInDate: '',
        checkOutDate: '',
        numberOfGuests: '2',
        specialRequests: ''
      });

      if (onBookingCreated) {
        onBookingCreated();
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

  // Calculate number of nights
  const calculateNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    
    if (checkOut <= checkIn) return 0;
    
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  const totalCost = nights * pricePerNight;

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
            max="10"
            value={formData.numberOfGuests}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="checkInDate">Check-in Date</Label>
          <Input
            id="checkInDate"
            name="checkInDate"
            type="date"
            value={formData.checkInDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="checkOutDate">Check-out Date</Label>
          <Input
            id="checkOutDate"
            name="checkOutDate"
            type="date"
            value={formData.checkOutDate}
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
      
      {nights > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span>Room Type:</span>
            <span className="font-semibold">{roomType}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span>Price per Night:</span>
            <div className="font-semibold">
              <MultiCurrencyPrice usdPrice={pricePerNight} size="sm" />
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span>Number of Nights:</span>
            <span className="font-semibold">{nights}</span>
          </div>
          <div className="flex justify-between items-center mt-2 border-t pt-2">
            <span className="font-semibold">Total Cost:</span>
            <div className="font-bold text-lg">
              <MultiCurrencyPrice usdPrice={totalCost} size="md" />
            </div>
          </div>
        </div>
      )}
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Requesting..." : "Request Booking"}
      </Button>
    </form>
  );
}