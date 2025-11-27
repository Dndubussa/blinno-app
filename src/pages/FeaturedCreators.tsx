import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Star, MapPin, ExternalLink } from "lucide-react";

export default function FeaturedCreators() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-4xl mb-4">Featured Creators</CardTitle>
            <p className="text-muted-foreground">
              Discover talented creators, artists, and entrepreneurs from around the world.
            </p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Featured Gospel Musicians */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src="/Paul Clement.jpg" 
                  alt="Paul Clement" 
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">Paul Clement</h3>
                  <p className="text-sm text-muted-foreground">Gospel Musician</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Inspirational gospel artist with powerful vocals and meaningful lyrics that touch hearts.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">4.9</span>
                <span className="text-sm text-muted-foreground">(150 reviews)</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Nairobi, Kenya</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/creator/1`)}
              >
                View Profile
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src="/Joel Lwaga.jpg" 
                  alt="Joel Lwaga" 
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">Joel Lwaga</h3>
                  <p className="text-sm text-muted-foreground">Gospel Musician</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Soulful gospel singer known for his anointed voice and spirit-filled worship experiences.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">4.8</span>
                <span className="text-sm text-muted-foreground">(120 reviews)</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Dar es Salaam, Tanzania</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/creator/2`)}
              >
                View Profile
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src="/Godfrey Steven.jpg" 
                  alt="Godfrey Steven" 
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">Godfrey Steven</h3>
                  <p className="text-sm text-muted-foreground">Gospel Musician</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Anointed worship leader creating songs that bring people closer to God through music.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">4.7</span>
                <span className="text-sm text-muted-foreground">(100 reviews)</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Kampala, Uganda</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/creator/3`)}
              >
                View Profile
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Become a Featured Creator</h3>
            <p className="text-muted-foreground mb-4">
              Want to be featured? Build your profile, create quality content, and engage with the community. 
              Featured creators are selected based on activity, quality, and community engagement.
            </p>
            <Button onClick={() => navigate("/auth?tab=signup")}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

