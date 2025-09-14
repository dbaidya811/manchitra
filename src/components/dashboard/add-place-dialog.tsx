"use client";

import { useState, useEffect, useRef } from "react";
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

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  location: z.string().min(5, { message: "Please enter a valid location." }),
  photos: z.array(z.any()).optional(),
});

interface AddPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPlaceDialog({ open, onOpenChange }: AddPlaceDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previews, setPreviews] = useState<(string | null)[]>(Array(5).fill(null));
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      photos: [],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews];
        newPreviews[index] = reader.result as string;
        setPreviews(newPreviews);

        const currentPhotos = form.getValues("photos") || [];
        currentPhotos[index] = file;
        form.setValue("photos", currentPhotos);
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    // Filter out null/undefined values from photos array
    const submissionValues = {
        ...values,
        photos: (values.photos || []).filter(p => p),
    };
    console.log("Submitting new place:", submissionValues);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Place Submitted",
        description: "Thank you for your contribution! Your new place has been submitted for review.",
      });
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
          <DialogTitle>Add a New Place</DialogTitle>
          <DialogDescription>
            Contribute to the map by adding a new point of interest.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
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
                  <FormLabel>Description</FormLabel>
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Address or lat, lng" {...field} className="bg-white/20 border-none placeholder:text-white/70" />
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
                                    className="w-full aspect-square flex items-center justify-center flex-col gap-1 bg-white/10 border border-white/20 hover:bg-white/20 p-0 overflow-hidden"
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
                Submit Place
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
