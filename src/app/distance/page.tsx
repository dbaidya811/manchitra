"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin, Navigation } from "lucide-react";

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function DistancePlannerPage() {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startLoc, setStartLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [endLoc, setEndLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [activeField, setActiveField] = useState<"start" | "end">("start");
  const [startSuggestions, setStartSuggestions] = useState<Suggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<Suggestion[]>([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);

  // No map on this page per request

  // Wrappers to manage focus-outside for suggestion closing
  const startWrapRef = useRef<HTMLDivElement | null>(null);
  const endWrapRef = useRef<HTMLDivElement | null>(null);

  // Mini maps (Leaflet)
  const leafletRef = useRef<any>(null);
  const startMapRef = useRef<any>(null);
  const endMapRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const startMapDivRef = useRef<HTMLDivElement | null>(null);
  const endMapDivRef = useRef<HTMLDivElement | null>(null);

  // Initialize mini maps
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
        const defaultCenter: [number, number] = [22.5726, 88.3639]; // Kolkata

        if (!startMapRef.current && startMapDivRef.current) {
          startMapRef.current = L.map(startMapDivRef.current, { zoomControl: false, attributionControl: false }).setView(defaultCenter, 12);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(startMapRef.current);
          startMarkerRef.current = L.marker(defaultCenter, { draggable: true }).addTo(startMapRef.current);
          startMarkerRef.current.on("dragend", () => {
            const pos = startMarkerRef.current.getLatLng();
            setStartLoc({ lat: pos.lat, lon: pos.lng });
            setStartQuery(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
          });
          startMapRef.current.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            setStartLoc({ lat, lon: lng });
            setStartQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            startMarkerRef.current.setLatLng([lat, lng]);
          });
          setTimeout(() => { try { startMapRef.current?.invalidateSize(); } catch {} }, 50);
        }

        if (!endMapRef.current && endMapDivRef.current) {
          endMapRef.current = L.map(endMapDivRef.current, { zoomControl: false, attributionControl: false }).setView(defaultCenter, 12);
          leafletRef.current.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(endMapRef.current);
          endMarkerRef.current = L.marker(defaultCenter, { draggable: true }).addTo(endMapRef.current);
          endMarkerRef.current.on("dragend", () => {
            const pos = endMarkerRef.current.getLatLng();
            setEndLoc({ lat: pos.lat, lon: pos.lng });
            setEndQuery(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
          });
          endMapRef.current.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            setEndLoc({ lat, lon: lng });
            setEndQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            endMarkerRef.current.setLatLng([lat, lng]);
          });
          setTimeout(() => { try { endMapRef.current?.invalidateSize(); } catch {} }, 50);
        }
      } catch {}
    })();
  }, []);

  // Keep markers in sync when values change programmatically
  useEffect(() => {
    try {
      if (startLoc && startMarkerRef.current && startMapRef.current) {
        startMarkerRef.current.setLatLng([startLoc.lat, startLoc.lon]);
        startMapRef.current.setView([startLoc.lat, startLoc.lon]);
      }
    } catch {}
  }, [startLoc]);

  useEffect(() => {
    try {
      if (endLoc && endMarkerRef.current && endMapRef.current) {
        endMarkerRef.current.setLatLng([endLoc.lat, endLoc.lon]);
        endMapRef.current.setView([endLoc.lat, endLoc.lon]);
      }
    } catch {}
  }, [endLoc]);

  // Suggestion searching
  useEffect(() => {
    const controller = new AbortController();
    const q = startQuery.trim();
    if (!q) { setStartSuggestions([]); return; }
    setIsSearchingStart(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`, { signal: controller.signal });
        const data = await res.json();
        setStartSuggestions(Array.isArray(data) ? data : []);
      } catch { setStartSuggestions([]); }
      finally { setIsSearchingStart(false); }
    }, 300);
    return () => { controller.abort(); clearTimeout(t); };
  }, [startQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const q = endQuery.trim();
    if (!q) { setEndSuggestions([]); return; }
    setIsSearchingEnd(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`, { signal: controller.signal });
        const data = await res.json();
        setEndSuggestions(Array.isArray(data) ? data : []);
      } catch { setEndSuggestions([]); }
      finally { setIsSearchingEnd(false); }
    }, 300);
    return () => { controller.abort(); clearTimeout(t); };
  }, [endQuery]);

  const setFromSuggestion = (which: "start" | "end", s: Suggestion) => {
    const lat = parseFloat(s.lat); const lon = parseFloat(s.lon);
    if (which === "start") {
      setStartQuery(s.display_name);
      setStartLoc({ lat, lon });
    } else {
      setEndQuery(s.display_name);
      setEndLoc({ lat, lon });
    }
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported on this device/browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setStartLoc({ lat, lon });
        setStartQuery(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        try {
          if (startMarkerRef.current) startMarkerRef.current.setLatLng([lat, lon]);
          if (startMapRef.current) startMapRef.current.setView([lat, lon], 14);
        } catch {}
      },
      (err) => {
        alert(`Could not get current location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };
  const canCalculate = startLoc && endLoc;

  return (
    <div className="mx-auto max-w-full sm:max-w-4xl px-3 sm:px-4 py-6 sm:py-8">
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">Distance</span>
            <h1 className="text-lg sm:text-xl font-semibold text-neutral-900">Plan between two points</h1>
          </div>
          <p className="mt-1 text-xs text-neutral-600">Enter start and end, or pick on the mini-maps below.</p>

        <div className="mt-3 mb-2 h-px w-full bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        <div className="grid grid-cols-1 gap-4">
          {/* Start */}
          <div
            className="relative"
            ref={startWrapRef}
            tabIndex={-1}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!startWrapRef.current || !next || !startWrapRef.current.contains(next)) {
              setStartSuggestions([]);
            }
          }}
        >
          <label className="mb-1 block text-sm font-medium text-neutral-800">Starting location</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
              <Input
                value={startQuery}
                onChange={(e) => { setStartQuery(e.target.value); setActiveField("start"); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setStartSuggestions([]); }}
                placeholder="Type a place or lat,lon"
                className="pl-9 rounded-xl bg-white border border-neutral-300 focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>
            <Button type="button" onClick={() => { setActiveField("start"); useCurrentLocation(); }} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
              <LocateFixed className="h-4 w-4" />
            </Button>
          </div>
          {startSuggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl bg-white border border-neutral-200 shadow-xl">
              {startSuggestions.map((s) => (
                <button key={s.place_id} type="button" className="w-full text-left px-3 py-2 hover:bg-emerald-50/90 flex items-center gap-2 transition-colors" onClick={() => setFromSuggestion("start", s)}>
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm truncate">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="relative mt-2">
            <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
              Start
            </div>
            <div ref={startMapDivRef} className="h-40 w-full rounded-xl overflow-hidden border border-neutral-200 shadow" />
          </div>
        </div>

          {/* End */}
          <div
            className="relative"
            ref={endWrapRef}
            tabIndex={-1}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!endWrapRef.current || !next || !endWrapRef.current.contains(next)) {
              setEndSuggestions([]);
            }
          }}
        >
          <label className="mb-1 block text-sm font-medium text-neutral-800">Ending location</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-600" />
              <Input
                value={endQuery}
                onChange={(e) => { setEndQuery(e.target.value); setActiveField("end"); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setEndSuggestions([]); }}
                placeholder="Type a place or lat,lon"
                className="pl-9 rounded-xl bg-white border border-neutral-300 focus-visible:ring-2 focus-visible:ring-sky-400"
              />
            </div>
          </div>
          {endSuggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl bg-white border border-neutral-200 shadow-xl">
              {endSuggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-sky-50/90 flex items-center gap-2 transition-colors"
                  onClick={() => setFromSuggestion("end", s)}
                >
                  <MapPin className="h-4 w-4 text-sky-600" />
                  <span className="text-sm truncate">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="relative mt-2">
            <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
              End
            </div>
            <div ref={endMapDivRef} className="h-40 w-full rounded-xl overflow-hidden border border-neutral-200 shadow" />
          </div>
        </div>
        </div>

        {/* spacer */}
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        {/* Calculate row */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            className="rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-lg hover:from-emerald-600 hover:to-sky-600 disabled:opacity-60"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {canCalculate ? "Calculate distance" : "Select start and end"}
          </Button>
        </div>
      </div>

      {/* End content */}
    </div>
  );
}
