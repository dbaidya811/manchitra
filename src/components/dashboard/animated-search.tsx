"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AnimatedSearch() {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Animate open on component mount
    const timer = setTimeout(() => setIsExpanded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex items-center justify-center h-10 w-full max-w-md">
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
            />
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
