import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatPrice as formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ImageUpload } from "@/components/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import { 
  Music, 
  Users, 
  TrendingUp, 
  DollarSign,
  Plus, 
  Loader2, 
  Play, 
  BarChart3,
  Upload,
  Eye
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: string;
  plays: number;
  likes: number;
  image_url: string;
  audio_url: string;
  price: number;
  is_published: boolean;
  created_at: string;
}

interface Stats {
  totalTracks: number;
  totalPlays: number;
  totalEarnings: number;
  followerCount: number;
}

export default function MusicianDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = window.location.hash.replace('#', '') || 'overview';
  
  const [isMusician, setIsMusician] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalTracks: 0,
    totalPlays: 0,
    totalEarnings: 0,
    followerCount: 0
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [formData, setFormData] = useState({
    image_url: "",
    audio_url: ""
  });

  useEffect(() => {
    checkMusicianRole();
    
    // If no hash, default to overview
    if (!window.location.hash) {
      navigate('/musician-dashboard#overview', { replace: true });
    }
  }, [user, window.location.hash, navigate]);

  useEffect(() => {
    if (isMusician) {
      fetchData();
    }
  }, [isMusician, currentSection]);

  const checkMusicianRole = async () => {
    if (!user || !profile) return;
    
    try {
      // Check if user has musician role
      const userHasRole = profile.roles.includes('musician');

      if (!userHasRole) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this dashboard",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      setIsMusician(true);
    } catch (error) {
      console.error('Role check error:', error);
      toast({
        title: "Error",
        description: "Failed to verify musician role",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setCheckingRole(false);
    }
  };

  const fetchData = async () => {
    try {
      // Mock data for demonstration
      // In a real implementation, you would fetch from the API
      const mockTracks: Track[] = [
        {
          id: "1",
          title: "My First Track",
          artist: profile?.display_name || "Unknown Artist",
          genre: "Bongo Flava",
          duration: "3:45",
          plays: 1250,
          likes: 89,
          image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
          audio_url: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3",
          price: 0,
          is_published: true,
          created_at: new Date().toISOString()
        },
        {
          id: "2",
          title: "Another Hit",
          artist: profile?.display_name || "Unknown Artist",
          genre: "Afrobeat",
          duration: "4:12",
          plays: 890,
          likes: 45,
          image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
          audio_url: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3",
          price: 500,
          is_published: true,
          created_at: new Date().toISOString()
        }
      ];
      
      setTracks(mockTracks);
      
      // Mock stats
      const mockStats: Stats = {
        totalTracks: mockTracks.length,
        totalPlays: mockTracks.reduce((sum, track) => sum + track.plays, 0),
        totalEarnings: 25000,
        followerCount: 1200
      };
      
      setStats(mockStats);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
    }
  };

  const handleAddTrack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      // In a real implementation, you would call the API to create a track
      // await api.createTrack({
      //   title: formData.get("title") as string,
      //   description: formData.get("description") as string || null,
      //   genre: formData.get("genre") as string,
      //   price: parseFloat(formData.get("price") as string) || 0,
      //   image_url: formData.get("image_url") as string || null,
      //   audio_url: formData.get("audio_url") as string || null,
      //   is_published: isPublished
      // });
      
      toast({ title: "Success", description: "Track created!" });
      setShowAddTrack(false);
      setIsPublished(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create track", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrency(amount, 'TZS');
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isMusician || !user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarProvider>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-4 border-b border-border px-4 py-4">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Musician Dashboard</h1>
          </div>
          <div className="container mx-auto px-4 pt-8 pb-12">
            
            {/* Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
              <Button
                variant={currentSection === 'overview' ? "default" : "outline"}
                onClick={() => navigate('/musician-dashboard#overview')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={currentSection === 'tracks' ? "default" : "outline"}
                onClick={() => navigate('/musician-dashboard#tracks')}
                className="flex items-center gap-2"
              >
                <Music className="h-4 w-4" />
                My Tracks
              </Button>
              <Button
                variant={currentSection === 'analytics' ? "default" : "outline"}
                onClick={() => navigate('/musician-dashboard#analytics')}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Analytics
              </Button>
            </div>

            {/* Overview Section */}
            {currentSection === 'overview' && (
            <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Tracks</CardTitle>
                      <Music className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalTracks}</div>
                      <p className="text-xs text-muted-foreground">
                        Published tracks
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalPlays.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">All time plays</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Followers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.followerCount.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total followers</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
                      <p className="text-xs text-muted-foreground">From track sales</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Tracks */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tracks</CardTitle>
                    <CardDescription>Your latest uploaded tracks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tracks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No tracks yet</p>
                    ) : (
                      <div className="space-y-4">
                        {tracks.slice(0, 3).map((track) => (
                          <div key={track.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <img 
                                src={track.image_url} 
                                alt={track.title}
                                className="w-16 h-16 rounded-md object-cover"
                              />
                              <div>
                                <h3 className="font-semibold">{track.title}</h3>
                                <p className="text-sm text-muted-foreground">{track.genre} • {track.plays} plays</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={track.is_published ? "default" : "outline"}>
                                {track.is_published ? "Published" : "Draft"}
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/music/${track.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
            )}

            {/* Tracks Section */}
            {currentSection === 'tracks' && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">My Tracks</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your music tracks
                    </p>
                  </div>
                  <Button onClick={() => setShowAddTrack(!showAddTrack)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Track
                  </Button>
                </div>

                {showAddTrack && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Upload New Track</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddTrack} className="space-y-4">
                        {user && (
                          <div>
                            <Label htmlFor="track-image">Track Cover Art</Label>
                            <ImageUpload
                              bucket="music"
                              userId={user.id}
                              onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                              currentImage={formData.image_url}
                            />
                          </div>
                        )}
                        <div>
                          <Label htmlFor="track-title">Track Title</Label>
                          <Input id="track-title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="track-description">Description</Label>
                          <Textarea id="track-description" name="description" rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="genre">Genre</Label>
                            <Select name="genre" defaultValue="Bongo Flava">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bongo Flava">Bongo Flava</SelectItem>
                                <SelectItem value="Afrobeat">Afrobeat</SelectItem>
                                <SelectItem value="R&B">R&B</SelectItem>
                                <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                                <SelectItem value="Gospel">Gospel</SelectItem>
                                <SelectItem value="Traditional">Traditional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="price">Price (TZS)</Label>
                            <Input id="price" name="price" type="number" step="0.01" defaultValue="0" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="audio-file">Audio File</Label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-border">
                            <div className="space-y-1 text-center">
                              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                              <div className="flex text-sm text-muted-foreground">
                                <label htmlFor="audio-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80">
                                  <span>Upload a file</span>
                                  <input id="audio-upload" name="audio_url" type="file" className="sr-only" accept="audio/*" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-muted-foreground">MP3, WAV, FLAC up to 100MB</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            id="is_published" 
                            checked={isPublished}
                            onCheckedChange={setIsPublished}
                          />
                          <Label htmlFor="is_published">Publish Track</Label>
                        </div>
                        <Button type="submit">Upload Track</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tracks.map((track) => (
                    <Card key={track.id}>
                      <div className="relative">
                        <img
                          src={track.image_url}
                          alt={track.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge variant={track.is_published ? "default" : "outline"}>
                            {track.is_published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{track.title}</CardTitle>
                        <CardDescription>{track.artist} • {track.genre}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span>{track.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Plays:</span>
                            <span>{track.plays.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Likes:</span>
                            <span>{track.likes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium">
                              {track.price > 0 ? formatCurrency(track.price) : "Free"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/music/${track.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {tracks.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload your first track to start sharing your music with the world.
                      </p>
                      <Button onClick={() => setShowAddTrack(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Your First Track
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

            {/* Analytics Section */}
            {currentSection === 'analytics' && (
            <div className="mt-6">
                <h2 className="text-2xl font-semibold mb-6">Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Plays Over Time</CardTitle>
                      <CardDescription>Track your plays over the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">Analytics chart would appear here</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Tracks</CardTitle>
                      <CardDescription>Your most popular tracks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {tracks
                          .sort((a, b) => b.plays - a.plays)
                          .slice(0, 5)
                          .map((track, index) => (
                            <div key={track.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-muted-foreground w-6">
                                  {index + 1}
                                </span>
                                <div>
                                  <h4 className="font-medium">{track.title}</h4>
                                  <p className="text-sm text-muted-foreground">{track.plays.toLocaleString()} plays</p>
                                </div>
                              </div>
                              <Badge variant="secondary">{track.likes} likes</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
            </div>
            )}
          </div>
        </div>
      </SidebarProvider>
    </SidebarProvider>
  );
}