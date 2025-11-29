/**
 * Modern Section Card Component
 * For displaying content sections in dashboards
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  variant?: "default" | "bordered" | "elevated";
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  headerActions,
  className,
  variant = "default",
}: SectionCardProps) {
  const variantStyles = {
    default: "border border-border bg-background",
    bordered: "border-2 border-border bg-card",
    elevated: "border border-border bg-card shadow-lg",
  };

  return (
    <Card className={cn("transition-all duration-300", variantStyles[variant], className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="rounded-lg bg-primary/10 p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

