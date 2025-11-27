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
  Newspaper,
  Eye,
  Heart,
  TrendingUp,
  FileText,
  CheckCircle2,
  XCircle,
  Edit
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";

const NEWS_CATEGORIES = [
  "Politics",
  "Business",
  "Technology",
  "Entertainment",
  "Sports",
  "Health",
  "Education",
  "Culture",
  "Local News",
  "International"
];

export default function JournalistDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isJournalist, setIsJournalist] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    totalViews: 0,
    totalLikes: 0,
  });
  
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [articleImageUrl, setArticleImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkJournalistRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/journalist-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isJournalist) {
      fetchData();
    }
  }, [isJournalist, user]);

  const checkJournalistRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('journalist');

      if (!userHasRole && primaryRole !== 'journalist') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for journalists.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsJournalist(true);
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
      const [articlesData, statsData] = await Promise.all([
        api.getNewsArticles(),
        api.getDashboardStats('journalist'),
      ]);

      setArticles(articlesData || []);
      
      if (statsData) {
        setStats({
          totalArticles: statsData.totalArticles || 0,
          publishedArticles: statsData.publishedArticles || 0,
          totalViews: statsData.totalCategories || 0, // Using available stat
          totalLikes: 0,
        });
      }
    } catch (error: any) {
      console.error("Error fetching articles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch articles.",
        variant: "destructive",
      });
    }
  };

  const handleAddArticle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const tags = (formData.get("tags") as string).split(",").map(t => t.trim()).filter(t => t);

    try {
      await api.createNewsArticle({
        title: formData.get("title") as string,
        content: formData.get("content") as string,
        excerpt: formData.get("excerpt") as string,
        category: formData.get("category") as string,
        tags: tags,
        coverImageUrl: articleImageUrl || null,
        isPublished,
        isFeatured,
      });

      toast({
        title: "Success",
        description: "Article created successfully!",
      });
      
      setShowAddArticle(false);
      setArticleImageUrl("");
      setIsPublished(false);
      setIsFeatured(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      });
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      await api.deleteNewsArticle(id);

      toast({
        title: "Success",
        description: "Article deleted successfully!",
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

  const handleUpdateArticle = async (id: string, data: any) => {
    try {
      await api.updateNewsArticle(id, data);

      toast({
        title: "Success",
        description: "Article updated successfully!",
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
      profileData.append('website', formData.get("website") as string);
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

  if (!isJournalist || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: Newspaper },
    { id: "articles", label: "Articles", icon: FileText },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <DashboardLayout
      title="Journalist Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >
      {/* Overview Section */}
      {currentSection === 'overview' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Your journalism dashboard at a glance
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalArticles}</div>
                      <p className="text-xs text-muted-foreground">Written articles</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Published Articles</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.publishedArticles}</div>
                      <p className="text-xs text-muted-foreground">Live articles</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Article views</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                      <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalLikes}</div>
                      <p className="text-xs text-muted-foreground">Article likes</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Articles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Articles</CardTitle>
                    <CardDescription>Your latest published articles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(articles || []).slice(0, 5).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No articles yet</p>
                    ) : (
                      <div className="space-y-4">
                        {(articles || []).slice(0, 5).map((article) => (
                          <div key={article.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold">{article.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(article.created_at).toLocaleDateString()} • {article.category}
                              </p>
                            </div>
                            <Badge variant={article.is_published ? "default" : "secondary"}>
                              {article.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

      {/* Articles Section */}
      {currentSection === 'articles' && (
      <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Articles</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your news articles
                    </p>
                  </div>
                  <Button onClick={() => setShowAddArticle(!showAddArticle)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Article
                  </Button>
                </div>

                {showAddArticle && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Create New Article</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddArticle} className="space-y-4">
                        <div>
                          <Label htmlFor="article-image">Cover Image</Label>
                          <ImageUpload
                            bucket="portfolios"
                            userId={user?.id || ""}
                            onUploadComplete={setArticleImageUrl}
                          />
                        </div>
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="excerpt">Excerpt</Label>
                          <Textarea id="excerpt" name="excerpt" rows={2} placeholder="Brief summary..." />
                        </div>
                        <div>
                          <Label htmlFor="content">Content</Label>
                          <Textarea id="content" name="content" rows={10} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select name="category" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {NEWS_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="tags">Tags (comma-separated)</Label>
                            <Input id="tags" name="tags" placeholder="politics, economy, sports" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-published"
                              checked={isPublished}
                              onCheckedChange={setIsPublished}
                            />
                            <Label htmlFor="is-published">Publish Article</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-featured"
                              checked={isFeatured}
                              onCheckedChange={setIsFeatured}
                            />
                            <Label htmlFor="is-featured">Feature Article</Label>
                          </div>
                        </div>
                        <Button type="submit">Create Article</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(articles || []).map((article) => (
                    <Card key={article.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{article.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant={article.is_published ? "default" : "secondary"}>
                              {article.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteArticle(article.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{article.category}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{article.excerpt}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span>{new Date(article.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Views:</span>
                            <span>{article.view_count || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Likes:</span>
                            <span>{article.like_count || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(articles || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No articles yet</p>
                      <Button onClick={() => setShowAddArticle(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Write Your First Article
                      </Button>
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
                    Update your journalist profile information
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
                          placeholder="Tell us about your journalism experience"
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
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          defaultValue={profile?.website || ""}
                          placeholder="https://example.com"
                        />
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