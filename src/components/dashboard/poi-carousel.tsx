
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
import { MapPin, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("seen-places");
      setSeenIds(raw ? JSON.parse(raw) : []);
    } catch (_) {}
    setCanPortal(typeof window !== 'undefined');
  }, []);

  const handleShowOnMap = (place: Place) => {
    // Prefer explicit location string if available (handle both "lat,lon" and "lon,lat")
    if (place.location && place.location.includes(',')) {
      const parts = place.location.split(',').map(s => s.trim());
      const a = parseFloat(parts[0] || '');
      const b = parseFloat(parts[1] || '');
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        let latNum = a;
        let lonNum = b;
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
          latNum = a; lonNum = b;
        } else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
          latNum = b; lonNum = a;
        }
        router.push(`/dashboard/map?lat=${latNum}&lon=${lonNum}`);
        return;
      }
    }
    // Next, use numeric lat/lon fields
    if (typeof place.lat === 'number' && typeof place.lon === 'number') {
      router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
      return;
    }
    // Finally, fall back to address
    const addressParts = [place.tags?.name, place.area].filter(Boolean);
    if (addressParts.length > 0) {
      const address = addressParts.join(", ");
      router.push(`/dashboard/map?address=${encodeURIComponent(address)}`);
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
          }}
          className="w-full touch-pan-x"
        >
          <CarouselContent className="-ml-2">
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
              <CarouselItem key={place.id} className="basis-[55%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-2 snap-start">
                <div className="p-1 h-full max-w-[300px] sm:max-w-none">
                  <Card className="group h-full flex flex-col overflow-hidden transition-all hover:shadow-lg">
                    <CardContent className="p-0">
                         <div className="aspect-[4/3] overflow-hidden">
                           <Image
                             src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                             alt={place.tags.name}
                             width={600}
                             height={450}
                             className="h-full w-full object-cover transition-transform group-hover:scale-105"
                             data-ai-hint="building"
                           />
                         </div>
                    </CardContent>
                    <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold truncate">{place.tags.name}</CardTitle>
                      {place.tags.description && <CardDescription className="text-xs truncate">{place.tags.description}</CardDescription>}
                    </CardHeader>
                    <CardFooter className="mt-auto flex justify-end gap-2 p-2 sm:p-3 pt-0">
                      <Button
                        onClick={() => handleMarkSeen(place)}
                        size="icon"
                        variant="outline"
                        className={`shrink-0 ${seenIds.includes(place.id) ? 'border-red-500 text-red-500' : ''}`}
                        title="Love"
                      >
                        <Heart className={`h-4 w-4 ${seenIds.includes(place.id) ? 'text-red-500' : ''}`} />
                      </Button>
                      <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600">
                          <MapPin className="mr-2 h-4 w-4" />
                          Directions
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext  className="hidden sm:flex" />
        </Carousel>
      )}
    </section>
  );
}
