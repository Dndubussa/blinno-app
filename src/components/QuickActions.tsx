import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Heart,
  BarChart3,
  Search,
  Shield,
  ShoppingCart,
  UserPlus,
} from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function QuickActions() {
  // Safely access auth context
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const profile = authContext?.profile || null;
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const actions = [
    {
      icon: Heart,
      label: "My Wishlist",
      description: "View saved items",
      href: "/wishlist",
      color: "text-red-500",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      description: "Track performance",
      href: "/analytics",
      color: "text-blue-500",
      show: profile?.is_creator,
    },
    {
      icon: Search,
      label: "Advanced Search",
      description: "Find exactly what you need",
      href: "/search",
      color: "text-purple-500",
    },
    {
      icon: Shield,
      label: "Security",
      description: "Enable 2FA",
      href: "/2fa",
      color: "text-green-500",
    },
  ].filter((action) => action.show !== false);

  return (
    <AnimatedSection delay={500}>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Quick Actions</h2>
          <p className="text-muted-foreground">
            Access your favorite features quickly
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.href}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-3 ${action.color}`} />
                  <h3 className="font-semibold mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}

