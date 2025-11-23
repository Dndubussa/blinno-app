import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArtisanBookingForm } from "@/components/ArtisanBookingForm";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";

interface ArtisanService {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  hourly_rate: number;
  daily_rate: number;
  fixed_price: number;
  pricing_type: string;
  location: string;
  service_area: string[];
  is_available: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function ArtisanServices() {
  const { toast } = useToast();
  const [services, setServices] = useState<ArtisanService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ArtisanService | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await api.getArtisanServices();
      setServices(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch artisan services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = (service: ArtisanService) => {
    setSelectedService(service);
    setShowBookingForm(true);
  };

  const handleBookingCreated = () => {
    setShowBookingForm(false);
    setSelectedService(null);
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
        <h1 className="text-4xl font-bold mb-4">Artisan Services</h1>
        <p className="text-lg text-muted-foreground">
          Discover skilled artisans and book their services
        </p>
      </div>

      {showBookingForm && selectedService ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Book Service: {selectedService.title}</CardTitle>
              <CardDescription>
                Fill out the form below to request this service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArtisanBookingForm
                serviceId={selectedService.id}
                serviceName={selectedService.title}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{service.title}</CardTitle>
                <CardDescription>{service.category}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4">
                  {service.description}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{service.location}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Pricing:</span>
                  {service.pricing_type === 'hourly' && (
                    <Badge variant="secondary">TZS {service.hourly_rate}/hour</Badge>
                  )}
                  {service.pricing_type === 'daily' && (
                    <Badge variant="secondary">TZS {service.daily_rate}/day</Badge>
                  )}
                  {service.pricing_type === 'fixed' && (
                    <Badge variant="secondary">TZS {service.fixed_price} (fixed)</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {service.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {service.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{service.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleBookingClick(service)}
                >
                  Book Service
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}