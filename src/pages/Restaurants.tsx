import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RestaurantReservationForm } from "@/components/RestaurantReservationForm";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  location: string;
  contact_info: any;
  rating: number;
  owner_id: string;
}

export default function Restaurants() {
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showReservationForm, setShowReservationForm] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const data = await api.getRestaurants();
      setRestaurants(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch restaurants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReservationClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowReservationForm(true);
  };

  const handleReservationCreated = () => {
    setShowReservationForm(false);
    setSelectedRestaurant(null);
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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Restaurants</h1>
        <p className="text-lg text-muted-foreground">
          Discover amazing restaurants and make reservations
        </p>
      </div>

      {showReservationForm && selectedRestaurant ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Reserve a Table at {selectedRestaurant.name}</CardTitle>
              <CardDescription>
                Fill out the form below to request a reservation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantReservationForm
                restaurantId={selectedRestaurant.id}
                restaurantName={selectedRestaurant.name}
                onReservationCreated={handleReservationCreated}
              />
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowReservationForm(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{restaurant.name}</CardTitle>
                <CardDescription>{restaurant.cuisine_type}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4">
                  {restaurant.description}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{restaurant.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rating:</span>
                  <Badge variant="secondary">{restaurant.rating || 'N/A'}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleReservationClick(restaurant)}
                >
                  Reserve a Table
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}