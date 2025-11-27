import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const DiasporaBanner = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-card border border-border rounded-lg p-6 flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Globe className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-foreground">Welcome from Abroad!</h3>
            <Badge className="bg-accent text-accent-foreground">
              🌍 Worldwide Access
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Connect with home from anywhere in the world. Support local creators, discover events, and shop authentic products through our worldwide platform.
          </p>
        </div>
      </div>
    </div>
  );
};