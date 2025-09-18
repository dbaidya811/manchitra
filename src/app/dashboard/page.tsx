"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useEffect, useState, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { PoiCarousel } from "@/components/dashboard/poi-carousel";
import { Place } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Sparkles, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { AddPlaceDialog } from "@/components/dashboard/add-place-dialog";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { status } = useSession();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [showLoveAnim, setShowLoveAnim] = useState(false);
  const [showCreateAnim, setShowCreateAnim] = useState(false);
  const [showWelcomeAnim, setShowWelcomeAnim] = useState(false);

  useEffect(() => {
    const storedPlaces = localStorage.getItem("user-places");
    if (storedPlaces) {
      setPlaces(JSON.parse(storedPlaces));
    }
    try {
      const rawSeen = localStorage.getItem("seen-places");
      setSeenIds(rawSeen ? JSON.parse(rawSeen) : []);
    } catch (_) {}
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) {
            toast({
              variant: "destructive",
              title: "Could not get location",
              description: error.message,
            });
          }
        }
      );
    }
  }, [toast, status]);

  // Authenticated users: show welcome right after the login transition
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (status === "authenticated" && prev !== "authenticated") {
      const alreadyShown = sessionStorage.getItem("welcome_after_login_shown");
      if (!alreadyShown) {
        setShowWelcomeAnim(true);
        sessionStorage.setItem("welcome_after_login_shown", "1");
        setTimeout(() => setShowWelcomeAnim(false), 1000);
      }
    }
    prevStatusRef.current = status;
  }, [status]);
  
  const handleAddPlace = (newPlace: Omit<Place, 'id' | 'tags' | 'lat' | 'lon'>) => {
    // Validate location
    if (!newPlace.location) {
      toast({
        variant: "destructive",
        title: "Location is required",
        description: "Please select a location for the place.",
      });
      return;
    }

    const [latStr = "", lonStr = ""] = newPlace.location.split(",").map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      toast({
        variant: "destructive",
        title: "Invalid location",
        description: "Could not parse latitude/longitude from the selected location.",
      });
      return;
    }

    const placeToAdd: Place = {
      id: Date.now(),
      lat,
      lon,
      area: newPlace.area,
      tags: {
        name: newPlace.name || "Unknown",
        description: newPlace.description || "",
      },
      photos: newPlace.photos,
    };

    const updatedPlaces = [...places, placeToAdd];
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
    // Show card created animation
    setShowCreateAnim(true);
    setTimeout(() => setShowCreateAnim(false), 1000);
  }

  const handleUpdatePlace = (updatedPlace: Place) => {
    const updatedPlaces = places.map(p => p.id === updatedPlace.id ? updatedPlace : p);
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
    setPlaceToEdit(null);
    setIsEditDialogOpen(false);
  };

  const handleShowOnMap = (place: Place) => {
    router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
  };

  const handleMarkSeen = (place: Place) => {
    try {
      const raw = localStorage.getItem("seen-places");
      const ids: number[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(place.id)) {
        const next = [place.id, ...ids].slice(0, 200);
        localStorage.setItem("seen-places", JSON.stringify(next));
        toast({ title: "Saved", description: `Added to What I've Seen` });
        setSeenIds(next);
        setShowLoveAnim(true);
        setTimeout(() => {
          setShowLoveAnim(false);
          router.push("/dashboard/what-have-i-seen");
        }, 1000);
      } else {
        toast({ title: "Already added", description: `This place is already in What I've Seen` });
        router.push("/dashboard/what-have-i-seen");
      }
    } catch (_) {}
  };

  const groupedPlaces = useMemo(() => {
    const groups: { [key: string]: Place[] } = {};
    const recentPlaces: Place[] = [];
    const sortedPlaces = [...places].sort((a, b) => b.id - a.id);

    sortedPlaces.forEach(place => {
      if (recentPlaces.length < 15) {
        recentPlaces.push(place);
      }
      if (place.area) {
        if (!groups[place.area]) {
          groups[place.area] = [];
        }
        groups[place.area].push(place);
      }
    });

    return { recentPlaces, areaGroups: groups };
  }, [places]);

  return (
    <>
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
      <main className="relative flex-1 space-y-8 p-4 md:p-6 pb-[calc(4.5rem+1px)]">
        {showLoveAnim && (
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-red-400/40 animate-ping" />
              <Heart className="h-20 w-20 text-red-500 drop-shadow-2xl" />
            </div>
          </div>
        )}
        {showCreateAnim && (
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-emerald-400/40 animate-ping" />
              <CheckCircle className="h-20 w-20 text-emerald-500 drop-shadow-2xl" />
            </div>
          </div>
        )}
        {showWelcomeAnim && (
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <div className="relative text-center">
              <div className="absolute -inset-10 rounded-full bg-yellow-300/30 animate-ping" />
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="h-8 w-8 text-yellow-400" />
                <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Welcome!</span>
                <Sparkles className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
          </div>
        )}
        {groupedPlaces.recentPlaces.length > 0 && (
          <PoiCarousel title="Last 15 Added Places" places={groupedPlaces.recentPlaces} />
        )}
        {Object.entries(groupedPlaces.areaGroups).map(([area, areaPlaces]) => (
           areaPlaces.length > 0 && (
            <section key={area}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Places in {area}</h2>
              </div>
              <div className="flex gap-2 sm:gap-4 overflow-x-auto touch-pan-x pb-2 -mx-2 px-2 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {areaPlaces.map(place => (
                  <div key={place.id} className="shrink-0 min-w-[24%] sm:min-w-0 snap-start">
                    <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
                      <CardContent className="p-0">
                          <div className="aspect-[2/1] sm:aspect-[4/3] overflow-hidden">
                              <Image
                              src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                              alt={place.tags.name}
                              width={600}
                              height={450}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              data-ai-hint="building location"
                              />
                          </div>
                      </CardContent>
                      <CardHeader className="p-1 sm:p-3 pb-1 sm:pb-2">
                        <CardTitle className="text-[12px] sm:text-base font-semibold truncate">{place.tags.name}</CardTitle>
                        {place.tags.description && <CardDescription className="text-[10px] sm:text-xs truncate">{place.tags.description}</CardDescription>}
                      </CardHeader>
                      <CardFooter className="mt-auto flex flex-col gap-2 p-1 sm:p-3 pt-0">
                         <div className="flex gap-2">
                           <Button onClick={() => handleMarkSeen(place)} size="icon" variant="outline" className={`shrink-0 ${seenIds.includes(place.id) ? 'border-red-500 text-red-500' : ''}`} title="Love">
                             <Heart className={`h-4 w-4 ${seenIds.includes(place.id) ? 'text-red-500' : ''}`} />
                           </Button>
                           <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 text-[11px]">
                              <MapPin className="mr-2 h-4 w-4" />
                              Directions
                           </Button>
                         </div>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
           )
        ))}
      </main>
      <MobileNav />
    </div>
    <AddPlaceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        placeToEdit={placeToEdit}
        onPlaceUpdate={handleUpdatePlace}
      />
    </>
  );
}
