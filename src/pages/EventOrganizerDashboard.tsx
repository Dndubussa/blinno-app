import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { hasRole, getPrimaryRole } from "@/lib/roleCheck";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash2, 
  Plus, 
  Loader2, 
  Calendar,
  Users,
  Eye,
  DollarSign,
  CheckCircle2,
  Clock,
  MapPin,
  Ticket
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";

const EVENT_CATEGORIES = [
  "Music",
  "Food & Drink",
  "Business",
  "Arts & Culture",
  "Sports",
  "Technology",
  "Education",
  "Networking",
  "Entertainment",
  "Other"
];

export default function EventOrganizerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
  });
  
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventImageUrl, setEventImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'cancelled' | 'completed'>('draft');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkOrganizerRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/event-organizer-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isOrganizer) {
      fetchData();
    }
  }, [isOrganizer, user]);

  const checkOrganizerRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('event_organizer');

      if (!userHasRole && primaryRole !== 'event_organizer') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for event organizers.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsOrganizer(true);
    } catch (error: any) {
      console.error('Error checking role:', error);
      toast({
        title: "Error",
        description: "Failed to verify access.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setCheckingRole(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      const [eventsData, registrationsData, statsData] = await Promise.all([
        api.getOrganizedEvents(),
        api.getEventRegistrations(),
        api.getDashboardStats('event_organizer'),
      ]);

      setEvents(eventsData || []);
      setRegistrations(registrationsData || []);
      
      if (statsData) {
        setStats({
          totalEvents: statsData.totalEvents || 0,
          publishedEvents: statsData.upcomingEvents || 0,
          totalRegistrations: statsData.totalRegistrations || 0,
          totalRevenue: 0,
        });
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data.",
        variant: "destructive",
      });
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const tags = (formData.get("tags") as string).split(",").map(t => t.trim()).filter(t => t);

    try {
      const startDate = new Date(`${formData.get("start_date")}T${formData.get("start_time")}`);
      const endDate = formData.get("end_date") && formData.get("end_time")
        ? new Date(`${formData.get("end_date")}T${formData.get("end_time")}`)
        : null;

      await api.createOrganizedEvent({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        venueName: formData.get("venue_name") as string,
        venueAddress: formData.get("venue_address") as string,
        city: formData.get("city") as string,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || null,
        startTime: formData.get("start_time") as string,
        endTime: formData.get("end_time") as string || null,
        coverImageUrl: eventImageUrl || null,
        ticketPrice: formData.get("ticket_price") ? parseFloat(formData.get("ticket_price") as string) : null,
        ticketUrl: formData.get("ticket_url") as string || null,
        maxAttendees: formData.get("max_attendees") ? parseInt(formData.get("max_attendees") as string) : null,
        tags: tags,
        isPublished,
        isFeatured,
        status: eventStatus,
      });

      toast({
        title: "Success",
        description: "Event created successfully!",
      });
      
      setShowAddEvent(false);
      setEventImageUrl("");
      setIsPublished(false);
      setIsFeatured(false);
      setEventStatus('draft');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await api.deleteOrganizedEvent(id);

      toast({
        title: "Success",
        description: "Event deleted successfully!",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateEvent = async (id: string, data: any) => {
    try {
      await api.updateOrganizedEvent(id, data);

      toast({
        title: "Success",
        description: "Event updated successfully!",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRegistrationStatus = async (registrationId: string, newStatus: string) => {
    try {
      await api.updateEventRegistrationStatus(registrationId, newStatus);

      toast({
        title: "Success",
        description: "Registration status updated!",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);

    try {
      const profileData = new FormData();
      profileData.append('display_name', formData.get("displayName") as string);
      profileData.append('bio', formData.get("bio") as string);
      profileData.append('location', formData.get("location") as string);
      profileData.append('phone', formData.get("phone") as string);
      profileData.append('website', formData.get("website") as string);
      await api.updateProfile(profileData);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOrganizer || !user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-4 border-b border-border px-4 py-4">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Event Organizer Dashboard</h1>
          </div>
          <div className="container mx-auto px-4 pt-8 pb-12">
            
            {/* Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
              <Button
                variant={currentSection === 'overview' ? "default" : "outline"}
                onClick={() => navigate('/event-organizer-dashboard#overview')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={currentSection === 'events' ? "default" : "outline"}
                onClick={() => navigate('/event-organizer-dashboard#events')}
                className="flex items-center gap-2"
              >
                <Ticket className="h-4 w-4" />
                Events
              </Button>
              <Button
                variant={currentSection === 'registrations' ? "default" : "outline"}
                onClick={() => navigate('/event-organizer-dashboard#registrations')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Registrations
              </Button>
              <Button
                variant={currentSection === 'profile' ? "default" : "outline"}
                onClick={() => navigate('/event-organizer-dashboard#profile')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Profile
              </Button>
            </div>

            {/* Overview Section */}
            {currentSection === 'overview' && (
              <div className="mt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Your event organizing dashboard at a glance
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEvents}</div>
                      <p className="text-xs text-muted-foreground">Organized events</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Published Events</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.publishedEvents}</div>
                      <p className="text-xs text-muted-foreground">Live events</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                      <p className="text-xs text-muted-foreground">Event attendees</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} USD</div>
                      <p className="text-xs text-muted-foreground">From ticket sales</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Events */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                    <CardDescription>Your latest event activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(events || []).slice(0, 5).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No events yet</p>
                    ) : (
                      <div className="space-y-4">
                        {(events || []).slice(0, 5).map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold">{event.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.start_date).toLocaleDateString()} • {event.venue_name}
                              </p>
                            </div>
                            <Badge variant={event.is_published ? "default" : "secondary"}>
                              {event.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Events Section */}
            {currentSection === 'events' && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Events</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your organized events
                    </p>
                  </div>
                  <Button onClick={() => setShowAddEvent(!showAddEvent)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </div>

                {showAddEvent && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Create New Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddEvent} className="space-y-4">
                        <div>
                          <Label htmlFor="event-image">Event Image</Label>
                          <ImageUpload
                            bucket="portfolios"
                            userId={user?.id || ""}
                            onUploadComplete={setEventImageUrl}
                          />
                        </div>
                        <div>
                          <Label htmlFor="title">Event Title</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" rows={4} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select name="category" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {EVENT_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="event_type">Event Type</Label>
                            <Select name="event_type" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="conference">Conference</SelectItem>
                                <SelectItem value="workshop">Workshop</SelectItem>
                                <SelectItem value="seminar">Seminar</SelectItem>
                                <SelectItem value="concert">Concert</SelectItem>
                                <SelectItem value="festival">Festival</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="venue_name">Venue Name</Label>
                            <Input id="venue_name" name="venue_name" required />
                          </div>
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input id="city" name="city" required />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="venue_address">Venue Address</Label>
                          <Input id="venue_address" name="venue_address" required />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input id="start_date" name="start_date" type="date" required />
                          </div>
                          <div>
                            <Label htmlFor="start_time">Start Time</Label>
                            <Input id="start_time" name="start_time" type="time" required />
                          </div>
                          <div>
                            <Label htmlFor="end_date">End Date</Label>
                            <Input id="end_date" name="end_date" type="date" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="ticket_price">Ticket Price (USD)</Label>
                            <Input id="ticket_price" name="ticket_price" type="number" step="0.01" />
                          </div>
                          <div>
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input id="capacity" name="capacity" type="number" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-published"
                              checked={isPublished}
                              onCheckedChange={setIsPublished}
                            />
                            <Label htmlFor="is-published">Publish Event</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-featured"
                              checked={isFeatured}
                              onCheckedChange={setIsFeatured}
                            />
                            <Label htmlFor="is-featured">Feature Event</Label>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="status">Event Status</Label>
                          <Select value={eventStatus} onValueChange={(v: any) => setEventStatus(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit">Create Event</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(events || []).map((event) => (
                    <Card key={event.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <CardDescription>{event.category}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={event.is_published ? "default" : "secondary"}>
                              {event.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{new Date(event.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Venue:</span>
                            <span className="text-right">{event.venue_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Registrations:</span>
                            <span>{event.registration_count || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline">{event.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(events || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No events yet</p>
                      <Button onClick={() => setShowAddEvent(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Event
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Registrations Section */}
            {currentSection === 'registrations' && (
              <div className="mt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Event Registrations</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage event registrations and attendees
                  </p>
                </div>

                <div className="space-y-4">
                  {(registrations || []).map((registration) => (
                    <Card key={registration.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {registration.organized_events?.title || "Event Registration"}
                            </CardTitle>
                            <CardDescription>
                              Registered by {registration.profiles?.display_name || "Attendee"} on {new Date(registration.registration_date).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge variant={registration.status === 'confirmed' ? "default" : registration.status === 'cancelled' ? "destructive" : "secondary"}>
                            {registration.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p>{registration.profiles?.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p>{registration.profiles?.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ticket Type</p>
                            <p>{registration.ticket_type || 'General'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payment Status</p>
                            <p className="capitalize">{registration.payment_status || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          {registration.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateRegistrationStatus(registration.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleUpdateRegistrationStatus(registration.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {registration.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              onClick={() => handleUpdateRegistrationStatus(registration.id, 'cancelled')}
                            >
                              Cancel Registration
                            </Button>
                          )}
                          {registration.status === 'cancelled' && (
                            <Button
                              variant="outline"
                              onClick={() => handleUpdateRegistrationStatus(registration.id, 'confirmed')}
                            >
                              Reconfirm
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(registrations || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No event registrations yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Profile Section */}
            {currentSection === 'profile' && (
              <div className="mt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Profile Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your event organizer profile information
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          defaultValue={profile?.display_name || ""}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          defaultValue={profile?.bio || ""}
                          rows={4}
                          placeholder="Tell us about your event organizing experience"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            name="location"
                            defaultValue={profile?.location || ""}
                            placeholder="e.g., Dar es Salaam"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            defaultValue={profile?.phone || ""}
                            placeholder="e.g., +1 (XXX) XXX-XXXX"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          defaultValue={profile?.website || ""}
                          placeholder="https://example.com"
                        />
                      </div>
                      <Button type="submit" disabled={isUpdatingProfile}>
                        {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Profile
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}