import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Earnings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!user) {
      navigate("/signin");
      return;
    }
    
    setLoading(false);
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="animate-pulse">Loading earnings dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <EarningsDashboard />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Earnings;