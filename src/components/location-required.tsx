"use client";

import { useEffect } from "react";
import { useLocationPermission } from "@/hooks/use-location-permission";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, RefreshCw } from "lucide-react";

interface LocationRequiredProps {
  children: React.ReactNode;
  feature?: string; // Optional feature name for better messaging
}

export function LocationRequired({ children, feature }: LocationRequiredProps) {
  const { isSupported, isGranted, isLoading, error, checkPermission } = useLocationPermission();

  // If location is not granted, don't show popup - just render children
  // The consuming component should handle the lack of location gracefully
  if (!isGranted) {
    return <>{children}</>;
  }

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Checking location permissions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should not be reached since !isGranted returns early
  return <>{children}</>;
}
