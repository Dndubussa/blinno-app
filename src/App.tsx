import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import Events from "@/pages/Events";
import Marketplace from "@/pages/Marketplace";
import Services from "@/pages/Services";
import Music from "@/pages/Music";
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import FreelancerDashboard from "@/pages/FreelancerDashboard";
import LodgingDashboard from "@/pages/LodgingDashboard";
import RestaurantDashboard from "@/pages/RestaurantDashboard";
import EducatorDashboard from "@/pages/EducatorDashboard";
import JournalistDashboard from "@/pages/JournalistDashboard";
import ArtisanDashboard from "@/pages/ArtisanDashboard";
import EmployerDashboard from "@/pages/EmployerDashboard";
import EventOrganizerDashboard from "@/pages/EventOrganizerDashboard";
import CreatorProfile from "@/pages/CreatorProfile";
import Cart from "@/pages/Cart";
import Booking from "@/pages/Booking";
import Restaurants from "@/pages/Restaurants";
import Lodging from "@/pages/Lodging";
import ArtisanServices from "@/pages/ArtisanServices";
import Blog from "@/pages/Blog";
import Messages from "@/pages/Messages";
import AdvancedSearch from "@/pages/AdvancedSearch";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CookiePolicy from "@/pages/CookiePolicy";
import Analytics from "@/pages/Analytics";
import TwoFactorAuth from "@/pages/TwoFactorAuth";
import About from "@/pages/About";
import HowItWorks from "@/pages/HowItWorks";
import Earnings from "@/pages/Earnings";
import NotFound from "@/pages/NotFound";
import CourseViewer from "@/pages/CourseViewer";
import MediaTest from "@/pages/MediaTest";
import MusicianDashboard from "@/pages/MusicianDashboard";
import MusicTest from "@/pages/MusicTest";

function App() {
  return (
    <HelmetProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/events" element={<Events />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/services" element={<Services />} />
              <Route path="/music" element={<Music />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="/freelancer-dashboard/*" element={<FreelancerDashboard />} />
              <Route path="/lodging-dashboard/*" element={<LodgingDashboard />} />
              <Route path="/restaurant-dashboard/*" element={<RestaurantDashboard />} />
              <Route path="/educator-dashboard/*" element={<EducatorDashboard />} />
              <Route path="/journalist-dashboard/*" element={<JournalistDashboard />} />
              <Route path="/artisan-dashboard/*" element={<ArtisanDashboard />} />
              <Route path="/employer-dashboard/*" element={<EmployerDashboard />} />
              <Route path="/event-organizer-dashboard/*" element={<EventOrganizerDashboard />} />
              <Route path="/musician-dashboard/*" element={<MusicianDashboard />} />
              <Route path="/profile/:userId" element={<CreatorProfile />} />
              <Route path="/creator/:id" element={<CreatorProfile />} />
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
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/2fa" element={<TwoFactorAuth />} />
              <Route path="/contact" element={<About />} />
              <Route path="/about" element={<About />} />
              <Route path="/help" element={<HowItWorks />} />
              <Route path="/settings" element={<Dashboard />} />
              <Route path="/earnings" element={<Earnings />} />
              <Route path="/course/:courseId" element={<CourseViewer />} />
              <Route path="/media-test" element={<MediaTest />} />
              <Route path="/music-test" element={<MusicTest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;