"use client";

import { useUrlCleaner } from "@/hooks/use-url-cleaner";

export function UrlCleanerProvider({ children }: { children: React.ReactNode }) {
  // Clean URL by removing unnecessary parameters globally
  useUrlCleaner({
    paramsToRemove: ['callbackUrl', 'error', 'error_description', 'state', 'code'],
    immediate: true
  });

  return <>{children}</>;
}