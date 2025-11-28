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
    title: t("homepage.categories.news.title"),
    description: t("homepage.categories.news.description"),
    stats: t("homepage.categories.news.stats"),
    badge: { text: t("homepage.categories.news.badge"), variant: "trending" as const },
    href: "/news",
    backgroundImage: newsMediaImage
  },
  creativity: {
    icon: Palette,
    title: t("homepage.categories.creativity.title"),
    description: t("homepage.categories.creativity.description"),
    stats: t("homepage.categories.creativity.stats"),
    href: "/marketplace?category=creativity",
    backgroundImage: creativityImage
  },
  marketplace: {
    icon: ShoppingBag,
    title: t("homepage.categories.marketplace.title"),
    description: t("homepage.categories.marketplace.description"),
    stats: t("homepage.categories.marketplace.stats"),
    badge: { text: t("homepage.categories.marketplace.badge"), variant: "featured" as const },
    href: "/marketplace",
    backgroundImage: businessImage
  },
  events: {
    icon: Calendar,
    title: t("homepage.categories.events.title"),
    description: t("homepage.categories.events.description"),
    stats: t("homepage.categories.events.stats"),
    badge: { text: t("homepage.categories.events.badge"), variant: "trending" as const },
    href: "/events",
    backgroundImage: eventsImage
  },
  music: {
    icon: Music,
    title: t("homepage.categories.music.title"),
    description: t("homepage.categories.music.description"),
    stats: t("homepage.categories.music.stats"),
    href: "/music",
    backgroundImage: musicImage
  },
  restaurants: {
    icon: UtensilsCrossed,
    title: t("homepage.categories.restaurants.title"),
    description: t("homepage.categories.restaurants.description"),
    stats: t("homepage.categories.restaurants.stats"),
    href: "/restaurants",
    backgroundImage: foodImage
  },
  lodging: {
    icon: Home,
    title: t("homepage.categories.lodging.title"),
    description: t("homepage.categories.lodging.description"),
    stats: t("homepage.categories.lodging.stats"),
    href: "/lodging",
    backgroundImage: lodgingImage
  },
  education: {
    icon: GraduationCap,
    title: t("homepage.categories.education.title"),
    description: t("homepage.categories.education.description"),
    stats: t("homepage.categories.education.stats"),
    href: "/education",
    backgroundImage: educationImage
  },
  jobs: {
    icon: Briefcase,
    title: t("homepage.categories.jobs.title"),
    description: t("homepage.categories.jobs.description"),
    stats: t("homepage.categories.jobs.stats"),
    href: "/jobs",
    backgroundImage: techImage
  },
  artisans: {
    icon: Wrench,
    title: t("homepage.categories.artisans.title"),
    description: t("homepage.categories.artisans.description"),
    stats: t("homepage.categories.artisans.stats"),
    href: "/artisan-services",
    backgroundImage: fashionImage
  },
  movies: {
    icon: Film,
    title: t("homepage.categories.movies.title"),
    description: t("homepage.categories.movies.description"),
    stats: t("homepage.categories.movies.stats"),
    href: "/marketplace?category=movies",
    backgroundImage: moviesImage
  },
  community: {
    icon: Heart,
    title: t("homepage.categories.community.title"),
    description: t("homepage.categories.community.description"),
    stats: t("homepage.categories.community.stats"),
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