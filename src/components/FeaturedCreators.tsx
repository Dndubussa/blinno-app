import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const creators = [
  {
    name: "Paul Clement",
    category: "Gospel Musician",
    location: "Nairobi, Kenya",
    followers: "150K+",
    verified: true,
    image: "/Paul%20Clement.jpg",
    badge: "🎵 Gospel"
  },
  {
    name: "Joel Lwaga",
    category: "Gospel Musician",
    location: "Dar es Salaam, Tanzania",
    followers: "120K+",
    verified: true,
    image: "/Joel%20Lwaga.jpg",
    badge: "🎵 Worship"
  },
  {
    name: "Godfrey Steven",
    category: "Gospel Musician",
    location: "Kampala, Uganda",
    followers: "100K+",
    verified: true,
    image: "/Godfrey%20Steven.jpg",
    badge: "🎵 Praise"
  }
];

export const FeaturedCreators = () => {
  const navigate = useNavigate();
  
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
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src={creator.image} 
                  alt={creator.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.src = '/placeholder.svg';
                  }}
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
        <button 
          onClick={() => navigate("/auth?tab=signup")}
          className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
        >
          Get Started Today
        </button>
        <p className="mt-4 text-muted-foreground">Join thousands of creators already on BLINNO</p>
      </div>
    </section>
  );
};
