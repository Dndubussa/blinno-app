import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, X, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function AdvancedSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "all",
    category: searchParams.get("category") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    location: searchParams.get("location") || "",
    rating: searchParams.get("rating") || "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (query || Object.values(filters).some((v) => v)) {
      performSearch();
    }
  }, []);

  const performSearch = async () => {
    setLoading(true);
    try {
      // This will use the enhanced search API when backend is ready
      const products = await api.getProducts({
        search: query,
        category: filters.category || undefined,
      });

      let filtered = products || [];

      // Apply price filter
      if (filters.minPrice) {
        filtered = filtered.filter(
          (p: any) => parseFloat(p.price) >= parseFloat(filters.minPrice)
        );
      }
      if (filters.maxPrice) {
        filtered = filtered.filter(
          (p: any) => parseFloat(p.price) <= parseFloat(filters.maxPrice)
        );
      }

      // Apply rating filter
      if (filters.rating) {
        filtered = filtered.filter(
          (p: any) => (p.rating || 0) >= parseFloat(filters.rating)
        );
      }

      setResults(filtered);
    } catch (error: any) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Failed to perform search",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const clearFilters = () => {
    setFilters({
      type: "all",
      category: "",
      minPrice: "",
      maxPrice: "",
      location: "",
      rating: "",
    });
    setQuery("");
    setResults([]);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Advanced Search</h1>
            <p className="text-muted-foreground">
              Find exactly what you're looking for
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for products, creators, services..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Category
                    </label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) =>
                        setFilters({ ...filters, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        <SelectItem value="art">Art</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="writing">Writing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Min Price
                    </label>
                    <Input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, minPrice: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Max Price
                    </label>
                    <Input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, maxPrice: e.target.value })
                      }
                      placeholder="No limit"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Min Rating
                    </label>
                    <Select
                      value={filters.rating}
                      onValueChange={(value) =>
                        setFilters({ ...filters, rating: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any rating</SelectItem>
                        <SelectItem value="4">4+ stars</SelectItem>
                        <SelectItem value="3">3+ stars</SelectItem>
                        <SelectItem value="2">2+ stars</SelectItem>
                        <SelectItem value="1">1+ star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                  <Button onClick={performSearch}>Apply Filters</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <div className="mb-4">
            <p className="text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{formatPrice(parseFloat(item.price))}</p>
                        {item.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <span>⭐</span>
                            <span>{item.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {query || Object.values(filters).some((v) => v)
                    ? "No results found. Try adjusting your search or filters."
                    : "Start typing to search..."}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
}

