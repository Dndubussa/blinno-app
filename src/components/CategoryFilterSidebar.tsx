import { useState } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const categories = [
  { id: "news", label: "News & Media" },
  { id: "creativity", label: "Creativity" },
  { id: "marketplace", label: "Marketplace" },
  { id: "events", label: "Events" },
  { id: "music", label: "Music" },
  { id: "restaurants", label: "Restaurants" },
  { id: "lodging", label: "Lodging" },
  { id: "education", label: "Education" },
  { id: "movies", label: "Bongo Movies" },
  { id: "community", label: "Community" },
  { id: "jobs", label: "Jobs" },
  { id: "artisans", label: "Artisans" },
];

interface CategoryFilterSidebarProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}

export const CategoryFilterSidebar = ({ selectedCategories, onCategoryChange }: CategoryFilterSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    onCategoryChange(newSelected);
  };

  const clearAll = () => {
    onCategoryChange([]);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filter Categories</h3>
        {selectedCategories.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((catId) => {
            const category = categories.find((c) => c.id === catId);
            return (
              <Badge
                key={catId}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10"
                onClick={() => toggleCategory(catId)}
              >
                {category?.label}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
            onClick={() => toggleCategory(category.id)}
          >
            <Checkbox
              id={category.id}
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={() => toggleCategory(category.id)}
            />
            <label
              htmlFor={category.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
            >
              {category.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 sm:w-96">
            <SheetHeader>
              <SheetTitle>Filter Options</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed Sidebar */}
      <Card className="hidden lg:block w-full p-6 h-fit sticky top-24 animate-fade-in">
        <FilterContent />
      </Card>
    </>
  );
};