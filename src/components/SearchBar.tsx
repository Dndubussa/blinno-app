import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const searchData = {
  categories: [
    { name: "News & Media", path: "/category/news" },
    { name: "Creativity", path: "/category/creativity" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Events", path: "/events" },
    { name: "Music", path: "/music" },
    { name: "Restaurants", path: "/category/restaurants" },
    { name: "Lodging", path: "/category/lodging" },
    { name: "Education", path: "/category/education" },
  ],
  creators: [
    { name: "Amina Hassan - Digital Artist", type: "Creator" },
    { name: "John Mwakasege - Music Producer", type: "Creator" },
    { name: "Fatuma Juma - Fashion Designer", type: "Creator" },
    { name: "David Mollel - Event Organizer", type: "Creator" },
  ],
  content: [
    { name: "Latest Movies", type: "Content" },
    { name: "Local Art Exhibition", type: "Content" },
    { name: "City Food Festival", type: "Content" },
  ],
};

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim() === "") {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults: any[] = [];
    const lowerQuery = query.toLowerCase();

    searchData.categories.forEach((cat) => {
      if (cat.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({ ...cat, type: "Category" });
      }
    });

    searchData.creators.forEach((creator) => {
      if (creator.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push(creator);
      }
    });

    searchData.content.forEach((content) => {
      if (content.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push(content);
      }
    });

    setResults(searchResults.slice(0, 8));
    setIsOpen(searchResults.length > 0);
  }, [query]);

  return (
    <div className="w-full relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          type="text"
          placeholder="Search categories, creators, and content..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          className="pl-12 pr-4 py-6 text-lg bg-background/95 backdrop-blur border-border focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto shadow-lg border-border animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-3 hover:bg-accent rounded-md cursor-pointer transition-colors group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium">{result.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {result.type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};