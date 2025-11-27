import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle } from "lucide-react";

const creators = [
  {
    name: "Alex Johnson",
    category: "Music",
    location: "New York",
    followers: "15M+",
    verified: true,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    badge: "🎵 Top Artist"
  },
  {
    name: "Maria Rodriguez",
    category: "Fashion Designer",
    location: "Los Angeles",
    followers: "250K+",
    verified: true,
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop",
    badge: "👗 Featured"
  },
  {
    name: "James Wilson",
    category: "Music & Activism",
    location: "London",
    followers: "800K+",
    verified: true,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    badge: "🎤 Legend"
  },
  {
    name: "Emma Thompson",
    category: "Entrepreneur",
    location: "Paris",
    followers: "180K+",
    verified: true,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
    badge: "💼 Business"
  },
  {
    name: "David Kim",
    category: "Music",
    location: "Seoul",
    followers: "5M+",
    verified: true,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    badge: "🎵 Top Artist"
  },
  {
    name: "Sarah Chen",
    category: "Actress & Influencer",
    location: "Tokyo",
    followers: "3M+",
    verified: true,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    badge: "🎬 Featured"
  }
];

export const FeaturedCreators = () => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Featured Creators</h2>
        <p className="text-muted-foreground">Top artists, entrepreneurs, and influencers from around the world</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map((creator) => (
          <Card key={creator.name} className="group overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardContent className="p-0">
              <div className="relative">
                <img 
                  src={creator.image} 
                  alt={creator.name}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-accent text-accent-foreground">
                    {creator.badge}
                  </Badge>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground">{creator.name}</h3>
                      {creator.verified && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{creator.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{creator.location}</span>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {creator.followers} followers
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Get Started Today Button */}
      <div className="mt-12 text-center">
        <a 
          href="/auth?tab=signup" 
          className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
        >
          Get Started Today
        </a>
        <p className="mt-4 text-muted-foreground">Join thousands of creators already on BLINNO</p>
      </div>
    </section>
  );
};
