"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "../ui/skeleton";
import Image from "next/image";

interface Place {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name: string;
    [key: string]: string;
  };
}

interface PoiCarouselProps {
  category: string;
  value: string;
  title: string;
  areaId: string; // OSM area ID. Kolkata is 3602888796
}

export function PoiCarousel({ category, value, title, areaId }: PoiCarouselProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true);
      const query = `
        [out:json][timeout:25];
        (
          node["${category}"="${value}"](area:${areaId});
          way["${category}"="${value}"](area:${areaId});
          relation["${category}"="${value}"](area:${areaId});
        );
        out center;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        query
      )}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        // Filter out places without names
        const namedPlaces = data.elements.filter((place: Place) => place.tags?.name);
        setPlaces(namedPlaces.slice(0, 15)); // Limit to 15 results
      } catch (error) {
        console.error("Failed to fetch places:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [category, value, areaId]);
  
  const getAddress = (tags: Place['tags']) => {
    return [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']]
      .filter(Boolean)
      .join(', ');
  }

  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight mb-4">{title}</h2>
      {isLoading ? (
        <div className="flex space-x-4">
            {[...Array(4)].map((_, i) => (
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
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {places.map((place, index) => (
              <CarouselItem key={place.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  <Card className="h-full flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-0">
                         <div className="aspect-video overflow-hidden">
                           <Image
                             src={`https://picsum.photos/seed/${place.id}/600/400`}
                             alt={place.tags.name}
                             width={600}
                             height={400}
                             className="h-full w-full object-cover transition-transform group-hover:scale-105"
                             data-ai-hint={`${value} building`}
                           />
                         </div>
                    </CardContent>
                    <CardHeader>
                      <CardTitle>{place.tags.name}</CardTitle>
                      {getAddress(place.tags) && <CardDescription>{getAddress(place.tags)}</CardDescription>}
                    </CardHeader>
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
