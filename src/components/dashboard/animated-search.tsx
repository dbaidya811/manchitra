"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AnimatedSearch() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex items-center -ml-[50px]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <Input
              type="text"
              placeholder="Search map..."
              className="h-9 w-full rounded-full bg-background/80 pr-10 text-foreground placeholder:text-muted-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-full transition-all",
          isOpen ? "absolute right-0" : "relative"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </Button>
    </div>
  );
}
