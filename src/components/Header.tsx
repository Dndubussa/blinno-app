import { User, LogOut, LayoutDashboard, ShoppingCart, Home, Store, Calendar, Music, Briefcase, Menu, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getSupportedCurrencies, getCurrencySymbol } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

export const Header = () => {
  const { t } = useTranslation();
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userCurrency, setUserCurrency] = useState<string>(profile?.currency || 'USD');
  const [updatingCurrency, setUpdatingCurrency] = useState(false);

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

  useEffect(() => {
    if (profile?.currency) {
      setUserCurrency(profile.currency);
    }
  }, [profile]);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === userCurrency || !user) return;
    
    setUpdatingCurrency(true);
    try {
      await api.updateProfilePreferences({ currency: newCurrency });
      setUserCurrency(newCurrency);
      toast({
        title: "Currency Updated",
        description: `Currency changed to ${newCurrency}`,
      });
      // Refresh page to update all prices
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update currency",
        variant: "destructive",
      });
    } finally {
      setUpdatingCurrency(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <EmailVerificationBanner />
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="flex flex-col gap-4 mt-6">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity mb-4"
                  onClick={() => {
                    navigate("/");
                    setMobileMenuOpen(false);
                  }}
                >
                  <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
                  <span className="text-xl font-bold text-primary">BLINNO</span>
                </div>
                <Button 
                  variant={isActive("/") ? "secondary" : "ghost"} 
                  className="justify-start"
                  onClick={() => {
                    navigate("/");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Home className="h-4 w-4 mr-2" />
                  {t("common.home")}
                </Button>
                <Button 
                  variant={isActive("/marketplace") ? "secondary" : "ghost"} 
                  className="justify-start"
                  onClick={() => {
                    navigate("/marketplace");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Store className="h-4 w-4 mr-2" />
                  {t("common.marketplace")}
                </Button>
                <Button 
                  variant={isActive("/services") ? "secondary" : "ghost"} 
                  className="justify-start"
                  onClick={() => {
                    navigate("/services");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  {t("common.services")}
                </Button>
                <Button 
                  variant={isActive("/events") ? "secondary" : "ghost"} 
                  className="justify-start"
                  onClick={() => {
                    navigate("/events");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("common.events")}
                </Button>
                <Button 
                  variant={isActive("/music") ? "secondary" : "ghost"} 
                  className="justify-start"
                  onClick={() => {
                    navigate("/music");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Music className="h-4 w-4 mr-2" />
                  {t("common.music")}
                </Button>
                {user && (
                  <>
                    <div className="border-t my-2" />
                    <div className="flex items-center justify-between px-2 py-2">
                      <span className="text-sm font-medium">Notifications</span>
                      <NotificationBell />
                    </div>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        navigate("/cart");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {t("common.cart")} {cartCount > 0 && `(${cartCount})`}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        navigate("/dashboard");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      {t("common.dashboard")}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                )}
                {!user && (
                  <>
                    <div className="border-t my-2" />
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                    <Button 
                      variant="default" 
                      className="justify-start"
                      onClick={() => {
                        navigate("/auth", { state: { tab: "signup" } });
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
            <span className="text-xl font-bold text-primary hidden sm:inline">
              BLINNO
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-2xl">
            <Button 
              variant={isActive("/") ? "secondary" : "ghost"} 
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              {t("common.home")}
            </Button>
            <Button 
              variant={isActive("/marketplace") ? "secondary" : "ghost"} 
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate("/marketplace")}
            >
              <Store className="h-4 w-4 mr-2" />
              {t("common.marketplace")}
            </Button>
            <Button 
              variant={isActive("/services") ? "secondary" : "ghost"} 
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate("/services")}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              {t("common.services")}
            </Button>
            <Button 
              variant={isActive("/events") ? "secondary" : "ghost"} 
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate("/events")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {t("common.events")}
            </Button>
            <Button 
              variant={isActive("/music") ? "secondary" : "ghost"} 
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate("/music")}
            >
              <Music className="h-4 w-4 mr-2" />
              {t("common.music")}
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <LanguageSelector variant="compact" showIcon={false} />
            
            {/* Currency Selector */}
            {user && (
              <Select 
                value={userCurrency} 
                onValueChange={handleCurrencyChange}
                disabled={updatingCurrency}
              >
                <SelectTrigger className="w-20 h-9 text-xs hidden sm:flex">
                  <DollarSign className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSupportedCurrencies().map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency} ({getCurrencySymbol(currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {user ? (
              <>
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  onClick={() => navigate("/cart")}
                  title="Shopping Cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartCount > 9 ? "9+" : cartCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                  title="Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/auth", { state: { tab: "signup" } })}
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};