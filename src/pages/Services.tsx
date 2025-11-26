import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatPrice as formatCurrency, formatPricePerUnit as formatCurrencyPerUnit } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Filter, Star, Loader2, X, Calendar, Clock, User, Briefcase } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnimatedSection } from "@/components/AnimatedSection";

type Service = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  price: number | null;
  pricing_type: string;
  rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
  display_name?: string;
  avatar_url?: string;
  service_type: 'freelancer' | 'artisan' | 'restaurant' | 'event' | 'lodging';
};

const Services = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  useEffect(() => {
    fetchServices();
  }, [categoryFilter, locationFilter, serviceTypeFilter, searchQuery]);

  const fetchServices = async () => {
    try {
      const servicesData = await api.getServices({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        location: locationFilter !== 'all' ? locationFilter : undefined,
        serviceType: serviceTypeFilter !== 'all' ? serviceTypeFilter : undefined,
        search: searchQuery || undefined,
      });
      
      setServices(servicesData || []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load services. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bookService = (service: Service) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book services",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    // Navigate to booking page with service creator
    navigate(`/booking?creator=${service.creator_id}`);
  };

  const formatPrice = (price: number | null, pricingType: string) => {
    if (!price) return "Price on request";
    
    const formattedPrice = formatCurrency(price, 'TZS'); // Default to TZS, but could be dynamic
    
    switch (pricingType) {
      case 'hourly':
        return formatCurrencyPerUnit(price, 'TZS', 'hour');
      case 'daily':
        return formatCurrencyPerUnit(price, 'TZS', 'day');
      default:
        return formattedPrice;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'freelancer':
        return 'Freelancer Service';
      case 'artisan':
        return 'Artisan Service';
      case 'restaurant':
        return 'Restaurant';
      case 'event':
        return 'Event';
      case 'lodging':
        return 'Lodging';
      default:
        return 'Service';
    }
  };

  const getUniqueCategories = () => {
    const categories = new Set(services.map((s) => s.category));
    return Array.from(categories).sort();
  };

  const getUniqueLocations = () => {
    const locations = services
      .map((s) => s.location)
      .filter((loc): loc is string => loc !== null);
    return Array.from(new Set(locations)).sort();
  };

  const getServiceTypes = () => {
    const types = new Set(services.map((s) => s.service_type));
    return Array.from(types).sort();
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || service.location === locationFilter;
    const matchesServiceType = serviceTypeFilter === "all" || service.service_type === serviceTypeFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesServiceType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Services</h1>
            <p className="text-muted-foreground">Discover and book services from local providers</p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {/* Active Filters Display */}
              {(categoryFilter !== "all" || locationFilter !== "all" || serviceTypeFilter !== "all" || searchQuery) && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Category: {categoryFilter}
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Remove category filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {locationFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Location: {locationFilter}
                      <button
                        onClick={() => setLocationFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Remove location filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {serviceTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {getServiceTypeLabel(serviceTypeFilter)}
                      <button
                        onClick={() => setServiceTypeFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Remove service type filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <button
                        onClick={() => setSearchQuery("")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {getUniqueLocations().map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {getServiceTypes().map((type) => (
                      <SelectItem key={type} value={type}>
                        {getServiceTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No services found matching your criteria.</p>
              {(categoryFilter !== "all" || locationFilter !== "all" || serviceTypeFilter !== "all" || searchQuery) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setCategoryFilter("all");
                    setLocationFilter("all");
                    setServiceTypeFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <Card key={service.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg line-clamp-2">{service.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {getServiceTypeLabel(service.service_type)}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{service.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(service.price, service.pricing_type)}
                      </span>
                      {service.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <span className="text-sm font-medium">
                            {service.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">By {service.display_name || "Unknown Provider"}</span>
                      </div>
                      
                      {service.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{service.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <div className="px-6 pb-6">
                    <Button className="w-full" onClick={() => bookService(service)}>
                      Book Service
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Services;