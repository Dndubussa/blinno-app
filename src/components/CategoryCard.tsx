import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const scrollPercent = (window.innerHeight - rect.top) / window.innerHeight;
      setParallaxOffset(scrollPercent * 30);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Card ref={cardRef} className="group relative overflow-hidden border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full flex flex-col">
      {backgroundImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-300 group-hover:scale-105"
            style={{ 
              backgroundImage: `url(${backgroundImage})`,
              transform: `translateY(${parallaxOffset}px)`
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
          <a href={href}>
            <span>View {title}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </Button>
      </div>
    </Card>
  );
};