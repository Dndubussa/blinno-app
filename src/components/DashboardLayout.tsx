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
        <div className="min-h-screen bg-background flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <SidebarTrigger />
                <h1 className="text-2xl md:text-3xl font-bold truncate">{title}</h1>
              </div>
              
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                {/* Home Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  title="Home"
                >
                  <Home className="h-4 w-4" />
                </Button>

                {/* Cart */}
                {user && (
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
                )}

                {/* Notifications */}
                {user && <NotificationBell />}

                {/* User Menu */}
                {user && profile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || user.email || ""} />
                          <AvatarFallback>
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
                      <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
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
            
            {/* Navigation Tabs */}
            {navigationTabs && navigationTabs.length > 0 && (
              <div className="px-6 border-b border-border">
                <div className="flex flex-wrap gap-2 -mb-px">
                  {navigationTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentSection === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        variant={isActive ? "default" : "ghost"}
                        onClick={() => {
                          const basePath = location.pathname;
                          navigate(`${basePath}#${tab.id}`, { replace: true });
                        }}
                        className={`rounded-none rounded-t-lg border-b-2 ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-transparent hover:border-border"
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4 mr-2" />}
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

