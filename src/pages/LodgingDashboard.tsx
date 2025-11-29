import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { hasRole, getPrimaryRole } from "@/lib/roleCheck";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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
  Clock,
  CreditCard,
  Settings
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { formatPrice, getCurrencyFromCountry } from "@/lib/currency";

export default function LodgingDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
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
  // Financial state
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  // Profile state
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
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
  }, [isLodging, user, currentSection]);

  const checkLodgingRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('lodging');

      if (!userHasRole && primaryRole !== 'lodging') {
        toast({
          title: t("common.accessDenied"),
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
        title: t("common.error"),
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
      // Fetch data based on current section
      if (currentSection === 'financial') {
        // Fetch financial data
        const [balanceData, transactionsData, payoutsData] = await Promise.all([
          api.getBalance().catch(() => null),
          api.getTransactions({ limit: 50 }).catch(() => ({ transactions: [] })),
          api.getPayoutHistory().catch(() => [])
        ]);
        setBalance(balanceData);
        setTransactions(transactionsData?.transactions || []);
        setPayouts(payoutsData || []);
      } else {
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
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: t("common.error"),
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
      
      toast({ title: t("common.success"), description: t("common.propertyCreated") });
      setShowAddProperty(false);
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToCreate"), variant: "destructive" });
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

      toast({ title: t("common.success"), description: t("common.roomAdded") });
      setShowAddRoom(false);
      setSelectedProperty("");
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToCreate"), variant: "destructive" });
    }
  };

  const handleUpdateProperty = async (id: string, data: any) => {
    try {
      await api.updateLodgingProperty(id, data);
      toast({ title: t("common.success"), description: t("common.propertyUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      await api.deleteLodgingProperty(id);
      toast({ title: t("common.success"), description: t("common.propertyDeleted") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToDelete"), variant: "destructive" });
    }
  };

  const handleUpdateRoom = async (id: string, data: any) => {
    try {
      await api.updateLodgingRoom(id, data);
      toast({ title: t("common.success"), description: t("common.roomUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      await api.deleteLodgingRoom(id);
      toast({ title: t("common.success"), description: t("common.roomDeleted") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToDelete"), variant: "destructive" });
    }
  };

  const handleUpdateBooking = async (id: string, data: any) => {
    try {
      await api.updateLodgingBooking(id, data);
      toast({ title: t("common.success"), description: t("common.bookingUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await api.deleteLodgingBooking(id);
      toast({ title: t("common.success"), description: t("common.bookingDeleted") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToDelete"), variant: "destructive" });
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await api.updateLodgingBookingStatus(bookingId, status);
      toast({ title: t("common.success"), description: t("common.bookingStatusUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
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

  // Get user's currency based on their country
  const userCurrency = profile?.location ? getCurrencyFromCountry(profile.location) : 'USD';
  
  const formatCurrency = (amount: number) => {
    return formatPrice(amount, userCurrency);
  };

  const handleRequestPayout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !balance) return;

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const accountName = formData.get("accountName") as string;

    const availableBalance = balance?.available_balance || 0;
    
    if (amount > availableBalance) {
      toast({
        title: t("common.error"),
        description: `Insufficient funds. Available: ${formatCurrency(availableBalance)}`,
        variant: "destructive",
      });
      return;
    }

    if (amount < 25) {
      toast({
        title: t("common.error"),
        description: "Minimum payout amount is USD 25",
        variant: "destructive",
      });
      return;
    }

    try {
      const payoutMethods = await api.getPayoutMethods();
      let methodId = payoutMethods.find((m: any) => 
        (m.account_number === accountNumber || m.mobile_number === accountNumber)
      )?.id;

      if (!methodId) {
        const methodType = paymentMethod === 'mobile_money' ? 'mobile_money' : 'bank_transfer';
        const newMethod = await api.addPayoutMethod({
          methodType: methodType,
          accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
          accountName: paymentMethod === 'bank_transfer' ? accountName : undefined,
          mobileNumber: paymentMethod === 'mobile_money' ? accountNumber : undefined,
        });
        methodId = newMethod.id;
      }

      await api.createPayoutRequest({
        methodId: methodId,
        amount: amount,
        currency: 'USD',
        description: `Payout request for ${accountName}`
      });

      toast({
        title: t("common.success"),
        description: "Payout request submitted successfully"
      });
      setShowRequestPayout(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to submit payout request",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);

    const profileFormData = new FormData();
    profileFormData.append('displayName', formData.get("displayName") as string);
    profileFormData.append('bio', formData.get("bio") as string || '');
    profileFormData.append('location', formData.get("location") as string || '');
    profileFormData.append('phone', formData.get("phone") as string || '');
    profileFormData.append('website', formData.get("website") as string || '');

    try {
      await api.updateProfile(profileFormData);
      toast({ title: t("common.success"), description: "Profile updated successfully!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user) return;
    try {
      const formData = new FormData();
      formData.append('avatar_url', url);
      await api.updateProfile(formData);
      toast({ title: t("common.success"), description: "Avatar updated!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLodging || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "properties", label: "Properties", icon: Home },
    { id: "rooms", label: "Rooms", icon: Bed },
    { id: "bookings", label: "Bookings", icon: Calendar },
  ];

  return (
    <DashboardLayout
      title="Lodging Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >

      {/* Overview Section */}
      {currentSection === 'overview' && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Properties"
                    value={stats.totalProperties}
                    description="Total properties"
                    icon={Home}
                    variant="primary"
                  />
                  <StatCard
                    title="Rooms"
                    value={stats.totalRooms}
                    description="Total rooms"
                    icon={Bed}
                    variant="default"
                  />
                  <StatCard
                    title="Active Bookings"
                    value={stats.activeBookings}
                    description="Confirmed & checked in"
                    icon={Calendar}
                    variant="success"
                  />
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    description="From completed bookings"
                    icon={DollarSign}
                    variant="success"
                  />
                </div>

                {/* Recent Bookings */}
                <SectionCard
                  title="Recent Bookings"
                  description="Your latest booking activity"
                  icon={Calendar}
                >
                  {(bookings || []).slice(0, 5).length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No bookings yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(bookings || []).slice(0, 5).map((booking) => (
                        <div 
                          key={booking.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                              {booking.lodging_properties?.name || "Property"}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {booking.profiles?.display_name || "Guest"} • {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-4">
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
            </div>
            )}

      {/* Properties Section */}
      {currentSection === 'properties' && (
      <div>
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
      <div>
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
                              <SelectValue placeholder={t("common.selectProperty")} />
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
                            <Label htmlFor="price_per_night">Price per Night (USD)</Label>
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
      <div>
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

      {/* Financial Section */}
      {currentSection === 'financial' && (
      <div>
            <div className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {balance ? formatCurrency(balance.available_balance || 0) : formatCurrency(0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Ready for payout</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {balance ? formatCurrency(balance.pending_balance || 0) : formatCurrency(0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Awaiting payment</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {balance ? formatCurrency(balance.total_earned || 0) : formatCurrency(stats.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {balance ? formatCurrency(balance.total_paid_out || 0) : formatCurrency(0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Withdrawn funds</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payout Request Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Payouts</CardTitle>
                      <CardDescription>Request payouts of your earnings</CardDescription>
                    </div>
                    <Button 
                      onClick={() => setShowRequestPayout(!showRequestPayout)}
                      disabled={!balance || (balance.available_balance || 0) < 25}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Request Payout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!balance || (balance.available_balance || 0) < 25 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Minimum payout amount is USD 25. Available balance: {formatCurrency(balance?.available_balance || 0)}
                    </p>
                  ) : null}

                  {showRequestPayout && (
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Request Payout</CardTitle>
                        <CardDescription>
                          Available: {formatCurrency(balance?.available_balance || 0)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleRequestPayout} className="space-y-4">
                          <div>
                            <Label htmlFor="payout-amount">Amount (USD)</Label>
                            <Input
                              id="payout-amount"
                              name="amount"
                              type="number"
                              step="0.01"
                              min="25"
                              max={balance?.available_balance || 0}
                              required
                              placeholder="25"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Minimum: USD 25
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="payment-method">Payment Method</Label>
                            <Select name="paymentMethod" required>
                              <SelectTrigger id="payment-method">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="clickpesa">Click Pesa</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="account-number">Account Number / Phone Number</Label>
                            <Input
                              id="account-number"
                              name="accountNumber"
                              type="text"
                              required
                              placeholder="e.g., 0712345678 or Account Number"
                            />
                          </div>
                          <div>
                            <Label htmlFor="account-name">Account Name</Label>
                            <Input
                              id="account-name"
                              name="accountName"
                              type="text"
                              required
                              placeholder="Account holder name"
                            />
                          </div>
                          <Button type="submit" className="w-full">
                            Submit Payout Request
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {payouts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No payout requests yet</p>
                  ) : (
                    <div className="space-y-4">
                      {payouts.map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold">Payout #{payout.id?.slice(0, 8) || 'N/A'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {payout.payment_method || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">{formatCurrency(payout.amount || 0)}</div>
                            <Badge variant={
                              payout.status === 'completed' ? 'default' :
                              payout.status === 'pending' ? 'secondary' :
                              payout.status === 'processing' ? 'secondary' :
                              'destructive'
                            }>
                              {payout.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>Your recent financial transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold">{transaction.description || transaction.type || 'Transaction'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount || 0))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Balance: {formatCurrency(transaction.balance_after || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        </div>
      )}

      {/* Profile Section */}
      {currentSection === 'profile' && (
      <div>
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <Label htmlFor="avatar">Profile Avatar</Label>
                    <div className="mt-2">
                      {profile?.avatar_url ? (
                        <div className="flex items-start gap-4 mb-4">
                          <img
                            src={profile.avatar_url}
                            alt="Current avatar"
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        </div>
                      ) : null}
                      <ImageUpload
                        bucket="avatars"
                        userId={user?.id || ""}
                        onUploadComplete={handleAvatarUpload}
                        currentImage={profile?.avatar_url}
                        maxSizeMB={2}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      defaultValue={profile?.display_name}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      defaultValue={profile?.bio || ""}
                      placeholder="Tell us about your lodging business..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={profile?.location || ""}
                      placeholder="City, Country"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={profile?.phone || ""}
                      placeholder="+1 (XXX) XXX-XXXX"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      defaultValue={profile?.website || ""}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
        </div>
      )}
    </DashboardLayout>
  );
}