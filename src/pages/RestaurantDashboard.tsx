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
  Plus, 
  Loader2, 
  UtensilsCrossed,
  Menu,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Globe
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function RestaurantDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isRestaurant, setIsRestaurant] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalMenuItems: 0,
    pendingReservations: 0,
    todayReservations: 0,
  });
  
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [acceptsReservations, setAcceptsReservations] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkRestaurantRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/restaurant-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isRestaurant) {
      fetchData();
    }
  }, [isRestaurant, user]);

  const checkRestaurantRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('restaurant');

      if (!userHasRole && primaryRole !== 'restaurant') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for restaurant owners.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsRestaurant(true);
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
      // Fetch restaurants, menu items, reservations, and stats using API
      const [restaurantsData, menuData, reservationsData, statsData] = await Promise.all([
        api.getRestaurants(),
        api.getMenuItems(),
        api.getRestaurantReservations(),
        api.getDashboardStats('restaurant'),
      ]);

      setRestaurants(restaurantsData || []);
      setMenuItems(menuData || []);
      setReservations(reservationsData || []);
      
      if (statsData) {
        setStats({
          totalRestaurants: statsData.totalRestaurants || 0,
          totalMenuItems: statsData.totalMenuItems || 0,
          pendingReservations: statsData.pendingReservations || 0,
          todayReservations: statsData.todayReservations || 0,
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

  const handleAddRestaurant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const restaurantData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      cuisine_type: formData.get("cuisine_type") as string,
      price_range: formData.get("price_range") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      website: formData.get("website") as string,
      accepts_reservations: acceptsReservations,
      delivery_available: deliveryAvailable,
    };

    try {
      await api.createRestaurant(restaurantData);
      toast({ title: "Success", description: "Restaurant created!" });
      setShowAddRestaurant(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create restaurant", variant: "destructive" });
    }
  };

  const handleUpdateRestaurant = async (id: string, data: any) => {
    try {
      await api.updateRestaurant(id, data);
      toast({ title: "Success", description: "Restaurant updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update restaurant", variant: "destructive" });
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    try {
      await api.deleteRestaurant(id);
      toast({ title: "Success", description: "Restaurant deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete restaurant", variant: "destructive" });
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedRestaurant) return;

    const formData = new FormData(e.currentTarget);
    const menuItemData = {
      restaurant_id: selectedRestaurant,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      price: parseFloat(formData.get("price") as string),
    };

    try {
      await api.createMenuItem(menuItemData);
      toast({ title: "Success", description: "Menu item created!" });
      setShowAddMenuItem(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create menu item", variant: "destructive" });
    }
  };

  const handleUpdateMenuItem = async (id: string, data: any) => {
    try {
      await api.updateMenuItem(id, data);
      toast({ title: "Success", description: "Menu item updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update menu item", variant: "destructive" });
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await api.deleteMenuItem(id);
      toast({ title: "Success", description: "Menu item deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete menu item", variant: "destructive" });
    }
  };

  const handleUpdateReservationStatus = async (reservationId: string, newStatus: string) => {
    try {
      await api.updateRestaurantReservationStatus(reservationId, newStatus);
      toast({ title: "Success", description: "Reservation status updated!" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update reservation status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      confirmed: { variant: "default" as const, icon: CheckCircle2 },
      seated: { variant: "default" as const, icon: CheckCircle2 },
      completed: { variant: "default" as const, icon: CheckCircle2 },
      pending: { variant: "secondary" as const, icon: Clock },
      cancelled: { variant: "destructive" as const, icon: XCircle },
      no_show: { variant: "destructive" as const, icon: XCircle },
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
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRestaurant || !user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-4 border-b border-border px-4 py-4">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
          </div>
          <div className="container mx-auto px-4 pt-8 pb-12">
            
            {/* Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
              <Button
                variant={currentSection === 'overview' ? "default" : "outline"}
                onClick={() => navigate('/restaurant-dashboard#overview')}
                className="flex items-center gap-2"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={currentSection === 'restaurants' ? "default" : "outline"}
                onClick={() => navigate('/restaurant-dashboard#restaurants')}
                className="flex items-center gap-2"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Restaurants
              </Button>
              <Button
                variant={currentSection === 'menu' ? "default" : "outline"}
                onClick={() => navigate('/restaurant-dashboard#menu')}
                className="flex items-center gap-2"
              >
                <Menu className="h-4 w-4" />
                Menu
              </Button>
              <Button
                variant={currentSection === 'reservations' ? "default" : "outline"}
                onClick={() => navigate('/restaurant-dashboard#reservations')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Reservations
              </Button>
            </div>

            {/* Overview Section */}
            {currentSection === 'overview' && (
            <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
                      <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
                      <p className="text-xs text-muted-foreground">Total restaurants</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
                      <Menu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalMenuItems}</div>
                      <p className="text-xs text-muted-foreground">Total menu items</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Reservations</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.pendingReservations}</div>
                      <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Today's Reservations</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.todayReservations}</div>
                      <p className="text-xs text-muted-foreground">Reservations today</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Reservations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reservations</CardTitle>
                    <CardDescription>Your latest reservation activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(reservations || []).slice(0, 5).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No reservations yet</p>
                    ) : (
                      <div className="space-y-4">
                        {(reservations || []).slice(0, 5).map((reservation) => (
                          <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold">
                                {reservation.restaurants?.name || "Restaurant"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {reservation.profiles?.display_name || "Guest"} • {new Date(reservation.reservation_date).toLocaleDateString()} at {reservation.reservation_time}
                              </p>
                            </div>
                            {getStatusBadge(reservation.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
            )}

            {/* Restaurants Section */}
            {currentSection === 'restaurants' && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Restaurants</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your restaurant listings
                    </p>
                  </div>
                  <Button onClick={() => setShowAddRestaurant(!showAddRestaurant)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Restaurant
                  </Button>
                </div>

                {showAddRestaurant && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add New Restaurant</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddRestaurant} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Restaurant Name</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cuisine_type">Cuisine Type</Label>
                            <Input id="cuisine_type" name="cuisine_type" placeholder="e.g., Italian, African, Asian" required />
                          </div>
                          <div>
                            <Label htmlFor="price_range">Price Range</Label>
                            <Select name="price_range">
                              <SelectTrigger>
                                <SelectValue placeholder="Select price range" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="$">$ - Budget</SelectItem>
                                <SelectItem value="$$">$$ - Moderate</SelectItem>
                                <SelectItem value="$$$">$$$ - Expensive</SelectItem>
                                <SelectItem value="$$$$">$$$$ - Very Expensive</SelectItem>
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
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" type="tel" />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" />
                          </div>
                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" name="website" type="url" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch 
                              id="accepts_reservations" 
                              checked={acceptsReservations}
                              onCheckedChange={setAcceptsReservations}
                            />
                            <Label htmlFor="accepts_reservations">Accepts Reservations</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch 
                              id="delivery_available" 
                              checked={deliveryAvailable}
                              onCheckedChange={setDeliveryAvailable}
                            />
                            <Label htmlFor="delivery_available">Delivery Available</Label>
                          </div>
                        </div>
                        <Button type="submit">Create Restaurant</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restaurants.map((restaurant) => (
                    <Card key={restaurant.id}>
                      <CardHeader>
                        <CardTitle>{restaurant.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{restaurant.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{restaurant.city}, {restaurant.country}</span>
                          </div>
                          <Badge variant="outline">{restaurant.cuisine_type}</Badge>
                          {restaurant.price_range && (
                            <div className="text-muted-foreground">
                              Price: {restaurant.price_range}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {restaurants.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No restaurants yet</p>
                      <Button onClick={() => setShowAddRestaurant(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Restaurant
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

            {/* Menu Section */}
            {currentSection === 'menu' && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Menu Items</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your restaurant menus
                    </p>
                  </div>
                  <Button onClick={() => setShowAddMenuItem(!showAddMenuItem)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Menu Item
                  </Button>
                </div>

                {showAddMenuItem && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add Menu Item</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddMenuItem} className="space-y-4">
                        <div>
                          <Label htmlFor="restaurant-select">Restaurant</Label>
                          <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant} required>
                            <SelectTrigger id="restaurant-select">
                              <SelectValue placeholder="Select a restaurant" />
                            </SelectTrigger>
                            <SelectContent>
                              {restaurants.map((restaurant) => (
                                <SelectItem key={restaurant.id} value={restaurant.id}>
                                  {restaurant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="item-name">Item Name</Label>
                          <Input id="item-name" name="name" required />
                        </div>
                        <div>
                          <Label htmlFor="item-description">Description</Label>
                          <Textarea id="item-description" name="description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" name="category" placeholder="e.g., Appetizer, Main Course, Dessert" required />
                          </div>
                          <div>
                            <Label htmlFor="price">Price (TZS)</Label>
                            <Input id="price" name="price" type="number" step="0.01" required />
                          </div>
                        </div>
                        <Button type="submit" disabled={!selectedRestaurant}>Add Menu Item</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {menuItems.map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle>{item.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                        <div className="space-y-2 text-sm">
                          <Badge variant="outline">{item.category}</Badge>
                          <div className="font-medium">{formatCurrency(item.price)}</div>
                          {item.is_available ? (
                            <Badge variant="default">Available</Badge>
                          ) : (
                            <Badge variant="outline">Unavailable</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {menuItems.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No menu items yet</p>
                      <Button onClick={() => setShowAddMenuItem(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Menu Item
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

            {/* Reservations Section */}
            {currentSection === 'reservations' && (
            <div className="mt-6">
                <h2 className="text-2xl font-semibold mb-6">Reservations</h2>
                <div className="space-y-4">
                  {(reservations || []).map((reservation) => (
                    <Card key={reservation.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold mb-2">
                              {reservation.restaurants?.name || "Restaurant"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Guest: {reservation.profiles?.display_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(reservation.reservation_date).toLocaleDateString()} at {reservation.reservation_time}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Party Size: {reservation.number_of_guests}
                            </p>
                            {reservation.special_requests && (
                              <p className="text-sm mt-2">{reservation.special_requests}</p>
                            )}
                          </div>
                          {getStatusBadge(reservation.status)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(reservations || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No reservations yet</p>
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