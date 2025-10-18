"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Pencil, Trash2, Heart } from "lucide-react";
import Image from "next/image";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AddPlaceDialog } from "@/components/dashboard/add-place-dialog";
import { useSession } from "next-auth/react";

export default function MyContributionsPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [places, setPlaces] = useState<Place[]>([]);
  type Post = {
    id: string;
    author?: string;
    avatarUrl?: string | null;
    cardName: string;
    text: string;
    photos: string[];
    createdAt: number | string | Date;
    likes: number;
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (status === "authenticated") {
          // Load places owned by user
          const [resPlaces, resPosts] = await Promise.all([
            fetch("/api/places?mine=1", { cache: "no-store" }),
            fetch("/api/feed?mine=1", { cache: "no-store" }),
          ]);
          const dataPlaces = await resPlaces.json();
          const dataPosts = await resPosts.json();
          if (resPlaces.ok && dataPlaces?.ok && Array.isArray(dataPlaces.places)) {
            setPlaces(dataPlaces.places as Place[]);
          }
          if (resPosts.ok && dataPosts?.ok && Array.isArray(dataPosts.posts)) {
            const list: Post[] = dataPosts.posts.map((p: any) => ({
              id: String(p.id),
              author: p.author || undefined,
              avatarUrl: p.avatarUrl || null,
              cardName: String(p.cardName),
              text: p.text || "",
              photos: Array.isArray(p.photos) ? p.photos : [],
              createdAt: p.createdAt || Date.now(),
              likes: typeof p.likes === 'number' ? p.likes : 0,
            }));
            setPosts(list);
          }
          return;
        }
      } catch (_) {}
      // Fallback for guests or API error (places only)
      const storedPlaces = localStorage.getItem("user-places");
      if (storedPlaces) setPlaces(JSON.parse(storedPlaces));
    };
    load();
  }, [status]);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts;
    return posts.filter((p) => {
      const nameMatch = p.cardName.toLowerCase().includes(normalizedQuery);
      const textMatch = (p.text || "").toLowerCase().includes(normalizedQuery);
      return nameMatch || textMatch;
    });
  }, [posts, normalizedQuery]);

  const filteredPlaces = useMemo(() => {
    if (!normalizedQuery) return places;
    return places.filter((place) => {
      const nameMatch = (place.tags?.name ?? "").toLowerCase().includes(normalizedQuery);
      const descMatch = (place.tags?.description ?? "").toLowerCase().includes(normalizedQuery);
      const areaMatch = (place.area ?? "").toLowerCase().includes(normalizedQuery);
      return nameMatch || descMatch || areaMatch;
    });
  }, [places, normalizedQuery]);

  const handleShowOnMap = (place: Place) => {
    // Prefer explicit location string if available
    if (place.location && place.location.includes(',')) {
      const [latStr, lonStr] = place.location.split(',').map(s => s.trim());
      const latNum = parseFloat(latStr);
      const lonNum = parseFloat(lonStr);
      if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
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
      const address = addressParts.join(', ');
      router.push(`/dashboard/map?address=${address}`);
    }
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
    const label = place.tags?.name || "this place";
    const ok = typeof window !== "undefined" ? window.confirm(`Delete "${label}"? This cannot be undone.`) : true;
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
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">My Contributions</h1>
      </header>
      <main className="flex-1 space-y-8 p-4 md:p-6 pb-[calc(4.5rem+20px)]">
        <section className="rounded-2xl border border-orange-200/60 dark:border-orange-500/30 bg-orange-50/70 dark:bg-orange-500/10 backdrop-blur-sm p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-semibold text-orange-600 dark:text-orange-300">Search contributions</h2>
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search posts or places..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-orange-300/60 focus-visible:ring-orange-400/50"
              />
            </div>
          </div>
        </section>
        {/* My Posts */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Posts</h2>
          </div>
          {posts.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-2xl p-6 text-center">No posts yet.</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-2xl p-6 text-center">No posts match “{searchTerm}”.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredPosts.map((p) => (
                <Card key={p.id} className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
                  <CardContent className="p-0">
                    <div className="aspect-[4/3] overflow-hidden bg-black/5">
                      {p.photos?.[0] ? (
                        <Image src={p.photos[0]} alt={p.cardName} width={600} height={450} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">No photo</div>
                      )}
                    </div>
                  </CardContent>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-base font-semibold truncate">{p.cardName}</CardTitle>
                    {p.text && <CardDescription className="text-xs line-clamp-2">{p.text}</CardDescription>}
                  </CardHeader>
                  <CardFooter className="mt-auto flex flex-col gap-2 p-3 pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {p.likes}</div>
                      <div>{new Date(p.createdAt as any).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-1/2" onClick={() => { try { localStorage.setItem('feed_edit_post_id', p.id); } catch {} router.push('/dashboard/feed'); }}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" className="w-1/2" onClick={async () => {
                        const ok = window.confirm('Delete this post?');
                        if (!ok) return;
                        try {
                          const res = await fetch(`/api/feed/${p.id}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Delete failed');
                          setPosts((prev) => prev.filter((x) => x.id !== p.id));
                        } catch (_) {}
                      }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* My Places */}
        {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-[50vh]">
                <p className="text-lg text-muted-foreground">No places have been added yet.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Add a Place</Button>
            </div>
        ) : filteredPlaces.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-2xl p-6 text-center">No places match “{searchTerm}”.</div>
        ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredPlaces.map(place => (
              <Card key={place.id} className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
                 <CardContent className="p-0">
                    <div className="aspect-[4/3] overflow-hidden">
                        <Image
                        src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
                        alt={place.tags?.name || 'Place photo'}
                        width={600}
                        height={450}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        data-ai-hint="building location"
                        />
                    </div>
                </CardContent>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-base font-semibold">{place.tags?.name || 'Untitled place'}</CardTitle>
                  <CardDescription className="text-xs truncate">{place.tags?.description || 'No description provided.'}</CardDescription>
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
