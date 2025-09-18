
"use client";

import { useState, useEffect } from "react";
import { Place } from "@/lib/types";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Image from "next/image";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function WhatHaveISeenMap() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India
    const [zoom, setZoom] = useState(5);

    useEffect(() => {
        const storedPlaces = localStorage.getItem("user-places");
        const seenRaw = localStorage.getItem("seen-places");
        try {
            const parsedPlaces = storedPlaces ? (JSON.parse(storedPlaces) as Place[]) : [];
            const seenIds = seenRaw ? (JSON.parse(seenRaw) as number[]) : [];
            const loved = Array.isArray(seenIds) && seenIds.length > 0
                ? parsedPlaces.filter(p => seenIds.includes(p.id))
                : [];
            setPlaces(loved);
            if (loved.length > 0) {
                setCenter([loved[0].lat, loved[0].lon]);
                setZoom(10);
            }
        } catch (e) {
            console.error("Failed to parse places/seen from localStorage", e);
            setPlaces([]);
        }
    }, []);

    useEffect(() => {
        // This effect runs only if there are no places.
        if (places.length === 0) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setCenter([position.coords.latitude, position.coords.longitude]);
                        setZoom(13);
                    },
                    (error) => {
                        console.warn(`Could not get geolocation: ${error.message}`);
                        // Keep default center if geolocation fails
                    }
                );
            }
        }
    }, [places.length]);

    if (typeof window === 'undefined') {
        return null;
    }
    
    return (
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapUpdater center={center} zoom={zoom} />
            {places.map((place) => (
                <Marker key={place.id} position={[place.lat, place.lon]}>
                    <Popup>
                        <div className="w-48">
                            {place.photos && place.photos[0]?.preview && (
                                <div className="aspect-video overflow-hidden rounded-md mb-2">
                                <Image
                                    src={place.photos?.[0]?.preview || `https://i.pinimg.com/1200x/1d/88/fe/1d88fe41748769af8df4ee6c1b2d83bd.jpg`}
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

