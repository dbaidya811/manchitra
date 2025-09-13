"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Fuel, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Place {
  id: number;
  tags: {
    name?: string;
    [key: string]: any;
  };
}

export function NearbyPumps() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNearbyPumps = (latitude: number, longitude: number) => {
      const radius = 2000; // 2km
      const overpassQuery = `
        [out:json];
        node(around:${radius},${latitude},${longitude})[amenity=fuel];
        out;
      `;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        overpassQuery
      )}`;

      fetch(overpassUrl)
        .then((response) => response.json())
        .then((data) => {
          setPlaces(data.elements);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching nearby places:", error);
          toast({
            variant: "destructive",
            title: "Failed to fetch nearby pumps",
            description: "Could not retrieve data from OpenStreetMap.",
          });
          setIsLoading(false);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchNearbyPumps(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) {
             toast({
              variant: "destructive",
              title: "Location Error",
              description: error.message,
            });
          }
          setIsLoading(false);
        }
      );
    } else {
        setIsLoading(false);
    }
  }, [toast]);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-4">
                <Skeleton className="h-40 w-64" />
                <Skeleton className="h-40 w-64" />
                <Skeleton className="h-40 w-64" />
            </div>
        </div>
    );
  }

  if (places.length === 0) {
    return null; // Don't render anything if no pumps are found or location is denied
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Nearby Petrol Pumps</h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent>
          {places.map((place) => (
            <CarouselItem key={place.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {place.tags.name || "Petrol Pump"}
                    </CardTitle>
                    <Fuel className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      Amenity: Fuel Station
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
