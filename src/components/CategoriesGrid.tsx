import { 
  Newspaper, 
  Palette, 
  Calendar, 
  ShoppingBag, 
  Home, 
  UtensilsCrossed,
  Wrench,
  GraduationCap,
  Briefcase,
  Music,
  Film,
  Heart
} from "lucide-react";
import { CategoryCard } from "./CategoryCard";
import newsMediaImage from "@/assets/news-media.jpg";
import creativityImage from "@/assets/creativity.jpg";
import businessImage from "@/assets/business.jpg";
import techImage from "@/assets/tech.jpg";
import foodImage from "@/assets/food.jpg";
import fashionImage from "@/assets/fashion.jpg";
import eventsImage from "@/assets/events.jpg";
import lodgingImage from "@/assets/lodging.jpg";
import educationImage from "@/assets/education.jpg";
import musicImage from "@/assets/music-performance.jpg";
import bongoMoviesImage from "@/assets/bongo-movies.jpg";
import communityImage from "@/assets/community.jpg";

export const CategoriesGrid = () => {
  const categories = [
    {
      icon: Newspaper,
      title: "News & Media",
      description: "Latest headlines",
      stats: "Daily Updates",
      badge: { text: "🔥 Trending", variant: "trending" as const },
      href: "#",
      backgroundImage: newsMediaImage
    },
    {
      icon: Palette,
      title: "Creativity",
      description: "Showcase your art",
      stats: "15K+ Works",
      href: "#",
      backgroundImage: creativityImage
    },
    {
      icon: Calendar,
      title: "Events",
      description: "Discover & host events",
      stats: "500+ Events",
      badge: { text: "🔥 Trending", variant: "trending" as const },
      href: "/events",
      backgroundImage: eventsImage
    },
    {
      icon: ShoppingBag,
      title: "Marketplace",
      description: "Buy & sell products",
      stats: "2K+ Products",
      badge: { text: "⭐ Featured", variant: "featured" as const },
      href: "/marketplace",
      backgroundImage: businessImage
    },
    {
      icon: Home,
      title: "Lodging",
      description: "Book unique stays",
      stats: "350+ Properties",
      href: "#",
      backgroundImage: lodgingImage
    },
    {
      icon: UtensilsCrossed,
      title: "Restaurants",
      description: "Find great food",
      stats: "200+ Restaurants",
      href: "#",
      backgroundImage: foodImage
    },
    {
      icon: Wrench,
      title: "Artisans",
      description: "Hire skilled workers",
      stats: "150+ Artisans",
      href: "#",
      backgroundImage: fashionImage
    },
    {
      icon: GraduationCap,
      title: "Education",
      description: "Learn & teach",
      stats: "100+ Courses",
      href: "#",
      backgroundImage: educationImage
    },
    {
      icon: Briefcase,
      title: "Jobs",
      description: "Find opportunities",
      stats: "250+ Openings",
      href: "#",
      backgroundImage: techImage
    },
    {
      icon: Music,
      title: "Music",
      description: "Discover Bongo Flava",
      stats: "1K+ Tracks",
      href: "/music",
      backgroundImage: musicImage
    },
    {
      icon: Film,
      title: "Bongo Movies",
      description: "Watch Tanzanian films",
      stats: "500+ Movies",
      href: "#",
      backgroundImage: bongoMoviesImage
    },
    {
      icon: Heart,
      title: "Community",
      description: "Connect with others",
      stats: "10K+ Members",
      href: "#",
      backgroundImage: communityImage
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <CategoryCard key={category.title} {...category} />
        ))}
      </div>
    </div>
  );
};
