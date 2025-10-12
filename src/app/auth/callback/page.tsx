"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('Auth Callback - Status:', status);

    // Wait for authentication to complete
    if (status === "authenticated") {
      console.log('Auth Callback - Session ready, redirecting to dashboard');
      // Use window.location for a hard redirect to ensure cookies are properly set
      window.location.href = "/dashboard";
    } else if (status === "unauthenticated") {
      console.log('Auth Callback - Not authenticated, redirecting to home');
      router.replace("/");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Completing sign in...</p>
          <p className="text-white/80 text-sm mt-2">Please wait</p>
        </div>
      </div>
    </div>
  );
}
