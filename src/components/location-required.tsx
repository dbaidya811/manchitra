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

  // If location is granted, render children
  if (isGranted) {
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

  // Show location required screen
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white dark:bg-neutral-900 border-2 border-orange-200 dark:border-orange-800">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          </div>

          <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
            Location Access Required
          </h2>

          <p className="text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
            {feature
              ? `This feature requires location access to ${feature}.`
              : "This app feature requires location access to work properly."
            }
          </p>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="space-y-3 mb-6">
            <Button
              onClick={checkPermission}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Location Access
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                // Try to open browser settings or show instructions
                if (confirm('Location access is required for this feature. Would you like to enable it in your browser settings?')) {
                  alert('Please enable location access in your browser settings:\n\n1. Click the location icon in your browser\'s address bar\n2. Select "Allow" or "Always allow"\n3. Refresh this page');
                }
              }}
              className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20 py-3 rounded-xl font-medium"
            >
              Open Browser Settings
            </Button>
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-2">
            <p>• Location data is only used for this feature</p>
            <p>• Your privacy is protected - data stays on your device</p>
            <p>• You can disable location anytime in browser settings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
