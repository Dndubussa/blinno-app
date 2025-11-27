import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

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
  const currentSection = location.hash.replace("#", "") || defaultSection;

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
              </div>
              {headerActions && (
                <div className="flex items-center gap-2">
                  {headerActions}
                </div>
              )}
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

