"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
};

interface Suggestion {
  place_id: number;
  display_name: string;
  boundingbox: [string, string, string, string];
}

interface AnimatedSearchProps {
  onLocationSelect: (location: Suggestion) => void;
}

export function AnimatedSearch({ onLocationSelect }: AnimatedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&limit=5`
      );
      const data: Suggestion[] = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 300), []);

  useEffect(() => {
    // Animate open on component mount
    const timer = setTimeout(() => setIsExpanded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (query) {
      debouncedFetchSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query, debouncedFetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.display_name);
    setSuggestions([]);
    onLocationSelect(suggestion);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    }
  };

  return (
    <div className="relative flex items-center justify-center h-10 w-full max-w-md" ref={searchContainerRef}>
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            key="search-input"
            initial={{ width: "40px", opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            exit={{ width: "40px", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative w-full"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search map..."
              className="h-10 w-full rounded-full bg-background/80 pl-10 pr-4 text-foreground placeholder:text-muted-foreground"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
             {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
             {suggestions.length > 0 && (
              <Card className="absolute top-full mt-2 w-full rounded-lg bg-background/90 p-2 shadow-lg backdrop-blur-sm">
                <ScrollArea className="h-full max-h-60">
                   <ul>
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.place_id}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-auto py-2 px-3 text-left"
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{suggestion.display_name}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="search-button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-background/80"
              onClick={() => setIsExpanded(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
