

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin } from "lucide-react";
import Image from "next/image";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function MyContributionsPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  
  useEffect(() => {
    const storedPlaces = localStorage.getItem("user-places");
    if (storedPlaces) {
      setPlaces(JSON.parse(storedPlaces));
    }
  }, []);
  
  const handleShowOnMap = (place: Place) => {
    router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
  };


  return (
    <>
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            >
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">All Places</h1>
      </header>
      <main className="flex-1 space-y-8 p-4 md:p-6 pb-24">
        {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-[50vh]">
                <p className="text-lg text-muted-foreground">No places have been added yet.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Add a Place</Button>
            </div>
        ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {places.map(place => (
              <Card key={place.id} className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
                 <CardContent className="p-0">
                    <div className="aspect-[4/3] overflow-hidden">
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
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-base font-semibold">{place.tags.name}</CardTitle>
                  <CardDescription className="text-xs truncate">{place.tags.description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto flex flex-col gap-2 p-3 pt-0">
                   <Button onClick={() => handleShowOnMap(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600">
                        <MapPin className="mr-2 h-4 w-4" />
                        Directions
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
    </>
  );
}
