"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Loader2 } from "lucide-react";

export default function PointToPointEndPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dSuggest, setDSuggest] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [dOpen, setDOpen] = useState(false);
  const debounceRef = useRef<any>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [foundPlaces, setFoundPlaces] = useState<Array<{ id: string; name: string; lat: number; lon: number }>>([]);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Load origin from session
  useEffect(() => {
    try {
      const o = sessionStorage.getItem('ptp_origin') || "";
      setOrigin(o);
    } catch {}
  }, []);

  useEffect(() => {
    const ensureLeaflet = async () => {
      if (typeof window === 'undefined') return;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
      }
      if (!('L' in (window as any))) {
        await new Promise<void>((resolve) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.async = true; s.onload = () => resolve(); document.body.appendChild(s); });
      }
      if (mapDivRef.current && !mapRef.current) {
        const L = (window as any).L;
        mapRef.current = L.map(mapDivRef.current).setView([22.5726, 88.3639], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(mapRef.current);
        const endIcon = L.divIcon({ html: '<div style=\"width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 0 1px #ef4444\"></div>', className: '', iconSize: [14,14] });
        markerRef.current = L.marker([22.5726, 88.3639], { draggable: true, icon: endIcon }).addTo(mapRef.current);
        markerRef.current.on('dragend', () => { const ll = markerRef.current.getLatLng(); setDestination(`${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`); });
        mapRef.current.on('click', (e: any) => { const { lat, lng } = e.latlng || {}; if (typeof lat !== 'number') return; markerRef.current.setLatLng([lat,lng]); setDestination(`${lat.toFixed(6)},${lng.toFixed(6)}`); });
      }
    };
    ensureLeaflet();
  }, []);

  const parseLatLng = (text: string): { lat: number; lng: number } | null => {
    const m = text.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/); if (!m) return null; const lat = parseFloat(m[1]); const lng = parseFloat(m[2]); if (Number.isNaN(lat) || Number.isNaN(lng)) return null; return { lat, lng };
  };

  const setMapTo = (lat: number, lng: number, zoom: number = 14) => {
    const L = (window as any).L; if (!L || !mapRef.current || !markerRef.current) return; mapRef.current.setView([lat,lng], zoom); markerRef.current.setLatLng([lat,lng]);
  };

  const searchSuggest = async (q: string): Promise<Array<{ name: string; lat: number; lng: number }>> => {
    try { const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=0&limit=8`; const res = await fetch(url, { headers: { 'Accept-Language': 'en' } }); const data = await res.json(); if (Array.isArray(data)) { return data.map((it: any) => ({ name: String(it.display_name||''), lat: parseFloat(it.lat), lng: parseFloat(it.lon) })).filter(x => x.name && !Number.isNaN(x.lat) && !Number.isNaN(x.lng)); } } catch {} return [];
  };

  const onDestinationChange = (value: string) => {
    setDestination(value);
    const coords = parseLatLng(value);
    if (coords) { setMapTo(coords.lat, coords.lng, 15); setDSuggest([]); setDOpen(false); }
    else if (value.trim().length >= 3) { setDOpen(true); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(async () => { setDSuggest(await searchSuggest(value.trim())); }, 250); }
    else { setDSuggest([]); setDOpen(false); }
  };

  const onBack = () => router.push('/ai/point-to-point/start');

  const onFinish = async () => {
    const o = origin.trim(); const d = destination.trim(); if (!o || !d) return;
    setSearching(true);
    setNotFound(false);
    setFoundPlaces([]);

    const parse = (val: string): { lat: number; lon: number } | null => {
      const m = val.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (!m) return null; const lat = parseFloat(m[1]); const lon = parseFloat(m[2]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return null; return { lat, lon };
    };
    const geocodeOne = async (q: string): Promise<{ lat: number; lon: number } | null> => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=0&limit=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat); const lon = parseFloat(data[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
        }
      } catch {}
      return null;
    };
    const oC = parse(o) || await geocodeOne(o);
    const dC = parse(d) || await geocodeOne(d);
    if (!oC || !dC) {
      setSearching(false);
      if (typeof window !== 'undefined') alert('Could not resolve one of the locations. Please enter a place name or lat,lng.');
      return;
    }

    // Query API for places between these coordinates
    try {
      const res = await fetch(`/api/places/between?fromLat=${oC.lat}&fromLon=${oC.lon}&toLat=${dC.lat}&toLon=${dC.lon}`);
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        setFoundPlaces(data.places);
        // Navigate to map with found places
        const ids = data.places.map((p: any) => p.id).join(',');
        const q = new URLSearchParams({
          plan: ids,
          fromLat: String(oC.lat),
          fromLon: String(oC.lon),
          toLat: String(dC.lat),
          toLon: String(dC.lon),
        }).toString();
        router.push(`/dashboard/map?${q}`);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error finding places:', err);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      {searching && (
        <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
          <div className="flex flex-col items-center gap-6">
            {/* Modern animated spinner */}
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-200 dark:border-orange-800"></div>
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-t-orange-500 border-r-transparent border-b-orange-600 border-l-transparent animate-pulse"></div>
              <div className="absolute inset-2 h-12 w-12 animate-spin rounded-full border-2 border-pink-300 dark:border-pink-700 animate-reverse"></div>
            </div>

            {/* Loading text with typing animation */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                Searching Places...
              </h2>
              <p className="text-sm text-muted-foreground animate-pulse">
                Finding places between your locations
              </p>
            </div>

            {/* Animated dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      )}
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <section className="relative mx-auto max-w-4xl px-4 pt-16 pb-10 sm:pt-24">
          <div className="flex items-start sm:items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg"><ArrowRightLeft className="h-6 w-6" /></span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Point to point</h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Step 2 of 2 · Pick your destination.</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full grid place-items-center bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm font-semibold">1</div>
                <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Start</div>
              </div>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-neutral-200 dark:from-neutral-800 to-orange-500/70" />
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full grid place-items-center bg-orange-500 text-white text-sm font-semibold">2</div>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">End</div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 shadow-sm p-4 sm:p-5">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ending location</label>
            <div className="relative">
              <Input value={destination} onChange={(e) => onDestinationChange(e.target.value)} onFocus={() => { if (dSuggest.length>0) setDOpen(true); }} onBlur={() => setTimeout(()=>setDOpen(false),120)} placeholder="Ending location (place name or lat,lng)" className="h-11 rounded-xl pl-3" />
              {dOpen && dSuggest.length>0 && (
                <div className="absolute z-[1000] mt-1 w-full max-h-60 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow">
                  {dSuggest.map((it, idx) => (
                    <button key={`${it.lat},${it.lng}-${idx}`} type="button" className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" onMouseDown={(e) => e.preventDefault()} onClick={() => { setDestination(it.name); setDOpen(false); setDSuggest([]); setMapTo(it.lat, it.lng, 15); }}>
                      {it.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 relative z-0">
              <div ref={mapDivRef} className="w-full h-56" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button onClick={onBack} variant="secondary" className="rounded-xl h-10">Back</Button>
              <Button onClick={onFinish} disabled={!origin.trim() || !destination.trim() || searching} className="rounded-xl h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                  </>
                ) : (
                  'Find Places'
                )}
              </Button>
            </div>
          </div>

          {/* Not Found Message */}
          {notFound && (
            <div className="mt-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">No Places Found</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">We couldn't find any places between your selected locations in our database.</p>
              <Button onClick={() => setNotFound(false)} variant="secondary" className="mt-4 rounded-xl">Try Again</Button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
