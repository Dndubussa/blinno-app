import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { hasRole, getPrimaryRole } from "@/lib/roleCheck";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  Wrench,
  Calendar,
  DollarSign,
  Star,
  CheckCircle2,
  Clock,
  MapPin
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const SERVICE_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Masonry",
  "Welding",
  "Tailoring",
  "Hair Styling",
  "Beauty Services",
  "Auto Repair",
  "Electronics Repair",
  "Other"
];

export default function ArtisanDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isArtisan, setIsArtisan] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalServices: 0,
    activeBookings: 0,
    completedJobs: 0,
    totalEarnings: 0,
  });
  
  const [showAddService, setShowAddService] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [pricingType, setPricingType] = useState<'hourly' | 'daily' | 'fixed' | 'negotiable'>('hourly');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkArtisanRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/artisan-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isArtisan) {
      fetchData();
    }
  }, [isArtisan, user]);

  const checkArtisanRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('artisan');

      if (!userHasRole && primaryRole !== 'artisan') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for artisans.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsArtisan(true);
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
      const [servicesData, bookingsData, statsData] = await Promise.all([
        api.getArtisanServices(),
        api.getArtisanBookings(),
        api.getDashboardStats('artisan'),
      ]);

      setServices(servicesData || []);
      setBookings(bookingsData || []);
      
      if (statsData) {
        setStats({
          totalServices: statsData.totalServices || 0,
          activeBookings: statsData.activeBookings || 0,
          completedJobs: statsData.completedJobs || 0,
          totalEarnings: 0,
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

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const skills = (formData.get("skills") as string).split(",").map(s => s.trim()).filter(s => s);
    const serviceArea = (formData.get("service_area") as string).split(",").map(a => a.trim()).filter(a => a);

    try {
      await api.createArtisanService({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        skills: skills,
        hourlyRate: formData.get("hourly_rate") ? parseFloat(formData.get("hourly_rate") as string) : null,
        dailyRate: formData.get("daily_rate") ? parseFloat(formData.get("daily_rate") as string) : null,
        fixedPrice: formData.get("fixed_price") ? parseFloat(formData.get("fixed_price") as string) : null,
        pricingType: pricingType,
        location: formData.get("location") as string,
        serviceArea: serviceArea,
        isAvailable,
      });

      toast({
        title: "Success",
        description: "Service added successfully!",
      });
      
      setShowAddService(false);
      setIsAvailable(true);
      setPricingType('hourly');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await api.deleteArtisanService(id);

      toast({
        title: "Success",
        description: "Service deleted successfully!",
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

  const handleUpdateService = async (id: string, data: any) => {
    try {
      await api.updateArtisanService(id, data);

      toast({
        title: "Success",
        description: "Service updated successfully!",
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

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await api.updateArtisanBookingStatus(bookingId, newStatus);

      toast({
        title: "Success",
        description: "Booking status updated!",
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

  if (!isArtisan || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: Wrench },
    { id: "services", label: "Services", icon: Wrench },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "profile", label: "Profile", icon: Star },
  ];

  return (
    <DashboardLayout
      title="Artisan Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >

      {/* Overview Section */}
      {currentSection === 'overview' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Your artisan business at a glance
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Services</CardTitle>
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalServices}</div>
                      <p className="text-xs text-muted-foreground">Active services</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.activeBookings}</div>
                      <p className="text-xs text-muted-foreground">Current bookings</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.completedJobs}</div>
                      <p className="text-xs text-muted-foreground">Jobs completed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEarnings.toLocaleString()} USD</div>
                      <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Bookings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>Your latest booking activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(bookings || []).slice(0, 5).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No bookings yet</p>
                    ) : (
                      <div className="space-y-4">
                        {(bookings || []).slice(0, 5).map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold">
                                {booking.artisan_services?.title || "Service"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {booking.profiles?.display_name || "Client"} • {new Date(booking.booking_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={booking.status === 'completed' ? "default" : "secondary"}>
                              {booking.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

      {/* Services Section */}
      {currentSection === 'services' && (
      <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Services</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your artisan services
                    </p>
                  </div>
                  <Button onClick={() => setShowAddService(!showAddService)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </div>

                {showAddService && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add New Service</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddService} className="space-y-4">
                        <div>
                          <Label htmlFor="title">Service Title</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" rows={4} required />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select name="category" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="skills">Skills (comma-separated)</Label>
                          <Input id="skills" name="skills" placeholder="plumbing, repairs, installation" />
                        </div>
                        <div>
                          <Label htmlFor="pricing_type">Pricing Type</Label>
                          <Select value={pricingType} onValueChange={(v: any) => setPricingType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="fixed">Fixed Price</SelectItem>
                              <SelectItem value="negotiable">Negotiable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {pricingType === 'hourly' && (
                            <div>
                              <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
                              <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" />
                            </div>
                          )}
                          {pricingType === 'daily' && (
                            <div>
                              <Label htmlFor="daily_rate">Daily Rate (USD)</Label>
                              <Input id="daily_rate" name="daily_rate" type="number" step="0.01" />
                            </div>
                          )}
                          {pricingType === 'fixed' && (
                            <div>
                              <Label htmlFor="fixed_price">Fixed Price (USD)</Label>
                              <Input id="fixed_price" name="fixed_price" type="number" step="0.01" />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" placeholder="e.g., Dar es Salaam" />
                          </div>
                          <div>
                            <Label htmlFor="service_area">Service Area (comma-separated)</Label>
                            <Input id="service_area" name="service_area" placeholder="e.g., Dar es Salaam, Morogoro" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is-available"
                            checked={isAvailable}
                            onCheckedChange={setIsAvailable}
                          />
                          <Label htmlFor="is-available">Available for Booking</Label>
                        </div>
                        <Button type="submit">Add Service</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(services || []).map((service) => (
                    <Card key={service.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{service.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription>{service.category}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pricing:</span>
                            <span className="font-medium">
                              {service.pricing_type === 'hourly' && service.hourly_rate && `${service.hourly_rate.toLocaleString()} USD/hour`}
                              {service.pricing_type === 'daily' && service.daily_rate && `${service.daily_rate.toLocaleString()} USD/day`}
                              {service.pricing_type === 'fixed' && service.fixed_price && `${service.fixed_price.toLocaleString()} USD`}
                              {service.pricing_type === 'negotiable' && 'Negotiable'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span>{service.location || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Availability:</span>
                            <Badge variant={service.is_available ? "default" : "secondary"}>
                              {service.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(services || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No services yet</p>
                      <Button onClick={() => setShowAddService(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Service
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

      {/* Bookings Section */}
      {currentSection === 'bookings' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Bookings</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your service bookings
                  </p>
                </div>

                <div className="space-y-4">
                  {(bookings || []).map((booking) => (
                    <Card key={booking.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {booking.artisan_services?.title || "Service Booking"}
                            </CardTitle>
                            <CardDescription>
                              Booked by {booking.profiles?.display_name || "Client"} on {new Date(booking.booking_date).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge variant={booking.status === 'completed' ? "default" : "secondary"}>
                            {booking.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Booking Date</p>
                            <p>{new Date(booking.booking_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Booking Time</p>
                            <p>{booking.booking_time || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p>{booking.location || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Special Requests</p>
                            <p>{booking.special_requests || 'None'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          {booking.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button
                              variant="default"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                            >
                              Mark as Completed
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(bookings || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No bookings yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

      {/* Profile Section */}
      {currentSection === 'profile' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Profile Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your artisan profile information
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
                          placeholder="Tell us about your artisan skills and experience"
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
                      <Button type="submit" disabled={isUpdatingProfile}>
                        {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Profile
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
      )}
    </DashboardLayout>
  );
}


