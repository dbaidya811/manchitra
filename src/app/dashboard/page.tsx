"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { PoiCarousel } from "@/components/dashboard/poi-carousel";
import { Place } from "@/lib/types";

export default function DashboardPage() {
  const { toast } = useToast();
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    // Load places from local storage on mount
    const storedPlaces = localStorage.getItem("user-places");
    if (storedPlaces) {
      setPlaces(JSON.parse(storedPlaces));
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Location retrieved successfully, no need to do anything here.
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            // This is expected if the user denies permission.
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
  
  const handleAddPlace = (newPlace: Omit<Place, 'id' | 'tags'>) => {
     const placeToAdd: Place = {
      id: Date.now(),
      lat: parseFloat(newPlace.location.split(',')[0]),
      lon: parseFloat(newPlace.location.split(',')[1]),
      area: newPlace.area,
      tags: {
        name: newPlace.name,
        description: newPlace.description,
      },
      photos: newPlace.photos,
    };

    const updatedPlaces = [...places, placeToAdd];
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
  }

  const handleUpdatePlace = (updatedPlace: Place) => {
    const updatedPlaces = places.map(p => p.id === updatedPlace.id ? updatedPlace : p);
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
  };

  const handleDeletePlace = (placeId: number) => {
    const updatedPlaces = places.filter(p => p.id !== placeId);
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
  };

  const groupedPlaces = useMemo(() => {
    const groups: { [key: string]: Place[] } = {};
    const recentPlaces: Place[] = [];
    const placesWithArea: Place[] = [];

    // Sort places by id descending to get recent places
    const sortedPlaces = [...places].sort((a, b) => b.id - a.id);

    sortedPlaces.forEach(place => {
      if (recentPlaces.length < 15) {
        recentPlaces.push(place);
      }
      if (place.area) {
        placesWithArea.push(place);
      }
    });

    placesWithArea.forEach(place => {
      const area = place.area!;
      if (!groups[area]) {
        groups[area] = [];
      }
      groups[area].push(place);
    });

    return { recentPlaces, areaGroups: groups };
  }, [places]);


  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent">
            Manchitra
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile onPlaceSubmit={handleAddPlace} />
        </div>
      </header>
      <main className="flex-1 space-y-8 p-4 md:p-6">
        {groupedPlaces.recentPlaces.length > 0 && (
          <PoiCarousel title="Recently Added Places" places={groupedPlaces.recentPlaces} />
        )}
        {Object.entries(groupedPlaces.areaGroups).map(([area, areaPlaces]) => (
           areaPlaces.length > 0 && <PoiCarousel key={area} title={`Places in ${area}`} places={areaPlaces} />
        ))}
      </main>
      <MobileNav />
    </div>
  );
}
