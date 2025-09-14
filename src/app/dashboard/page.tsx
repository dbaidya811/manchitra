"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { PoiCarousel } from "@/components/dashboard/poi-carousel";
import { Place } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit, MapPin, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddPlaceDialog } from "@/components/dashboard/add-place-dialog";

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const storedPlaces = localStorage.getItem("user-places");
    if (storedPlaces) {
      setPlaces(JSON.parse(storedPlaces));
    }
    
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
    setPlaceToEdit(null);
    setIsEditDialogOpen(false);
  };

  const handleDeletePlace = (placeId: number) => {
    const updatedPlaces = places.filter(p => p.id !== placeId);
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
    toast({
      title: "Place Deleted",
      description: "The place has been removed from your contributions.",
    });
  };

  const handleShowOnMap = (place: Place) => {
    router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
  };

  const handleEdit = (place: Place) => {
    setPlaceToEdit(place);
    setIsEditDialogOpen(true);
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
      <main className="flex-1 space-y-8 p-4 md:p-6">
        {groupedPlaces.recentPlaces.length > 0 && (
          <PoiCarousel title="Last 15 Added Places" places={groupedPlaces.recentPlaces} />
        )}
        {Object.entries(groupedPlaces.areaGroups).map(([area, areaPlaces]) => (
           areaPlaces.length > 0 && (
            <section key={area}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Places in {area}</h2>
                 <Button variant="link" onClick={() => router.push('/dashboard/my-contributions')} className="text-primary">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {areaPlaces.map(place => (
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
                      <div className="flex w-full gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(place)} className="w-full">
                          <Edit className="mr-2 h-3 w-3" /> Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="w-full">
                                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete your
                                  contribution.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePlace(place.id)}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </CardFooter>
                  </Card>
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

    