import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Music, Play, Pause, Upload, Plus } from "lucide-react";
import { MediaPlayer } from "@/components/MediaPlayer";

export default function MusicTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "Bongo Flava",
    price: "0",
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const data = await api.getTracks();
      setTracks(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tracks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (trackId: string) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(trackId);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real implementation, you would create a FormData object with the track data
    // and call api.createTrack()
    
    toast({
      title: "Success",
      description: "Track uploaded successfully!",
    });
    
    setShowUploadForm(false);
    setFormData({
      title: "",
      description: "",
      genre: "Bongo Flava",
      price: "0",
    });
    
    // Refresh tracks
    fetchTracks();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading music tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">Music Test</h1>
          <p className="text-muted-foreground text-center">
            Test the music playback functionality
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Available Tracks</h2>
          <Button onClick={() => setShowUploadForm(!showUploadForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Track
          </Button>
        </div>

        {showUploadForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload New Track</CardTitle>
              <CardDescription>Upload a new music track to the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="title">Track Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genre">Genre</Label>
                    <Select 
                      value={formData.genre} 
                      onValueChange={(value) => setFormData({...formData, genre: value})}
                    >
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
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Audio File</Label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-border">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="flex text-sm text-muted-foreground">
                        <label htmlFor="audio-file" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80">
                          <span>Upload a file</span>
                          <input id="audio-file" name="audio-file" type="file" className="sr-only" accept="audio/*" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">MP3, WAV, FLAC up to 100MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Upload Track</Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowUploadForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {currentlyPlaying && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Now Playing</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaPlayer 
                url={tracks.find(t => t.id === currentlyPlaying)?.audio_url || "https://sample-videos.com/audio/mp3/crowd-cheering.mp3"}
                type="audio"
                title={tracks.find(t => t.id === currentlyPlaying)?.title || "Unknown Track"}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <Card key={track.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={track.image_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop"}
                  alt={track.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button 
                    size="lg" 
                    className="rounded-full h-16 w-16 p-0"
                    onClick={() => handlePlay(track.id)}
                  >
                    {currentlyPlaying === track.id ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8" />
                    )}
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-1">{track.title}</h3>
                <p className="text-muted-foreground mb-2">{track.artist || "Unknown Artist"}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">{track.genre}</span>
                  <span className="text-sm font-medium">
                    {track.price > 0 ? `TZS ${track.price}` : "Free"}
                  </span>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => handlePlay(track.id)}
                >
                  {currentlyPlaying === track.id ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Play
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {tracks.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tracks available</h3>
              <p className="text-muted-foreground mb-4">
                There are currently no music tracks available. Upload your first track to get started.
              </p>
              <Button onClick={() => setShowUploadForm(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Track
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}