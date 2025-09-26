
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "../ui/skeleton";
import Image from "next/image";
import { Place } from "@/lib/types";
import { Button } from "../ui/button";
import { MapPin, Heart, Landmark, Train, ListOrdered } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { RouteStepsDialog } from "./route-steps-dialog";

interface PoiCarouselProps {
  title: string;
  places: Place[];
  isLoading?: boolean;
}

export function PoiCarousel({ title, places, isLoading }: PoiCarouselProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [showLoveAnim, setShowLoveAnim] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const isMobile = useIsMobile();
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [routeOpenFor, setRouteOpenFor] = useState<{ id: number; name: string } | null>(null);
  const [routeSteps, setRouteSteps] = useState<{ title: string; detail?: string }[]>([]);
  const isRecent = (title || "").toLowerCase() === "recent";

  const truncateWords = (text: string, count: number) => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    const sliced = words.slice(0, count).join(" ");
    return words.length > count ? `${sliced}...` : sliced;
  };

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
  // Helper to derive coords from numeric fields or a "lat,lon" or "lon,lat" string
  const getCoords = (place: Place): { lat: number; lon: number } | null => {
    if (typeof place.lat === 'number' && typeof place.lon === 'number' && !Number.isNaN(place.lat) && !Number.isNaN(place.lon)) {
      return { lat: place.lat, lon: place.lon };
    }
    if (typeof (place as any).location === 'string' && (place as any).location.includes(',')) {
      const parts = (place as any).location.split(',').map((s: string) => s.trim());
      const a = parseFloat(parts[0] || '');
      const b = parseFloat(parts[1] || '');
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
        if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { lat: b, lon: a };
      }
    }
    return null;
  };
  const openRouteDialog = (place: Place) => {
    setRouteOpenFor({ id: place.id, name: place.tags?.name || "Destination" });
    setRouteSteps([{ title: "Fetching walking steps…", detail: "Using OpenStreetMap directions" }]);
    const dest = getCoords(place);
    if (!geo || !dest) {
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
          const road = s?.name || s?.ref || 'road';
          const m = s?.maneuver || {};
          const type = (m.type || 'Proceed');
          const mod = m.modifier ? ` ${m.modifier}` : '';
          const instruction = `${type}${mod} onto ${road}`.replace(/\s+/g, ' ').trim();
          const dist = typeof s.distance === 'number' ? s.distance : 0;
          const right = dist >= 1000 ? `${(dist/1000).toFixed(1)} km` : `${Math.round(dist)} m`;
          return { title: instruction, detail: right } as { title: string; detail?: string };
        });
        if (pretty.length > 0) setRouteSteps(pretty);
        else setRouteSteps(buildRouteSteps(place));
      } catch (_) {
        setRouteSteps(buildRouteSteps(place));
      }
    })();
  };

  

  const buildKeyStops = (place: Place) => {
    const name = place?.tags?.name || "Destination";
    const area = (place?.area || "").trim();
    const stops = [
      area ? { label: `${area} Pandal`, minutes: 15, icon: "landmark" as const } : null,
      area ? { label: `${area} Metro`, minutes: 10, icon: "train" as const } : null,
      { label: name, minutes: 5, icon: "landmark" as const },
    ].filter(Boolean) as { label: string; minutes: number; icon: "landmark" | "train" }[];
    // Ensure there are always 3 items by adding generic fallbacks
    const fallbacks: { label: string; minutes: number; icon: "landmark" | "train" }[] = [
      { label: "Local Market", minutes: 12, icon: "landmark" },
      { label: "Auto Stand", minutes: 8, icon: "landmark" },
      { label: "Nearest Metro", minutes: 10, icon: "train" },
    ];
    let i = 0;
    while (stops.length < 3 && i < fallbacks.length) {
      // Avoid duplicates by name
      if (!stops.some(s => s.label === fallbacks[i].label)) {
        stops.push(fallbacks[i]);
      }
      i++;
    }
    return stops;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("seen-places");
      setSeenIds(raw ? JSON.parse(raw) : []);
    } catch (_) {}
    setCanPortal(typeof window !== 'undefined');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setGeo(null),
        { enableHighAccuracy: true, maximumAge: 1000 * 60 }
      );
    }
  }, []);

  const handleShowOnMap = (place: Place) => {
    // Derive destination coordinates or address
    let destLat: number | null = null;
    let destLon: number | null = null;
    let destAddress: string | null = null;
    // Prefer explicit location string if available (handle both "lat,lon" and "lon,lat")
    if (place.location && place.location.includes(',')) {
      const parts = place.location.split(',').map(s => s.trim());
      const a = parseFloat(parts[0] || '');
      const b = parseFloat(parts[1] || '');
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
          destLat = a; destLon = b;
        } else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
          destLat = b; destLon = a;
        }
      }
    }
    // Next, use numeric lat/lon fields
    if ((destLat == null || destLon == null) && typeof place.lat === 'number' && typeof place.lon === 'number') {
      destLat = place.lat; destLon = place.lon;
    }
    // Finally, fall back to address
    if (destLat == null || destLon == null) {
      const addressParts = [place.tags?.name, place.area].filter(Boolean);
      if (addressParts.length > 0) {
        destAddress = addressParts.join(", ");
      }
    }

    // Helper to push with optional fromLat/fromLon
    const pushToMap = (from?: { lat: number; lon: number }) => {
      if (destLat != null && destLon != null) {
        const qs = new URLSearchParams({ lat: String(destLat), lon: String(destLon) });
        if (from) {
          qs.set('fromLat', String(from.lat));
          qs.set('fromLon', String(from.lon));
        }
        router.push(`/dashboard/map?${qs.toString()}`);
        return;
      }
      if (destAddress) {
        const qs = new URLSearchParams({ address: destAddress });
        if (from) {
          qs.set('fromLat', String(from.lat));
          qs.set('fromLon', String(from.lon));
        }
        router.push(`/dashboard/map?${qs.toString()}`);
      }
    };

    // Try to capture user's current location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          pushToMap(me);
        },
        () => {
          pushToMap();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      pushToMap();
    }
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
    } catch (_) {
      // ignore
    }
  };
  
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight mb-4">{title}</h2>
      {isLoading ? (
        <div className="flex space-x-4">
            {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-1">
                    <div className="space-y-2">
                        <Skeleton className="h-40 w-full rounded-lg" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ))}
        </div>

      ) : (
        <Carousel
          opts={{
            align: "start",
            loop: places.length > 5,
            dragFree: true,
            containScroll: "trimSnaps",
            // Lower angle tolerance so vertical drags bubble to page scroll
            dragAngleTolerance: isRecent ? 20 : 40,
          }}
          className={isRecent ? "w-full touch-pan-y overscroll-x-contain md:touch-auto" : "w-full touch-auto"}
        >
          <CarouselContent className={isRecent ? "-ml-2 touch-pan-y overscroll-x-contain" : "-ml-2"}>
            {showLoveAnim && canPortal && createPortal(
              <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-full bg-red-400/40 animate-ping" />
                  <Heart className="h-20 w-20 text-red-500 drop-shadow-2xl" />
                </div>
              </div>,
              document.body
            )}
            {places.map((place) => (
              <CarouselItem key={place.id} className="basis-[70%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-2 snap-start">
                <div className="p-1 h-full max-w-[320px] sm:max-w-none">
                  <Card className="group h-full flex flex-col overflow-hidden transition-all hover:shadow-lg rounded-2xl">
                    {isMobile ? (
                      <>
                        <div className="relative">
                          <div className="relative aspect-square overflow-hidden rounded-2xl">
                            <Image
                              src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                              alt={place.tags.name}
                              fill
                              className="object-cover"
                              data-ai-hint="building"
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
                            <div className="text-white font-semibold text-base truncate">{place.tags.name}</div>
                            <div className="text-white/80 text-xs truncate">{place.area ? `Starts near: ${place.area}` : ''}</div>
                          </div>
                        </div>
                        <div className="p-3 pt-2">
                          {place.tags.description && (
                            <CardDescription className="text-[11px] text-muted-foreground">
                              {truncateWords(place.tags.description, 4)}
                            </CardDescription>
                          )}
                          {!isRecent && (
                            <>
                              <div className="mt-3 rounded-lg bg-muted/30 p-2">
                                <div className="text-[12px] font-semibold mb-1 text-foreground/90">Key Stops:</div>
                                <ul className="space-y-1">
                                  {buildKeyStops(place).slice(0, 3).map((s, idx, arr) => (
                                    <li key={`${s.label}-${idx}`} className="flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-2 text-foreground/90">
                                        {s.icon === "train" ? (
                                          <Train className="h-3.5 w-3.5" />
                                        ) : (
                                          <Landmark className="h-3.5 w-3.5" />
                                        )}
                                        <span className="truncate max-w-[65%]">{s.label}</span>
                                      </div>
                                      <span className="text-muted-foreground">{s.minutes} min</span>
                                    </li>
                                  ))}
                                  <li className="text-center text-[11px] text-primary underline cursor-pointer" onClick={() => openRouteDialog(place)}>See more</li>
                                </ul>
                              </div>
                            </>
                          )}
                        </div>
                        <CardFooter className="mt-auto flex items-center justify-between gap-2 p-3 pt-0">
                          <Button onClick={() => openRouteDialog(place)} size="sm" variant="outline" className="shrink-0 rounded-full">
                            <ListOrdered className="mr-2 h-4 w-4" />
                            Step
                          </Button>
                          <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 rounded-full">
                            <MapPin className="mr-2 h-4 w-4" />
                            Directions
                          </Button>
                        </CardFooter>
                      </>
                    ) : (
                      <>
                        <CardContent className="p-0">
                          <div className="relative aspect-square overflow-hidden">
                            <Image
                              src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                              alt={place.tags.name}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              data-ai-hint="building"
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
                        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                          <CardTitle className="text-sm sm:text-base font-semibold truncate">{place.tags.name}</CardTitle>
                          {place.tags.description && (
                            <CardDescription className="text-xs truncate">
                              {place.tags.description}
                            </CardDescription>
                          )}
                          {!isRecent && (
                            <>
                              <div className="mt-3 rounded-lg bg-muted/30 p-2">
                                <div className="text-sm font-semibold mb-1 text-foreground/90">Key Stops:</div>
                                <ul className="space-y-1">
                                  {buildKeyStops(place).slice(0, 3).map((s, idx) => (
                                    <li key={`${s.label}-${idx}`} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 text-foreground/90">
                                        {s.icon === "train" ? (
                                          <Train className="h-4 w-4" />
                                        ) : (
                                          <Landmark className="h-4 w-4" />
                                        )}
                                        <span className="truncate max-w-[70%]">{s.label}</span>
                                      </div>
                                      <span className="text-muted-foreground">{s.minutes} min</span>
                                    </li>
                                  ))}
                                  <li className="text-center text-xs text-primary underline cursor-pointer" onClick={() => openRouteDialog(place)}>See more</li>
                                </ul>
                              </div>
                            </>
                          )}
                        </CardHeader>
                        <CardFooter className="mt-auto flex justify-end gap-2 p-2 sm:p-3 pt-0">
                          <Button onClick={() => openRouteDialog(place)} size="sm" variant="outline" className="shrink-0 rounded-full">
                            <ListOrdered className="mr-2 h-4 w-4" />
                            Step
                          </Button>
                          <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 rounded-full">
                            <MapPin className="mr-2 h-4 w-4" />
                            Directions
                          </Button>
                        </CardFooter>
                      </>
                    )}
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext  className="hidden sm:flex" />
        </Carousel>
      )}
      {routeOpenFor && (
        <RouteStepsDialog
          open={!!routeOpenFor}
          onOpenChange={(o) => !o && setRouteOpenFor(null)}
          placeName={routeOpenFor.name}
          steps={routeSteps}
        />
      )}
    </section>
  );
}
