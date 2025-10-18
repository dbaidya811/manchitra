"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LocateFixed, Upload, MapPin as MapPinIcon, Search } from "lucide-react";
import Image from "next/image";
import { Place } from "@/lib/types";
import { Loader } from "@/components/ui/loader";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  area: z.string().min(1, { message: "Area is required." }),
  location: z.string().min(1, { message: "Location is required." }),
  photos: z.array(z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceSubmit?: (place: FormValues) => void;
  onPlaceUpdate?: (place: Place) => void;
  placeToEdit?: Place | null;
}

export function AddPlaceDialog({ open, onOpenChange, onPlaceSubmit, onPlaceUpdate, placeToEdit }: AddPlaceDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previews, setPreviews] = useState<(string | null)[]>(Array(5).fill(null));
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isEditing = !!placeToEdit;
  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Note: We only show suggestions under the Location search, not Name
  // Area suggestions
  const [allAreas, setAllAreas] = useState<string[]>([]);
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      area: "",
      location: "",
      photos: [],
    },
  });

  useEffect(() => {
    if (isEditing && placeToEdit) {
      const tags = placeToEdit.tags ?? { name: "", description: "" } as any;
      form.reset({
        name: tags.name ?? "",
        description: tags.description ?? "",
        area: placeToEdit.area || "",
        location: `${placeToEdit.lat},${placeToEdit.lon}`,
        photos: placeToEdit.photos || []
      });
      const imagePreviews = Array(5).fill(null);
      placeToEdit.photos?.forEach((photo, index) => {
        if(index < 5) imagePreviews[index] = photo.preview;
      });
      setPreviews(imagePreviews);

    } else {
      form.reset({ name: "", description: "", area: "", location: "", photos: [] });
      setPreviews(Array(5).fill(null));
    }
  }, [placeToEdit, isEditing, form, open]);

  // Load all areas from DB once when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch('/api/places');
        const data = await res.json();
        const areas: string[] = Array.isArray(data?.places)
          ? data.places
              .map((p: any) => (typeof p?.area === 'string' ? p.area.trim() : ''))
              .filter((a: string) => a.length > 0)
          : [];
        const uniq = Array.from(new Set(areas)).sort((a, b) => a.localeCompare(b));
        setAllAreas(uniq);
      } catch (_) {
        setAllAreas([]);
      }
    })();
  }, [open]);

  // We no longer drive search from Name field per request

  // Initialize Leaflet map when dialog opens
  useEffect(() => {
    async function initMap() {
      if (!open) return;
      try {
        if (!leafletRef.current) {
          // Dynamic import to avoid SSR issues
          const L = await import("leaflet");
          // Fix default icon paths when bundling
          // @ts-ignore
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
          leafletRef.current = L;
        }
        const L = leafletRef.current;
        if (!mapRef.current && mapContainerRef.current) {
          // Determine initial center
          const loc = form.getValues("location");
          const [latStr = "22.5726", lonStr = "88.3639"] = (loc || "").split(",").map((s) => s.trim());
          const lat = parseFloat(latStr) || 22.5726; // Kolkata default
          const lon = parseFloat(lonStr) || 88.3639;

          mapRef.current = L.map(mapContainerRef.current).setView([lat, lon], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current);
          // Make sure the map renders correctly inside a dialog
          setTimeout(() => {
            try { mapRef.current?.invalidateSize(); } catch (_) {}
          }, 50);

          const customIcon = L.divIcon({
            className: 'leaflet-custom-marker',
            html: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          markerRef.current = L.marker([lat, lon], { draggable: true, icon: customIcon }).addTo(mapRef.current);
          markerRef.current.on("dragend", async () => {
            const pos = markerRef.current.getLatLng();
            const newLoc = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
            form.setValue("location", newLoc, { shouldValidate: true });
            // Reverse geocode to suggest name/area
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}`);
              const data = await res.json();
              // Intentionally do not auto-fill name/area per request
            } catch (e) {
              // ignore errors
            }
          });
          // Allow setting by clicking on the map
          mapRef.current.on('click', async (e: any) => {
            const { lat: clat, lng: clon } = e.latlng;
            if (markerRef.current) markerRef.current.setLatLng([clat, clon]);
            form.setValue("location", `${clat.toFixed(6)}, ${clon.toFixed(6)}`, { shouldValidate: true });
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${clat}&lon=${clon}`);
              const data = await res.json();
              // Do not auto-fill name/area per request
            } catch (_) {}
          });
        }
      } catch (_) {
        // Leaflet may not be available; ignore silently
      }
    }
    initMap();
    return () => {
      // Do not destroy on every rerender; cleanup when dialog closes handled below
    };
  }, [open, form]);

  // Keep marker in sync if user types location manually
  useEffect(() => {
    const loc = form.watch("location");
    if (!loc || !markerRef.current || !leafletRef.current) return;
    const [latStr, lonStr] = loc.split(",").map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      markerRef.current.setLatLng([lat, lon]);
      if (mapRef.current) mapRef.current.setView([lat, lon]);
    }
  }, [form]);

  // Search suggestions using Nominatim
  useEffect(() => {
    const controller = new AbortController();
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`, { signal: controller.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (_) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [searchQuery]);

  // No auto-pick from Name

  const readAndStoreFile = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...previews];
      newPreviews[index] = reader.result as string;
      setPreviews(newPreviews);

      const currentPhotos = form.getValues("photos") || [];
      const photosArray = Array.isArray(currentPhotos) ? [...currentPhotos] : [];
      while (photosArray.length < 5) photosArray.push(undefined);

      photosArray[index] = {
        preview: reader.result as string,
      };
      form.setValue("photos", photosArray.filter(Boolean));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndStoreFile(file, index);
    }
  };

  const handleGetCurrentLocation = () => {
      if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition((position) => {
              const { latitude, longitude } = position.coords;
              form.setValue("location", `${latitude}, ${longitude}`);
              if (markerRef.current) {
                markerRef.current.setLatLng([latitude, longitude]);
                if (mapRef.current) mapRef.current.setView([latitude, longitude]);
              }
          }, (error) => {
              toast({
                  variant: "destructive",
                  title: "Could not get location",
                  description: error.message
              })
          })
      }
  }

  function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      if (isEditing && placeToEdit && onPlaceUpdate) {
         const baseTags = placeToEdit.tags ?? {};
        const updatedPlace: Place = {
          ...placeToEdit,
          lat: parseFloat(values.location.split(',')[0]),
          lon: parseFloat(values.location.split(',')[1]),
          area: values.area,
          tags: {
            ...baseTags,
            name: values.name,
            description: values.description,
          },
          photos: values.photos,
        };
        onPlaceUpdate(updatedPlace);
        toast({
          title: "Place Updated",
          description: "Your changes have been saved.",
        });
        // Play feedback tone
        try { const audio = new Audio('/sound/b%20tone.wav'); audio.play().catch(() => {}); } catch {}
      } else if (onPlaceSubmit) {
        onPlaceSubmit(values);
        toast({
          title: "Place Submitted",
          description: "Thank you for your contribution! Your new place has been added.",
        });
        // Play feedback tone
        try { const audio = new Audio('/sound/b%20tone.wav'); audio.play().catch(() => {}); } catch {}
      }

      setIsSubmitting(false);
      resetAndClose();
    }, 1500);
  }
  
  const resetAndClose = () => {
      form.reset();
      setPreviews(Array(5).fill(null));
      setSearchQuery("");
      setSuggestions([]);
      // Destroy map instance to avoid leaks
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (_) {}
      }
      mapRef.current = null;
      markerRef.current = null;
      onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white shadow-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">{isEditing ? "Edit Place" : "Add a New Place"}</span>
            </div>
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this point of interest." : "Contribute to the map by adding a new point of interest."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Central Park Cafe" {...field} className="bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-orange-400/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short description of the place."
                      className="resize-none bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-orange-400/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area (e.g., City, Neighborhood)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="e.g., New York City"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const q = e.target.value.trim().toLowerCase();
                          if (!q) { setAreaSuggestions([]); return; }
                          const matches = allAreas.filter(a => a.toLowerCase().includes(q)).slice(0, 8);
                          setAreaSuggestions(matches);
                        }}
                        className="bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-orange-400/50"
                      />
                    </FormControl>
                    {areaSuggestions.length > 0 && (
                      <div className="absolute mt-2 w-full rounded-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-black/10 dark:border-white/10 shadow-2xl max-h-56 overflow-auto z-40">
                        {areaSuggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-orange-500/10"
                            onClick={() => { form.setValue('area', name, { shouldValidate: true }); setAreaSuggestions([]); }}
                          >
                            <div className="text-sm font-medium truncate">{name}</div>
                          </button>
                        ))}
                        {areaSuggestions.length === 0 && (
                          <div className="px-3 py-2 text-xs text-neutral-600 dark:text-white/70">No matches</div>
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-destructive">*</span></FormLabel>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} className="bg-orange-500/90 text-white border-none hover:bg-orange-600">
                        <LocateFixed className="h-4 w-4 mr-2" /> Use my location
                      </Button>
                      <span className="text-xs text-neutral-700 dark:text-white/80">Selected: {field.value || '—'}</span>
                    </div>
                    {/* Location search with suggestions below */}
                    <div className="relative z-30">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-neutral-600 dark:text-white/70" />
                        <Input
                          placeholder="Search place name (powered by OSM)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              try {
                                let target = suggestions[0];
                                if (!target) {
                                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=1`);
                                  const data = await res.json();
                                  target = Array.isArray(data) && data.length > 0 ? data[0] : null;
                                }
                                if (target) {
                                  const lat = parseFloat(target.lat);
                                  const lon = parseFloat(target.lon);
                                  form.setValue("location", `${lat.toFixed(6)}, ${lon.toFixed(6)}`, { shouldValidate: true });
                                  if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
                                  if (mapRef.current) mapRef.current.setView([lat, lon], 14);
                                  setSuggestions([]);
                                }
                              } catch (_) {}
                            }
                          }}
                          className="bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-orange-400/50"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 border border-black/10 dark:border-white/10"
                          onClick={async () => {
                            try {
                              let target = suggestions[0];
                              if (!target) {
                                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=1`);
                                const data = await res.json();
                                target = Array.isArray(data) && data.length > 0 ? data[0] : null;
                              }
                              if (target) {
                                const lat = parseFloat(target.lat);
                                const lon = parseFloat(target.lon);
                                form.setValue("location", `${lat.toFixed(6)}, ${lon.toFixed(6)}`, { shouldValidate: true });
                                if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
                                if (mapRef.current) mapRef.current.setView([lat, lon], 14);
                                setSuggestions([]);
                              }
                            } catch (_) {}
                          }}
                        >
                          Go
                        </Button>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="absolute mt-2 w-full rounded-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-black/10 dark:border-white/10 shadow-2xl max-h-64 overflow-auto">
                          {suggestions.map((s) => (
                            <button
                              key={s.place_id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-orange-500/10 focus:bg-orange-500/10 flex items-center gap-2"
                              onClick={() => {
                                setSearchQuery(s.display_name);
                                const lat = parseFloat(s.lat);
                                const lon = parseFloat(s.lon);
                                form.setValue("location", `${lat.toFixed(6)}, ${lon.toFixed(6)}`, { shouldValidate: true });
                                if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
                                if (mapRef.current) mapRef.current.setView([lat, lon], 14);
                                setSuggestions([]);
                              }}
                            >
                              <div className="text-sm font-medium truncate flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-orange-500" /> {s.display_name}</div>
                            </button>
                          ))}
                          {isSearching && (
                          <div className="px-3 py-2 flex items-center gap-2 text-xs text-neutral-600 dark:text-white/70">
                            <Loader />
                            <span>Searching…</span>
                          </div>
                        )}
                        </div>
                      )}
                    </div>
                    {/* Mini Map */}
                    <div ref={mapContainerRef} className="h-48 w-full rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-lg" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photos"
              render={() => (
                <FormItem>
                  <FormLabel>Photo (optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="relative w-full h-24 rounded-md overflow-hidden bg-gradient-to-br from-white/85 to-white/60 dark:from-white/10 dark:to-white/5 border border-dashed border-orange-300/50 dark:border-orange-300/30 shadow-sm">
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => { fileInputRefs.current[0] = el; }}
                          onChange={(e) => handleFileChange(e, 0)}
                          className="hidden"
                        />
                        <div
                          className="absolute inset-0"
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              readAndStoreFile(file, 0);
                            }
                          }}
                          role="presentation"
                        >
                          {previews[0] ? (
                            <Image
                              src={previews[0] as string}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <button
                              type="button"
                              className="absolute inset-0 flex items-center justify-center flex-col gap-1 hover:bg-black/5 dark:hover:bg-white/10 transition"
                              onClick={() => fileInputRefs.current[0]?.click()}
                            >
                              <Upload className="h-4 w-4 text-orange-500" />
                              <span className="text-[11px] text-neutral-600 dark:text-white/70">Upload or drop photo</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {previews[0] && (
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-neutral-500 dark:text-white/60">Tap to replace</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const copy = [...previews];
                              copy[0] = null;
                              setPreviews(copy);
                              form.setValue("photos", []);
                            }}
                            className="text-neutral-700 dark:text-white/80 hover:text-neutral-900 hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            Remove photo
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={resetAndClose} className="hover:bg-white/20 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Place' : 'Submit Place'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
      {/* Custom marker style */}
      <style jsx global>{`
        .leaflet-custom-marker {
          width: 14px;
          height: 14px;
          background: #f59e0b; /* amber-500 */
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.15);
        }
      `}</style>
    </DialogContent>
  </Dialog>
  );
}
