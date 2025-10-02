"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocateFixed, Navigation, MapPin, CircleDot } from "lucide-react";
import { useRouter } from "next/navigation";

interface Suggestion { place_id: number; display_name: string; lat: string; lon: string }

export default function LocationRangePage() {
  const router = useRouter();

  // stepper
  const [step, setStep] = useState<number>(1); // 1: start, 2: end
  const stepRef = useRef<number>(1);
  useEffect(()=>{ stepRef.current = step; }, [step]);

  // map refs
  const leafletRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  // location state
  const [center, setCenter] = useState<{ lat: number; lon: number }>({ lat: 22.5726, lon: 88.3639 });
  const [radius, setRadius] = useState<number>(2000);
  const [end, setEnd] = useState<{ lat: number; lon: number } | null>(null);

  // search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // ending search
  const [endQuery, setEndQuery] = useState("");
  const [endSuggestions, setEndSuggestions] = useState<Suggestion[]>([]);
  const endWrapRef = useRef<HTMLDivElement | null>(null);

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
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          });

          centerMarkerRef.current = L.marker([center.lat, center.lon], { draggable: true, icon: personIcon }).addTo(mapRef.current);
          circleRef.current = L.circle([center.lat, center.lon], { radius, color: "#0ea5e9", fillOpacity: 0.12 }).addTo(mapRef.current);

          centerMarkerRef.current.on("dragend", () => {
            const pos = centerMarkerRef.current.getLatLng();
            setCenter({ lat: pos.lat, lon: pos.lng });
            setQuery(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
          });
          mapRef.current.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            if (stepRef.current === 2) {
              setEnd({ lat, lon: lng });
              setEndQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              try { endMarkerRef.current?.setLatLng([lat, lng]); } catch {}
            } else {
              setCenter({ lat, lon: lng });
              setQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          });
          setTimeout(() => { try { mapRef.current?.invalidateSize(); } catch {} }, 60);
        }
      } catch {}
    })();
  }, []);

  // sync with state
  useEffect(() => {
    try {
      if (centerMarkerRef.current) centerMarkerRef.current.setLatLng([center.lat, center.lon]);
      if (circleRef.current) circleRef.current.setLatLng([center.lat, center.lon]);
      if (mapRef.current) mapRef.current.setView([center.lat, center.lon]);
    } catch {}
  }, [center]);
  useEffect(() => { try { if (circleRef.current) circleRef.current.setRadius(radius); } catch {} }, [radius]);

  // ensure map renders after step transitions (container size changes)
  useEffect(() => {
    const t = setTimeout(() => {
      try { mapRef.current?.invalidateSize(); } catch {}
    }, 60);
    return () => clearTimeout(t);
  }, [step]);

  // mount end marker when entering step 2 if not present
  useEffect(() => {
    try {
      const L = leafletRef.current;
      if (step === 2 && mapRef.current && !endMarkerRef.current) {
        const personIcon = L?.icon ? L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149059.png",
          iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
        }) : undefined;
        const initial = end || center;
        endMarkerRef.current = L.marker([initial.lat, initial.lon], { draggable: true, icon: personIcon }).addTo(mapRef.current);
        endMarkerRef.current.on("dragend", () => {
          const pos = endMarkerRef.current.getLatLng();
          setEnd({ lat: pos.lat, lon: pos.lng });
          setEndQuery(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
        });
      }
    } catch {}
  }, [step]);

  // keep end marker and map centered when end changes programmatically
  useEffect(() => {
    try {
      if (end && endMarkerRef.current) {
        endMarkerRef.current.setLatLng([end.lat, end.lon]);
      }
      if (end && mapRef.current && stepRef.current === 2) {
        mapRef.current.setView([end.lat, end.lon]);
      }
    } catch {}
  }, [end]);

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

  // end suggestions
  useEffect(() => {
    const controller = new AbortController();
    const q = endQuery.trim();
    if (!q) { setEndSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`, { signal: controller.signal });
        const data = await res.json();
        setEndSuggestions(Array.isArray(data) ? data : []);
      } catch { setEndSuggestions([]); }
    }, 300);
    return () => { controller.abort(); clearTimeout(t); };
  }, [endQuery]);

  const chooseSuggestion = (s: Suggestion) => {
    const lat = parseFloat(s.lat), lon = parseFloat(s.lon);
    setCenter({ lat, lon });
    setQuery(s.display_name);
    setSuggestions([]);
  };

  const chooseEndSuggestion = (s: Suggestion) => {
    const lat = parseFloat(s.lat), lon = parseFloat(s.lon);
    setEnd({ lat, lon });
    setEndQuery(s.display_name);
    try { endMarkerRef.current?.setLatLng([lat, lon]); } catch {}
    setEndSuggestions([]);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      setCenter({ lat, lon });
      setQuery(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    });
  };

  const proceedRoute = async () => {
    if (!end) return;
    const base = `/dashboard/map?mode=pair&startLat=${center.lat.toFixed(6)}&startLon=${center.lon.toFixed(6)}&endLat=${end.lat.toFixed(6)}&endLon=${end.lon.toFixed(6)}`;
    try {
      const res = await fetch('/api/places', { cache: 'no-store' });
      const data = await res.json();
      const list = Array.isArray(data?.places) ? data.places : [];
      const ids = list.map((p: any) => p.id).filter((x: any) => typeof x === 'number' || typeof x === 'string');
      const plan = ids.join(',');
      const url = plan ? `${base}&plan=${encodeURIComponent(plan)}&auto=1` : `${base}&auto=1`;
      router.push(url);
    } catch (e) {
      router.push(`${base}&auto=1`);
    }
  };

  const StepHeader = () => (
    <div className="mb-4 sm:mb-5 flex items-center gap-4">
      {[
        { i: 1, label: 'Start' },
        { i: 2, label: 'End' },
      ].map(({ i, label }) => (
        <div key={i} className="flex items-center gap-3 sm:gap-4">
          <div className={`h-8 w-8 grid place-items-center rounded-full text-sm font-semibold transition-colors ${step===i? 'bg-emerald-600 text-white':'bg-neutral-200 text-neutral-700'}`}>{i}</div>
          <div className={`text-sm font-medium ${step===i? 'text-neutral-900':'text-neutral-500'}`}>{label}</div>
          {i<2 && <div className="hidden sm:block h-px w-16 bg-neutral-300" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-112px)] w-full bg-gradient-to-b from-emerald-50 via-white to-sky-50">
      <div className="mx-auto max-w-full sm:max-w-3xl px-3 sm:px-4 py-6 sm:py-10">
        <div className="rounded-3xl border border-white/60 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur-md shadow-[0_10px_40px_rgba(16,24,40,0.06)] ring-1 ring-black/5 p-4 sm:p-6">
          <StepHeader />
          <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900 mb-1">Starting location</h2>
              <p className="text-sm text-neutral-600 mb-3">Type a place name. Pick a suggestion or adjust on the map.</p>
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
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key==='Escape') setSuggestions([]); }}
                      placeholder="Type a place or lat,lon"
                      className="pl-9 rounded-xl bg-white/90 border border-neutral-200 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-400"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-2 justify-between sm:justify-end">
                    <Button onClick={useMyLocation} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex-1 sm:flex-none">
                      <LocateFixed className="h-4 w-4 mr-2" /> Use my location
                    </Button>
                    <Button onClick={()=> setStep(2)} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md px-5">
                      Next
                    </Button>
                  </div>
                </div>
                {suggestions.length>0 && (
                  <div className="absolute z-[10000] mt-2 w-full overflow-auto max-h-72 rounded-xl bg-white/95 border border-neutral-200 shadow-[0_12px_40px_rgba(16,24,40,0.12)]">
                    {suggestions.map((s,idx)=> (
                      <button key={s.place_id} className="w-full text-left px-3 py-2 hover:bg-emerald-50/80 flex items-center gap-2 transition-colors border-b last:border-b-0 border-neutral-100" onClick={()=>chooseSuggestion(s)}>
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm truncate">{s.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900 mb-1">Ending location</h2>
              <p className="text-sm text-neutral-600 mb-3">Type a place name. Pick a suggestion or adjust on the map.</p>
              <div
                ref={endWrapRef}
                tabIndex={-1}
                onBlur={(e) => {
                  const next = e.relatedTarget as Node | null;
                  if (!endWrapRef.current || !next || !endWrapRef.current.contains(next)) setEndSuggestions([]);
                }}
                className="relative"
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-600" />
                    <Input
                      value={endQuery}
                      onChange={(e) => setEndQuery(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key==='Escape') { setEndSuggestions([]); return; }
                        if (e.key==='Enter') {
                          const raw = endQuery.trim();
                          // try lat,lon
                          const m = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
                          if (m) {
                            const lat = parseFloat(m[1]);
                            const lon = parseFloat(m[2]);
                            setEnd({ lat, lon });
                            setEndQuery(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
                            setEndSuggestions([]);
                            return;
                          }
                          // fallback to geocode first result
                          try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(raw)}&limit=1`);
                            const data = await res.json();
                            if (Array.isArray(data) && data[0]) {
                              const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
                              setEnd({ lat, lon });
                              setEndQuery(data[0].display_name || raw);
                            }
                          } catch {}
                          setEndSuggestions([]);
                        }
                      }}
                      placeholder="Type a place or lat,lon"
                      className="pl-9 rounded-xl bg-white/90 border border-neutral-200 shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400"
                    />
                  </div>
                </div>
                {endSuggestions.length>0 && (
                  <div className="absolute z-[10000] mt-2 w-full overflow-auto max-h-72 rounded-xl bg-white/95 border border-neutral-200 shadow-[0_12px_40px_rgba(16,24,40,0.12)]">
                    {endSuggestions.map((s)=> (
                      <button key={s.place_id} className="w-full text-left px-3 py-2 hover:bg-sky-50/80 flex items-center gap-2 transition-colors border-b last:border-b-0 border-neutral-100" onClick={()=>chooseEndSuggestion(s)}>
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <span className="text-sm truncate">{s.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <Button
                  onClick={()=> setStep(1)}
                  className="rounded-full px-5 py-2.5 bg-sky-100 text-sky-900 hover:bg-sky-200 border border-sky-200 shadow-sm focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  Back
                </Button>
                <Button
                  disabled={!end}
                  onClick={proceedRoute}
                  className="rounded-full px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed shadow-md focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  Route
                </Button>
              </div>
            </div>
          )}
          {/* Persistent map container (shared across steps) */}
          <div className="relative mt-4">
            <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-neutral-900/80 text-white text-[11px] font-semibold px-2.5 py-1 shadow-sm">
              {step === 1 ? 'Start area' : 'End point'}
            </div>
            <div ref={mapDivRef} className="h-[52vh] w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-[0_8px_28px_rgba(16,24,40,0.08)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
