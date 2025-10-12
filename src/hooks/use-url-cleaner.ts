"use client";

import { useEffect } from "react";

interface UseUrlCleanerOptions {
  paramsToRemove?: string[];
  immediate?: boolean;
}

export function useUrlCleaner(options: UseUrlCleanerOptions = {}) {
  const {
    paramsToRemove = ['callbackUrl', 'error', 'error_description', 'state', 'code'],
    immediate = true
  } = options;

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const cleanUrl = () => {
      const url = new URL(window.location.href);
      let hasParamsToRemove = false;
      
      // Check if any parameters need to be removed
      paramsToRemove.forEach(param => {
        if (url.searchParams.has(param)) {
          hasParamsToRemove = true;
          url.searchParams.delete(param);
        }
      });
      
      if (hasParamsToRemove) {
        // Clean the URL and update without page reload
        const cleanUrlString = url.toString();
        
        // Use replaceState to avoid adding to browser history
        window.history.replaceState({}, '', cleanUrlString);
      }
    };

    if (immediate) {
      cleanUrl();
    }

    // Also clean on popstate (back/forward navigation)
    const handlePopState = () => {
      cleanUrl();
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [paramsToRemove, immediate]);
}