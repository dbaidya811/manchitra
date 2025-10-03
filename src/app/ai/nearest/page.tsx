"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocateFixed, Navigation, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NearestPandalSetupPage() {
  const router = useRouter();
  const leafletRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  const [center, setCenter] = useState<{ lat: number; lon: number }>({ lat: 22.5726, lon: 88.3639 });
  const [radiusKm, setRadiusKm] = useState<number>(3); // 0 - 10 km
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [noResults, setNoResults] = useState<boolean>(false);

  // init map
  useEffect(() => {
    (async () => {
      try {
        if (!leafletRef.current) {
          const L = await import("leaflet");
          // @ts-ignore
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
          leafletRef.current = L;
        }
        const L = leafletRef.current;
        if (!mapRef.current && mapDivRef.current) {
          mapRef.current = L.map(mapDivRef.current, { attributionControl: false }).setView([center.lat, center.lon], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
          const personIcon = L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149059.png",
            iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30],
          });
          centerMarkerRef.current = L.marker([center.lat, center.lon], { draggable: true, icon: personIcon }).addTo(mapRef.current);
          circleRef.current = L.circle([center.lat, center.lon], { radius: radiusKm * 1000, color: "#6366f1", fillOpacity: 0.12 }).addTo(mapRef.current);

          centerMarkerRef.current.on("dragend", () => {
            const pos = centerMarkerRef.current.getLatLng();
            setCenter({ lat: pos.lat, lon: pos.lng });
            setQuery(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
          });
          mapRef.current.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            setCenter({ lat, lon: lng });
            setQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          });
          setTimeout(() => { try { mapRef.current?.invalidateSize(); } catch {} }, 60);
        }
      } catch {}
    })();
  }, []);

  // sync map
  useEffect(() => {
    try {
      if (centerMarkerRef.current) centerMarkerRef.current.setLatLng([center.lat, center.lon]);
      if (circleRef.current) circleRef.current.setLatLng([center.lat, center.lon]);
      if (mapRef.current) mapRef.current.setView([center.lat, center.lon]);
    } catch {}
  }, [center]);
  useEffect(() => { try { if (circleRef.current) circleRef.current.setRadius(radiusKm * 1000); } catch {} }, [radiusKm]);

  // suggestions
  useEffect(() => {
    const controller = new AbortController();
    const q = query.trim();
    if (!q) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`, { signal: controller.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch { setSuggestions([]); }
    }, 300);
    return () => { controller.abort(); clearTimeout(t); };
  }, [query]);

  const chooseSuggestion = (s: any) => {
    const lat = parseFloat(s.lat), lon = parseFloat(s.lon);
    setCenter({ lat, lon });
    setQuery(s.display_name);
    setSuggestions([]);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      setCenter({ lat, lon });
      setQuery(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    });
  };

  const proceed = async () => {
    // First, check for pandals within radius; if none, show message and do not navigate
    try {
      const res = await fetch('/api/places', { cache: 'no-store' });
      const data = await res.json();
      const list: any[] = Array.isArray(data?.places) ? data.places : [];

      // Haversine helpers
      const toRad = (v: number) => (v * Math.PI) / 180;
      const distKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
        const R = 6371; // km
        const dLat = toRad(bLat - aLat);
        const dLon = toRad(bLon - aLon);
        const A = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(A));
      };
      const toCoords = (p: any): { lat: number | null; lon: number | null } => {
        if (typeof p?.lat === 'number' && typeof p?.lon === 'number' && !Number.isNaN(p.lat) && !Number.isNaN(p.lon)) return { lat: p.lat, lon: p.lon };
        if (typeof p?.location === 'string' && p.location.includes(',')) {
          const parts = p.location.split(',').map((s: string) => s.trim());
          const a = parseFloat(parts[0] || ''), b = parseFloat(parts[1] || '');
          if (!Number.isNaN(a) && !Number.isNaN(b)) {
            if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
            if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { lat: b, lon: a };
          }
        }
        return { lat: null, lon: null };
      };

      const within = list
        .map((p: any) => ({ p, c: toCoords(p) }))
        .filter(({ c }) => c.lat != null && c.lon != null)
        .filter(({ c }) => distKm(center.lat, center.lon, c.lat as number, c.lon as number) <= radiusKm);

      if (within.length === 0) {
        setNoResults(true);
        return;
      }

      // Navigate to the dashboard map with nearest mode and parameters
      const lat = center.lat.toFixed(6);
      const lon = center.lon.toFixed(6);
      const r = (radiusKm * 1000); // meters
      const url = `http://localhost:9002/dashboard/map?mode=nearest&lat=${lat}&lon=${lon}&fromLat=${lat}&fromLon=${lon}&r=${r}`;
      router.push(url);
    } catch {
      // If API fails, show message instead of navigating blindly
      setNoResults(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-112px)] w-full bg-gradient-to-b from-violet-50 via-white to-sky-50">
      <div className="mx-auto max-w-full sm:max-w-3xl px-3 sm:px-4 py-4 sm:py-10">
        <div className="rounded-3xl border border-white/60 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur-md shadow-[0_10px_40px_rgba(16,24,40,0.06)] ring-1 ring-black/5 p-3 sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-8 w-8 grid place-items-center rounded-full bg-violet-600 text-white text-sm font-semibold">1</div>
            <div className="text-base sm:text-lg font-semibold text-neutral-900">Nearest pandal</div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 mb-4">Pick a center and radius. We will show pandals within that range.</p>

          <div
            ref={wrapRef}
            tabIndex={-1}
            onBlur={(e) => {
              const next = e.relatedTarget as Node | null;
              if (!wrapRef.current || !next || !wrapRef.current.contains(next)) setSuggestions([]);
            }}
            className="relative"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-600" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key==='Escape') setSuggestions([]); }}
                  placeholder="Type a place or lat,lon"
                  className="pl-9 rounded-xl bg-white/90 border border-neutral-200 shadow-sm focus-visible:ring-2 focus-visible:ring-violet-400"
                />
              </div>
              <div className="flex w-full sm:w-auto gap-2 sm:gap-3 justify-stretch sm:justify-end flex-col sm:flex-row">
                <Button onClick={useMyLocation} className="rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-md w-full sm:w-auto">
                  <LocateFixed className="h-4 w-4 mr-2" /> Use my location
                </Button>
                <div className="flex items-center gap-3 rounded-full bg-white/90 border border-neutral-200 px-3 py-2 shadow-sm w-full sm:w-auto">
                  <span className="text-xs sm:text-sm text-neutral-600">Radius</span>
                  <input
                    className="radiusInput iosSlider flex-1"
                    type="range" min={0} max={10} step={0.5}
                    value={radiusKm}
                    onChange={(e)=> setRadiusKm(parseFloat(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #7c3aed ${(Math.max(0, Math.min(10, radiusKm))/10)*100}%, #e5e7eb ${(Math.max(0, Math.min(10, radiusKm))/10)*100}%)`
                    }}
                  />
                  <span className="text-sm font-semibold text-neutral-900 w-16 text-right">{radiusKm} km</span>
                </div>
              </div>
            </div>
            {suggestions.length>0 && (
              <div className="absolute z-[10000] mt-2 w-full overflow-auto max-h-72 rounded-xl bg-white/95 border border-neutral-200 shadow-[0_12px_40px_rgba(16,24,40,0.12)]">
                {suggestions.map((s)=> (
                  <button key={s.place_id} className="w-full text-left px-3 py-2 hover:bg-violet-50/80 flex items-center gap-2 transition-colors border-b last:border-b-0 border-neutral-100" onClick={()=>chooseSuggestion(s)}>
                    <MapPin className="h-4 w-4 text-violet-600" />
                    <span className="text-sm truncate">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative mt-3 sm:mt-4">
            <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-neutral-900/80 text-white text-[11px] font-semibold px-2.5 py-1 shadow-sm">
              Nearest area
            </div>
            <div ref={mapDivRef} className="h-[44vh] sm:h-[52vh] w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-[0_8px_28px_rgba(16,24,40,0.08)]" />
          </div>

          <div className="mt-4 sm:mt-5 flex items-center justify-end">
            {radiusKm >= 1 ? (
              <Button onClick={proceed} className="w-full sm:w-auto rounded-full px-6 py-2.5 bg-violet-600 text-white hover:bg-violet-700 shadow-md focus-visible:ring-2 focus-visible:ring-violet-300">
                <Navigation className="h-4 w-4 mr-2" /> Show nearest pandals
              </Button>
            ) : (
              <div className="w-full text-right text-xs sm:text-sm text-neutral-500">
                Select at least 1 km to continue
              </div>
            )}
          </div>
        </div>
      </div>
      {noResults && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white/95 backdrop-blur p-5 w-[min(92vw,360px)] text-center shadow-2xl border border-black/10">
            <div className="text-lg font-semibold text-neutral-900 mb-1">No pandals found</div>
            <div className="text-sm text-neutral-600 mb-4">Try increasing the radius or pick a different center.</div>
            <Button onClick={()=> setNoResults(false)} className="rounded-full bg-violet-600 hover:bg-violet-700 text-white px-5">OK</Button>
          </div>
        </div>
      )}
      <style jsx>{`
        .radiusInput { height: 6px; border-radius: 9999px; background-color: rgba(0,0,0,0.08); outline: none; }
        /* Center thumb vertically on 6px track (thumb 16px => (16-6)/2 = 5px) */
        .radiusInput::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 16px; width: 16px; border-radius: 9999px; background: #7c3aed; box-shadow: 0 2px 6px rgba(124,58,237,0.35); border: 2px solid white; cursor: pointer; margin-top: -5px; }
        .radiusInput::-moz-range-thumb { height: 16px; width: 16px; border-radius: 9999px; background: #7c3aed; box-shadow: 0 2px 6px rgba(124,58,237,0.35); border: 2px solid white; cursor: pointer; transform: translateY(-5px); }
        .radiusInput::-webkit-slider-runnable-track { height: 6px; border-radius: 9999px; background: #e5e7eb; }
        .radiusInput::-moz-range-track { height: 6px; border-radius: 9999px; background: #e5e7eb; }
      `}</style>
    </div>
  );
}
