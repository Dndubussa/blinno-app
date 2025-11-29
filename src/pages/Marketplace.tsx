import { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatPrice as formatCurrency } from "@/lib/currency";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, Filter, Star, MapPin, Heart, Plus, Loader2, X, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CategoriesGrid } from "@/components/CategoriesGrid";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO } from "@/components/SEO";
import { generateProductSchema } from '@/lib/schemaMarkup';
import { useTranslation } from "react-i18next";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

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

type Book = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  file_url: string;
  preview_url: string | null;
  thumbnail_url: string | null;
  currency: string;
  tags: string[];
  download_count: number;
  sales_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_name?: string;
  avatar_url?: string;
  type: "book";
};

const Marketplace = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [products, setProducts] = useState<(Product | Course | Book)[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "course" | "book">("all");

  // Update category filter when URL query parameter changes
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, locationFilter, searchQuery, typeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const productsData = typeFilter === "all" || typeFilter === "product" 
        ? await api.getProducts({
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            location: locationFilter !== 'all' ? locationFilter : undefined,
            search: searchQuery || undefined,
          })
        : [];

      // Fetch courses
      const coursesData = typeFilter === "all" || typeFilter === "course"
        ? await api.getCourses()
        : [];

      // Fetch books (digital products with category 'ebook')
      const booksData = typeFilter === "all" || typeFilter === "book"
        ? await api.getDigitalProducts({
            category: 'ebook',
            search: searchQuery || undefined,
          })
        : [];
      
      // Combine products, courses, and books
      const allItems = [
        ...productsData.map((p: any) => ({ ...p, type: "product" as const })),
        ...coursesData.map((c: any) => ({ ...c, type: "course" as const })),
        ...booksData.map((b: any) => ({ ...b, type: "book" as const }))
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
          title: t("common.loading"),
          description: t("marketplace.settingUp"),
          duration: 3000,
        });
      } else {
        toast({
          title: t("common.error"),
          description: error.message || t("marketplace.failedToLoad"),
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
        title: t("marketplace.signInRequired"),
        description: t("marketplace.signInToAddToCart"),
        variant: "destructive",
      });
      navigate("/signin");
      return;
    }

    setAddingToCart(productId);
    try {
      await api.addToCart(productId, 1);
      toast({
        title: t("marketplace.addedToCart"),
        description: t("marketplace.itemAddedToCart"),
      });
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("marketplace.failedToAddToCart"),
        variant: "destructive",
      });
    } finally {
      setAddingToCart(null);
    }
  };

  // Keep formatPrice for backward compatibility, but use MultiCurrencyPrice component in UI
  const formatPrice = (price: number) => {
    return formatCurrency(price, 'USD'); // USD is the base currency
  };

  const getUniqueCategories = () => {
    const categories = new Set(products.map((p) => p.category));
    return Array.from(categories).sort();
  };

  const getUniqueLocations = () => {
    const locations = products
      .filter((p): p is Product => 'location' in p)
      .map((p) => (p as Product).location)
      .filter((loc): loc is string => loc !== null);
    return Array.from(new Set(locations)).sort();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ('display_name' in product && product.display_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || ('location' in product && product.location === locationFilter);

    return matchesSearch && matchesCategory && matchesLocation;
  });

  const loadingContent = (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (loading) {
    return user ? (
      <DashboardLayout title={t("marketplace.title")}>
        {loadingContent}
      </DashboardLayout>
    ) : (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16">{loadingContent}</div>
        <Footer />
      </div>
    );
  }

  // Generate schema markup for the first few products
  const productSchemas = products.slice(0, 5).map((product) => 
    generateProductSchema({
      name: product.title,
      description: product.description,
      image: 'image_url' in product ? (product as Product).image_url : undefined,
      price: product.price,
      currency: 'TZS',
      in_stock: !('stock_quantity' in product) || ('stock_quantity' in product && (product as Product).stock_quantity > 0),
      brand: 'display_name' in product ? (product as Product).display_name : undefined,
      average_rating: 'rating' in product ? (product as Product).rating : undefined,
      review_count: 'reviews_count' in product ? (product as Product).reviews_count : undefined,
      url: 'type' in product && product.type === 'course' 
        ? `/course/${product.id}` 
        : `/product/${product.id}`
    })
  );

  const content = (
    <>
      <SEO
        title="Marketplace - Authentic Local Products & Courses"
        description="Shop authentic local products and online courses from sellers worldwide. Discover handmade crafts, traditional goods, and educational content from creators around the globe."
        keywords={["marketplace", "local products", "handmade crafts", "courses", "online shopping", "authentic products", "sellers", "creators"]}
        schemaMarkup={productSchemas.length > 0 ? productSchemas : undefined}
      />
      <div className="mb-8">
        <p className="text-muted-foreground">{t("marketplace.subtitle")}</p>
      </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {/* Active Filters Display */}
              {(categoryFilter !== "all" || locationFilter !== "all" || searchQuery || typeFilter !== "all") && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("marketplace.activeFilters")}:</span>
                  {typeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {typeFilter}
                      <button
                        onClick={() => setTypeFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Remove type filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t("marketplace.category")}: {categoryFilter}
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label={t("marketplace.removeCategoryFilter")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {locationFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t("marketplace.location")}: {locationFilter}
                      <button
                        onClick={() => setLocationFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label={t("marketplace.removeLocationFilter")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      {t("common.search")}: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery("")}
                        className="ml-1 hover:text-destructive"
                        aria-label={t("marketplace.clearSearch")}
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
                      setTypeFilter("all");
                    }}
                    className="h-6 text-xs"
                  >
                    {t("marketplace.clearAll")}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search Bar - Takes 4 columns on desktop */}
                <div className="md:col-span-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={t("marketplace.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                
                {/* Type Filter - Takes 2 columns on desktop */}
                <div className="md:col-span-2">
                  <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Type">
                        {typeFilter === "all" ? "All Types" : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="product">Products</SelectItem>
                      <SelectItem value="course">Courses</SelectItem>
                      <SelectItem value="book">Books</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Category Filter - Takes 3 columns on desktop */}
                <div className="md:col-span-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-10">
                      <div className="flex items-center gap-2 flex-1">
                        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <SelectValue placeholder={t("marketplace.category")}>
                          {categoryFilter === "all" ? t("marketplace.allCategories") : categoryFilter}
                        </SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("marketplace.allCategories")}</SelectItem>
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
                        <SelectValue placeholder={t("marketplace.location")}>
                          {locationFilter === "all" ? t("marketplace.allLocations") : locationFilter}
                        </SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("marketplace.allLocations")}</SelectItem>
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
              {t("marketplace.showingItems", { filtered: filteredProducts.length, total: products.length })}
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-2">{t("marketplace.noProducts")}</p>
                {(categoryFilter !== "all" || locationFilter !== "all" || searchQuery || typeFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter("all");
                      setLocationFilter("all");
                      setSearchQuery("");
                      setTypeFilter("all");
                    }}
                    className="mt-4"
                  >
                    {t("marketplace.clearAll")}
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
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img 
                      src={
                        'thumbnail_url' in item && item.thumbnail_url 
                          ? item.thumbnail_url 
                          : 'image_url' in item 
                            ? item.image_url || PLACEHOLDER_IMAGE.PRODUCT 
                            : PLACEHOLDER_IMAGE.PRODUCT
                      } 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE.PRODUCT;
                      }}
                    />
                    {"stock_quantity" in item && item.stock_quantity === 0 && (
                      <div className="absolute top-4 left-4">
                        <Badge variant="destructive">{t("marketplace.outOfStock")}</Badge>
                      </div>
                    )}
                    {"type" in item && item.type === "course" && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="default" className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {t("marketplace.course")}
                        </Badge>
                      </div>
                    )}
                    {"type" in item && item.type === "book" && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="default" className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Book
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 min-h-[3.5rem]">
                        {item.title}
                      </h3>
                      
                      {'rating' in item && item.rating && item.rating > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {item.rating.toFixed(1)}
                            </span>
                          </div>
                          {'reviews_count' in item && item.reviews_count && item.reviews_count > 0 && (
                            <span className="text-sm text-muted-foreground">
                              ({item.reviews_count} {t("marketplace.reviews")})
                            </span>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{t("marketplace.by")} {('display_name' in item && (item as Product).display_name) || t("marketplace.unknownSeller")}</span>
                        </div>
                        
                        {'location' in item && (item as Product).location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{(item as Product).location}</span>
                          </div>
                        )}

                        {"stock_quantity" in item && item.stock_quantity !== null && item.stock_quantity > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {item.stock_quantity} {t("marketplace.inStock")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-border gap-3">
                      <div className="flex-1 min-w-0">
                        <MultiCurrencyPrice 
                          usdPrice={item.price} 
                          size="lg"
                          className="text-primary"
                        />
                      </div>
                      {"type" in item && item.type === "course" ? (
                        <Button 
                          size="sm" 
                          className="gap-2 flex-shrink-0"
                          onClick={() => navigate(`/course/${item.id}`)}
                        >
                          <BookOpen className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("marketplace.viewCourse")}</span>
                          <span className="sm:hidden">{t("common.view")}</span>
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
                            {("stock_quantity" in item && item.stock_quantity === 0) ? t("marketplace.outOfStock") : t("marketplace.addToCart")}
                          </span>
                          <span className="sm:hidden">
                            {("stock_quantity" in item && item.stock_quantity === 0) ? t("marketplace.out") : t("marketplace.add")}
                          </span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
    </>
  );

  return user ? (
    <DashboardLayout title={t("marketplace.title")}>
      {content}
    </DashboardLayout>
  ) : (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t("marketplace.title")}</h1>
          </div>
          {content}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Marketplace;