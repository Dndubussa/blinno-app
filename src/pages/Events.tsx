import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventRegistrationForm } from "@/components/EventRegistrationForm";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";
import { Calendar, MapPin, Users, Clock, Loader2, Ticket, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  image_url?: string;
  category?: string;
}

export default function Events() {
  const { t } = useTranslation();
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
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("events.failedToFetch"),
        variant: "destructive",
      });
      setEvents([]);
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
    fetchEvents(); // Refresh events to update attendee count
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    // If time is in HH:MM format, format it nicely
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const getEventStatus = (event: Event) => {
    const eventDate = new Date(event.event_date);
    const now = new Date();
    
    if (event.current_attendees >= event.max_attendees) {
      return { label: t("events.soldOut"), variant: "destructive" as const };
    }
    if (eventDate < now) {
      return { label: t("events.pastEvent"), variant: "secondary" as const };
    }
    if (event.status === 'cancelled') {
      return { label: t("events.cancelled"), variant: "destructive" as const };
    }
    return { label: t("events.upcoming"), variant: "default" as const };
  };

  const getAttendancePercentage = (event: Event) => {
    return Math.round((event.current_attendees / event.max_attendees) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Events - Upcoming Local Cultural & Business Events"
        description="Discover upcoming events. Register to attend cultural festivals, business conferences, workshops, and community gatherings."
        keywords={["events", "cultural festivals", "business conferences", "workshops", "community gatherings"]}
      />
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t("events.title")}</h1>
            <p className="text-muted-foreground text-lg">
              {t("events.subtitle")}
            </p>
          </div>

          {showRegistrationForm && selectedEvent ? (
            <div className="max-w-2xl mx-auto">
              <Button
                variant="ghost"
                onClick={() => setShowRegistrationForm(false)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("common.back")} {t("events.title")}
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle>{t("events.registerFor")}: {selectedEvent.title}</CardTitle>
                  <CardDescription>
                    {t("events.fillFormToRegister")}
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
                    {t("common.cancel")}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : (
            <>
              {events.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium text-foreground mb-2">{t("events.noEvents")}</p>
                    <p className="text-muted-foreground">
                      {t("events.checkBackLater")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const status = getEventStatus(event);
                    const attendancePercent = getAttendancePercentage(event);
                    const isSoldOut = event.current_attendees >= event.max_attendees;
                    
                    return (
                      <Card 
                        key={event.id} 
                        className="flex flex-col overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
                      >
                        {/* Event Image */}
                        <div className="relative aspect-video overflow-hidden bg-muted">
                          <img 
                            src={event.image_url || "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800&h=600&fit=crop"} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800&h=600&fit=crop";
                            }}
                          />
                          <div className="absolute top-4 left-4">
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </div>
                          {event.category && (
                            <div className="absolute top-4 right-4">
                              <Badge variant="secondary" className="bg-background/90">
                                {event.category}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <CardHeader>
                          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {event.description}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="flex-grow space-y-4">
                          {/* Date and Time */}
                          <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {formatDate(event.event_date)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Clock className="h-4 w-4" />
                                {formatTime(event.event_time)}
                              </div>
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-muted-foreground">
                              {event.location}
                            </div>
                          </div>

                          {/* Ticket Price */}
                          <div className="flex items-center gap-3">
                            <Ticket className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1">
                              {event.ticket_price > 0 ? (
                                <MultiCurrencyPrice usdPrice={event.ticket_price} size="sm" />
                              ) : (
                                <Badge variant="secondary" className="text-sm">{t("events.free")}</Badge>
                              )}
                            </div>
                          </div>

                          {/* Attendees Progress */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{t("events.attending")}</span>
                              </div>
                              <span className="font-medium text-foreground">
                                {event.current_attendees}/{event.max_attendees}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${Math.min(attendancePercent, 100)}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              {attendancePercent}% {t("events.full")}
                            </div>
                          </div>
                        </CardContent>
                        
                        <CardFooter>
                          <Button 
                            className="w-full" 
                            onClick={() => handleRegistrationClick(event)}
                            disabled={isSoldOut || event.status === 'cancelled'}
                            size="lg"
                          >
                            {isSoldOut ? (
                              <>
                                <Ticket className="h-4 w-4 mr-2" />
                                {t("events.soldOut")}
                              </>
                            ) : event.status === 'cancelled' ? (
                              t("events.cancelled")
                            ) : (
                              <>
                                <Ticket className="h-4 w-4 mr-2" />
                                {t("events.registerNow")}
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
