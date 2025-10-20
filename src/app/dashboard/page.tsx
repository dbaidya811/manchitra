"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useEffect, useState, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { PoiCarousel } from "@/components/dashboard/poi-carousel";
import { Place } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Sparkles, CheckCircle, ListOrdered, Star, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { AddPlaceDialog } from "@/components/dashboard/add-place-dialog";
import { RouteStepsDialog } from "@/components/dashboard/route-steps-dialog";
import { useSession } from "next-auth/react";
import { useSessionRefresh } from "@/hooks/use-session-refresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { StarRating } from "@/components/star-rating";

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { status, data: session } = useSession();
  const { refreshSessionWithRetry } = useSessionRefresh();
  const [isMounted, setIsMounted] = useState(false);
  
  // Track client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Monitor session status and redirect if unauthenticated, with grace period right after login
  useEffect(() => {
    console.log('Dashboard - Session status:', status);
    if (status === "unauthenticated") {
      let justLogged = false;
      try { justLogged = localStorage.getItem('just-logged-in') === '1'; } catch {}
      if (justLogged) {
        (async () => {
          try {
            await refreshSessionWithRetry(3);
          } catch {}
          try { localStorage.removeItem('just-logged-in'); } catch {}
          const timer = setTimeout(() => {
            if (document.visibilityState !== 'hidden') {
              router.replace("/");
            }
          }, 800);
          return () => clearTimeout(timer);
        })();
        return;
      }
      router.replace("/");
    }
  }, [status, router, refreshSessionWithRetry]);
  
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [showLoveAnim, setShowLoveAnim] = useState(false);
  const [showCreateAnim, setShowCreateAnim] = useState(false);
  const [showWelcomeAnim, setShowWelcomeAnim] = useState(false);
  const [placeRatings, setPlaceRatings] = useState<Record<number, Record<string, number>>>({});
  const isMobile = useIsMobile();
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [routeOpenFor, setRouteOpenFor] = useState<{ id: number; name: string } | null>(null);
  const [routeSteps, setRouteSteps] = useState<{ title: string; detail?: string }[]>([]);
  const [placeViewCounts, setPlaceViewCounts] = useState<Record<number, number>>({});
  const [descriptionDialog, setDescriptionDialog] = useState<{ name: string; description: string } | null>(null);
  // Removed Key Stops preview
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Debug loading state
  useEffect(() => {
    console.log('Dashboard loading state:', isLoading);
  }, [isLoading]);

  // Force loading to false after 3 seconds to prevent stuck loading
  useEffect(() => {
    const forceLoadingFalse = setTimeout(() => {
      if (isLoading) {
        console.log('Forcing loading state to false after timeout');
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(forceLoadingFalse);
  }, [isLoading]);
  const [mountedAt, setMountedAt] = useState<number>(Date.now());
  useEffect(() => {
    // used to stagger simple entrance animations
    setMountedAt(Date.now());
    
    // Play welcome audio only once per login session
    try {
      const audioPlayed = sessionStorage.getItem('dashboard_audio_played');
      if (!audioPlayed) {
        const audio = new Audio('/sound/A tone.wav');
        audio.volume = 0.5; // 50% volume
        audio.play().then(() => {
          // Mark as played in session storage
          sessionStorage.setItem('dashboard_audio_played', '1');
        }).catch(() => {
          // Silently fail if autoplay is blocked by browser
        });
      }
    } catch {
      // Ignore audio errors
    }
  }, []);
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000 }
    );
  };

  const truncateWords = (text: string, count: number) => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    const sliced = words.slice(0, count).join(" ");
    return words.length > count ? `${sliced}...` : sliced;
  };

  // Helpers to compute basic steps without external maps
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const bearingToCardinal = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
      Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    const d = (brng + 360) % 360;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(d / 45) % 8];
  };
  const buildRouteSteps = (place: Place) => {
    const dest = { lat: place.lat, lon: place.lon };
    const steps: { title: string; detail?: string }[] = [];
    if (geo) {
      const km = haversineKm(geo, dest);
      const dir = bearingToCardinal(geo, dest);
      steps.push({ title: `Head ${dir} for ~${km.toFixed(1)} km`, detail: `Start from your current location` });
    } else {
      steps.push({ title: `Start from your current location`, detail: `Enable location for accurate directions` });
    }
    if (place.area) {
      steps.push({ title: `Reach ${place.area}`, detail: `Ask locals for the nearest route` });
    }
    steps.push({ title: `Ask for "${place.tags?.name}"`, detail: `Arrive at your destination` });
    return steps;
  };
  const openRouteDialog = (place: Place) => {
    // Open first with a placeholder, then populate with OSRM steps if possible
    setRouteOpenFor({ id: place.id, name: place.tags?.name || "Destination" });
    setRouteSteps([{ title: "Fetching walking steps…", detail: "Using OpenStreetMap directions" }]);
    const dest = getCoords(place);
    if (!geo || !dest) {
      // Fallback to manual, approximate guidance if we don't have live location
      setRouteSteps(buildRouteSteps(place));
      return;
    }
    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${geo.lon},${geo.lat};${dest.lon},${dest.lat}?overview=false&steps=true`;
        const res = await fetch(url);
        const data = await res.json();
        const stepsRaw = data?.routes?.[0]?.legs?.[0]?.steps || [];
        const pretty = stepsRaw.map((s: any) => {
          const road = s?.name || s?.ref || "road";
          const m = s?.maneuver || {};
          const type = (m.type || "Proceed");
          const mod = m.modifier ? ` ${m.modifier}` : "";
          const instruction = `${type}${mod} onto ${road}`.replace(/\s+/g, " ").trim();
          const dist = typeof s.distance === 'number' ? s.distance : 0;
          const right = dist >= 1000 ? `${(dist/1000).toFixed(1)} km` : `${Math.round(dist)} m`;
          return { title: instruction, detail: right } as { title: string; detail?: string };
        });
        if (pretty.length > 0) {
          setRouteSteps(pretty);
        } else {
          setRouteSteps(buildRouteSteps(place));
        }
      } catch (_) {
        setRouteSteps(buildRouteSteps(place));
      }
    })();
  };

  

  // Helper to get numeric coords from place (supports either explicit lat/lon or a "lat,lon" or "lon,lat" string)
  const getCoords = (place: Place): { lat: number; lon: number } | null => {
    if (typeof place.lat === 'number' && typeof place.lon === 'number' && !Number.isNaN(place.lat) && !Number.isNaN(place.lon)) {
      return { lat: place.lat, lon: place.lon };
    }
    if (typeof (place as any).location === 'string' && (place as any).location.includes(',')) {
      const parts = (place as any).location.split(',').map((s: string) => s.trim());
      const a = parseFloat(parts[0] || '');
      const b = parseFloat(parts[1] || '');
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        // Detect ordering by numeric range
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
        if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { lat: b, lon: a };
      }
    }
    return null;
  };

  // Removed Key Stops helpers

  useEffect(() => {
    // Load global feed from API for everyone; fallback to localStorage
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/places", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data?.ok && Array.isArray(data.places)) {
          setPlaces(data.places as Place[]);
          setIsLoading(false);
          return;
        }
      } catch (_) {}
      // fallback on error
      const storedPlaces = localStorage.getItem("user-places");
      if (storedPlaces) setPlaces(JSON.parse(storedPlaces));
      setIsLoading(false);
    };
    load().catch(() => {
      // Ensure loading is set to false even if there's an error
      setIsLoading(false);
    });

    // Safety timeout to ensure loading state doesn't get stuck
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 seconds timeout

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toast, status]);

  // Load additional data
  useEffect(() => {
    try {
      const rawSeen = localStorage.getItem("seen-places");
      setSeenIds(rawSeen ? JSON.parse(rawSeen) : []);
    } catch (_) {}
    
    // Load ratings from localStorage
    try {
      const rawRatings = localStorage.getItem("place-ratings");
      if (rawRatings) {
        setPlaceRatings(JSON.parse(rawRatings));
      }
    } catch (_) {}
    
    // Load place view counts
    try {
      const rawViewCounts = localStorage.getItem("place-view-counts");
      if (rawViewCounts) {
        setPlaceViewCounts(JSON.parse(rawViewCounts));
      }
    } catch (_) {}
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) {
            toast({
              variant: "destructive",
              title: "Could not get location",
              description: error.message,
            });
          }
        },
        { enableHighAccuracy: true, maximumAge: 1000 * 60 }
      );
    }
  }, [toast]);

  // Removed Key Stops preload

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
  
  const handleAddPlace = async (newPlace: Omit<Place, 'id' | 'lat' | 'lon' | 'tags'> & { name?: string; description?: string; }) => {
    // Validate location
    if (!newPlace.location) {
      toast({
        variant: "destructive",
        title: "Location is required",
        description: "Please select a location for the place.",
      });
      return;
    }

    const [latStr = "", lonStr = ""] = newPlace.location.split(",").map((s: string) => s.trim());
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
    try {
      await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(placeToAdd),
      });
    } catch (_) {
      // fallback to localStorage on error
      localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
    }
    // Show card created animation
    setShowCreateAnim(true);
    setTimeout(() => setShowCreateAnim(false), 1000);
  }

  const handleUpdatePlace = async (updatedPlace: Place) => {
    const updatedPlaces = places.map(p => p.id === updatedPlace.id ? updatedPlace : p);
    setPlaces(updatedPlaces);
    try {
      if (status === "authenticated") {
        await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPlace),
        });
      } else {
        localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
      }
    } catch (_) {
      localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
    }
    setPlaceToEdit(null);
    setIsEditDialogOpen(false);
  };

  // Track place view
  const trackPlaceView = (placeId: number) => {
    try {
      const raw = localStorage.getItem("place-view-counts");
      const counts: Record<number, number> = raw ? JSON.parse(raw) : {};
      counts[placeId] = (counts[placeId] || 0) + 1;
      localStorage.setItem("place-view-counts", JSON.stringify(counts));
      setPlaceViewCounts(counts);
    } catch (_) {}
  };

  const handleShowOnMap = (place: Place) => {
    // Track view
    trackPlaceView(place.id);
    // Prefer explicit location if provided ("lat,lon" string)
    if (place.location && place.location.includes(',')) {
      const parts = place.location.split(',').map((s: string) => s.trim());
      const a = parseFloat(parts[0] || '');
      const b = parseFloat(parts[1] || '');
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        // Detect ordering: lat must be within [-90, 90], lon within [-180, 180]
        let latNum = a;
        let lonNum = b;
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
          latNum = a; lonNum = b;
        } else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
          latNum = b; lonNum = a;
        }
        // Log visit history
        try {
          const raw = localStorage.getItem('visit-history');
          const arr: Array<{ id: number | string | null; name: string; lat: number; lon: number; time: number }> = raw ? JSON.parse(raw) : [];
          const now = Date.now();
          arr.unshift({ id: place.id ?? null, name: place.tags?.name || 'Place', lat: latNum, lon: lonNum, time: now });
          localStorage.setItem('visit-history', JSON.stringify(arr.slice(0, 200)));
          // Best-effort server persist with user position to derive visited/not-visited
          try {
            const post = (coords?: { lat: number; lon: number }) => {
              fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'visit',
                  data: { id: place.id ?? null, name: place.tags?.name || 'Place', lat: latNum, lon: lonNum, time: now, ...(coords ? { userLat: coords.lat, userLon: coords.lon } : {}) },
                }),
                cache: 'no-store',
              }).catch(() => {});
            };
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => post({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => post(),
                { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
              );
            } else {
              post();
            }
          } catch {}
        } catch {}
        router.push(`/dashboard/map?lat=${latNum}&lon=${lonNum}`);
        return;
      }
    }
    // Next, use numeric lat/lon fields if available
    if (typeof place.lat === 'number' && typeof place.lon === 'number') {
      // Log visit history
      try {
        const raw = localStorage.getItem('visit-history');
        const arr: Array<{ id: number | string | null; name: string; lat: number; lon: number; time: number }> = raw ? JSON.parse(raw) : [];
        const now = Date.now();
        arr.unshift({ id: place.id ?? null, name: place.tags?.name || 'Place', lat: place.lat, lon: place.lon, time: now });
        localStorage.setItem('visit-history', JSON.stringify(arr.slice(0, 200)));
        // Best-effort server persist with user position to derive visited/not-visited
        try {
          const post = (coords?: { lat: number; lon: number }) => {
            fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'visit',
                data: { id: place.id ?? null, name: place.tags?.name || 'Place', lat: place.lat, lon: place.lon, time: now, ...(coords ? { userLat: coords.lat, userLon: coords.lon } : {}) },
              }),
              cache: 'no-store',
            }).catch(() => {});
          };
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => post({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => post(),
              { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
            );
          } else {
            post();
          }
        } catch {}
      } catch {}
      router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
      return;
    }
    // Finally, try address from tags.name + area
    const addressParts = [place.tags?.name, place.area].filter(Boolean);
    if (addressParts.length > 0) {
      const address = encodeURIComponent(addressParts.join(", "));
      router.push(`/dashboard/map?address=${address}`);
      return;
    }
  };

  const handleMarkSeen = (place: Place) => {
    try {
      const raw = localStorage.getItem("seen-places");
      const ids: number[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(place.id)) {
        const next = [place.id, ...ids].slice(0, 200);
        localStorage.setItem("seen-places", JSON.stringify(next));
        toast({ title: "Saved", description: `Added to Watchlist` });
        setSeenIds(next);
        setShowLoveAnim(true);
        setTimeout(() => {
          setShowLoveAnim(false);
          router.push("/dashboard/what-have-i-seen");
        }, 1000);
      } else {
        toast({ title: "Already added", description: `This place is already in Watchlist` });
        router.push("/dashboard/what-have-i-seen");
      }
    } catch (_) {}
  };

  // Rating handler
  const handleRatePlace = async (placeId: number, rating: number) => {
    try {
      const userEmail =
        status === "authenticated"
          ? (typeof window !== "undefined" &&
              localStorage.getItem("user")
              ? JSON.parse(localStorage.getItem("user")!).email
              : null)
          : localStorage.getItem("anon_id") || `anon_`;

      if (!userEmail) return;

      const updatedRatings = { ...placeRatings } as Record<number, Record<string, number>>;
      if (!updatedRatings[placeId]) {
        updatedRatings[placeId] = {};
      }
      updatedRatings[placeId][userEmail] = rating;

      localStorage.setItem("place-ratings", JSON.stringify(updatedRatings));
      setPlaceRatings(updatedRatings);

      toast({
        title: "Rated!",
        description: `You gave ${rating} star${rating !== 1 ? 's' : ''}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const getPlaceRating = (placeId: number) => {
    const ratings = placeRatings[placeId];
    if (!ratings || Object.keys(ratings).length === 0) {
      return { average: 0, total: 0 };
    }
    const values = Object.values(ratings);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    return { average, total: values.length };
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

  // Get Top 10 and Top 25 most viewed places
  const topPlaces = useMemo(() => {
    const placesWithViews = places.map(place => ({
      place,
      views: placeViewCounts[place.id] || 0
    }));
    
    // Sort by view count descending
    placesWithViews.sort((a, b) => b.views - a.views);
    
    const top10 = placesWithViews.slice(0, 10).filter(p => p.views > 0);
    const top25 = placesWithViews.slice(0, 25).filter(p => p.views > 0);
    
    return { top10, top25 };
  }, [places, placeViewCounts]);

  // Wait for client-side hydration
  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, the useEffect above will redirect, but show loading meanwhile
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <header className="absolute top-3 left-3 right-3 z-[9999] flex h-14 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold text-transparent drop-shadow-sm">
              Manchitra
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <UserProfile onPlaceSubmit={handleAddPlace} />
          </div>
        </header>
        <main className="relative flex-1 space-y-8 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
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
          {groupedPlaces.recentPlaces.length > 0 ? (
            <PoiCarousel title="Recent" places={groupedPlaces.recentPlaces} isLoading={isLoading} />
          ) : isLoading ? (
            <div className="mb-6">
              <div className="h-6 w-40 bg-foreground/10 rounded mb-3 animate-pulse" />
              <div className="flex gap-3 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="min-w-[70%] sm:min-w-[260px]">
                    <div className="space-y-2">
                      <div className="h-40 w-full bg-foreground/10 rounded-2xl animate-pulse" />
                      <div className="h-4 w-3/4 bg-foreground/10 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-foreground/10 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-4">Welcome to Manchitra!</h2>
              <div className="text-center py-12">
                <div className="mb-4">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No places yet</h3>
                  <p className="text-muted-foreground mb-6">Start exploring by adding your first place!</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Top 10 Most Viewed Puja */}
          {topPlaces.top10.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  🏆 Top 10 Puja
                </h2>
              </div>
              <div className="sm:p-4 sm:rounded-lg sm:bg-gradient-to-br sm:from-purple-50 sm:to-pink-50 dark:sm:from-purple-950/30 dark:sm:to-pink-950/30 sm:border-2 sm:border-purple-200 dark:sm:border-purple-800">
                <div className="flex gap-3 overflow-x-auto touch-auto overscroll-x-contain pb-2 snap-x snap-mandatory sm:overflow-visible sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {topPlaces.top10.map(({ place, views }, idx) => (
                    <div key={`top10-${place.id}`} className="relative shrink-0 w-[240px] sm:min-w-0 snap-start">
                      <Card className="group h-full flex flex-col overflow-hidden transition-all hover:shadow-2xl rounded-2xl border-2 border-purple-300 dark:border-purple-700">
                        <CardContent className="p-0">
                          <div className="relative aspect-square overflow-hidden">
                            <Image
                              src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                              alt={place.tags?.name || 'Place'}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                            {/* Ranking number - large overlay at bottom-left */}
                            <div className="absolute bottom-2 left-2 z-10 text-white font-black text-7xl leading-none" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.5)' }}>
                              {idx + 1}
                            </div>
                            <button
                              onClick={() => handleMarkSeen(place)}
                              title="Love"
                              className={`absolute top-2 right-2 h-9 w-9 flex items-center justify-center rounded-full shadow-md backdrop-blur bg-white/90 ${seenIds.includes(place.id) ? 'border border-red-500 text-red-600' : 'border border-white/70 text-neutral-700'}`}
                            >
                              <Heart className={`h-4.5 w-4.5 ${seenIds.includes(place.id) ? 'text-red-600' : ''}`} />
                            </button>
                          </div>
                        </CardContent>
                        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                          <CardTitle className="text-sm sm:text-base font-semibold truncate">{place.tags?.name || 'Place'}</CardTitle>
                          {place.tags?.description && (
                            <CardDescription className="text-xs truncate">
                              {place.tags.description}
                            </CardDescription>
                          )}
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {views} views
                          </div>
                        </CardHeader>
                        <CardFooter className="mt-auto flex justify-end gap-2 p-2 sm:p-3 pt-0">
                          <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-full">
                            <MapPin className="mr-2 h-4 w-4" />
                            Directions
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          
          {Object.entries(groupedPlaces.areaGroups).map(([area, areaPlaces]) => (
            areaPlaces.length > 0 && (
              <section key={area}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold tracking-tight">Places in {area}</h2>
                </div>
                <div className="flex gap-2 sm:gap-4 overflow-x-auto touch-auto overscroll-x-contain pb-2 -mx-2 px-2 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {areaPlaces.map((place, idx) => (
                    <div
                      key={place.id}
                      className="shrink-0 w-[280px] sm:min-w-0 snap-start"
                      style={{
                        transition: 'transform 400ms ease-out, opacity 400ms ease-out',
                        transform: `translateY(${isLoading ? 8 : 0}px)`,
                        opacity: isLoading ? 0.6 : 1,
                        // slight stagger based on index
                        transitionDelay: `${Math.min(idx * 40, 200)}ms`,
                      }}
                    >
                      <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-xl rounded-2xl will-change-transform">
                        {isMobile ? (
                          <>
                            <div className="relative">
                              <div className="overflow-hidden rounded-2xl">
                                <Image
                                  src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                                  alt={place.tags?.name || 'Place'}
                                  width={600}
                                  height={450}
                                  className="h-48 w-full object-cover"
                                  data-ai-hint="building location"
                                />
                              </div>
                              {/* Like button overlay (top-right) */}
                              <button
                                onClick={() => handleMarkSeen(place)}
                                title="Love"
                                className={`absolute top-2 right-2 h-9 w-9 flex items-center justify-center rounded-full shadow-md backdrop-blur bg-white/90 ${seenIds.includes(place.id) ? 'border border-red-500 text-red-600' : 'border border-white/70 text-neutral-700'}`}
                              >
                                <Heart className={`h-4.5 w-4.5 ${seenIds.includes(place.id) ? 'text-red-600' : ''}`} />
                              </button>
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-b-2xl">
                                <div className="text-white font-semibold text-base truncate">{place.tags?.name || 'Place'}</div>
                                <div className="text-white/80 text-xs truncate">{place.area ? `Starts near: ${place.area}` : ''}</div>
                              </div>
                            </div>
                            <div className="px-3 pt-2 pb-2 min-h-[32px]">
                              {place.tags?.description && (
                                <CardDescription 
                                  className="text-[11px] text-muted-foreground truncate w-full cursor-pointer hover:text-primary transition-colors active:text-primary"
                                  onClick={() => setDescriptionDialog({ name: place.tags?.name || 'Place', description: place.tags?.description || '' })}
                                  title="Tap to view full description"
                                >
                                  {place.tags.description}
                                </CardDescription>
                              )}
                            </div>
                            <CardFooter className="mt-auto flex items-center justify-between gap-2 p-3 pt-0">
                              <Button onClick={() => openRouteDialog(place)} size="sm" variant="outline" className="shrink-0 rounded-full text-[12px]">
                                <ListOrdered className="mr-2 h-4 w-4" />
                                Step
                              </Button>
                              <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 rounded-full text-[12px]">
                                <MapPin className="mr-2 h-4 w-4" />
                                Directions
                              </Button>
                            </CardFooter>
                          </>
                        ) : (
                          <>
                            <CardContent className="p-0">
                              <div className="aspect-[2/1] sm:aspect-[4/3] overflow-hidden relative">
                                <Image
                                  src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                                  alt={place.tags?.name || 'Place'}
                                  width={600}
                                  height={450}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  data-ai-hint="building location"
                                />
                                {/* Like button overlay (top-right) */}
                                <button
                                  onClick={() => handleMarkSeen(place)}
                                  title="Love"
                                  className={`absolute top-2 right-2 h-9 w-9 flex items-center justify-center rounded-full shadow-md backdrop-blur bg-white/90 ${seenIds.includes(place.id) ? 'border border-red-500 text-red-600' : 'border border-white/70 text-neutral-700'}`}
                                >
                                  <Heart className={`h-4.5 w-4.5 ${seenIds.includes(place.id) ? 'text-red-600' : ''}`} />
                                </button>
                              </div>
                            </CardContent>
                            <CardHeader className="p-1 sm:p-3 pb-1 sm:pb-2">
                              <CardTitle className="text-[12px] sm:text-base font-semibold truncate">{place.tags?.name || 'Place'}</CardTitle>
                              {place.tags?.description && (
                                <CardDescription className="text-[10px] sm:text-xs truncate">
                                  {place.tags.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardFooter className="mt-auto flex flex-col gap-2 p-1 sm:p-3 pt-0">
                              <div className="flex gap-2">
                                <Button onClick={() => openRouteDialog(place)} size="sm" variant="outline" className="shrink-0 rounded-full text-[11px]">
                                  <ListOrdered className="mr-2 h-4 w-4" />
                                  Step
                                </Button>
                                <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 rounded-full text-[11px]">
                                  <MapPin className="mr-2 h-4 w-4" />
                                  Directions
                                </Button>
                              </div>
                            </CardFooter>
                          </>
                        )}
                      </Card>
                    </div>
                  ))}
                </div>
              </section>
            )
          ))}
        </main>
      </div>
      <AddPlaceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        placeToEdit={placeToEdit}
        onPlaceUpdate={handleUpdatePlace}
      />
      {routeOpenFor && (
        <RouteStepsDialog
          open={!!routeOpenFor}
          onOpenChange={(o) => !o && setRouteOpenFor(null)}
          placeName={routeOpenFor.name}
          steps={routeSteps}
        />
      )}
      {descriptionDialog && (
        <Dialog open={!!descriptionDialog} onOpenChange={(open: boolean) => !open && setDescriptionDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{descriptionDialog.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {descriptionDialog.description}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

