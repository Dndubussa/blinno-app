import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Events from "./pages/Events";
import Marketplace from "./pages/Marketplace";
import Services from "./pages/Services";
import Music from "./pages/Music";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import LodgingDashboard from "./pages/LodgingDashboard";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import EducatorDashboard from "./pages/EducatorDashboard";
import JournalistDashboard from "./pages/JournalistDashboard";
import ArtisanDashboard from "./pages/ArtisanDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import EventOrganizerDashboard from "./pages/EventOrganizerDashboard";
import CreatorProfile from "./pages/CreatorProfile";
import Messages from "./pages/Messages";
import Booking from "./pages/Booking";
import Admin from "./pages/Admin";
import Cart from "./pages/Cart";
import ManageProducts from "./pages/ManageProducts";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import FeaturedCreators from "./pages/FeaturedCreators";
import SuccessStories from "./pages/SuccessStories";
import Blog from "./pages/Blog";
import Jobs from "./pages/Jobs";
import Education from "./pages/Education";
import Orders from "./pages/Orders";
import Refunds from "./pages/Refunds";
import Disputes from "./pages/Disputes";
import Notifications from "./pages/Notifications";
import SocialFeed from "./pages/SocialFeed";
import Wishlist from "./pages/Wishlist";
import Analytics from "./pages/Analytics";
import AdvancedSearch from "./pages/AdvancedSearch";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import ContentModeration from "./pages/ContentModeration";
import NotFound from "./pages/NotFound";
import Earnings from "./pages/Earnings";
import { api } from "@/lib/api";

// Missing imports that were referenced in routes
import Restaurants from "./pages/Restaurants";
import Lodging from "./pages/Lodging";
import ArtisanServices from "./pages/ArtisanServices";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-2xl font-bold">Loading BLINNO...</div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<Events />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/services" element={<Services />} />
            <Route path="/music" element={<Music />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/profile/:userId" element={<CreatorProfile />} />
            <Route path="/portfolios" element={<Marketplace />} />
            <Route path="/portfolio/:id" element={<CreatorProfile />} />
            <Route path="/products" element={<Marketplace />} />
            <Route path="/product/:id" element={<Marketplace />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Cart />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/bookings" element={<Booking />} />
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/restaurant/:id" element={<Restaurants />} />
            <Route path="/lodging" element={<Lodging />} />
            <Route path="/lodging/:id" element={<Lodging />} />
            <Route path="/event/:id" element={<Events />} />
            <Route path="/artisan-services" element={<ArtisanServices />} />
            <Route path="/artisan/:id" element={<ArtisanServices />} />
            <Route path="/performance-bookings" element={<Booking />} />
            <Route path="/news" element={<Blog />} />
            <Route path="/news/:id" element={<Blog />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/search" element={<AdvancedSearch />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/contact" element={<About />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<HowItWorks />} />
            <Route path="/settings" element={<Dashboard />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;