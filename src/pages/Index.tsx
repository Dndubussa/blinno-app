import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { getDashboardRoute } from "@/lib/dashboardRoutes";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DiasporaBanner } from "@/components/DiasporaBanner";
import { FeaturedCreators } from "@/components/FeaturedCreators";
import { CategoriesGrid } from "@/components/CategoriesGrid";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { Testimonials } from "@/components/Testimonials";
import { CategoryFilterSidebar } from "@/components/CategoryFilterSidebar";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SubscriptionPricing } from "@/components/SubscriptionPricing";
import { SocialFeedPreview } from "@/components/SocialFeedPreview";
import { QuickActions } from "@/components/QuickActions";
import { HowToGetStarted } from "@/components/HowToGetStarted";
import { SEO } from "@/components/SEO";
import { TrustPilotWidget } from "@/components/TrustPilotWidget";

const Index = () => {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    // If user is authenticated and not loading, redirect them away from homepage
    // Authenticated users should not access the homepage
    if (!loading && user && profile) {
      // Check if user needs to select subscription/percentage model
      const checkSubscription = async () => {
        try {
          // Check if user has a creator role that needs subscription
          const creatorRoles = ['creator', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator', 'journalist', 'artisan', 'employer', 'event_organizer', 'musician'];
          const userRoles = Array.isArray(profile.roles) ? profile.roles : [profile.roles].filter(Boolean);
          const isCreatorRole = userRoles.some((role: string) => creatorRoles.includes(role));
          
          if (isCreatorRole) {
            const { api } = await import("@/lib/api");
            const subscription = await api.getMySubscription();
            
            // If subscription doesn't have an 'id' or 'created_at', it's a default and user needs to choose
            if (!subscription?.id || !subscription?.created_at) {
              navigate("/choose-subscription", { replace: true });
              return;
            }
          }
          
          // User has subscription or doesn't need one, redirect to dashboard
          const dashboardRoute = getDashboardRoute(profile.roles);
          navigate(dashboardRoute, { replace: true });
        } catch (error) {
          console.error("Error checking subscription:", error);
          // If error, assume they need to choose if they're a creator role
          const creatorRoles = ['creator', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator', 'journalist', 'artisan', 'employer', 'event_organizer', 'musician'];
          const userRoles = Array.isArray(profile.roles) ? profile.roles : [profile.roles].filter(Boolean);
          const isCreatorRole = userRoles.some((role: string) => creatorRoles.includes(role));
          
          if (isCreatorRole) {
            navigate("/choose-subscription", { replace: true });
          } else {
            const dashboardRoute = getDashboardRoute(profile.roles);
            navigate(dashboardRoute, { replace: true });
          }
        }
      };
      
      checkSubscription();
    }
  }, [user, profile, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BLISSFUL INNOVATIONS - Discover, Create & Connect with Local Creators and Businesses"
        description="BLINNO connects local creators, events, marketplace, music, and more. Discover thousands of creators, events, and products worldwide."
        keywords={["creators", "events", "marketplace", "music", "local business", "culture"]}
      />
      
      <Header />
      <Hero />
      
      {/* Improved search bar section */}
      <div className="py-8 bg-background/95 backdrop-blur sticky top-16 z-40 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="w-full max-w-3xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="space-y-16 py-8">
        <AnimatedSection delay={100}>
          <DiasporaBanner />
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <FeaturedCreators />
        </AnimatedSection>

        {/* Improved category section with better layout */}
        <section className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-80 lg:shrink-0">
              <CategoryFilterSidebar 
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
              />
            </div>
            <div className="flex-1">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">{t("homepage.categories.title")}</h2>
                <p className="text-muted-foreground">{t("homepage.categories.subtitle")}</p>
              </div>
              <AnimatedSection delay={300}>
                <CategoriesGrid selectedCategories={selectedCategories} />
              </AnimatedSection>
              
              {/* Get Started Today Button */}
              <div className="mt-12 text-center">
                <button 
                  onClick={() => navigate("/signup")}
                  className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
                >
                  {t("homepage.getStartedToday")}
                </button>
                <p className="mt-4 text-muted-foreground">{t("homepage.joinCommunity")}</p>
              </div>
            </div>
          </div>
        </section>

        <AnimatedSection delay={200}>
          <Testimonials />
        </AnimatedSection>

        <HowToGetStarted />

        <AnimatedSection delay={300}>
          <SubscriptionPricing />
        </AnimatedSection>

        <SocialFeedPreview />

        <QuickActions />

      </div>

      <Footer />
    </div>
  );
};

export default Index;