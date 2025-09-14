"use client";

import { useState, useEffect } from "react";
import { Place } from "@/lib/types";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


export default function WhatHaveISeenMap() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [initialCenter, setInitialCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India
    const { toast } = useToast();

    useEffect(() => {
        const storedPlaces = localStorage.getItem("user-places");
        if (storedPlaces) {
            const parsedPlaces = JSON.parse(storedPlaces) as Place[];
            setPlaces(parsedPlaces);
            if(parsedPlaces.length > 0) {
                // Center map on the first contributed place
                setInitialCenter([parsedPlaces[0].lat, parsedPlaces[0].lon]);
            }
        }
    }, []);

    useEffect(() => {
        if (places.length === 0) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setInitialCenter([position.coords.latitude, position.coords.longitude]);
                    },
                    (error) => {
                        console.warn(`Could not get geolocation: ${error.message}`);
                        // Keep default center if geolocation fails
                    }
                );
            }
        }
    }, [places]);

    if (typeof window === 'undefined') {
        return null;
    }
    
    return (
        <MapContainer center={initialCenter} zoom={places.length > 0 ? 10 : 5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {places.map((place) => (
                <Marker key={place.id} position={[place.lat, place.lon]}>
                    <Popup>
                        <div className="w-48">
                            {place.photos && place.photos[0]?.preview && (
                                <div className="aspect-video overflow-hidden rounded-md mb-2">
                                <Image
                                    src={place.photos[0].preview}
                                    alt={place.tags.name}
                                    width={200}
                                    height={112}
                                    className="object-cover"
                                />
                                </div>
                            )}
                            <h3 className="font-bold text-base mb-1">{place.tags.name}</h3>
                            <p className="text-sm text-muted-foreground">{place.tags.description}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}