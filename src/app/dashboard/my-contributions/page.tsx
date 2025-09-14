
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { AddPlaceDialog } from "@/components/dashboard/add-place-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function MyContributionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const storedPlaces = localStorage.getItem("user-places");
    if (storedPlaces) {
      setPlaces(JSON.parse(storedPlaces));
    }
  }, []);
  
  const handleEdit = (place: Place) => {
    setPlaceToEdit(place);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (placeId: number) => {
    const updatedPlaces = places.filter(p => p.id !== placeId);
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
    toast({
      title: "Place Deleted",
      description: "The place has been removed from your contributions.",
    });
  };

  const handleUpdatePlace = (updatedPlace: Place) => {
    const updatedPlaces = places.map(p => p.id === updatedPlace.id ? updatedPlace : p);
    setPlaces(updatedPlaces);
    localStorage.setItem("user-places", JSON.stringify(updatedPlaces));
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
        <h1 className="text-xl font-semibold">My Contributions</h1>
      </header>
      <main className="flex-1 space-y-8 p-4 md:p-6">
        {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-[50vh]">
                <p className="text-lg text-muted-foreground">You haven't added any places yet.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Add a Place</Button>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {places.map(place => (
              <Card key={place.id} className="flex flex-col overflow-hidden">
                 <CardContent className="p-0">
                    <div className="aspect-video overflow-hidden">
                        <Image
                        src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                        alt={place.tags.name}
                        width={600}
                        height={400}
                        className="h-full w-full object-cover"
                        data-ai-hint="building location"
                        />
                    </div>
                </CardContent>
                <CardHeader>
                  <CardTitle>{place.tags.name}</CardTitle>
                  <CardDescription>{place.tags.description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto flex justify-end gap-2 p-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(place)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                          <AlertDialogAction onClick={() => handleDelete(place.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
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
