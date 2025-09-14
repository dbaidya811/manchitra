
"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AnimatedSearch } from "@/components/dashboard/animated-search";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';

export default function DashboardMapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [viewBox, setViewBox] = useState<string>("-0.004017949104309083,51.47612752051241,0.004017949104309083,51.47957975293232");

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      const offset = 0.002; // Small offset to create a bounding box
      const newBbox = [lonNum - offset, latNum - offset, lonNum + offset, latNum + offset].join(',');
      setViewBox(newBbox);
      // Optional: remove query params after use
      router.replace('/dashboard/map');
    }
  }, [searchParams, router]);


  const handleLocationSelect = (location: { boundingbox: [string, string, string, string] }) => {
    const [minLat, maxLat, minLon, maxLon] = location.boundingbox;
    const newBbox = [minLon, minLat, maxLon, maxLat].join(',');
    setViewBox(newBbox);
  };


  return (
    <div className="relative h-screen">
       <header className="absolute top-0 left-0 right-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 px-4 md:px-6 bg-transparent">
        <div className="flex items-center gap-2 md:flex-1">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent drop-shadow-md">
            Manchitra
          </h1>
        </div>
        <div className="flex-1 flex justify-center">
            <AnimatedSearch onLocationSelect={handleLocationSelect} />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <UserProfile />
        </div>
      </header>
      <main className="h-full w-full">
        <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${viewBox}&layer=mapnik`}
            style={{ border: 0, width: '100%', height: '100%' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </main>
      <MobileNav />
    </div>
  );
}
