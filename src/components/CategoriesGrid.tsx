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

// Map category IDs to their corresponding data
const categoryDataMap = {
  news: {
    icon: Newspaper,
    title: "News & Media",
    description: "Latest headlines",
    stats: "Daily Updates",
    badge: { text: "🔥 Trending", variant: "trending" as const },
    href: "/news",
    backgroundImage: newsMediaImage
  },
  creativity: {
    icon: Palette,
    title: "Creativity",
    description: "Showcase your art",
    stats: "15K+ Works",
    href: "/creativity",
    backgroundImage: creativityImage
  },
  marketplace: {
    icon: ShoppingBag,
    title: "Marketplace",
    description: "Buy & sell products",
    stats: "2K+ Products",
    badge: { text: "⭐ Featured", variant: "featured" as const },
    href: "/marketplace",
    backgroundImage: businessImage
  },
  events: {
    icon: Calendar,
    title: "Events",
    description: "Discover & host events",
    stats: "500+ Events",
    badge: { text: "🔥 Trending", variant: "trending" as const },
    href: "/events",
    backgroundImage: eventsImage
  },
  music: {
    icon: Music,
    title: "Music",
    description: "Discover Bongo Flava",
    stats: "1K+ Tracks",
    href: "/music",
    backgroundImage: musicImage
  },
  restaurants: {
    icon: UtensilsCrossed,
    title: "Restaurants",
    description: "Find great food",
    stats: "200+ Restaurants",
    href: "/restaurants",
    backgroundImage: foodImage
  },
  lodging: {
    icon: Home,
    title: "Lodging",
    description: "Book unique stays",
    stats: "350+ Properties",
    href: "/lodging",
    backgroundImage: lodgingImage
  },
  education: {
    icon: GraduationCap,
    title: "Education",
    description: "Learn & teach",
    stats: "100+ Courses",
    href: "/education",
    backgroundImage: educationImage
  },
  jobs: {
    icon: Briefcase,
    title: "Jobs",
    description: "Find opportunities",
    stats: "250+ Openings",
    href: "/jobs",
    backgroundImage: techImage
  },
  artisans: {
    icon: Wrench,
    title: "Artisans",
    description: "Hire skilled workers",
    stats: "150+ Artisans",
    href: "/artisans",
    backgroundImage: fashionImage
  },
  movies: {
    icon: Film,
    title: "Bongo Movies",
    description: "Watch Tanzanian films",
    stats: "500+ Movies",
    href: "/movies",
    backgroundImage: bongoMoviesImage
  },
  community: {
    icon: Heart,
    title: "Community",
    description: "Connect with others",
    stats: "10K+ Members",
    href: "/community",
    backgroundImage: communityImage
  },
};

interface CategoriesGridProps {
  selectedCategories: string[];
}

export const CategoriesGrid = ({ selectedCategories }: CategoriesGridProps) => {
  // Get all category IDs
  const allCategoryIds = Object.keys(categoryDataMap);
  
  // Filter categories based on selection
  const filteredCategoryIds = selectedCategories.length > 0 
    ? selectedCategories
    : allCategoryIds;
  
  // Get category data for filtered IDs
  const categories = filteredCategoryIds.map(id => ({
    id,
    ...categoryDataMap[id as keyof typeof categoryDataMap]
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => (
        <CategoryCard key={category.id} {...category} />
      ))}
    </div>
  );
};