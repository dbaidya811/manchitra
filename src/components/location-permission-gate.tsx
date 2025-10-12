"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, AlertTriangle, Settings, RefreshCw } from "lucide-react";

interface LocationPermissionGateProps {
  children: React.ReactNode;
}

export function LocationPermissionGate({ children }: LocationPermissionGateProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [showPermissionScreen, setShowPermissionScreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    setIsLoading(true);

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setShowPermissionScreen(true);
        setIsLoading(false);
        return;
      }

      // Check current permission status if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          setPermissionStatus(permission.state);

          if (permission.state === 'denied') {
            setShowPermissionScreen(true);
          } else if (permission.state === 'granted') {
            setLocationEnabled(true);
            setShowPermissionScreen(false);
          } else {
            // For 'prompt' state, we need to actually request permission
            await requestLocationPermission();
          }
        } catch {
          // Fallback: try to request permission directly
          await requestLocationPermission();
        }
      } else {
        // Fallback for browsers without Permissions API
        await requestLocationPermission();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setShowPermissionScreen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success - location granted
          setLocationEnabled(true);
          setShowPermissionScreen(false);
          setPermissionStatus('granted');
          resolve();
        },
        (error) => {
          // Error - location denied or unavailable
          setLocationEnabled(false);
          setShowPermissionScreen(true);

          if (error.code === error.PERMISSION_DENIED) {
            setPermissionStatus('denied');
          } else {
            setPermissionStatus('denied'); // Treat other errors as denied for simplicity
          }
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  const handleEnableLocation = async () => {
    setIsLoading(true);
    await requestLocationPermission();
    setIsLoading(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Show loading screen while checking permissions
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

  // Show permission screen if location is not enabled
  if (showPermissionScreen) {
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

            <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
              This app needs location access to show maps, find nearby places, and provide navigation features.
              Please enable location permissions to continue using the app.
            </p>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-2">
              <p>• Location data is only used for mapping features</p>
              <p>• Your privacy is protected - data stays on your device</p>
              <p>• You can disable location anytime in browser settings</p>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleReload}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 rounded-xl font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Location is enabled, render children
  return <>{children}</>;
}
