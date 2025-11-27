import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UserCurrencySettings } from "@/components/UserCurrencySettings";
import { UserLanguageSettings } from "@/components/UserLanguageSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Filter } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { optimizeAvatar } from "@/lib/imageOptimizer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Available categories matching the platform
const CATEGORIES = [
  "News & Media",
  "Creativity",
  "Events",
  "Marketplace",
  "Music",
  "Restaurants",
  "Lodging",
  "Education",
  "Jobs",
  "Artisans",
  "Movies",
  "Community",
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to portfolio
  const currentSection = location.hash.replace('#', '') || 'portfolio';
  
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioImageUrl, setPortfolioImageUrl] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newPortfolioCategory, setNewPortfolioCategory] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
    
    // If no hash, default to portfolio
    if (!location.hash) {
      navigate('/dashboard#portfolio', { replace: true });
    }
  }, [user, location.hash, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const portfolioData = await api.getPortfolios({ creatorId: user.id });
      const bookingData = await api.getBookings('creator');
      
      setPortfolios(portfolioData || []);
      setBookings(bookingData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to fetch data", 
        variant: "destructive" 
      });
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!newPortfolioCategory) {
      toast({ 
        title: "Error", 
        description: "Please select a category", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const portfolioFormData = new FormData();
      portfolioFormData.append('title', formData.get("title") as string);
      portfolioFormData.append('description', formData.get("description") as string);
      portfolioFormData.append('category', newPortfolioCategory);
      portfolioFormData.append('tags', JSON.stringify((formData.get("tags") as string).split(",").map(t => t.trim())));
      if (portfolioImageUrl) {
        portfolioFormData.append('image_url', portfolioImageUrl);
      }

      await api.createPortfolio(portfolioFormData);
      toast({ title: "Success", description: "Portfolio item added!" });
      setShowAddPortfolio(false);
      setPortfolioImageUrl("");
      setNewPortfolioCategory("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add portfolio", variant: "destructive" });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);

    const profileFormData = new FormData();
    profileFormData.append('display_name', formData.get("displayName") as string);
    profileFormData.append('bio', formData.get("bio") as string || '');
    profileFormData.append('location', formData.get("location") as string || '');
    profileFormData.append('phone', formData.get("phone") as string || '');
    profileFormData.append('website', formData.get("website") as string || '');

    try {
      await api.updateProfile(profileFormData);
      toast({ title: "Success", description: "Profile updated!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    }
    setIsUpdatingProfile(false);
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user) return;

    try {
      const formData = new FormData();
      formData.append('avatar_url', url);
      await api.updateProfile(formData);
      toast({ title: "Success", description: "Avatar updated!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update avatar", variant: "destructive" });
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      await api.deletePortfolio(id);
      toast({ title: "Success", description: "Portfolio item deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete portfolio", variant: "destructive" });
    }
  };

  // Get unique categories from user's portfolios
  const getUserCategories = () => {
    const categories = new Set(portfolios.map((p) => p.category));
    return Array.from(categories).sort();
  };

  // Filter portfolios by selected category
  const filteredPortfolios = selectedCategory === "all" 
    ? portfolios 
    : portfolios.filter((p) => p.category === selectedCategory);

  // Get category statistics
  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    portfolios.forEach((p) => {
      stats[p.category] = (stats[p.category] || 0) + 1;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  if (!user) return null;

  const navigationTabs = [
    { id: "portfolio", label: "My Portfolio", icon: Filter },
    { id: "bookings", label: "Bookings", icon: Filter },
    { id: "profile", label: "Profile Settings", icon: Filter },
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="portfolio"
    >

      {/* Portfolio Section */}
      {currentSection === 'portfolio' && (
      <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Portfolio Items</h2>
                    <p className="text-sm text-muted-foreground">
                      {portfolios.length} total items across {getUserCategories().length} categories
                    </p>
                  </div>
                  <Button onClick={() => setShowAddPortfolio(!showAddPortfolio)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {/* Category Statistics */}
                {Object.keys(categoryStats).length > 0 && (
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Category Overview</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(categoryStats).map(([category, count]) => (
                          <Badge 
                            key={category} 
                            variant={selectedCategory === category ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setSelectedCategory(category)}
                          >
                            {category} ({count})
                          </Badge>
                        ))}
                        <Badge 
                          variant={selectedCategory === "all" ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setSelectedCategory("all")}
                        >
                          All ({portfolios.length})
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Category Filter */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-4">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[200px]">
                        <div className="flex items-center gap-2 flex-1">
                          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <SelectValue placeholder="Filter by category">
                            {selectedCategory === "all" ? "All Categories" : selectedCategory}
                          </SelectValue>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUserCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category} ({categoryStats[category] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategory !== "all" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCategory("all")}
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                  {selectedCategory !== "all" && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        Showing: {selectedCategory} ({filteredPortfolios.length} items)
                      </Badge>
                    </div>
                  )}
                </div>

                {showAddPortfolio && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add Portfolio Item</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddPortfolio} className="space-y-4">
                        <div>
                          <Label htmlFor="portfolio-image">Image</Label>
                          <ImageUpload
                            bucket="portfolios"
                            userId={user?.id || ""}
                            onUploadComplete={setPortfolioImageUrl}
                            maxSizeMB={10}
                          />
                        </div>
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select 
                            value={newPortfolioCategory} 
                            onValueChange={setNewPortfolioCategory}
                            required
                          >
                            <SelectTrigger id="category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="tags">Tags (comma separated)</Label>
                          <Input id="tags" name="tags" placeholder="design, art, photography" />
                        </div>
                        <Button type="submit" disabled={!portfolioImageUrl}>
                          Add Portfolio Item
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {filteredPortfolios.length === 0 && selectedCategory !== "all" && (
                  <Card className="mb-6">
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">
                        No portfolio items found in "{selectedCategory}" category.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSelectedCategory("all")}
                      >
                        View All Categories
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPortfolios.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-semibold">{item.title}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePortfolio(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge>{item.category}</Badge>
                          {item.tags?.map((tag: string) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {filteredPortfolios.length === 0 && selectedCategory === "all" && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No portfolio items yet</p>
                      <Button onClick={() => setShowAddPortfolio(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Item
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
                  {bookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">No bookings yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold mb-2">
                                {booking.services?.title || "Service"}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                Client: {booking.profiles?.display_name || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground mb-2">
                                {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Status: {booking.status}
                              </p>
                            </div>
                            <Badge variant={
                              booking.status === 'confirmed' ? "default" :
                              booking.status === 'pending' ? "secondary" :
                              booking.status === 'completed' ? "default" :
                              "outline"
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
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
                          placeholder="Tell us about yourself and your services..."
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

                {/* Currency Settings */}
                <UserCurrencySettings
                  currentCurrency={profile?.currency || 'USD'}
                  onCurrencyChange={(newCurrency) => {
                    // Refresh profile to get updated currency
                    window.location.reload();
                  }}
                />

                {/* Language Settings */}
                <UserLanguageSettings
                  currentLanguage={profile?.language || 'en'}
                  onLanguageChange={(newLanguage) => {
                    // Refresh profile to get updated language
                    window.location.reload();
                  }}
                />
      </div>
      )}
    </DashboardLayout>
  );
}