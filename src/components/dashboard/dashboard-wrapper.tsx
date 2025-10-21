"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "@/components/ui/loader";

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Skip loading for map and feed pages
  const isMapOrFeed = pathname?.includes("/map") || pathname?.includes("/feed");

  if (status === "loading" && !isMapOrFeed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
        <div className="text-center">
          <Loader size="md" />
          <p className="mt-4 text-white font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
        <div className="text-center">
          <p className="text-white font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}