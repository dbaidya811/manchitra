"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Crosshair } from "lucide-react";

export default function PointToPointPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [oSuggest, setOSuggest] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [dSuggest, setDSuggest] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [oOpen, setOOpen] = useState(false);
  const [dOpen, setDOpen] = useState(false);
  const debounceRef = useRef<any>(null);
  // Start map
  const startMapDivRef = useRef<HTMLDivElement | null>(null);
  const startMapRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  // End map
  const endMapDivRef = useRef<HTMLDivElement | null>(null);
  const endMapRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  // Load Leaflet CSS/JS from CDN once
  useEffect(() => {
    const ensureLeaflet = async () => {
      if (typeof window === 'undefined') return;
      // CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // JS
      if (!('L' in (window as any))) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }
      const L = (window as any).L;
      // Start map init
      if (startMapDivRef.current && !startMapRef.current) {
        startMapRef.current = L.map(startMapDivRef.current).setView([22.5726, 88.3639], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(startMapRef.current);
        const startIcon = L.divIcon({
          html: '<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 0 1px #10b981"></div>',
          className: '', iconSize: [14, 14],
        });
        startMarkerRef.current = L.marker([22.5726, 88.3639], { draggable: true, icon: startIcon }).addTo(startMapRef.current);
        startMarkerRef.current.on('dragend', () => {
          const ll = startMarkerRef.current.getLatLng();
          setOrigin(`${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`);
        });
        startMapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng || {}; if (typeof lat !== 'number') return;
          startMarkerRef.current.setLatLng([lat, lng]);
          setOrigin(`${lat.toFixed(6)},${lng.toFixed(6)}`);
        });
      }
      // End map init
      if (endMapDivRef.current && !endMapRef.current) {
        endMapRef.current = L.map(endMapDivRef.current).setView([22.5726, 88.3639], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(endMapRef.current);
        const endIcon = L.divIcon({
          html: '<div style=\"width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 0 1px #ef4444\"></div>',
          className: '', iconSize: [14, 14],
        });
        endMarkerRef.current = L.marker([22.5726, 88.3639], { draggable: true, icon: endIcon, opacity: 0.9 }).addTo(endMapRef.current);
        endMarkerRef.current.on('dragend', () => {
          const ll = endMarkerRef.current.getLatLng();
          setDestination(`${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`);
        });
        endMapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng || {}; if (typeof lat !== 'number') return;
          endMarkerRef.current.setLatLng([lat, lng]);
          setDestination(`${lat.toFixed(6)},${lng.toFixed(6)}`);
        });
      }
    };
    ensureLeaflet();
  }, []);

  // Helpers: set individual maps/markers
  const setStartMapTo = (lat: number, lng: number, zoom: number = 14) => {
    const L = (window as any).L; if (!L || !startMapRef.current || !startMarkerRef.current) return;
    startMapRef.current.setView([lat, lng], zoom);
    startMarkerRef.current.setLatLng([lat, lng]);
  };
  const setEndMapTo = (lat: number, lng: number, zoom: number = 14) => {
    const L = (window as any).L; if (!L || !endMapRef.current || !endMarkerRef.current) return;
    endMapRef.current.setView([lat, lng], zoom);
    endMarkerRef.current.setLatLng([lat, lng]);
  };

  // Try to parse "lat,lng"
  const parseLatLng = (text: string): { lat: number; lng: number } | null => {
    const m = text.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  };

  // Geocode via Nominatim
  const geocode = async (q: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lng: lon };
      }
    } catch {}
    return null;
  };

  // Search suggestions (Nominatim)
  const searchSuggest = async (q: string): Promise<Array<{ name: string; lat: number; lng: number }>> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=0&limit=8`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (Array.isArray(data)) {
        return data
          .map((it: any) => ({ name: String(it.display_name || ''), lat: parseFloat(it.lat), lng: parseFloat(it.lon) }))
          .filter((x: any) => x.name && !Number.isNaN(x.lat) && !Number.isNaN(x.lng));
      }
    } catch {}
    return [];
  };

  const onOriginChange = (value: string) => {
    setOrigin(value);
    const coords = parseLatLng(value);
    if (coords) {
      setStartMapTo(coords.lat, coords.lng, 15);
      setOSuggest([]); setOOpen(false);
      // Debounced suggest
      setOOpen(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const items = await searchSuggest(value.trim());
        setOSuggest(items);
      }, 250);
    } else {
      setOSuggest([]); setOOpen(false);
    }
  };
  const onDestinationChange = (value: string) => {
    setDestination(value);
    const coords = parseLatLng(value);
    if (coords) {
      setEndMapTo(coords.lat, coords.lng, 15);
      setDSuggest([]); setDOpen(false);
    } else if (value.trim().length >= 3) {
      setDOpen(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const items = await searchSuggest(value.trim());
        setDSuggest(items);
      }, 250);
    } else {
      setDSuggest([]); setDOpen(false);
    }
  };

  const useCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coord = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        setOrigin(coord);
        setStartMapTo(latitude, longitude, 15);
        setLoadingLoc(false);
      },
      () => { setLoadingLoc(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const openDirections = () => {
    const o = origin.trim();
    const d = destination.trim();
    if (!o || !d) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&travelmode=driving`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <section className="relative mx-auto max-w-4xl px-4 pt-16 pb-10 sm:pt-24">
        <div className="flex items-start sm:items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg">
            <ArrowRightLeft className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Point to point
            </h1>
            <p className="mt-2 text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
              Enter a starting location to preview it on the map. Add a destination to open directions.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6">
          {/* Start input + small map */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 shadow-sm p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 px-2 items-center justify-center rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Start</span>
              <span className="text-xs text-neutral-500">Choose your starting point</span>
            </div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Starting location</label>
            <div className="relative">
              <Input
                value={origin}
                onChange={(e) => onOriginChange(e.target.value)}
                onFocus={() => { if (oSuggest.length > 0) setOOpen(true); }}
                onBlur={() => setTimeout(() => setOOpen(false), 120)}
                placeholder="Starting location (place name or lat,lng)"
                className="h-11 rounded-xl pl-3"
              />
              {oOpen && oSuggest.length > 0 && (
                <div className="absolute z-[1000] mt-1 w-full max-h-60 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow">
                  {oSuggest.map((it, idx) => (
                    <button
                      key={`${it.lat},${it.lng}-${idx}`}
                      type="button"
                      className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setOrigin(it.name); setOOpen(false); setOSuggest([]); setStartMapTo(it.lat, it.lng, 15); }}
                    >
                      {it.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 relative z-0">
              <div ref={startMapDivRef} className="w-full h-44" />
            </div>
            <div className="mt-3">
              <Button onClick={useCurrentLocation} variant="secondary" className="rounded-xl h-10 inline-flex items-center gap-2 w-max">
                <Crosshair className="h-4 w-4" /> {loadingLoc ? 'Locating…' : 'Use current (start)'}
              </Button>
            </div>
          </div>

          {/* End input + small map */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 shadow-sm p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 px-2 items-center justify-center rounded-full text-[11px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">End</span>
              <span className="text-xs text-neutral-500">Choose your destination</span>
            </div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ending location</label>
            <div className="relative">
              <Input
                value={destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                onFocus={() => { if (dSuggest.length > 0) setDOpen(true); }}
                onBlur={() => setTimeout(() => setDOpen(false), 120)}
                placeholder="Ending location (optional for directions)"
                className="h-11 rounded-xl pl-3"
              />
              {dOpen && dSuggest.length > 0 && (
                <div className="absolute z-[1000] mt-1 w-full max-h-60 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow">
                  {dSuggest.map((it, idx) => (
                    <button
                      key={`${it.lat},${it.lng}-${idx}`}
                      type="button"
                      className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setDestination(it.name); setDOpen(false); setDSuggest([]); setEndMapTo(it.lat, it.lng, 15); }}
                    >
                      {it.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 relative z-0">
              <div ref={endMapDivRef} className="w-full h-44" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button
            onClick={openDirections}
            disabled={!origin.trim() || !destination.trim()}
            className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            Open Directions
          </Button>
        </div>

        {/* Removed single large map; now two small maps above */}
      </section>
    </main>
  );
}
