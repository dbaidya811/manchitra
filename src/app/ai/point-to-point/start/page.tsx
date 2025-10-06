"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Crosshair } from "lucide-react";

export default function PointToPointStartPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [oSuggest, setOSuggest] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [oOpen, setOOpen] = useState(false);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const debounceRef = useRef<any>(null);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
        const startIcon = L.divIcon({ html: '<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 0 1px #10b981"></div>', className: '', iconSize: [14,14] });
        markerRef.current = L.marker([22.5726, 88.3639], { draggable: true, icon: startIcon }).addTo(mapRef.current);
        markerRef.current.on('dragend', () => { const ll = markerRef.current.getLatLng(); setOrigin(`${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`); });
        mapRef.current.on('click', (e: any) => { const { lat, lng } = e.latlng || {}; if (typeof lat !== 'number') return; markerRef.current.setLatLng([lat,lng]); setOrigin(`${lat.toFixed(6)},${lng.toFixed(6)}`); });
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

  const onOriginChange = (value: string) => {
    setOrigin(value);
    const coords = parseLatLng(value);
    if (coords) { setMapTo(coords.lat, coords.lng, 15); setOSuggest([]); setOOpen(false); }
    else if (value.trim().length >= 3) { setOOpen(true); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(async () => { setOSuggest(await searchSuggest(value.trim())); }, 250); }
    else { setOSuggest([]); setOOpen(false); }
  };

  const useCurrentLocation = () => { if (typeof navigator === 'undefined' || !navigator.geolocation) return; setLoadingLoc(true); navigator.geolocation.getCurrentPosition((pos) => { const { latitude, longitude } = pos.coords; const coord = `${latitude.toFixed(6)},${longitude.toFixed(6)}`; setOrigin(coord); setMapTo(latitude, longitude, 15); setLoadingLoc(false); }, () => { setLoadingLoc(false); }, { enableHighAccuracy: true, timeout: 8000 }); };

  const onNext = () => {
    if (!origin.trim()) return; try { sessionStorage.setItem('ptp_origin', origin.trim()); } catch {}
    router.push('/ai/point-to-point/end');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <section className="relative mx-auto max-w-4xl px-4 pt-16 pb-10 sm:pt-24">
        <div className="flex items-start sm:items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg"><ArrowRightLeft className="h-6 w-6" /></span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Point to point</h1>
            <p className="mt-2 text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Step 1 of 2 · Pick your starting point.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full grid place-items-center bg-orange-500 text-white text-sm font-semibold">1</div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Start</div>
            </div>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500/70 to-neutral-200 dark:to-neutral-800" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full grid place-items-center bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm font-semibold">2</div>
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">End</div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 shadow-sm p-4 sm:p-5">
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Starting location</label>
          <div className="relative">
            <Input value={origin} onChange={(e) => onOriginChange(e.target.value)} onFocus={() => { if (oSuggest.length>0) setOOpen(true); }} onBlur={() => setTimeout(()=>setOOpen(false),120)} placeholder="Starting location (place name or lat,lng)" className="h-11 rounded-xl pl-3" />
            {oOpen && oSuggest.length>0 && (
              <div className="absolute z-[1000] mt-1 w-full max-h-60 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow">
                {oSuggest.map((it, idx) => (
                  <button key={`${it.lat},${it.lng}-${idx}`} type="button" className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOrigin(it.name); setOOpen(false); setOSuggest([]); setMapTo(it.lat, it.lng, 15); }}>
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
            <Button onClick={useCurrentLocation} variant="secondary" className="rounded-xl h-10 inline-flex items-center gap-2 w-max"><Crosshair className="h-4 w-4" /> {loadingLoc ? 'Locating…' : 'Use current'}</Button>
            <Button onClick={onNext} disabled={!origin.trim()} className="rounded-xl h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">Next</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
