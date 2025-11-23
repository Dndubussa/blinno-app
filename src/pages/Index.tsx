import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/dashboardRoutes";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DiasporaBanner } from "@/components/DiasporaBanner";
import { FeaturedCreators } from "@/components/FeaturedCreators";
import { CategoriesGrid } from "@/components/CategoriesGrid";
import { CreatorGallery } from "@/components/CreatorGallery";
import { MapSection } from "@/components/MapSection";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { Testimonials } from "@/components/Testimonials";
import { CategoryFilterSidebar } from "@/components/CategoryFilterSidebar";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SubscriptionPricing } from "@/components/SubscriptionPricing";
import { SocialFeedPreview } from "@/components/SocialFeedPreview";
import { QuickActions } from "@/components/QuickActions";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is authenticated and not loading, redirect to their dashboard
    if (!loading && user && profile) {
      const dashboardRoute = getDashboardRoute(profile.roles);
      // Only redirect if we're on the homepage
      if (window.location.pathname === '/') {
        navigate(dashboardRoute, { replace: true });
      }
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
      <Header />
      <Hero />
      
      <AnimatedSection>
        <div className="py-8 bg-background/95 backdrop-blur sticky top-16 z-40 border-b">
          <div className="container mx-auto px-4">
            <SearchBar />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={100}>
        <DiasporaBanner />
      </AnimatedSection>

      <AnimatedSection delay={200}>
        <FeaturedCreators />
      </AnimatedSection>

      <div className="container mx-auto px-4 py-12">
        <div className="flex gap-8">
          <CategoryFilterSidebar />
          <div className="flex-1">
            <AnimatedSection delay={300}>
              <CategoriesGrid />
            </AnimatedSection>
          </div>
        </div>
      </div>

      <AnimatedSection delay={100}>
        <CreatorGallery />
      </AnimatedSection>

      <AnimatedSection delay={200}>
        <Testimonials />
      </AnimatedSection>

      <AnimatedSection delay={300}>
        <SubscriptionPricing />
      </AnimatedSection>

      <SocialFeedPreview />

      <QuickActions />

      <AnimatedSection delay={100}>
        <MapSection />
      </AnimatedSection>

      <Footer />
    </div>
  );
};

export default Index;
