"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AddPlaceDialog } from "@/components/dashboard/add-place-dialog";
import { useSession } from "next-auth/react";

export default function MyContributionsPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      try {
        if (status === "authenticated") {
          const res = await fetch("/api/places?mine=1", { cache: "no-store" });
          const data = await res.json();
          if (res.ok && data?.ok && Array.isArray(data.places)) {
            setPlaces(data.places as Place[]);
            return;
          }
        }
      } catch (_) {}
      // Fallback for guests or API error
      const storedPlaces = localStorage.getItem("user-places");
      if (storedPlaces) setPlaces(JSON.parse(storedPlaces));
    };
    load();
  }, [status]);
  
  const handleShowOnMap = (place: Place) => {
    router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
  };

  const handleEdit = (place: Place) => {
    setPlaceToEdit(place);
    setIsEditDialogOpen(true);
  };

  const handlePlaceUpdate = async (updatedPlace: Place) => {
    const updated = places.map((p) => (p.id === updatedPlace.id ? updatedPlace : p));
    setPlaces(updated);
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlace),
      });
      if (!res.ok) {
        throw new Error("Update failed");
      }
    } catch (_) {
      // fallback if unauthenticated
      localStorage.setItem("user-places", JSON.stringify(updated));
    }
    setPlaceToEdit(null);
    setIsEditDialogOpen(false);
  };

  const handleDelete = async (place: Place) => {
    const ok = typeof window !== "undefined" ? window.confirm(`Delete "${place.tags.name}"? This cannot be undone.`) : true;
    if (!ok) return;
    try {
      const res = await fetch("/api/places", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: place.id }),
      });
      if (!res.ok) {
        throw new Error("Delete failed");
      }
      const remaining = places.filter((p) => p.id !== place.id);
      setPlaces(remaining);
    } catch (_) {
      const remaining = places.filter((p) => p.id !== place.id);
      setPlaces(remaining);
      localStorage.setItem("user-places", JSON.stringify(remaining));
    }
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
      <main className="flex-1 space-y-8 p-4 md:p-6 pb-[calc(4.5rem+1px)]">
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
                   <div className="flex gap-2">
                      <Button onClick={() => handleEdit(place)} size="sm" variant="outline" className="w-1/2">
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button onClick={() => handleDelete(place)} size="sm" variant="destructive" className="w-1/2">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                   </div>
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
    <AddPlaceDialog
      open={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      placeToEdit={placeToEdit}
      onPlaceUpdate={handlePlaceUpdate}
    />
    </>
  );
}
