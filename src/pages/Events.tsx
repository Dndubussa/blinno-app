import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventRegistrationForm } from "@/components/EventRegistrationForm";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { SEO } from "@/components/SEO";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  ticket_price: number;
  max_attendees: number;
  current_attendees: number;
  organizer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Events() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await api.getOrganizedEvents();
      setEvents(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationClick = (event: Event) => {
    setSelectedEvent(event);
    setShowRegistrationForm(true);
  };

  const handleRegistrationCreated = () => {
    setShowRegistrationForm(false);
    setSelectedEvent(null);
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
      <SEO
        title="Events - Upcoming Tanzanian Cultural & Business Events"
        description="Discover upcoming events in Tanzania. Register to attend cultural festivals, business conferences, workshops, and community gatherings across Dar es Salaam, Mwanza, Zanzibar and more."
        keywords={["Tanzanian events", "cultural festivals", "business conferences", "workshops", "community gatherings", "Dar es Salaam events", "Mwanza events", "Zanzibar events"]}
      />
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Events</h1>
        <p className="text-lg text-muted-foreground">
          Discover upcoming events and register to attend
        </p>
      </div>

      {showRegistrationForm && selectedEvent ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Register for: {selectedEvent.title}</CardTitle>
              <CardDescription>
                Fill out the form below to register for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventRegistrationForm
                eventId={selectedEvent.id}
                eventName={selectedEvent.title}
                ticketPrice={selectedEvent.ticket_price}
                onRegistrationCreated={handleRegistrationCreated}
              />
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowRegistrationForm(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                  {new Date(event.event_date).toLocaleDateString()} at {event.event_time}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4">
                  {event.description}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{event.location}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Ticket Price:</span>
                  {event.ticket_price > 0 ? (
                    <Badge variant="secondary">TZS {event.ticket_price}</Badge>
                  ) : (
                    <Badge variant="secondary">Free</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Attendees:</span>
                  <Badge variant="outline">
                    {event.current_attendees}/{event.max_attendees}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleRegistrationClick(event)}
                  disabled={event.current_attendees >= event.max_attendees}
                >
                  {event.current_attendees >= event.max_attendees ? 'Sold Out' : 'Register'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}