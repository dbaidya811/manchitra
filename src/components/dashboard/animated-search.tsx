
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, LocateFixed } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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
    // Save to localStorage: compute approximate center from bounding box
    try {
      const [minLatStr, maxLatStr, minLonStr, maxLonStr] = suggestion.boundingbox || [] as any;
      const minLat = parseFloat(minLatStr || '0');
      const maxLat = parseFloat(maxLatStr || '0');
      const minLon = parseFloat(minLonStr || '0');
      const maxLon = parseFloat(maxLonStr || '0');
      const lat = (minLat + maxLat) / 2;
      const lon = (minLon + maxLon) / 2;
      const raw = localStorage.getItem('search-history');
      const arr: Array<{ name: string; lat: number; lon: number; time: number }> = raw ? JSON.parse(raw) : [];
      arr.unshift({ name: suggestion.display_name, lat, lon, time: Date.now() });
      const trimmed = arr.slice(0, 200);
      localStorage.setItem('search-history', JSON.stringify(trimmed));
    } catch {}
    onLocationSelect(suggestion);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Create a small bounding box around the user's location
        const offset = 0.01;
        const boundingbox: [string, string, string, string] = [
          (latitude - offset).toString(),
          (latitude + offset).toString(),
          (longitude - offset).toString(),
          (longitude + offset).toString(),
        ];
        
        const currentLocationSuggestion: Suggestion = {
            place_id: Date.now(),
            display_name: "Your Current Location",
            boundingbox: boundingbox
        };
        handleSelectSuggestion(currentLocationSuggestion);
        setQuery("Your Current Location");
        setIsLoading(false);
      },
      (error) => {
        toast({
          variant: "destructive",
          title: "Unable to retrieve your location",
          description: error.message,
        });
        setIsLoading(false);
      }
    );
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
              className="h-10 w-full rounded-full bg-background/80 pl-10 pr-12 text-foreground placeholder:text-muted-foreground"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
             {isLoading && (
               <span className="absolute right-12 top-1/2 -translate-y-1/2">
                 <Loader size="sm" />
               </span>
             )}
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                onClick={handleGetCurrentLocation}
                aria-label="Get current location"
            >
                <LocateFixed className="h-5 w-5 text-muted-foreground" />
            </Button>
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
