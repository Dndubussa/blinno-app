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
import { useTranslation } from "react-i18next";
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
import moviesImage from "@/assets/movies.jpg";
import communityImage from "@/assets/community.jpg";

// Helper function to get category data with translations
const getCategoryDataMap = (t: any) => ({
  news: {
    icon: Newspaper,
    title: t("categories.news.title"),
    description: t("categories.news.description"),
    stats: t("categories.news.stats"),
    badge: { text: t("categories.news.badge"), variant: "trending" as const },
    href: "/news",
    backgroundImage: newsMediaImage
  },
  creativity: {
    icon: Palette,
    title: t("categories.creativity.title"),
    description: t("categories.creativity.description"),
    stats: t("categories.creativity.stats"),
    href: "/marketplace?category=creativity",
    backgroundImage: creativityImage
  },
  marketplace: {
    icon: ShoppingBag,
    title: t("categories.marketplace.title"),
    description: t("categories.marketplace.description"),
    stats: t("categories.marketplace.stats"),
    badge: { text: t("categories.marketplace.badge"), variant: "featured" as const },
    href: "/marketplace",
    backgroundImage: businessImage
  },
  events: {
    icon: Calendar,
    title: t("categories.events.title"),
    description: t("categories.events.description"),
    stats: t("categories.events.stats"),
    badge: { text: t("categories.events.badge"), variant: "trending" as const },
    href: "/events",
    backgroundImage: eventsImage
  },
  music: {
    icon: Music,
    title: t("categories.music.title"),
    description: t("categories.music.description"),
    stats: t("categories.music.stats"),
    href: "/music",
    backgroundImage: musicImage
  },
  restaurants: {
    icon: UtensilsCrossed,
    title: t("categories.restaurants.title"),
    description: t("categories.restaurants.description"),
    stats: t("categories.restaurants.stats"),
    href: "/restaurants",
    backgroundImage: foodImage
  },
  lodging: {
    icon: Home,
    title: t("categories.lodging.title"),
    description: t("categories.lodging.description"),
    stats: t("categories.lodging.stats"),
    href: "/lodging",
    backgroundImage: lodgingImage
  },
  education: {
    icon: GraduationCap,
    title: t("categories.education.title"),
    description: t("categories.education.description"),
    stats: t("categories.education.stats"),
    href: "/education",
    backgroundImage: educationImage
  },
  jobs: {
    icon: Briefcase,
    title: t("categories.jobs.title"),
    description: t("categories.jobs.description"),
    stats: t("categories.jobs.stats"),
    href: "/jobs",
    backgroundImage: techImage
  },
  artisans: {
    icon: Wrench,
    title: t("categories.artisans.title"),
    description: t("categories.artisans.description"),
    stats: t("categories.artisans.stats"),
    href: "/artisan-services",
    backgroundImage: fashionImage
  },
  movies: {
    icon: Film,
    title: t("categories.movies.title"),
    description: t("categories.movies.description"),
    stats: t("categories.movies.stats"),
    href: "/marketplace?category=movies",
    backgroundImage: moviesImage
  },
  community: {
    icon: Heart,
    title: t("categories.community.title"),
    description: t("categories.community.description"),
    stats: t("categories.community.stats"),
    href: "/marketplace?category=community",
    backgroundImage: communityImage
  },
});

interface CategoriesGridProps {
  selectedCategories: string[];
}

export const CategoriesGrid = ({ selectedCategories }: CategoriesGridProps) => {
  const { t } = useTranslation();
  const categoryDataMap = getCategoryDataMap(t);
  
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