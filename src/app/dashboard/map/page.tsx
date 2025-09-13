
'use client';

import { useEffect, useRef, useState } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapPage() {
  const mapElement = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<tt.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_TOMTOM_API_KEY) {
      console.error('TomTom API key is not configured.');
      setLoading(false);
      return;
    }

    if (mapElement.current && !map) {
      const newMap = tt.map({
        key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY,
        container: mapElement.current,
        center: [-0.118092, 51.509865], // Default to London
        zoom: 10,
        style: 'tomtom://vector/1/basic-main',
      });

      newMap.on('load', () => {
        setLoading(false);
      });

      setMap(newMap);
    }

    return () => {
      map?.remove();
    };
  }, [map]);

  return (
    <div className="h-screen w-full relative">
      {loading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      <div ref={mapElement} className="h-screen w-full" />
    </div>
  );
}
