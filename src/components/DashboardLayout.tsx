import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { Search, ShoppingCart, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
  navigationTabs?: Array<{
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  defaultSection?: string;
  headerActions?: ReactNode;
}

export function DashboardLayout({
  title,
  children,
  navigationTabs,
  defaultSection = "overview",
  headerActions,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const currentSection = location.hash.replace("#", "") || defaultSection;
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCartCount = async () => {
      if (!user) return;
      try {
        const cartItems = await api.getCartItems();
        setCartCount(cartItems.length || 0);
      } catch (error) {
        console.error("Error fetching cart count:", error);
      }
    };

    if (user) {
      fetchCartCount();
    } else {
      setCartCount(0);
    }
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
          {/* Modern Header with Gradient */}
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <SidebarTrigger className="transition-all hover:scale-110" />
                <div className="flex flex-col">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
                    {title}
                  </h1>
                  {profile && (
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      Welcome back, {profile.display_name || user?.email?.split("@")[0] || "User"}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Enhanced Search Bar */}
              <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-2 flex-1 max-w-md mx-4">
                <div className="relative w-full group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="search"
                    placeholder="Search anything..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </form>

              {/* Right Side Actions */}
              <div className="flex items-center gap-1.5">
                {/* Home Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  title="Home"
                  className="hidden sm:flex hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Home className="h-4 w-4" />
                </Button>

                {/* Cart */}
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => navigate("/cart")}
                    title="Shopping Cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary animate-pulse">
                        {cartCount > 9 ? "9+" : cartCount}
                      </Badge>
                    )}
                  </Button>
                )}

                {/* Notifications */}
                {user && <NotificationBell />}

                {/* User Menu */}
                {user && profile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="relative h-9 w-9 rounded-full hover:ring-2 hover:ring-primary/20 transition-all"
                      >
                        <Avatar className="h-9 w-9 ring-2 ring-border hover:ring-primary/50 transition-all">
                          <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || user.email || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                            {(profile.display_name || user.email || "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {profile.display_name || "User"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/dashboard#profile")}>
                        Profile Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/settings")}>
                        Account Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Custom Header Actions */}
                {headerActions && (
                  <div className="flex items-center gap-2">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
            
            {/* Modern Navigation Tabs */}
            {navigationTabs && navigationTabs.length > 0 && (
              <div className="px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-muted/30">
                <div className="flex flex-wrap gap-1 -mb-px overflow-x-auto scrollbar-hide">
                  {navigationTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentSection === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        variant="ghost"
                        onClick={() => {
                          const basePath = location.pathname;
                          navigate(`${basePath}#${tab.id}`, { replace: true });
                        }}
                        className={`
                          relative rounded-none rounded-t-lg border-b-2 transition-all duration-200
                          ${isActive
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-transparent hover:border-border/50 hover:bg-muted/50 text-muted-foreground"
                          }
                        `}
                      >
                        {Icon && <Icon className={`h-4 w-4 mr-2 ${isActive ? "text-primary" : ""}`} />}
                        <span>{tab.label}</span>
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </header>

          {/* Main Content with Better Spacing */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-7xl">
              <div className="space-y-6 animate-in fade-in-50 duration-500">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

