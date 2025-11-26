import { MediaPlayer } from "@/components/MediaPlayer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function MediaTest() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Media Playback Test</h1>
          <p className="text-muted-foreground">Testing video and audio playback functionality</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Player Test */}
          <Card>
            <CardHeader>
              <CardTitle>Video Player</CardTitle>
              <CardDescription>Test video playback with sample content</CardDescription>
            </CardHeader>
            <CardContent>
              <MediaPlayer 
                url="https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"
                type="video"
                title="Sample Video"
                className="w-full"
              />
              <div className="mt-4 text-sm text-muted-foreground">
                <p>This is a sample video player demonstration.</p>
                <p className="mt-2">Features:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Play/Pause controls</li>
                  <li>Volume control</li>
                  <li>Progress seeking</li>
                  <li>Responsive design</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player Test */}
          <Card>
            <CardHeader>
              <CardTitle>Audio Player</CardTitle>
              <CardDescription>Test audio playback with sample content</CardDescription>
            </CardHeader>
            <CardContent>
              <MediaPlayer 
                url="https://sample-videos.com/audio/mp3/crowd-cheering.mp3"
                type="audio"
                title="Sample Audio"
              />
              <div className="mt-4 text-sm text-muted-foreground">
                <p>This is a sample audio player demonstration.</p>
                <p className="mt-2">Features:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Play/Pause controls</li>
                  <li>Volume control</li>
                  <li>Progress seeking</li>
                  <li>Compact design</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button onClick={() => navigate(-1)}>Back to Previous Page</Button>
        </div>
      </div>
    </div>
  );
}