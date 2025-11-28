import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Search, Globe } from "lucide-react";
import heroImage from "@/assets/hero-creators.jpg";
import { useParallax } from "@/hooks/use-parallax";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Hero = () => {
  const { t } = useTranslation();
  const parallaxOffset = useParallax(0.5);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          transform: `translate3d(0, ${parallaxOffset}px, 0)`,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-24 pb-16">
        <div className="flex flex-wrap gap-6 justify-center mb-8">
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">15,000+</span>
            <span className="text-sm text-muted-foreground">• {t("homepage.hero.creators")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">500+</span>
            <span className="text-sm text-muted-foreground">• {t("homepage.hero.events")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">2,000+</span>
            <span className="text-sm text-muted-foreground">• {t("homepage.hero.products")}</span>
          </div>
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-primary">{t("homepage.hero.titlePart1")} </span>
            <span className="text-accent">{t("homepage.hero.titlePart2")}</span>
            <span className="text-foreground">{t("homepage.hero.titlePart3")}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t("homepage.hero.subtitle")}
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Search className="mr-2 h-5 w-5" />
              {t("homepage.hero.exploreContent")}
            </Button>
            <Button size="lg" variant="outline" className="border-foreground/20 text-foreground hover:bg-foreground/10">
              <Upload className="mr-2 h-5 w-5" />
              {t("homepage.hero.submitContent")}
            </Button>
            <Button 
              size="lg" 
              variant="default" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => navigate('/signup')}
            >
              {t("homepage.hero.getStartedToday")}
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Badge variant="outline" className="bg-background/50 border-primary/30 text-foreground">
              <Globe className="mr-1 h-3 w-3" />
              {t("homepage.hero.worldwidePlatform")}
            </Badge>
            <Badge variant="outline" className="bg-background/50 border-primary/30 text-foreground">
              {t("homepage.hero.creatorOwned")}
            </Badge>
            <Badge variant="outline" className="bg-background/50 border-primary/30 text-foreground">
              {t("homepage.hero.verifiedCreators")}
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};