import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPlayerProps {
  url: string;
  type: "video" | "audio";
  title?: string;
  className?: string;
}

export const MediaPlayer = ({ url, type, title, className = "" }: MediaPlayerProps) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const updateTime = () => setCurrentTime(media.currentTime);
    const updateDuration = () => setDuration(media.duration);
    const handleError = () => setError("Failed to load media");

    media.addEventListener("timeupdate", updateTime);
    media.addEventListener("loadedmetadata", updateDuration);
    media.addEventListener("error", handleError);

    return () => {
      media.removeEventListener("timeupdate", updateTime);
      media.removeEventListener("loadedmetadata", updateDuration);
      media.removeEventListener("error", handleError);
    };
  }, [url]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(err => {
        console.error("Error playing media:", err);
        setError("Failed to play media");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;

    media.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media) return;

    const time = parseFloat(e.target.value);
    media.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media) return;

    const vol = parseFloat(e.target.value);
    media.volume = vol;
    setVolume(vol);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const resetPlayer = () => {
    const media = mediaRef.current;
    if (!media) return;

    media.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    }
  };

  if (error) {
    return (
      <div className={`bg-muted rounded-lg p-4 text-center ${className}`}>
        <p className="text-destructive">Error: {error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => {
            setError(null);
            resetPlayer();
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-background rounded-lg border border-border overflow-hidden ${className}`}>
      {title && (
        <div className="p-3 border-b border-border">
          <h3 className="font-medium">{title}</h3>
        </div>
      )}
      
      <div className="p-4">
        {type === "video" ? (
          <div className="relative">
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={url}
              className="w-full rounded-lg"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
            <Volume2 className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={url}
          className="hidden"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-primary"
                aria-label="Volume control"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-primary"
              aria-label="Seek"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};