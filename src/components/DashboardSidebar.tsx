import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Briefcase,
  BookOpen,
  Newspaper,
  Hammer,
  Building2,
  UtensilsCrossed,
  GraduationCap,
  Users,
  Settings,
  BarChart3,
  Heart,
  Bell,
  FileText,
  CreditCard,
  MessageSquare,
  LogOut,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
}

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Extract primary role from roles array (prefer non-'user' role)
  let role = 'user';
  if (profile?.roles && Array.isArray(profile.roles)) {
    const nonUserRole = profile.roles.find((r: string) => r !== 'user');
    role = nonUserRole || profile.roles[0] || 'user';
  } else if (profile?.role) {
    role = profile.role;
  }

  // Common navigation items for all dashboards
  const commonNavItems: NavItem[] = [
    { title: "Marketplace", icon: ShoppingBag, href: "/marketplace" },
    { title: "Events", icon: Calendar, href: "/events" },
    { title: "Orders", icon: FileText, href: "/orders" },
    { title: "Notifications", icon: Bell, href: "/notifications" },
    { title: "Wishlist", icon: Heart, href: "/wishlist" },
    { title: "Analytics", icon: BarChart3, href: "/analytics" },
    { title: "Messages", icon: MessageSquare, href: "/messages" },
  ];

  // Items to exclude for specific roles
  // Only exclude items that are truly redundant or not applicable
  // Service providers can still purchase products/services from others
  const roleExclusions: Record<string, string[]> = {
    // Freelancers provide services but can also buy products/services - only exclude redundant analytics
    freelancer: ['/analytics'],
    
    // Lodging providers can buy supplies/services - only exclude redundant analytics
    lodging: ['/analytics'],
    
    // Restaurant owners can buy supplies/services - only exclude redundant analytics
    restaurant: ['/analytics'],
    
    // Educators can buy courses/supplies - only exclude redundant analytics
    educator: ['/analytics'],
    
    // Journalists can buy services/supplies - only exclude redundant analytics
    journalist: ['/analytics'],
    
    // Artisans can buy materials/services - only exclude redundant analytics
    artisan: ['/analytics'],
    
    // Employers can buy services/supplies - only exclude redundant analytics
    employer: ['/analytics'],
    
    // Event organizers manage events but can attend others - only exclude redundant analytics
    event_organizer: ['/analytics'],
    
    // Musicians can buy equipment/services - only exclude redundant analytics
    musician: ['/analytics'],
    
    // Sellers can buy products/services - only exclude redundant analytics
    seller: ['/analytics'],
    
    // Creators might need all features
    creator: [],
    
    // Regular users need all features
    user: [],
  };

  // Role-specific dashboard items
  const roleNavItems: Record<string, NavItem[]> = {
    freelancer: [
      { title: "Freelancer Dashboard", icon: LayoutDashboard, href: "/freelancer-dashboard#overview" },
      { title: "Projects", icon: Briefcase, href: "/freelancer-dashboard#projects" },
      { title: "Clients", icon: Users, href: "/freelancer-dashboard#clients" },
      { title: "Services", icon: Briefcase, href: "/freelancer-dashboard#services" },
      { title: "Financial", icon: CreditCard, href: "/freelancer-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/freelancer-dashboard#profile" },
    ],
    lodging: [
      { title: "Lodging Dashboard", icon: LayoutDashboard, href: "/lodging-dashboard#overview" },
      { title: "Properties", icon: Building2, href: "/lodging-dashboard#properties" },
      { title: "Rooms", icon: Building2, href: "/lodging-dashboard#rooms" },
      { title: "Bookings", icon: Calendar, href: "/lodging-dashboard#bookings" },
      { title: "Financial", icon: CreditCard, href: "/lodging-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/lodging-dashboard#profile" },
    ],
    restaurant: [
      { title: "Restaurant Dashboard", icon: LayoutDashboard, href: "/restaurant-dashboard#overview" },
      { title: "Restaurants", icon: UtensilsCrossed, href: "/restaurant-dashboard#restaurants" },
      { title: "Menu", icon: UtensilsCrossed, href: "/restaurant-dashboard#menu" },
      { title: "Reservations", icon: Calendar, href: "/restaurant-dashboard#reservations" },
      { title: "Financial", icon: CreditCard, href: "/restaurant-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/restaurant-dashboard#profile" },
    ],
    educator: [
      { title: "Educator Dashboard", icon: LayoutDashboard, href: "/educator-dashboard#overview" },
      { title: "Courses", icon: BookOpen, href: "/educator-dashboard#courses" },
      { title: "Students", icon: Users, href: "/educator-dashboard#students" },
      { title: "Financial", icon: CreditCard, href: "/educator-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/educator-dashboard#profile" },
    ],
    journalist: [
      { title: "Journalist Dashboard", icon: LayoutDashboard, href: "/journalist-dashboard#overview" },
      { title: "Articles", icon: Newspaper, href: "/journalist-dashboard#articles" },
      { title: "Financial", icon: CreditCard, href: "/journalist-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/journalist-dashboard#profile" },
    ],
    artisan: [
      { title: "Artisan Dashboard", icon: LayoutDashboard, href: "/artisan-dashboard#overview" },
      { title: "Services", icon: Hammer, href: "/artisan-dashboard#services" },
      { title: "Bookings", icon: Calendar, href: "/artisan-dashboard#bookings" },
      { title: "Financial", icon: CreditCard, href: "/artisan-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/artisan-dashboard#profile" },
    ],
    employer: [
      { title: "Employer Dashboard", icon: LayoutDashboard, href: "/employer-dashboard#overview" },
      { title: "Jobs", icon: Briefcase, href: "/employer-dashboard#jobs" },
      { title: "Applications", icon: FileText, href: "/employer-dashboard#applications" },
      { title: "Financial", icon: CreditCard, href: "/employer-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/employer-dashboard#profile" },
    ],
    event_organizer: [
      { title: "Event Organizer Dashboard", icon: LayoutDashboard, href: "/event-organizer-dashboard#overview" },
      { title: "Events", icon: Calendar, href: "/event-organizer-dashboard#events" },
      { title: "Tickets", icon: FileText, href: "/event-organizer-dashboard#tickets" },
      { title: "Financial", icon: CreditCard, href: "/event-organizer-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/event-organizer-dashboard#profile" },
    ],
    seller: [
      { title: "Seller Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { title: "Manage Products", icon: ShoppingBag, href: "/manage-products" },
    ],
    creator: [
      { title: "Creator Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
    musician: [
      { title: "Musician Dashboard", icon: Music, href: "/musician-dashboard#overview" },
      { title: "My Tracks", icon: Music, href: "/musician-dashboard#tracks" },
      { title: "Financial", icon: CreditCard, href: "/musician-dashboard#financial" },
      { title: "Settings", icon: Settings, href: "/musician-dashboard#profile" },
    ],
    user: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  };

  // Get role-specific items
  const roleItems = roleNavItems[role] || roleNavItems['user'];
  
  // Combine role-specific items with common items
  // Remove duplicates by href to avoid React key warnings
  const allNavItemsMap = new Map<string, NavItem>();
  
  // Add role-specific items first (they take priority)
  roleItems.forEach(item => {
    allNavItemsMap.set(item.href, item);
  });
  
  // Add common items (only if href doesn't already exist and not excluded for this role)
  const excludedHrefs = roleExclusions[role] || [];
  commonNavItems.forEach(item => {
    if (!allNavItemsMap.has(item.href) && !excludedHrefs.includes(item.href)) {
      allNavItemsMap.set(item.href, item);
    }
  });
  
  const allNavItems = Array.from(allNavItemsMap.values());

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={`flex items-center gap-2 px-4 py-3 ${isCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold whitespace-nowrap">Blinno</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Dashboard</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allNavItems.map((item) => {
                const Icon = item.icon;
                // Check if href matches pathname or hash
                const itemHash = item.href.includes('#') ? item.href.split('#')[1] : null;
                const currentHash = location.hash.replace('#', '');
                const isActive = location.pathname === item.href.split('#')[0] && 
                  (itemHash ? currentHash === itemHash : !currentHash) ||
                  (item.href !== "/" && !item.href.includes('#') && location.pathname.startsWith(item.href));
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.href)}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign Out"
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}