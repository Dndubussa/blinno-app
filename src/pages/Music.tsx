import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Play, Pause, Heart, Share2, Filter, Music as MusicIcon, Volume2 } from "lucide-react";
import { MediaPlayer } from "@/components/MediaPlayer";

const tracks = [
  {
    id: 1,
    title: "Waah!",
    artist: "Diamond Platnumz",
    genre: "Bongo Flava",
    duration: "3:45",
    plays: "15M",
    likes: "2.5M",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    badge: "🔥 Trending",
    audioUrl: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3" // Sample audio URL
  },
  {
    id: 2,
    title: "Mwana",
    artist: "Ali Kiba",
    genre: "Bongo Flava",
    duration: "4:12",
    plays: "8M",
    likes: "1.2M",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
    badge: "⭐ Featured",
    audioUrl: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3" // Sample audio URL
  },
  {
    id: 3,
    title: "Sijaona",
    artist: "Harmonize",
    genre: "Afrobeat",
    duration: "3:58",
    plays: "12M",
    likes: "1.8M",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=600&fit=crop",
    badge: "🎵 Top Chart",
    audioUrl: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3" // Sample audio URL
  },
  {
    id: 4,
    title: "Kigoma",
    artist: "Alikiba & Abdukiba",
    genre: "Bongo Flava",
    duration: "3:32",
    plays: "10M",
    likes: "1.5M",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop",
    badge: "🔥 Trending",
    audioUrl: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3" // Sample audio URL
  },
  {
    id: 5,
    title: "Naogopa",
    artist: "Vanessa Mdee",
    genre: "R&B",
    duration: "4:05",
    plays: "7M",
    likes: "980K",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
    badge: "💫 Rising",
    audioUrl: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3" // Sample audio URL
  },
  {
    id: 6,
    title: "Dume Suruali",
    artist: "Mwana FA",
    genre: "Hip Hop",
    duration: "3:50",
    plays: "6M",
    likes: "850K",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&h=600&fit=crop",
    badge: "🎤 Classic",
    audioUrl: "https://sample-videos.com/audio/mp3/crowd-cheering.mp3" // Sample audio URL
  }
];

const Music = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === "all" || track.genre === genreFilter;
    
    return matchesSearch && matchesGenre;
  });

  const togglePlayback = (trackId: number) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(trackId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Music</h1>
            <p className="text-muted-foreground">Discover and stream the best Bongo Flava and Tanzanian music</p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tracks or artists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={genreFilter} onValueChange={setGenreFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    <SelectItem value="Bongo Flava">Bongo Flava</SelectItem>
                    <SelectItem value="Afrobeat">Afrobeat</SelectItem>
                    <SelectItem value="R&B">R&B</SelectItem>
                    <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Currently Playing Track */}
          {currentlyPlaying && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Now Playing</h2>
                <MediaPlayer 
                  url={tracks.find(t => t.id === currentlyPlaying)?.audioUrl || ""}
                  type="audio"
                  title={tracks.find(t => t.id === currentlyPlaying)?.title || "Unknown Track"}
                />
              </CardContent>
            </Card>
          )}

          {/* Tracks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTracks.map((track) => (
              <Card key={track.id} className="overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="relative group">
                  <img 
                    src={track.image} 
                    alt={track.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      size="lg" 
                      className="rounded-full h-16 w-16 p-0"
                      onClick={() => togglePlayback(track.id)}
                    >
                      {currentlyPlaying === track.id ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-accent text-accent-foreground">
                      {track.badge}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-1">{track.title}</h3>
                  <p className="text-muted-foreground mb-3">{track.artist}</p>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MusicIcon className="h-4 w-4" />
                      <span>{track.genre}</span>
                    </div>
                    <span>{track.duration}</span>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Plays</div>
                      <div className="text-sm font-semibold text-foreground">{track.plays}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Likes</div>
                      <div className="text-sm font-semibold text-foreground">{track.likes}</div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => togglePlayback(track.id)}
                    >
                      {currentlyPlaying === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Music;