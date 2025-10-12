"use client";

import { useSession, getSession } from "next-auth/react";
import { useEffect, useCallback, useState } from "react";

export function useSessionRefresh() {
  const { data: session, status, update } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const refreshSession = useCallback(async () => {
    if (isLoggingOut) return; // Don't refresh during logout
    try {
      await getSession();
    } catch (error) {
      console.error("Failed to refresh session:", error);
    }
  }, [isLoggingOut]);

  const refreshSessionWithRetry = useCallback(async (retries = 3) => {
    if (isLoggingOut) return; // Don't refresh during logout
    for (let i = 0; i < retries; i++) {
      try {
        await getSession();
        break;
      } catch (error) {
        console.error(`Failed to refresh session (attempt ${i + 1}):`, error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    }
  }, [isLoggingOut]);

  // Refresh session when component mounts if authenticated
  useEffect(() => {
    if (status === "authenticated" && !isLoggingOut) {
      refreshSession();
    }
  }, [status, refreshSession, isLoggingOut]);

  // Force refresh when status changes from loading to authenticated
  useEffect(() => {
    if (status === "authenticated" && !isLoggingOut) {
      // Small delay to ensure session data is available
      setTimeout(() => {
        refreshSessionWithRetry();
      }, 300);
    }
  }, [status, refreshSessionWithRetry, isLoggingOut]);

  // Reset logout state when session status changes
  useEffect(() => {
    if (status === "unauthenticated") {
      setIsLoggingOut(false);
    }
  }, [status]);

  // Check for login redirect and refresh session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCallbackUrl = urlParams.get('callbackUrl');
    const hasAccessToken = window.location.hash.includes('access_token');
    const justLoggedIn = localStorage.getItem('just-logged-in');
    const isDashboard = window.location.pathname === '/dashboard';
    
    if ((hasCallbackUrl || hasAccessToken || justLoggedIn) && isDashboard && !isLoggingOut) {
      // User just returned from OAuth to dashboard, refresh session with retry
      setTimeout(() => {
        refreshSessionWithRetry();
        localStorage.removeItem('just-logged-in');
      }, 100);
    }
  }, [refreshSessionWithRetry]);

  // Refresh session when window gains focus (after login redirect)
  useEffect(() => {
    const handleFocus = () => {
      if (status === "authenticated" && !isLoggingOut) {
        refreshSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [status, refreshSession, isLoggingOut]);

  const setLogoutState = useCallback((loggingOut: boolean) => {
    setIsLoggingOut(loggingOut);
  }, []);

  return { session, status, refreshSession, refreshSessionWithRetry, isLoggingOut, setLogoutState };
}