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
  Home, 
  Bed,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";

export default function LodgingDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isLodging, setIsLodging] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalRooms: 0,
    activeBookings: 0,
    totalRevenue: 0,
  });
  
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkLodgingRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/lodging-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isLodging) {
      fetchData();
    }
  }, [isLodging, user]);

  const checkLodgingRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('lodging');

      if (!userHasRole && primaryRole !== 'lodging') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for lodging owners.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsLodging(true);
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
      // Fetch properties, rooms, and bookings using API
      const [propertiesData, roomsData, bookingsData, statsData] = await Promise.all([
        api.getLodgingProperties(),
        api.getLodgingRooms(),
        api.getLodgingBookings(),
        api.getDashboardStats('lodging'),
      ]);

      setProperties(propertiesData || []);
      setRooms(roomsData || []);
      setBookings(bookingsData || []);
      
      if (statsData) {
        setStats({
          totalProperties: statsData.totalProperties || 0,
          totalRooms: statsData.totalRooms || 0,
          activeBookings: statsData.activeBookings || 0,
          totalRevenue: statsData.totalRevenue || 0,
        });
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const handleAddProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    try {
      await api.createLodgingProperty({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        propertyType: formData.get("property_type") as string,
        address: formData.get("address") as string,
        city: formData.get("city") as string,
        country: formData.get("country") as string,
        amenities: [],
      });
      
      toast({ title: "Success", description: "Property created!" });
      setShowAddProperty(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create property", variant: "destructive" });
    }
  };

  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    try {
      await api.createLodgingRoom({
        propertyId: formData.get("property_id") as string,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        roomType: formData.get("room_type") as string,
        capacity: parseInt(formData.get("capacity") as string),
        pricePerNight: parseFloat(formData.get("price_per_night") as string),
        amenities: (formData.get("amenities") as string).split(",").map(a => a.trim()).filter(a => a),
      });

      toast({ title: "Success", description: "Room added!" });
      setShowAddRoom(false);
      setSelectedProperty("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add room", variant: "destructive" });
    }
  };

  const handleUpdateProperty = async (id: string, data: any) => {
    try {
      await api.updateLodgingProperty(id, data);
      toast({ title: "Success", description: "Property updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update property", variant: "destructive" });
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      await api.deleteLodgingProperty(id);
      toast({ title: "Success", description: "Property deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete property", variant: "destructive" });
    }
  };

  const handleUpdateRoom = async (id: string, data: any) => {
    try {
      await api.updateLodgingRoom(id, data);
      toast({ title: "Success", description: "Room updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update room", variant: "destructive" });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      await api.deleteLodgingRoom(id);
      toast({ title: "Success", description: "Room deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete room", variant: "destructive" });
    }
  };

  const handleUpdateBooking = async (id: string, data: any) => {
    try {
      await api.updateLodgingBooking(id, data);
      toast({ title: "Success", description: "Booking updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update booking", variant: "destructive" });
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await api.deleteLodgingBooking(id);
      toast({ title: "Success", description: "Booking deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete booking", variant: "destructive" });
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await api.updateLodgingBookingStatus(bookingId, status);
      toast({ title: "Success", description: "Booking status updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update booking status", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      confirmed: { variant: "default" as const, icon: CheckCircle2 },
      checked_in: { variant: "default" as const, icon: CheckCircle2 },
      checked_out: { variant: "default" as const, icon: CheckCircle2 },
      pending: { variant: "secondary" as const, icon: Clock },
      cancelled: { variant: "destructive" as const, icon: XCircle },
    };

    const config = variants[status] || { variant: "outline" as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLodging || !user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-4 border-b border-border px-4 py-4">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Lodging Dashboard</h1>
          </div>
          <div className="container mx-auto px-4 pt-8 pb-12">
            
            {/* Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
              <Button
                variant={currentSection === 'overview' ? "default" : "outline"}
                onClick={() => navigate('/lodging-dashboard#overview')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={currentSection === 'properties' ? "default" : "outline"}
                onClick={() => navigate('/lodging-dashboard#properties')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Properties
              </Button>
              <Button
                variant={currentSection === 'rooms' ? "default" : "outline"}
                onClick={() => navigate('/lodging-dashboard#rooms')}
                className="flex items-center gap-2"
              >
                <Bed className="h-4 w-4" />
                Rooms
              </Button>
              <Button
                variant={currentSection === 'bookings' ? "default" : "outline"}
                onClick={() => navigate('/lodging-dashboard#bookings')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Bookings
              </Button>
            </div>

            {/* Overview Section */}
            {currentSection === 'overview' && (
            <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Properties</CardTitle>
                      <Home className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalProperties}</div>
                      <p className="text-xs text-muted-foreground">Total properties</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rooms</CardTitle>
                      <Bed className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRooms}</div>
                      <p className="text-xs text-muted-foreground">Total rooms</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.activeBookings}</div>
                      <p className="text-xs text-muted-foreground">Confirmed & checked in</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">From completed bookings</p>
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
                                {booking.lodging_properties?.name || "Property"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {booking.profiles?.display_name || "Guest"} • {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                              </p>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
            )}

            {/* Properties Section */}
            {currentSection === 'properties' && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Properties</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your lodging properties
                    </p>
                  </div>
                  <Button onClick={() => setShowAddProperty(!showAddProperty)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Button>
                </div>

                {showAddProperty && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add New Property</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddProperty} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Property Name</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="property_type">Property Type</Label>
                            <Select name="property_type" required>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hotel">Hotel</SelectItem>
                                <SelectItem value="bed_breakfast">Bed & Breakfast</SelectItem>
                                <SelectItem value="vacation_rental">Vacation Rental</SelectItem>
                                <SelectItem value="hostel">Hostel</SelectItem>
                                <SelectItem value="resort">Resort</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Input id="address" name="address" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input id="city" name="city" required />
                          </div>
                          <div>
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" name="country" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="check_in_time">Check-in Time</Label>
                            <Input id="check_in_time" name="check_in_time" type="time" defaultValue="14:00" />
                          </div>
                          <div>
                            <Label htmlFor="check_out_time">Check-out Time</Label>
                            <Input id="check_out_time" name="check_out_time" type="time" defaultValue="11:00" />
                          </div>
                        </div>
                        <Button type="submit">Create Property</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <Card key={property.id}>
                      <CardHeader>
                        <CardTitle>{property.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{property.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{property.city}, {property.country}</span>
                          </div>
                          <Badge variant="outline">{property.property_type}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {properties.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No properties yet</p>
                      <Button onClick={() => setShowAddProperty(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Property
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

            {/* Rooms Section */}
            {currentSection === 'rooms' && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Rooms</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage rooms for your properties
                    </p>
                  </div>
                  <Button onClick={() => setShowAddRoom(!showAddRoom)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Room
                  </Button>
                </div>

                {showAddRoom && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add New Room</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddRoom} className="space-y-4">
                        <div>
                          <Label htmlFor="property-select">Property</Label>
                          <Select value={selectedProperty} onValueChange={setSelectedProperty} required>
                            <SelectTrigger id="property-select">
                              <SelectValue placeholder="Select a property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map((property) => (
                                <SelectItem key={property.id} value={property.id}>
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="room_type">Room Type</Label>
                          <Input id="room_type" name="room_type" placeholder="e.g., Standard, Deluxe, Suite" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="max_guests">Max Guests</Label>
                            <Input id="max_guests" name="max_guests" type="number" min="1" required />
                          </div>
                          <div>
                            <Label htmlFor="price_per_night">Price per Night (TZS)</Label>
                            <Input id="price_per_night" name="price_per_night" type="number" step="0.01" required />
                          </div>
                        </div>
                        <Button type="submit" disabled={!selectedProperty}>Add Room</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <Card key={room.id}>
                      <CardHeader>
                        <CardTitle>{room.room_type}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{room.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Guests:</span>
                            <span>{room.max_guests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium">{formatCurrency(room.price_per_night)}/night</span>
                          </div>
                          {room.is_available ? (
                            <Badge variant="default">Available</Badge>
                          ) : (
                            <Badge variant="outline">Unavailable</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {rooms.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No rooms yet</p>
                      <Button onClick={() => setShowAddRoom(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Room
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

            {/* Bookings Section */}
            {currentSection === 'bookings' && (
            <div className="mt-6">
                <h2 className="text-2xl font-semibold mb-6">Bookings</h2>
                <div className="space-y-4">
                  {(bookings || []).map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold mb-2">
                              {booking.lodging_properties?.name || "Property"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Guest: {booking.profiles?.display_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Guests: {booking.number_of_guests} • Total: {formatCurrency(booking.total_amount)}
                            </p>
                            {booking.special_requests && (
                              <p className="text-sm mt-2">{booking.special_requests}</p>
                            )}
                          </div>
                          {getStatusBadge(booking.status)}
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
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}