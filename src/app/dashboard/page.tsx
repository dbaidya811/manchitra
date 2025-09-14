"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PoiCarousel } from "@/components/dashboard/poi-carousel";

export default function DashboardPage() {
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Location retrieved successfully, no need to do anything here.
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            // This is expected if the user denies permission.
            // You could show a toast here if you wanted to inform the user.
            console.log("Location permission denied.");
          } else {
            // Handle other errors
            toast({
              variant: "destructive",
              title: "Could not get location",
              description: error.message,
            });
          }
        }
      );
    }
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent">
            Manchitra
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </header>
      <main className="flex-1 space-y-8 p-4 md:p-6">
        <PoiCarousel
          category="amenity"
          value="hospital"
          title="Top Hospitals in Kolkata"
          areaId="3602888796"
        />
      </main>
      <MobileNav />
    </div>
  );
}
