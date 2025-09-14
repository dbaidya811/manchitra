
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
import { Place } from "@/lib/types";

interface PoiCarouselProps {
  title: string;
  places: Place[];
  isLoading?: boolean;
}

export function PoiCarousel({ title, places, isLoading }: PoiCarouselProps) {
  
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
            loop: places.length > 4,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {places.map((place) => (
              <CarouselItem key={place.id} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-2">
                <div className="p-1 h-full">
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
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm font-semibold truncate">{place.tags.name}</CardTitle>
                      {place.tags.description && <CardDescription className="text-xs truncate">{place.tags.description}</CardDescription>}
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
