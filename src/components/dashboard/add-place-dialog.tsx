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
import { Loader2, LocateFixed, Upload } from "lucide-react";
import Image from "next/image";
import { Place } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  area: z.string().optional(),
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
      form.reset({
        name: placeToEdit.tags.name,
        description: placeToEdit.tags.description,
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


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews];
        newPreviews[index] = reader.result as string;
        setPreviews(newPreviews);

        const currentPhotos = form.getValues("photos") || [];
        // Ensure the array is the correct length
        const photosArray = Array.isArray(currentPhotos) ? currentPhotos : [];
        while(photosArray.length < 5) photosArray.push(undefined);

        photosArray[index] = {
            // We can't store the file object in local storage, so we'll just keep the preview
            preview: reader.result as string,
        };
        form.setValue("photos", photosArray.filter(p => p));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleGetCurrentLocation = () => {
      if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition((position) => {
              const { latitude, longitude } = position.coords;
              form.setValue("location", `${latitude}, ${longitude}`);
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
         const updatedPlace: Place = {
          ...placeToEdit,
          lat: parseFloat(values.location.split(',')[0]),
          lon: parseFloat(values.location.split(',')[1]),
          area: values.area,
          tags: {
            ...placeToEdit.tags,
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
      } else if (onPlaceSubmit) {
        onPlaceSubmit(values);
        toast({
          title: "Place Submitted",
          description: "Thank you for your contribution! Your new place has been added.",
        });
      }

      setIsSubmitting(false);
      resetAndClose();
    }, 1500);
  }
  
  const resetAndClose = () => {
      form.reset();
      setPreviews(Array(5).fill(null));
      onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Place" : "Add a New Place"}</DialogTitle>
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
                    <Input placeholder="e.g., Central Park Cafe" {...field} className="bg-white/20 border-none placeholder:text-white/70" />
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
                      className="resize-none bg-white/20 border-none placeholder:text-white/70"
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
                  <FormControl>
                    <Input placeholder="e.g., New York City" {...field} className="bg-white/20 border-none placeholder:text-white/70" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Lat, Lng) <span className="text-destructive">*</span></FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="e.g., 40.782, -73.965" {...field} className="bg-white/20 border-none placeholder:text-white/70" />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={handleGetCurrentLocation} className="bg-white/20 border-none hover:bg-white/30">
                        <LocateFixed className="h-4 w-4" />
                    </Button>
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
                    <FormLabel>Photos</FormLabel>
                    <FormControl>
                        <div className="grid grid-cols-5 gap-2">
                            {previews.map((preview, index) => (
                                <div key={index} className="relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={el => fileInputRefs.current[index] = el}
                                    onChange={(e) => handleFileChange(e, index)}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full aspect-square flex items-center justify-center flex-col gap-1 bg-white/10 border border-dashed border-white/40 hover:bg-white/20 hover:border-white/60 p-0 overflow-hidden"
                                    onClick={() => fileInputRefs.current[index]?.click()}
                                >
                                    {preview ? (
                                    <Image
                                        src={preview}
                                        alt={`Preview ${index + 1}`}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                    ) : (
                                    <>
                                        <Upload className="h-5 w-5 text-white/70" />
                                        <span className="text-xs text-white/70">Upload</span>
                                    </>
                                    )}
                                </Button>
                                </div>
                            ))}
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
      </DialogContent>
    </Dialog>
  );
}
