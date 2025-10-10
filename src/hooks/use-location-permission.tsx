"use client";

import { useState, useEffect, useCallback } from "react";

interface LocationStatus {
  isSupported: boolean;
  isGranted: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useLocationPermission() {
  const [status, setStatus] = useState<LocationStatus>({
    isSupported: true,
    isGranted: false,
    isLoading: true,
    error: null
  });

  const checkPermission = useCallback(async () => {
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setStatus({
          isSupported: false,
          isGranted: false,
          isLoading: false,
          error: "Geolocation is not supported by this browser"
        });
        return;
      }

      // Check permission status if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });

          if (permission.state === 'granted') {
            setStatus({
              isSupported: true,
              isGranted: true,
              isLoading: false,
              error: null
            });
          } else if (permission.state === 'denied') {
            setStatus({
              isSupported: true,
              isGranted: false,
              isLoading: false,
              error: "Location permission denied"
            });
          } else {
            // For 'prompt' state, try to request permission
            await requestPermission();
          }
        } catch {
          // Fallback to direct request
          await requestPermission();
        }
      } else {
        // Browser doesn't support Permissions API, try direct request
        await requestPermission();
      }
    } catch (error) {
      setStatus({
        isSupported: true,
        isGranted: false,
        isLoading: false,
        error: "Failed to check location permission"
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success - permission granted
          setStatus({
            isSupported: true,
            isGranted: true,
            isLoading: false,
            error: null
          });
          resolve();
        },
        (error) => {
          // Error - permission denied or unavailable
          let errorMessage = "Location permission denied";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location permission denied";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Location information unavailable";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Location request timed out";
          }

          setStatus({
            isSupported: true,
            isGranted: false,
            isLoading: false,
            error: errorMessage
          });
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...status,
    checkPermission,
    requestPermission
  };
}
