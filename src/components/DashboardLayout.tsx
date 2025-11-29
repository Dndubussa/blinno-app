import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { Search, ShoppingCart, Home, LogOut, User, Settings, ChevronDown } from "lucide-react";
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

                {/* Enhanced User Profile & Sign Out */}
                {user && profile && (
                  <div className="flex items-center gap-2">
                    {/* Profile Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="relative h-auto px-2 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-all group border border-transparent hover:border-primary/20"
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-10 w-10 ring-2 ring-border group-hover:ring-primary/50 transition-all shadow-md group-hover:shadow-lg group-hover:scale-105">
                                <AvatarImage 
                                  src={profile.avatar_url || undefined} 
                                  alt={profile.display_name || user.email || ""}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground font-bold text-base shadow-inner">
                                  {(profile.display_name || user.email || "U")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background ring-2 ring-green-500/30 animate-pulse"></div>
                            </div>
                            <div className="hidden lg:flex flex-col items-start">
                              <span className="text-sm font-semibold leading-tight text-foreground">
                                {profile.display_name || user.email?.split("@")[0] || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
                                {user.email}
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors hidden lg:block" />
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72 p-2 shadow-xl border-border/50">
                        <DropdownMenuLabel className="p-0">
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50">
                            <div className="relative">
                              <Avatar className="h-14 w-14 ring-2 ring-primary/30 shadow-lg">
                                <AvatarImage 
                                  src={profile.avatar_url || undefined} 
                                  alt={profile.display_name || user.email || ""}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground font-bold text-xl shadow-inner">
                                  {(profile.display_name || user.email || "U")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-background ring-2 ring-green-500/50"></div>
                            </div>
                            <div className="flex flex-col space-y-1 flex-1 min-w-0">
                              <p className="text-sm font-bold leading-none truncate text-foreground">
                                {profile.display_name || "User"}
                              </p>
                              <p className="text-xs leading-none text-muted-foreground truncate">
                                {user.email}
                              </p>
                              {profile.bio && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                                  {profile.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem 
                          onClick={() => {
                            const basePath = location.pathname;
                            navigate(`${basePath}#profile`, { replace: true });
                          }}
                          className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-primary/10 hover:text-primary transition-colors group/item"
                        >
                          <User className="h-4 w-4 mr-2 group-hover/item:scale-110 transition-transform" />
                          <span className="font-medium">Profile Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            const basePath = location.pathname;
                            navigate(`${basePath}#profile`, { replace: true });
                          }}
                          className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-primary/10 hover:text-primary transition-colors group/item"
                        >
                          <Settings className="h-4 w-4 mr-2 group-hover/item:scale-110 transition-transform" />
                          <span className="font-medium">Account Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem 
                          onClick={async () => {
                            try {
                              await signOut();
                              navigate("/");
                            } catch (error) {
                              console.error("Error signing out:", error);
                            }
                          }} 
                          className="cursor-pointer rounded-md px-3 py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 hover:bg-destructive/10 transition-colors group/item font-semibold"
                        >
                          <LogOut className="h-4 w-4 mr-2 group-hover/item:scale-110 transition-transform" />
                          <span>Sign Out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Standalone Sign Out Button (Always Visible) */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await signOut();
                          navigate("/");
                        } catch (error) {
                          console.error("Error signing out:", error);
                        }
                      }}
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all hidden sm:flex items-center gap-2"
                      title="Sign Out"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden lg:inline">Sign Out</span>
                    </Button>
                  </div>
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

