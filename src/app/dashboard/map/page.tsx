"use client";

import { useEffect, useRef } from 'react';
import tt from '@tomtom-international/web-sdk-maps';

const MapPage = () => {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<tt.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapElement.current) return;

    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) {
      console.error("TomTom API key is not configured.");
      return;
    }

    map.current = tt.map({
      key: apiKey,
      container: mapElement.current,
      center: [-0.118092, 51.509865], // Default to London
      zoom: 10,
      style: `https://api.tomtom.com/style/1/style/aa1c6d7f-76ea-4a38-b120-28ccdda0a0e8?key=${apiKey}`
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="h-screen w-screen absolute inset-0">
      <div ref={mapElement} className="h-full w-full" />
    </div>
  );
};

export default MapPage;
