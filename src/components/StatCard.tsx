/**
 * Modern Stat Card Component
 * Beautiful, animated stat cards for dashboard metrics
 */

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-gradient-to-br from-background to-muted/50 border-border",
    primary: "bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20",
    success: "bg-gradient-to-br from-green-500/10 via-green-500/5 to-background border-green-500/20",
    warning: "bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-background border-yellow-500/20",
    danger: "bg-gradient-to-br from-red-500/10 via-red-500/5 to-background border-red-500/20",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "rounded-lg p-3 bg-background/50 backdrop-blur-sm",
              iconStyles[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      {/* Decorative gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-5 pointer-events-none",
          variant === "primary" && "bg-primary",
          variant === "success" && "bg-green-500",
          variant === "warning" && "bg-yellow-500",
          variant === "danger" && "bg-red-500"
        )}
        style={{
          background: "radial-gradient(circle at top right, currentColor, transparent 70%)",
        }}
      />
    </Card>
  );
}

