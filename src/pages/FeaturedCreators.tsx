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
              Discover talented creators, artists, and entrepreneurs making waves in Tanzania and beyond.
            </p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Placeholder for featured creators - would be populated from API */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">C{i}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Creator {i}</h3>
                    <p className="text-sm text-muted-foreground">Category Name</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Brief description of the creator's work and achievements...
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">4.{i}</span>
                  <span className="text-sm text-muted-foreground">({10 + i} reviews)</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Dar es Salaam, Tanzania</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/creator/${i}`)}
                >
                  View Profile
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Become a Featured Creator</h3>
            <p className="text-muted-foreground mb-4">
              Want to be featured? Build your profile, create quality content, and engage with the community. 
              Featured creators are selected based on activity, quality, and community engagement.
            </p>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

