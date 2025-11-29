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
import { Trash2, Plus, Loader2, Filter, BookOpen, Edit, Download } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { FileUpload } from "@/components/FileUpload";
import { optimizeAvatar } from "@/lib/imageOptimizer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { getPrimaryRole } from "@/lib/roleCheck";

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
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to portfolio
  const currentSection = location.hash.replace('#', '') || 'portfolio';
  
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [portfolioImageUrl, setPortfolioImageUrl] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newPortfolioCategory, setNewPortfolioCategory] = useState<string>("");
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookThumbnail, setBookThumbnail] = useState<File | string | null>(null);
  const [bookPreview, setBookPreview] = useState<File | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
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
      
      // Fetch books if user is a seller
      const primaryRole = profile ? getPrimaryRole(profile) : null;
      let booksData: any[] = [];
      if (primaryRole === 'seller' || (Array.isArray(profile?.roles) && profile.roles.includes('seller'))) {
        try {
          booksData = await api.getMyDigitalProducts();
        } catch (err) {
          console.error('Error fetching books:', err);
        }
      }
      
      setPortfolios(portfolioData || []);
      setBookings(bookingData || []);
      setBooks(booksData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ 
        title: t("common.error"), 
        description: error.message || t("dashboard.failedToFetch"), 
        variant: "destructive" 
      });
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!newPortfolioCategory) {
      toast({ 
        title: t("common.error"), 
        description: t("dashboard.selectCategory"), 
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
      toast({ title: t("common.success"), description: t("dashboard.portfolioItemAdded") });
      setShowAddPortfolio(false);
      setPortfolioImageUrl("");
      setNewPortfolioCategory("");
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dashboard.failedToAddPortfolio"), variant: "destructive" });
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
      toast({ title: t("common.success"), description: t("dashboard.profileUpdated") });
      window.location.reload();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dashboard.failedToUpdateProfile"), variant: "destructive" });
    }
    setIsUpdatingProfile(false);
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user) return;

    try {
      const formData = new FormData();
      formData.append('avatar_url', url);
      await api.updateProfile(formData);
      toast({ title: t("common.success"), description: t("dashboard.avatarUpdated") });
      window.location.reload();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dashboard.failedToUpdateAvatar"), variant: "destructive" });
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      await api.deletePortfolio(id);
      toast({ title: t("common.success"), description: t("dashboard.portfolioItemDeleted") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dashboard.failedToDeletePortfolio"), variant: "destructive" });
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

  const primaryRole = profile ? getPrimaryRole(profile) : null;
  const isSeller = primaryRole === 'seller' || (Array.isArray(profile?.roles) && profile.roles.includes('seller'));

  const navigationTabs = [
    { id: "portfolio", label: t("dashboard.myPortfolio"), icon: Filter },
    ...(isSeller ? [{ id: "books", label: "My Books", icon: BookOpen }] : []),
    { id: "bookings", label: t("dashboard.bookings"), icon: Filter },
    { id: "profile", label: t("dashboard.profileSettings"), icon: Filter },
  ];

  return (
    <DashboardLayout
      title={t("dashboard.title")}
      navigationTabs={navigationTabs}
      defaultSection="portfolio"
    >

      {/* Portfolio Section */}
      {currentSection === 'portfolio' && (
      <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{t("dashboard.portfolioItems")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.totalItemsAcrossCategories", { count: portfolios.length, categories: getUserCategories().length })}
                    </p>
                  </div>
                  <Button onClick={() => setShowAddPortfolio(!showAddPortfolio)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("dashboard.addItem")}
                  </Button>
                </div>

                {/* Category Statistics */}
                {Object.keys(categoryStats).length > 0 && (
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("dashboard.categoryOverview")}</span>
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
                          {t("dashboard.all")} ({portfolios.length})
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
                          <SelectValue placeholder={t("dashboard.filterByCategory")}>
                            {selectedCategory === "all" ? t("dashboard.allCategories") : selectedCategory}
                          </SelectValue>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("dashboard.allCategories")}</SelectItem>
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
                        {t("dashboard.clearFilter")}
                      </Button>
                    )}
                  </div>
                  {selectedCategory !== "all" && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        {t("dashboard.showing", { category: selectedCategory, count: filteredPortfolios.length })}
                      </Badge>
                    </div>
                  )}
                </div>

                {showAddPortfolio && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>{t("dashboard.addPortfolioItem")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddPortfolio} className="space-y-4">
                        <div>
                          <Label htmlFor="portfolio-image">{t("common.image")}</Label>
                          <ImageUpload
                            bucket="portfolios"
                            userId={user?.id || ""}
                            onUploadComplete={setPortfolioImageUrl}
                            maxSizeMB={10}
                          />
                        </div>
                        <div>
                          <Label htmlFor="title">{t("dashboard.itemTitle")}</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="description">{t("common.description")}</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <div>
                          <Label htmlFor="category">{t("dashboard.category")}</Label>
                          <Select 
                            value={newPortfolioCategory} 
                            onValueChange={setNewPortfolioCategory}
                            required
                          >
                            <SelectTrigger id="category">
                              <SelectValue placeholder={t("dashboard.selectCategory")} />
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
                          <Label htmlFor="tags">{t("dashboard.tags")}</Label>
                          <Input id="tags" name="tags" placeholder={t("dashboard.tagsPlaceholder")} />
                        </div>
                        <Button type="submit" disabled={!portfolioImageUrl}>
                          {t("dashboard.addPortfolioItem")}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {filteredPortfolios.length === 0 && selectedCategory !== "all" && (
                  <Card className="mb-6">
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">
                        {t("dashboard.noItemsInCategory", { category: selectedCategory })}
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSelectedCategory("all")}
                      >
                        {t("dashboard.viewAllCategories")}
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
                      <p className="text-muted-foreground mb-4">{t("dashboard.noPortfolioItemsYet")}</p>
                      <Button onClick={() => setShowAddPortfolio(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("dashboard.addYourFirstItem")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

      {/* Books Section (for sellers) */}
      {currentSection === 'books' && isSeller && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">My Books</h2>
              <p className="text-sm text-muted-foreground">
                Manage your digital books and ebooks ({books.length} total)
              </p>
            </div>
            <Button onClick={() => {
              setShowAddBook(true);
              setEditingBook(null);
              setBookFile(null);
              setBookThumbnail(null);
              setBookPreview(null);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Book
            </Button>
          </div>

          {(showAddBook || editingBook) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingBook ? "Edit Book" : "Upload New Book"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;

                  const formData = new FormData(e.currentTarget);
                  
                  if (!bookFile && !editingBook) {
                    toast({
                      title: "Error",
                      description: "Please upload a book file (PDF, EPUB, MOBI, AZW3, or FB2)",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    const bookFormData = new FormData();
                    bookFormData.append('title', formData.get("title") as string);
                    bookFormData.append('description', formData.get("description") as string);
                    bookFormData.append('category', 'ebook');
                    bookFormData.append('price', formData.get("price") as string);
                    bookFormData.append('currency', formData.get("currency") as string || 'USD');
                    
                    const tags = (formData.get("tags") as string)?.split(",").map(t => t.trim()).filter(t => t) || [];
                    if (tags.length > 0) {
                      bookFormData.append('tags', JSON.stringify(tags));
                    }

                    if (bookFile) {
                      bookFormData.append('file', bookFile);
                    }
                    if (bookThumbnail && bookThumbnail instanceof File) {
                      bookFormData.append('thumbnail', bookThumbnail);
                    }
                    if (bookPreview) {
                      bookFormData.append('preview', bookPreview);
                    }

                    if (editingBook) {
                      await api.updateDigitalProduct(editingBook, bookFormData);
                      toast({ title: "Success", description: "Book updated successfully" });
                    } else {
                      await api.createDigitalProduct(bookFormData);
                      toast({ title: "Success", description: "Book uploaded successfully" });
                    }

                    setShowAddBook(false);
                    setEditingBook(null);
                    setBookFile(null);
                    setBookThumbnail(null);
                    setBookPreview(null);
                    fetchData();
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to save book",
                      variant: "destructive",
                    });
                  }
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="book-file">Book File *</Label>
                    <FileUpload
                      onFileSelect={(file) => setBookFile(file)}
                      currentFile={editingBook ? books.find(b => b.id === editingBook)?.file_url : null}
                      accept=".pdf,.epub,.mobi,.azw3,.fb2"
                      maxSizeMB={50}
                      description="PDF, EPUB, MOBI, AZW3, or FB2 (max 50MB)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="book-thumbnail">Book Cover Image</Label>
                    <Input
                      id="book-thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBookThumbnail(file);
                        }
                      }}
                      className="mt-2"
                    />
                    {editingBook && books.find(b => b.id === editingBook)?.thumbnail_url && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-2">Current cover:</p>
                        <img
                          src={books.find(b => b.id === editingBook)?.thumbnail_url}
                          alt="Current cover"
                          className="w-32 h-48 object-cover rounded border"
                        />
                      </div>
                    )}
                    {bookThumbnail && bookThumbnail instanceof File && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-2">New cover preview:</p>
                        <img
                          src={URL.createObjectURL(bookThumbnail)}
                          alt="Preview"
                          className="w-32 h-48 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="book-title">Title *</Label>
                    <Input
                      id="book-title"
                      name="title"
                      defaultValue={editingBook ? books.find(b => b.id === editingBook)?.title : ""}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="book-description">Description *</Label>
                    <Textarea
                      id="book-description"
                      name="description"
                      defaultValue={editingBook ? books.find(b => b.id === editingBook)?.description : ""}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="book-price">Price *</Label>
                      <Input
                        id="book-price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingBook ? books.find(b => b.id === editingBook)?.price : ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="book-currency">Currency</Label>
                      <Select
                        name="currency"
                        defaultValue={editingBook ? books.find(b => b.id === editingBook)?.currency || 'USD' : profile?.currency || 'USD'}
                      >
                        <SelectTrigger id="book-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="TSh">TSh</SelectItem>
                          <SelectItem value="KES">KES</SelectItem>
                          <SelectItem value="UGX">UGX</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="book-tags">Tags (comma-separated)</Label>
                    <Input
                      id="book-tags"
                      name="tags"
                      placeholder="fiction, novel, romance"
                      defaultValue={editingBook ? books.find(b => b.id === editingBook)?.tags?.join(", ") : ""}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingBook ? "Update Book" : "Upload Book"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddBook(false);
                        setEditingBook(null);
                        setBookFile(null);
                        setBookThumbnail("");
                        setBookPreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {books.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No books uploaded yet</p>
                <Button onClick={() => setShowAddBook(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Your First Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <Card key={book.id} className="overflow-hidden">
                  {book.thumbnail_url ? (
                    <img
                      src={book.thumbnail_url}
                      alt={book.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{book.title}</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBook(book.id);
                            setShowAddBook(true);
                            setBookFile(null);
                            setBookThumbnail(null);
                            setBookPreview(null);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this book?")) {
                              try {
                                await api.deleteDigitalProduct(book.id);
                                toast({ title: "Success", description: "Book deleted successfully" });
                                fetchData();
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to delete book",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{book.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold">
                          {book.currency || 'USD'} {parseFloat(book.price).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {book.sales_count || 0} sales • {book.download_count || 0} downloads
                        </p>
                      </div>
                      <Badge variant={book.is_active ? "default" : "secondary"}>
                        {book.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {book.tags && book.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-3">
                        {book.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings Section */}
      {currentSection === 'bookings' && (
      <div>
        <h2 className="text-2xl font-semibold mb-6">{t("dashboard.bookings")}</h2>
                <div className="space-y-4">
                  {bookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">{t("dashboard.noBookingsYet")}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold mb-2">
                                {booking.services?.title || t("dashboard.service")}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {t("dashboard.client")}: {booking.profiles?.display_name || t("dashboard.unknown")}
                              </p>
                              <p className="text-sm text-muted-foreground mb-2">
                                {new Date(booking.booking_date).toLocaleDateString()} {t("dashboard.at")} {booking.booking_time}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t("common.status")}: {booking.status}
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
                    <CardTitle>{t("dashboard.profileSettings")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div>
                        <Label htmlFor="avatar">{t("dashboard.profileAvatar")}</Label>
                        <div className="mt-2">
                          {profile?.avatar_url ? (
                            <div className="flex items-start gap-4 mb-4">
                              <img
                                src={profile.avatar_url}
                                alt={t("dashboard.currentAvatar")}
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
                        <Label htmlFor="displayName">{t("dashboard.displayName")}</Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          defaultValue={profile?.display_name}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="bio">{t("dashboard.bio")}</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          defaultValue={profile?.bio || ""}
                          placeholder={t("dashboard.bioPlaceholder")}
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="location">{t("dashboard.location")}</Label>
                        <Input
                          id="location"
                          name="location"
                          defaultValue={profile?.location || ""}
                          placeholder={t("dashboard.locationPlaceholder")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">{t("dashboard.phone")}</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          defaultValue={profile?.phone || ""}
                          placeholder={t("dashboard.phonePlaceholder")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="website">{t("dashboard.website")}</Label>
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          defaultValue={profile?.website || ""}
                          placeholder={t("dashboard.websitePlaceholder")}
                        />
                      </div>

                      <div>
                        <Label>{t("dashboard.email")}</Label>
                        <Input value={user?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("dashboard.emailCannotBeChanged")}
                        </p>
                      </div>

                      <Button type="submit" disabled={isUpdatingProfile}>
                        {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("dashboard.saveChanges")}
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