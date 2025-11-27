import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Search, Globe } from "lucide-react";
import heroImage from "@/assets/hero-creators.jpg";
import { useParallax } from "@/hooks/use-parallax";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const parallaxOffset = useParallax(0.5);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-100"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          transform: `translateY(${parallaxOffset}px)`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-24 pb-16">
        <div className="flex flex-wrap gap-6 justify-center mb-8">
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">15,000+</span>
            <span className="text-sm text-muted-foreground">• Creators</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">500+</span>
            <span className="text-sm text-muted-foreground">• Events</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">2,000+</span>
            <span className="text-sm text-muted-foreground">• Products</span>
          </div>
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-primary">BLISSFUL INNOVATIONS </span>
            <span className="text-accent">Discover</span>
            <span className="text-foreground">, Create & Connect</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover, Create & Connect with Local Creators and Businesses Worldwide
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Search className="mr-2 h-5 w-5" />
              Explore Content
            </Button>
            <Button size="lg" variant="outline" className="border-foreground/20 text-foreground hover:bg-foreground/10">
              <Upload className="mr-2 h-5 w-5" />
              Submit Content
            </Button>
            <Button 
              size="lg" 
              variant="default" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => navigate('/auth?tab=signup')}
            >
              Get Started Today
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Badge variant="outline" className="bg-background/50 border-primary/30 text-foreground">
              <Globe className="mr-1 h-3 w-3" />
              🌍 Worldwide Platform
            </Badge>
            <Badge variant="outline" className="bg-background/50 border-primary/30 text-foreground">
              🌟 100% Creator-Owned
            </Badge>
            <Badge variant="outline" className="bg-background/50 border-primary/30 text-foreground">
              ✓ Verified Creators
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};