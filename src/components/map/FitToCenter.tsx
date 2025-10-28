"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function FitToCenter({ center }: { center?: { lat: number; lon: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !center) return;
    const { lat, lon } = center;
    if (typeof lat === 'number' && typeof lon === 'number') {
      map.setView([lat, lon], map.getZoom());
    }
  }, [map, center?.lat, center?.lon]);
  return null;
}
