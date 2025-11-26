import { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatPrice as formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, Filter, Star, MapPin, Heart, Plus, Loader2, X, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CategoriesGrid } from "@/components/CategoriesGrid";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO } from "@/components/SEO";

type Product = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  location: string | null;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
  display_name?: string;
  avatar_url?: string;
  type?: "product" | "course";
};

type Course = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  type: "course";
};

const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<(Product | Course)[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, locationFilter, searchQuery]);

  const fetchProducts = async () => {
    try {
      // Fetch products
      const productsData = await api.getProducts({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        location: locationFilter !== 'all' ? locationFilter : undefined,
        search: searchQuery || undefined,
      });

      // Fetch courses
      const coursesData = await api.getCourses();
      
      // Combine products and courses
      const allItems = [
        ...productsData.map((p: any) => ({ ...p, type: "product" as const })),
        ...coursesData.map((c: any) => ({ ...c, type: "course" as const }))
      ];

      setProducts(allItems || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      const isSchemaCacheError = 
        error.code === 'PGRST205' || // Table not in schema cache
        error.message?.includes('schema cache') ||
        error.message?.includes('Could not find the table');
      
      const is404Error = 
        error.code === 'PGRST116' || 
        error.message?.includes('404') || 
        error.status === 404 ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist');

      if (isSchemaCacheError || is404Error) {
        console.log("Table not accessible via API yet. PostgREST schema cache may need to refresh.");
        console.log("This usually resolves automatically within a few minutes.");
        setProducts([]);
        // Show a helpful message to user
        toast({
          title: "Loading...",
          description: "Products table is being set up. Please refresh in a moment.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to load products. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setAddingToCart(productId);
    try {
      await api.addToCart(productId, 1);
      toast({
        title: "Added to cart",
        description: "Item added to your cart",
      });
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive",
      });
    } finally {
      setAddingToCart(null);
    }
  };

  const formatPrice = (price: number) => {
    return formatCurrency(price, 'TZS'); // Default to TZS, but could be dynamic
  };

  const getUniqueCategories = () => {
    const categories = new Set(products.map((p) => p.category));
    return Array.from(categories).sort();
  };

  const getUniqueLocations = () => {
    const locations = products
      .map((p) => p.location)
      .filter((loc): loc is string => loc !== null);
    return Array.from(new Set(locations)).sort();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || product.location === locationFilter;

    return matchesSearch && matchesCategory && matchesLocation;
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
      <SEO
        title="Marketplace - Authentic Tanzanian Products & Courses"
        description="Shop authentic Tanzanian products and online courses from local sellers. Discover handmade crafts, traditional goods, and educational content from Tanzanian creators."
        keywords={["Tanzanian marketplace", "local products", "handmade crafts", "Tanzanian courses", "online shopping Tanzania", "authentic products", "local sellers", "Tanzanian creators"]}
      />
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Marketplace</h1>
            <p className="text-muted-foreground">Shop authentic Tanzanian products and courses from local sellers</p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {/* Active Filters Display */}
              {(categoryFilter !== "all" || locationFilter !== "all" || searchQuery) && (
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
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery("")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter("all");
                      setLocationFilter("all");
                      setSearchQuery("");
                    }}
                    className="h-6 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search Bar - Takes 6 columns on desktop */}
                <div className="md:col-span-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search products and courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                
                {/* Category Filter - Takes 3 columns on desktop */}
                <div className="md:col-span-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-10">
                      <div className="flex items-center gap-2 flex-1">
                        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <SelectValue placeholder="Category">
                          {categoryFilter === "all" ? "All Categories" : categoryFilter}
                        </SelectValue>
                      </div>
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
                </div>

                {/* Location Filter - Takes 3 columns on desktop */}
                <div className="md:col-span-3">
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="h-10">
                      <div className="flex items-center gap-2 flex-1">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <SelectValue placeholder="Location">
                          {locationFilter === "all" ? "All Locations" : locationFilter}
                        </SelectValue>
                      </div>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          {(categoryFilter !== "all" || locationFilter !== "all" || searchQuery) && (
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredProducts.length} of {products.length} items
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-2">No products or courses found.</p>
                {(categoryFilter !== "all" || locationFilter !== "all" || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter("all");
                      setLocationFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col"
                >
                  <div className="relative">
                    <img 
                      src={item.image_url || "https://via.placeholder.com/400x300?text=No+Image"} 
                      alt={item.title}
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=No+Image";
                      }}
                    />
                    {"stock_quantity" in item && item.stock_quantity === 0 && (
                      <div className="absolute top-4 left-4">
                        <Badge variant="destructive">Out of Stock</Badge>
                      </div>
                    )}
                    {"type" in item && item.type === "course" && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="default" className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Course
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 min-h-[3.5rem]">
                        {item.title}
                      </h3>
                      
                      {item.rating && item.rating > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {item.rating.toFixed(1)}
                            </span>
                          </div>
                          {item.reviews_count && item.reviews_count > 0 && (
                            <span className="text-sm text-muted-foreground">
                              ({item.reviews_count} reviews)
                            </span>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">By {item.display_name || "Unknown Seller"}</span>
                        </div>
                        
                        {item.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}

                        {"stock_quantity" in item && item.stock_quantity !== null && item.stock_quantity > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {item.stock_quantity} in stock
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-border gap-3">
                      <span className="text-xl font-bold text-primary whitespace-nowrap">
                        {formatPrice(item.price)}
                      </span>
                      {"type" in item && item.type === "course" ? (
                        <Button 
                          size="sm" 
                          className="gap-2 flex-shrink-0"
                          onClick={() => navigate(`/course/${item.id}`)}
                        >
                          <BookOpen className="h-4 w-4" />
                          <span className="hidden sm:inline">View Course</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="gap-2 flex-shrink-0"
                          onClick={() => addToCart(item.id)}
                          disabled={addingToCart === item.id || ("stock_quantity" in item && item.stock_quantity === 0)}
                        >
                          {addingToCart === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {("stock_quantity" in item && item.stock_quantity === 0) ? "Out of Stock" : "Add to Cart"}
                          </span>
                          <span className="sm:hidden">
                            {("stock_quantity" in item && item.stock_quantity === 0) ? "Out" : "Add"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
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

export default Marketplace;