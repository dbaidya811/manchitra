
"use client";

import { useEffect, useState }from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Fuel, Clock, MapPin, Phone, Globe, Mail, CreditCard, ShoppingCart, Droplet, Wind, Bath, Car, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Place {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    brand?: string;
    "addr:street"?: string;
    "addr:city"?: string;
    "addr:postcode"?: string;
    phone?: string;
    website?: string;
    email?: string;
    "fuel:diesel"?: "yes" | "no";
    "fuel:octane_95"?: "yes" | "no";
    "fuel:cng"?: "yes" | "no";
    shop?: "yes" | "no";
    toilets?: "yes" | "no";
    car_wash?: "yes" | "no";
    atm?: "yes" | "no";
    opening_hours?: string;
    "payment:credit_cards"?: "yes" | "no";
    "payment:upi"?: "yes" | "no";
    [key: string]: any;
  };
}

const InfoLine = ({ icon: Icon, text }: { icon: React.ElementType, text?: string }) => {
    if (!text) return null;
    return (
        <div className="flex items-center text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
            <span className="truncate">{text}</span>
        </div>
    )
};

const FeatureIcon = ({ icon: Icon, label, available }: { icon: React.ElementType, label: string, available?: "yes" | "no" }) => {
    if (available !== 'yes') return null;
    return (
        <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-2">
            <Icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">{label}</span>
        </Badge>
    )
}

export function NearbyPumps() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNearbyPumps = (latitude: number, longitude: number) => {
      const radius = 2000; // 2km
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="fuel"](around:${radius},${latitude},${longitude});
        );
        out body;
        >;
        out skel qt;
      `;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        overpassQuery
      )}`;

      fetch(overpassUrl)
        .then((response) => response.json())
        .then((data) => {
          setPlaces(data.elements);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching nearby places:", error);
          toast({
            variant: "destructive",
            title: "Failed to fetch nearby pumps",
            description: "Could not retrieve data from OpenStreetMap.",
          });
          setIsLoading(false);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchNearbyPumps(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) {
             toast({
              variant: "destructive",
              title: "Location Error",
              description: error.message,
            });
          }
          setIsLoading(false);
        }
      );
    } else {
        setIsLoading(false);
    }
  }, [toast]);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Nearby Petrol Pumps</h2>
            <div className="flex gap-4">
                <Skeleton className="h-64 w-80 rounded-lg" />
                <Skeleton className="h-64 w-80 rounded-lg" />
                <Skeleton className="h-64 w-80 rounded-lg" />
            </div>
        </div>
    );
  }

  if (places.length === 0) {
    return null; // Don't render anything if no pumps are found or location is denied
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Nearby Petrol Pumps</h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {places.map((place) => (
            <CarouselItem key={place.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4 pl-2">
              <div className="p-1 h-full">
                <Card className="flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">
                            {place.tags.name || "Petrol Pump"}
                            </CardTitle>
                            {place.tags.brand && <Badge variant="secondary" className="mt-1">{place.tags.brand}</Badge>}
                        </div>
                        <Fuel className="h-6 w-6 text-primary flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    <InfoLine icon={MapPin} text={[place.tags["addr:street"], place.tags["addr:city"], place.tags["addr:postcode"]].filter(Boolean).join(', ')} />
                    <InfoLine icon={Clock} text={place.tags.opening_hours} />
                    <InfoLine icon={Phone} text={place.tags.phone} />
                    <InfoLine icon={Globe} text={place.tags.website} />
                    <InfoLine icon={Mail} text={place.tags.email} />
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 pt-4">
                      <FeatureIcon icon={Droplet} label="Diesel" available={place.tags["fuel:diesel"]} />
                      <FeatureIcon icon={Wind} label="CNG" available={place.tags["fuel:cng"]} />
                      <FeatureIcon icon={ShoppingCart} label="Shop" available={place.tags.shop} />
                      <FeatureIcon icon={Bath} label="Toilets" available={place.tags.toilets} />
                      <FeatureIcon icon={Car} label="Car Wash" available={place.tags.car_wash} />
                      <FeatureIcon icon={CreditCard} label="Cards" available={place.tags["payment:credit_cards"]} />
                      <FeatureIcon icon={Banknote} label="UPI" available={place.tags["payment:upi"]} />
                  </CardFooter>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
