import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CategoryCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  stats: string;
  badge?: {
    text: string;
    variant: "trending" | "featured";
  };
  href?: string;
  backgroundImage?: string;
}

export const CategoryCard = ({ 
  id,
  icon: Icon, 
  title, 
  description, 
  stats, 
  badge,
  href = "#",
  backgroundImage
}: CategoryCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const rafId = useRef<number | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the button (it has its own link)
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    if (href && href !== "#") {
      navigate(href);
    }
  };

  useEffect(() => {
    if (!backgroundImage || isMobile) {
      setParallaxOffset(0);
      return;
    }

    const handleScroll = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const scrollPercent = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / window.innerHeight));
        setParallaxOffset(scrollPercent * 20); // Reduced from 30 for smoother effect
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [backgroundImage, isMobile]);

  return (
    <Card 
      ref={cardRef} 
      className="group relative overflow-hidden border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full flex flex-col cursor-pointer"
      onClick={handleCardClick}
    >
      {backgroundImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105 will-change-transform"
            style={{ 
              backgroundImage: `url(${backgroundImage})`,
              transform: `translate3d(0, ${parallaxOffset}px, 0)`,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background/95" />
        </>
      )}
      <div className="p-6 relative z-10 flex flex-col flex-1">
        {badge && (
          <Badge 
            className={`mb-3 self-start ${
              badge.variant === "trending" 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-accent text-accent-foreground"
            }`}
          >
            {badge.text}
          </Badge>
        )}
        
        <div className="flex items-start gap-4 mb-4 flex-1">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors backdrop-blur-sm">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground mb-1">{stats}</div>
            <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <Button 
          variant="ghost" 
          className="w-full justify-between group-hover:text-primary transition-colors mt-auto"
          asChild
        >
          <Link to={href}>
            <span>{t("common.view")} {title}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </Card>
  );
};