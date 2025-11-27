import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LodgingBookingForm } from "@/components/LodgingBookingForm";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";

interface LodgingProperty {
  id: string;
  name: string;
  description: string;
  location: string;
  property_type: string;
  amenities: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface LodgingRoom {
  id: string;
  property_id: string;
  room_type: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  availability_status: string;
  created_at: string;
  updated_at: string;
}

export default function Lodging() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<LodgingProperty[]>([]);
  const [rooms, setRooms] = useState<LodgingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<LodgingRoom | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<LodgingProperty | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const propertyData = await api.getLodgingProperties();
      const roomData = await api.getLodgingRooms();
      
      setProperties(propertyData);
      setRooms(roomData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lodging properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = (room: LodgingRoom, property: LodgingProperty) => {
    setSelectedRoom(room);
    setSelectedProperty(property);
    setShowBookingForm(true);
  };

  const handleBookingCreated = () => {
    setShowBookingForm(false);
    setSelectedRoom(null);
    setSelectedProperty(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Group rooms by property
  const roomsByProperty: { [key: string]: LodgingRoom[] } = {};
  rooms.forEach(room => {
    if (!roomsByProperty[room.property_id]) {
      roomsByProperty[room.property_id] = [];
    }
    roomsByProperty[room.property_id].push(room);
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Lodging</h1>
        <p className="text-lg text-muted-foreground">
          Discover accommodations and book your stay
        </p>
      </div>

      {showBookingForm && selectedRoom && selectedProperty ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Book Stay at {selectedProperty.name}</CardTitle>
              <CardDescription>
                Room Type: {selectedRoom.room_type} - <MultiCurrencyPrice usdPrice={selectedRoom.price_per_night} size="sm" />/night
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LodgingBookingForm
                propertyId={selectedProperty.id}
                roomId={selectedRoom.id}
                propertyName={selectedProperty.name}
                roomType={selectedRoom.room_type}
                pricePerNight={selectedRoom.price_per_night}
                onBookingCreated={handleBookingCreated}
              />
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowBookingForm(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {properties.map((property) => {
            const propertyRooms = roomsByProperty[property.id] || [];
            return (
              <div key={property.id}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>{property.name}</CardTitle>
                    <CardDescription>{property.property_type} - {property.location}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {property.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {property.amenities.slice(0, 5).map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {property.amenities.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{property.amenities.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ml-4">
                  {propertyRooms.map((room) => (
                    <Card key={room.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle>{room.room_type}</CardTitle>
                        <CardDescription>
                          <MultiCurrencyPrice usdPrice={room.price_per_night} size="sm" />/night
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground mb-4">
                          {room.description}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Max Guests:</span>
                          <Badge variant="secondary">{room.max_guests}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Availability:</span>
                          <Badge variant={room.availability_status === 'available' ? 'default' : 'destructive'}>
                            {room.availability_status}
                          </Badge>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          onClick={() => handleBookingClick(room, property)}
                          disabled={room.availability_status !== 'available'}
                        >
                          {room.availability_status === 'available' ? 'Book Now' : 'Unavailable'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}