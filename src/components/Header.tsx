import { MapPin, Clock, User, LogOut, LayoutDashboard, ShoppingCart, Home, Store, Calendar, Music, Search, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo.png";

export const Header = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = async () => {
    if (!user) return;
    try {
      const cartItems = await api.getCartItems();
      setCartCount(cartItems.length || 0);
    } catch (error) {
      console.error("Error fetching cart count:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCartCount();
    } else {
      setCartCount(0);
    }
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
          <span className="text-xl font-bold text-primary">
            BLINNO
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Button 
            variant={isActive("/") ? "secondary" : "ghost"} 
            className="text-foreground hover:text-primary"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Button 
            variant={isActive("/marketplace") ? "secondary" : "ghost"} 
            className="text-foreground hover:text-primary"
            onClick={() => navigate("/marketplace")}
          >
            <Store className="h-4 w-4 mr-2" />
            Marketplace
          </Button>
          <Button 
            variant={isActive("/services") ? "secondary" : "ghost"} 
            className="text-foreground hover:text-primary"
            onClick={() => navigate("/services")}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Services
          </Button>
          <Button 
            variant={isActive("/events") ? "secondary" : "ghost"} 
            className="text-foreground hover:text-primary"
            onClick={() => navigate("/events")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Events
          </Button>
          <Button 
            variant={isActive("/music") ? "secondary" : "ghost"} 
            className="text-foreground hover:text-primary"
            onClick={() => navigate("/music")}
          >
            <Music className="h-4 w-4 mr-2" />
            Music
          </Button>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Tanzania</span>
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Airtime</span>
          </Button>
          
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="relative flex items-center gap-2"
                onClick={() => navigate("/cart")}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {cartCount > 9 ? "9+" : cartCount}
                  </Badge>
                )}
                <span className="hidden md:inline">Cart</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => navigate("/dashboard")}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => navigate("/auth")}
            >
              <User className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
