import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Play, Pause, Heart, Share2, Filter, Music as MusicIcon, Volume2, Loader2, Calendar, User } from "lucide-react";
import { MediaPlayer } from "@/components/MediaPlayer";
import { SEO } from "@/components/SEO";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";
import { formatPrice } from "@/lib/currency";

interface Track {
  id: string;
  title: string;
  artist?: string;
  creator_id?: string;
  display_name?: string;
  genre: string;
  duration?: string;
  plays?: number;
  likes?: number;
  image_url?: string;
  audio_url?: string;
  price?: number;
  is_published?: boolean;
  created_at?: string;
}

const Music = () => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  useEffect(() => {
    fetchTracks();
  }, [genreFilter, searchQuery]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const filters: { genre?: string; search?: string } = {};
      if (genreFilter !== "all") {
        filters.genre = genreFilter;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      const data = await api.getTracks(filters);
      setTracks(data || []);
    } catch (error: any) {
      console.error("Error fetching tracks:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load music tracks",
        variant: "destructive",
      });
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === "all" || track.genre === genreFilter;
    
    return matchesSearch && matchesGenre;
  });

  const togglePlayback = (trackId: string) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(trackId);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getUniqueGenres = () => {
    const genres = new Set(tracks.map(t => t.genre).filter(Boolean));
    return Array.from(genres).sort();
  };

  const getBadge = (track: Track) => {
    if (track.plays && track.plays > 10000) return "🔥 Trending";
    if (track.likes && track.likes > 1000) return "⭐ Featured";
    if (track.price && track.price > 0) return "💰 Premium";
    return "🎵 New";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Music - Discover Local Artists and Tracks"
        description="Explore music from local artists. Listen to various genres and support musicians in your community."
        keywords={["Local music", "Music", "Artists", "Music streaming"]}
      />
      
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Music</h1>
            <p className="text-muted-foreground">Discover and stream the best local music</p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tracks or artists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                
                <Select value={genreFilter} onValueChange={setGenreFilter}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Genre" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    {getUniqueGenres().map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Currently Playing Track */}
          {currentlyPlaying && (
            <Card className="mb-8 bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Now Playing</h2>
                </div>
                <MediaPlayer 
                  url={tracks.find(t => t.id === currentlyPlaying)?.audio_url || ""}
                  type="audio"
                  title={tracks.find(t => t.id === currentlyPlaying)?.title || "Unknown Track"}
                />
              </CardContent>
            </Card>
          )}

          {/* Results Count */}
          {filteredTracks.length > 0 && (
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
            </div>
          )}

          {/* Tracks Grid */}
          {filteredTracks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MusicIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-foreground mb-2">No tracks found</p>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || genreFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Be the first to upload music!"}
                </p>
                {(searchQuery || genreFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setGenreFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTracks.map((track) => (
                <Card 
                  key={track.id} 
                  className="overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img 
                      src={track.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop"} 
                      alt={track.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        size="lg" 
                        className="rounded-full h-16 w-16 p-0 shadow-lg"
                        onClick={() => togglePlayback(track.id)}
                      >
                        {currentlyPlaying === track.id ? (
                          <Pause className="h-8 w-8" />
                        ) : (
                          <Play className="h-8 w-8 ml-1" />
                        )}
                      </Button>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-accent text-accent-foreground shadow-md">
                        {getBadge(track)}
                      </Badge>
                    </div>
                    {track.price && track.price > 0 && (
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary" className="bg-background/90">
                          <MultiCurrencyPrice usdPrice={track.price} size="sm" />
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-1 line-clamp-2">{track.title}</h3>
                    <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{track.display_name || track.artist || "Unknown Artist"}</span>
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MusicIcon className="h-4 w-4" />
                        <span>{track.genre || "Unknown"}</span>
                      </div>
                      {track.duration && (
                        <span>{formatDuration(typeof track.duration === 'string' ? parseInt(track.duration) : track.duration)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-border">
                      {track.plays !== undefined && (
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Plays</div>
                          <div className="text-sm font-semibold text-foreground">{formatNumber(track.plays)}</div>
                        </div>
                      )}
                      {track.likes !== undefined && (
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Likes</div>
                          <div className="text-sm font-semibold text-foreground">{formatNumber(track.likes)}</div>
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => togglePlayback(track.id)}
                        className="flex-shrink-0"
                      >
                        {currentlyPlaying === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="icon" variant="ghost" className="flex-shrink-0">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="flex-shrink-0">
                        <Share2 className="h-4 w-4" />
                      </Button>
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

export default Music;
