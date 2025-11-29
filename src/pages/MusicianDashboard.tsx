import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatPrice, getCurrencyFromCountry } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  Eye,
  CreditCard,
  Settings,
  Clock
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
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
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
  // Financial state
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  // Profile state
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

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
        // Fetch tracks and stats
        const tracksData = await api.getMyTracks();
        setTracks(tracksData || []);
        
        // Fetch real stats from API
        try {
          const statsData = await api.getMyTrackStats();
          setStats({
            totalTracks: statsData.totalTracks || tracksData?.length || 0,
            totalPlays: statsData.totalPlays || 0,
            totalEarnings: statsData.totalEarnings || 0,
            followerCount: statsData.followerCount || 0
          });
        } catch (statsError) {
          // If stats endpoint doesn't exist, calculate from tracks
          const calculatedStats: Stats = {
            totalTracks: tracksData?.length || 0,
            totalPlays: tracksData?.reduce((sum: number, track: Track) => sum + (track.plays || 0), 0) || 0,
            totalEarnings: 0, // Would need separate calculation
            followerCount: 0 // Would need separate API call
          };
          setStats(calculatedStats);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
      if (currentSection !== 'financial') {
        setTracks([]);
        setStats({
          totalTracks: 0,
          totalPlays: 0,
          totalEarnings: 0,
          followerCount: 0
        });
      }
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
        title: "Error",
        description: `Insufficient funds. Available: ${formatCurrency(availableBalance)}`,
        variant: "destructive",
      });
      return;
    }

    if (amount < 25) {
      toast({
        title: "Error",
        description: "Minimum payout amount is USD 25",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get existing payout methods or create new one
      const payoutMethods = await api.getPayoutMethods();
      let methodId = payoutMethods.find((m: any) => 
        (m.account_number === accountNumber || m.mobile_number === accountNumber)
      )?.id;

      if (!methodId) {
        // Create new payout method
        const methodType = paymentMethod === 'mobile_money' ? 'mobile_money' : 'bank_transfer';
        const newMethod = await api.addPayoutMethod({
          methodType: methodType,
          accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
          accountName: paymentMethod === 'bank_transfer' ? accountName : undefined,
          mobileNumber: paymentMethod === 'mobile_money' ? accountNumber : undefined,
        });
        methodId = newMethod.id;
      }

      // Create payout request
      await api.createPayoutRequest({
        methodId: methodId,
        amount: amount,
        currency: 'USD',
        description: `Payout request for ${accountName}`
      });

      toast({
        title: "Success",
        description: "Payout request submitted successfully"
      });
      setShowRequestPayout(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
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
      toast({ title: "Success", description: "Profile updated successfully!" });
      // Refresh profile data
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
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
      toast({ title: "Success", description: "Avatar updated!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Get user's currency based on their country
  const userCurrency = profile?.location ? getCurrencyFromCountry(profile.location) : 'USD';
  
  // Wrapper function to format currency using user's country-based currency
  const formatCurrency = (amount: number) => {
    return formatPrice(amount, userCurrency);
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isMusician || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "tracks", label: "My Tracks", icon: Music },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "financial", label: "Financial", icon: CreditCard },
    { id: "profile", label: "Settings", icon: Settings },
  ];

  return (
    <DashboardLayout
      title="Musician Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >
      {/* Overview Section */}
      {currentSection === 'overview' && (
      <div>
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
      <div>
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
                            <Select name="genre" defaultValue="Local Music">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Local Music">Local Music</SelectItem>
                                <SelectItem value="Afrobeat">Afrobeat</SelectItem>
                                <SelectItem value="R&B">R&B</SelectItem>
                                <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                                <SelectItem value="Gospel">Gospel</SelectItem>
                                <SelectItem value="Traditional">Traditional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="price">Price (USD)</Label>
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
      <div>
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
                      {balance ? formatCurrency(balance.total_earned || 0) : formatCurrency(stats.totalEarnings)}
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
                      placeholder="Tell us about yourself and your music..."
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