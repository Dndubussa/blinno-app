import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await api.search(query, 8);
        setResults(searchResults || []);
        setIsOpen((searchResults || []).length > 0);
      } catch (error: any) {
        console.error('Search error:', error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
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
            {loading ? (
              <div className="p-3 text-center text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground">
                No results found
              </div>
            ) : (
              results.map((result, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-accent rounded-md cursor-pointer transition-colors group flex items-center justify-between"
                  onClick={() => {
                    if (result.path) {
                      navigate(result.path);
                      setIsOpen(false);
                      setQuery('');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    <span className="font-medium">{result.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {result.type}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};