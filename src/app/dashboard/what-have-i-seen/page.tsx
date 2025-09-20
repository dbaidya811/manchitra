"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ArrowLeft, HeartOff, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Place } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function WhatHaveISeenPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [places, setPlaces] = useState<Place[]>([]);
    const [seenIds, setSeenIds] = useState<number[]>([]);
    const lovedPlaces = useMemo(
        () => places.filter(p => seenIds.includes(p.id)),
        [places, seenIds]
    );

    useEffect(() => {
        const load = async () => {
            const fallback = () => {
                try {
                    const storedPlaces = localStorage.getItem("user-places");
                    setPlaces(storedPlaces ? JSON.parse(storedPlaces) : []);
                } catch (_) {
                    setPlaces([]);
                }
            };
            try {
                const res = await fetch("/api/places", { cache: "no-store" });
                const data = await res.json();
                if (res.ok && data?.ok && Array.isArray(data.places)) {
                    setPlaces(data.places as Place[]);
                } else {
                    fallback();
                }
            } catch (_) {
                fallback();
            }
            try {
                const seenRaw = localStorage.getItem("seen-places");
                setSeenIds(seenRaw ? JSON.parse(seenRaw) : []);
            } catch (_) {
                setSeenIds([]);
            }
        };
        load();
    }, []);

    const handleUnlove = (placeId: number) => {
        try {
            const next = seenIds.filter(id => id !== placeId);
            setSeenIds(next);
            localStorage.setItem("seen-places", JSON.stringify(next));
            toast({ title: "Removed", description: "Removed from What I've Seen" });
        } catch (_) {}
    };

    const handleDirections = (place: Place) => {
        // Prefer explicit location string if available (handle both "lat,lon" and "lon,lat")
        if (place.location && place.location.includes(',')) {
            const parts = place.location.split(',').map(s => s.trim());
            const a = parseFloat(parts[0] || '');
            const b = parseFloat(parts[1] || '');
            if (!Number.isNaN(a) && !Number.isNaN(b)) {
                // lat ∈ [-90, 90], lon ∈ [-180, 180]
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
        // Next, use numeric lat/lon fields if present
        if (typeof place.lat === 'number' && typeof place.lon === 'number') {
            router.push(`/dashboard/map?lat=${place.lat}&lon=${place.lon}`);
            return;
        }
        // Finally, fall back to address (do not pre-encode; map page will encode)
        const addressParts = [place.tags?.name, place.area].filter(Boolean);
        if (addressParts.length > 0) {
            const address = addressParts.join(", ");
            router.push(`/dashboard/map?address=${address}`);
            return;
        }
    };
    
    return (
        <div className="relative h-screen flex flex-col">
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <div className="flex items-center gap-2 md:flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl font-semibold">
                        What I've Seen
                    </h1>
                </div>
                <div className="flex items-center gap-2 justify-end">
                <UserProfile />
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6 space-y-6 pb-[calc(4.5rem+20px)]">
                {lovedPlaces.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-muted-foreground">No loved places yet</h2>
                            <p className="text-muted-foreground">Tap the heart on any card to add it here.</p>
                        </div>
                    </div>
                ) : (
                    <section>
                        <h2 className="text-2xl font-bold tracking-tight mb-4">Loved Places</h2>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {lovedPlaces.map(place => (
                                <Card key={place.id} className="group flex flex-col overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="aspect-[4/3] overflow-hidden">
                                            <Image
                                              src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                                              alt={place.tags.name}
                                              width={600}
                                              height={450}
                                              className="h-full w-full object-cover"
                                            />
                                        </div>
                                    </CardContent>
                                    <CardHeader className="p-2">
                                        <CardTitle className="text-sm font-semibold truncate">{place.tags.name}</CardTitle>
                                        {place.tags.description && (
                                            <CardDescription className="text-xs truncate">{place.tags.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardFooter className="mt-auto flex gap-2 p-2 pt-0">
                                        <Button onClick={() => handleUnlove(place.id)} size="sm" variant="outline" className="shrink-0">
                                            <HeartOff className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={() => handleDirections(place)} size="sm" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600">
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Directions
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <MobileNav />
        </div>
    );
}
