"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/lib/types";
import { Loader2, MapPin, Navigation2, Search, X, Filter, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { safeFetch } from "@/lib/safe-fetch";

type GeoSuggestion = {
  name: string;
  lat: number;
  lon: number;
};

function InitialsAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = (name || "?").trim().split(/\s+/);
    const s = (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
    return s || "?";
  }, [name]);
  return (
    <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center font-semibold">
      {initials}
    </div>
  );
}

// Lazy react-leaflet components for the filter map (no SSR)
const RL = {
  MapContainer: dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false }),
  TileLayer: dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false }),
  Marker: dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false }),
  Polyline: dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false }),
} as const;

const ClickCatcher = dynamic(() => import("@/components/map/ClickCatcher"), { ssr: false });
const FitToCenter = dynamic(() => import("@/components/map/FitToCenter"), { ssr: false });

export default function AISelectionPage() {
  return (
    <Suspense fallback={<div style={{ height: 2 }} /> }>
      <AISelectionInner />
    </Suspense>
  );
}

function AISelectionInner() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [startSuggestions, setStartSuggestions] = useState<GeoSuggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<GeoSuggestion[]>([]);
  const [startSuggestOpen, setStartSuggestOpen] = useState(false);
  const [endSuggestOpen, setEndSuggestOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  // Search UI state
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [startCoord, setStartCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [endCoord, setEndCoord] = useState<{ lat: number; lon: number } | null>(null);
  const startDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStartQuery = useRef("");
  const latestEndQuery = useRef("");
  const router = useRouter();

  // Filter helpers
  const filteredPlaces = useMemo(() => {
    if (!searchQuery) return places;
    const q = searchQuery.toLowerCase();
    return places.filter((p) => {
      const name = (p.tags?.name || (p as any)?.name || "").toString().toLowerCase();
      const area = (p.area || p.tags?.description || "").toString().toLowerCase();
      return name.includes(q) || area.includes(q);
    });
  }, [places, searchQuery]);

  const filteredRoutePlaces = useMemo(() => {
    if (!searchQuery) return routePlaces;
    const q = searchQuery.toLowerCase();
    return routePlaces.filter((p) => {
      const name = (p.tags?.name || (p as any)?.name || "").toString().toLowerCase();
      const area = (p.area || p.tags?.description || "").toString().toLowerCase();
      return name.includes(q) || area.includes(q);
    });
  }, [routePlaces, searchQuery]);

  // Filter popup open
  const [filterOpen, setFilterOpen] = useState(false);
  const [activePin, setActivePin] = useState<'start' | 'end'>('start');
  const [mapKey, setMapKey] = useState<string>("");

  const useCurrentLocation = () => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setStartCoord({ lat, lon });
        setStartLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        setActivePin('start');
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Parse "lat, lon" text into coords
  const parseLatLon = (text: string): { lat: number; lon: number } | null => {
    const m = text.trim().match(/^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
    if (!m) return null;
    const lat = Number.parseFloat(m[1]);
    const lon = Number.parseFloat(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
    return null;
  };

  // Debounced geocode of inputs to update map markers
  const startGeoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endGeoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parsed = parseLatLon(startLocation);
    if (parsed) {
      setStartCoord(parsed);
      return;
    }
    if (startGeoDebounce.current) clearTimeout(startGeoDebounce.current);
    const q = startLocation.trim();
    if (q.length < 3) return;
    startGeoDebounce.current = setTimeout(async () => {
      const coords = await geocodeLocation(q);
      if (coords) setStartCoord(coords);
    }, 700);
  }, [startLocation]);

  useEffect(() => {
    const parsed = parseLatLon(endLocation);
    if (parsed) {
      setEndCoord(parsed);
      return;
    }
    if (endGeoDebounce.current) clearTimeout(endGeoDebounce.current);
    const q = endLocation.trim();
    if (q.length < 3) return;
    endGeoDebounce.current = setTimeout(async () => {
      const coords = await geocodeLocation(q);
      if (coords) setEndCoord(coords);
    }, 700);
  }, [endLocation]);

  // Geocoding helpers for start/end within popup
  const geoFetch = async (q: string) => {
    if (!q || q.trim().length < 3) return [] as GeoSuggestion[];
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=0`;
    const res = await safeFetch(url, { headers: { 'Accept': 'application/json' } }, { retries: 2, timeoutMs: 8000 });
    const arr = await res.json();
    return (Array.isArray(arr) ? arr : []).map((it: any) => ({ name: it.display_name, lat: parseFloat(it.lat), lon: parseFloat(it.lon) })) as GeoSuggestion[];
  };

  // Handlers are defined later in the file to avoid duplicate declarations

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Focus the search input when opened
  useEffect(() => {
    if (searchOpen) {
      const id = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [searchOpen]);

  // Ensure leaflet map mounts fresh in modal open
  useEffect(() => {
    if (filterOpen) setMapKey(Date.now().toString(36));
  }, [filterOpen]);

  // When modal opens, ensure a Start marker shows: prefer existing text -> geocode once; else geolocate
  useEffect(() => {
    const init = async () => {
      if (!filterOpen) return;
      if (!startCoord) {
        if (startLocation && startLocation.trim().length >= 3) {
          const coords = await geocodeLocation(startLocation.trim());
          if (coords) setStartCoord(coords);
        } else if (navigator?.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lon = pos.coords.longitude;
              setStartCoord({ lat, lon });
              if (!startLocation) setStartLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      }
    };
    init();
  }, [filterOpen]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Try user's places first, else fallback to all (request larger limit)
        let res = await safeFetch("/api/places?mine=1&limit=1000", { cache: "no-store" }, { retries: 2, timeoutMs: 10000 });
        let data = await res.json();
        let list: Place[] = (res.ok && data?.ok && Array.isArray(data.places)) ? data.places : [];
        if (list.length === 0) {
          res = await safeFetch("/api/places?limit=1000", { cache: "no-store" }, { retries: 2, timeoutMs: 10000 });
          data = await res.json();
          list = (res.ok && data?.ok && Array.isArray(data.places)) ? data.places : [];
        }
        setPlaces(list);
      } catch (e: any) {
        setError("Failed to load places");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (startLocation && endLocation) {
      fetchRoutePlaces();
    } else {
      setRoutePlaces([]);
      setRouteError(null);
      setAutoMode(false);
      setSelected({});
      setStartCoord(null);
      setEndCoord(null);
    }
  }, [startLocation, endLocation]);

  const fetchRoutePlaces = async () => {
    console.log("Fetching route places for:", startLocation, endLocation);
    setRouteLoading(true);
    setRouteError(null);
    try {
      const startCoords = await geocodeLocation(startLocation);
      const endCoords = await geocodeLocation(endLocation);
      console.log("Coordinates:", startCoords, endCoords);
      if (!startCoords || !endCoords) {
        setRouteError("Could not resolve locations.");
        setRoutePlaces([]);
        setSelected({});
        setStartCoord(null);
        setEndCoord(null);
        return;
      }
      setStartCoord(startCoords);
      setEndCoord(endCoords);
      // Prefetch bounding box sized to ~2.5km lateral buffer (convert meters to degrees)
      const bufferMeters = 2500;
      const metersPerDegLat = 111_000; // approx
      const degLat = bufferMeters / metersPerDegLat;
      const meanLat = (startCoords.lat + endCoords.lat) / 2;
      const metersPerDegLon = Math.cos((meanLat * Math.PI) / 180) * metersPerDegLat;
      const degLon = bufferMeters / Math.max(1e-6, metersPerDegLon);
      const fromLat = Math.min(startCoords.lat, endCoords.lat) - degLat;
      const toLat = Math.max(startCoords.lat, endCoords.lat) + degLat;
      const fromLon = Math.min(startCoords.lon, endCoords.lon) - degLon;
      const toLon = Math.max(startCoords.lon, endCoords.lon) + degLon;
      console.log("Bounding box:", fromLat, fromLon, toLat, toLon);
      const res = await safeFetch(`/api/places/between?fromLat=${fromLat}&fromLon=${fromLon}&toLat=${toLat}&toLon=${toLon}`, {}, { retries: 2, timeoutMs: 12000 });
      const data = await res.json();
      console.log("API response:", data);
      if (data.places && Array.isArray(data.places)) {
        const R = 6371000;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const haversineMeters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
          const dLat = toRad(b.lat - a.lat);
          const dLon = toRad(b.lon - a.lon);
          const lat1 = toRad(a.lat);
          const lat2 = toRad(b.lat);
          const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
          return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        };
        const latRef = toRad((startCoords.lat + endCoords.lat) / 2);
        const toXY = (loc: { lat: number; lon: number }) => ({
          x: R * toRad(loc.lon) * Math.cos(latRef),
          y: R * toRad(loc.lat),
        });
        const startXY = toXY(startCoords);
        const endXY = toXY(endCoords);
        const distanceToSegment = (loc: { lat: number; lon: number }) => {
          const point = toXY(loc);
          const dx = endXY.x - startXY.x;
          const dy = endXY.y - startXY.y;
          if (dx === 0 && dy === 0) {
            return Math.hypot(point.x - startXY.x, point.y - startXY.y);
          }
          const t = Math.max(0, Math.min(1, ((point.x - startXY.x) * dx + (point.y - startXY.y) * dy) / (dx * dx + dy * dy)));
          const projX = startXY.x + t * dx;
          const projY = startXY.y + t * dy;
          return Math.hypot(point.x - projX, point.y - projY);
        };
        const extractCoords = (place: any): { lat: number; lon: number } | null => {
          // direct lat/lon numbers
          if (typeof place.lat === 'number' && typeof place.lon === 'number') {
            if (Math.abs(place.lat) <= 90 && Math.abs(place.lon) <= 180) return { lat: place.lat, lon: place.lon };
          }
          // common shapes
          if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
            if (Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180) return { lat: place.latitude, lon: place.longitude };
          }
          // WKT POINT(lon lat)
          if (typeof place.location === 'string') {
            const s = place.location.trim();
            const wkt = s.match(/^POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)$/i);
            if (wkt) {
              const lon = Number.parseFloat(wkt[1]);
              const lat = Number.parseFloat(wkt[2]);
              if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
            }
            // CSV pair, try both orders
            if (s.includes(',')) {
              const [a, b] = s.split(',').map((t: string) => t.trim());
              const n1 = Number.parseFloat(a);
              const n2 = Number.parseFloat(b);
              if (Number.isFinite(n1) && Number.isFinite(n2)) {
                // prefer lat,lon when valid; else lon,lat
                if (Math.abs(n1) <= 90 && Math.abs(n2) <= 180) return { lat: n1, lon: n2 };
                if (Math.abs(n2) <= 90 && Math.abs(n1) <= 180) return { lat: n2, lon: n1 };
              }
            }
          }
          return null;
        };
        const filtered: Place[] = data.places
          .filter((raw: any) => {
            const coords = extractCoords(raw);
            if (!coords) return false;
            // quick bbox prefilter
            if (
              coords.lat < fromLat || coords.lat > toLat ||
              coords.lon < fromLon || coords.lon > toLon
            ) return false;
            const distSegment = distanceToSegment(coords);
            return distSegment <= 2500; // strictly within 2.5km of the straight route line
          });

        if (filtered.length === 0) {
          setRoutePlaces([]);
          setSelected({});
          setAutoMode(false);
          return;
        }

        setRoutePlaces(filtered);
        // Auto-select these places
        const nextSelection: Record<number, boolean> = {};
        filtered.forEach((p: any) => {
          const numericId = typeof p.id === 'number' ? p.id : Number.parseInt(String(p.id), 10);
          if (Number.isFinite(numericId)) nextSelection[numericId] = true;
        });
        setSelected(nextSelection);
        setAutoMode(true);
      } else {
        setRoutePlaces([]);
        setSelected({});
        setAutoMode(false);
      }
    } catch (err) {
      console.error("Error fetching route places:", err);
      setRouteError("Failed to fetch route places.");
      setRoutePlaces([]);
      setSelected({});
      setAutoMode(false);
      setStartCoord(null);
      setEndCoord(null);
    } finally {
      setRouteLoading(false);
    }
  };

  const geocodeLocation = async (location: string): Promise<{ lat: number; lon: number } | null> => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
    const res = await safeFetch(url, { headers: { "Accept-Language": "en" } }, { retries: 2, timeoutMs: 8000 });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      return { lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
    }
    return null;
  };

  const fetchGeoSuggestions = async (query: string): Promise<GeoSuggestion[]> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=0&limit=6`;
      const res = await safeFetch(url, { headers: { "Accept-Language": "en" } }, { retries: 2, timeoutMs: 8000 });
      const data = await res.json();
      if (Array.isArray(data)) {
        return data
          .map((entry: any) => ({
            name: String(entry.display_name || ""),
            lat: Number.parseFloat(entry.lat),
            lon: Number.parseFloat(entry.lon),
          }))
          .filter((item) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lon));
      }
    } catch {}
    return [];
  };

  const scheduleStartSuggestions = (value: string) => {
    const trimmed = value.trim();
    latestStartQuery.current = trimmed;
    if (startDebounce.current) clearTimeout(startDebounce.current);
    if (trimmed.length < 3) {
      setStartSuggestions([]);
      setStartSuggestOpen(false);
      return;
    }
    startDebounce.current = setTimeout(async () => {
      const suggestions = await fetchGeoSuggestions(trimmed);
      if (latestStartQuery.current !== trimmed) return;
      setStartSuggestions(suggestions);
      setStartSuggestOpen(suggestions.length > 0);
    }, 250);
  };

  const scheduleEndSuggestions = (value: string) => {
    const trimmed = value.trim();
    latestEndQuery.current = trimmed;
    if (endDebounce.current) clearTimeout(endDebounce.current);
    if (trimmed.length < 3) {
      setEndSuggestions([]);
      setEndSuggestOpen(false);
      return;
    }
    endDebounce.current = setTimeout(async () => {
      const suggestions = await fetchGeoSuggestions(trimmed);
      if (latestEndQuery.current !== trimmed) return;
      setEndSuggestions(suggestions);
      setEndSuggestOpen(suggestions.length > 0);
    }, 250);
  };

  const handleStartChange = (value: string) => {
    setStartLocation(value);
    scheduleStartSuggestions(value);
  };

  const handleEndChange = (value: string) => {
    setEndLocation(value);
    scheduleEndSuggestions(value);
  };

  const handleStartPick = (suggestion: GeoSuggestion) => {
    setStartLocation(suggestion.name);
    setStartSuggestions([]);
    setStartSuggestOpen(false);
  };

  const handleEndPick = (suggestion: GeoSuggestion) => {
    setEndLocation(suggestion.name);
    setEndSuggestions([]);
    setEndSuggestOpen(false);
  };
  const toggleSelection = (id: number) => {
    if (!Number.isFinite(id)) return;
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    if (autoMode) setAutoMode(false);
  };
  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const routeSelectedIds = useMemo(() => {
    return routePlaces.reduce<number[]>((acc, p) => {
      const numericId = typeof p.id === 'number' ? p.id : Number.parseInt(String(p.id), 10);
      if (Number.isFinite(numericId) && selected[numericId]) acc.push(numericId);
      return acc;
    }, []);
  }, [routePlaces, selected]);
  const routeContinueUrl = useMemo(() => {
    if (routeSelectedIds.length === 0) return null;
    const params = new URLSearchParams();
    params.set('plan', routeSelectedIds.join(','));
    if (startCoord) {
      params.set('fromLat', String(startCoord.lat));
      params.set('fromLon', String(startCoord.lon));
    }
    if (endCoord) {
      params.set('toLat', String(endCoord.lat));
      params.set('toLon', String(endCoord.lon));
    }
    params.set('route', 'chain');
    return `/dashboard/map?${params.toString()}`;
  }, [routeSelectedIds, startCoord, endCoord]);
  const showManualFallback = useMemo(() => {
    if (!startLocation || !endLocation) return true;
    if (routeError) return true;
    if (!routeLoading && routePlaces.length === 0) return true;
    return false;
  }, [startLocation, endLocation, routeError, routeLoading, routePlaces.length]);

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] bg-white overflow-x-hidden box-border" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }}>
      {/* Full-viewport background to eliminate right-side strip on mobile */}
      <div className="fixed inset-0 bg-white -z-10" />
      {/* Global fallback to ensure body/html background is white on very small screens (e.g., iPhone SE) */}
      <style jsx global>{`
        @media (max-width: 380px) {
          html, body, body > div:first-child, #__next, #__next > div {
            background-color: #ffffff !important;
          }
        }
      `}</style>
      <div className="max-w-full sm:max-w-4xl px-3 sm:px-4 py-6 sm:py-8 sm:mx-auto">
        <div
          className="origin-top-left sm:origin-top scale-[0.73] sm:scale-100"
          style={{
            width: isMobile ? 'calc(100% / 0.73)' : '100%',
            minWidth: isMobile ? 'calc(100% / 0.73)' : '100%',
            transformOrigin: 'top left'
          }}
        >
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Choose Places</h1>
                <p className="text-sm sm:text-base text-neutral-600">Select from your saved places to continue planning with AI.</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFilterOpen(true); }}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
                aria-label="Open filters"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>
          {routeLoading && (
            <div className="mb-4 sm:mb-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm w-full">
              <div className="flex items-center gap-3 text-sm text-neutral-700">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                Creating route and finding pandals within 5 KM…
              </div>
            </div>
          )}
          {!routeLoading && startLocation && endLocation && routePlaces.length === 0 && (
            <div className="mb-4 sm:mb-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm w-full">
              <div className="text-sm text-neutral-700">Pandel not found within 5 KM of the route.</div>
            </div>
          )}
          {/* Start/End inputs removed on request */}
          {/* Route Matches (within 5KM) */}
          {routePlaces.length > 0 && (
            <div className="mb-4 sm:mb-6 rounded-2xl border border-neutral-200 bg-white/95 p-4 sm:p-5 shadow-sm backdrop-blur w-full">
              <div className="mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Route Matches</h3>
                <p className="text-xs sm:text-sm text-neutral-600">Found along your route within 5 KM.</p>
              </div>
              <div className="grid gap-3">
                {routePlaces.map((p) => {
                  const numericId = typeof p.id === 'number' ? p.id : Number.parseInt(String(p.id), 10);
                  if (!Number.isFinite(numericId)) return null;
                  const name = p.tags?.name || (p as any)?.name || `Place #${p.id}`;
                  const img = p.photos?.[0]?.preview;
                  const area = p.area || p.tags?.description || "No area available";
                  const isSelected = !!selected[numericId];
                  return (
                    <button
                      key={`route-mini-${p.id}`}
                      type="button"
                      onClick={() => toggleSelection(numericId)}
                      className={`flex w-full items-center gap-3 sm:gap-4 rounded-2xl p-3 sm:p-4 border ring-2 text-left transition-shadow ${
                        isSelected ? 'bg-emerald-50 border-emerald-300 ring-emerald-200 shadow-sm' : 'bg-white border-neutral-200 ring-transparent hover:shadow'
                      }`}
                    >
                      {img ? (
                        <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-xl bg-neutral-100">
                          <Image
                            src={img}
                            alt={name}
                            fill
                            unoptimized
                            sizes="48px"
                            className="object-cover"
                            priority={false}
                          />
                        </div>
                      ) : (
                        <InitialsAvatar name={name} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-neutral-900 font-semibold truncate text-sm sm:text-base">{name}</div>
                        <div className="text-xs sm:text-sm text-neutral-600 truncate">{area}</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {isSelected ? 'Selected' : 'Tap to select'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm ${
                    anySelected ? 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50' : 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                  onClick={() => setSelected({})}
                  disabled={!anySelected}
                >
                  Clear
                </button>
                {routeContinueUrl && (
                  <Link href={routeContinueUrl as any} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow bg-emerald-600 text-white">
                    Continue ({routeSelectedIds.length})
                  </Link>
                )}
              </div>
            </div>
          )}
          {showManualFallback && (
            <>
              {/* Search bar placed directly above manual list */}
              <div className="mb-3">
                <div className="flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-2 bg-white">
                  <Search className="h-4 w-4 text-neutral-600" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search places..."
                    className="h-8 flex-1 border-0 focus-visible:ring-0 px-0 bg-transparent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="inline-flex items-center justify-center rounded-full h-8 w-8 border border-neutral-200 hover:bg-neutral-50"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="text-sm text-neutral-600">Loading…</div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : places.length === 0 ? (
                <div className="text-sm text-neutral-600">No places found.</div>
              ) : (
                <div className="grid gap-3">
                  {filteredPlaces.map((p) => {
                    const name = p.tags?.name || (p as any)?.name || `Place #${p.id}`;
                    const img = p.photos?.[0]?.preview;
                    const isSel = !!selected[p.id];
                    return (
                      <label
                        key={p.id}
                        className={`flex w-full items-center gap-3 sm:gap-4 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer touch-manipulation min-h-[64px] border ring-2 ${
                          isSel ? 'bg-emerald-50 border-emerald-300 ring-emerald-200' : 'bg-white border-neutral-200 ring-transparent'
                        }`}
                        onClick={() => toggleSelection(p.id)}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSel}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelection(p.id); } }}
                      >
                        {/* Left: image or initials */}
                        {img ? (
                          <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-xl bg-neutral-100">
                            <Image
                              src={img}
                              alt={name}
                              fill
                              unoptimized
                              sizes="48px"
                              className="object-cover"
                              priority={false}
                            />
                          </div>
                        ) : (
                          <InitialsAvatar name={name} />
                        )}

                        {/* Middle: name + area */}
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-900 font-semibold truncate text-sm sm:text-base">{name}</div>
                          {p.area ? (
                            <div className="text-xs sm:text-sm text-neutral-600 truncate">{p.area}</div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Desktop action row */}
              <div className="mt-6 hidden sm:flex items-center justify-between">
                <button
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm ${
                    anySelected
                      ? "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                      : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  }`}
                  onClick={() => setSelected({})}
                  disabled={!anySelected}
                >
                  Clear
                </button>

                <div className="flex items-center gap-3">
                {(() => {
                  const chosenIds = places.filter(p => !!selected[p.id]).map(p => p.id);
                  const plan = chosenIds.join(',');
                  const url = plan ? `/dashboard/map?plan=${encodeURIComponent(plan)}` : "/ai/continue";
                  return (
                    <Link href={url} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow bg-emerald-600 text-white">
                      {anySelected ? `Continue (${selectedCount})` : 'Continue'}
                    </Link>
                  );
                })()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Mobile sticky action bar */}
      {(!startLocation || !endLocation) && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[2100] overflow-hidden">
          <div
            className="w-full origin-bottom-left scale-[0.73] bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border-t border-black/10 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]"
            style={{
              width: isMobile ? 'calc(100% / 0.73)' : '100%',
              paddingLeft: 'max(0.75rem, calc(env(safe-area-inset-left, 0px) + 0.75rem))',
              paddingRight: 'max(0.75rem, calc(env(safe-area-inset-right, 0px) + 0.75rem))',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
              transformOrigin: 'left bottom',
            }}
          >
            <div className="mx-auto max-w-full sm:max-w-4xl pb-4">
              <div className="mb-2 h-0.5 w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow ${
                    anySelected
                      ? "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                      : "border border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  }`}
                  onClick={() => setSelected({})}
                  disabled={!anySelected}
                >
                  Clear
                </button>
                <div className="col-span-1 flex items-center justify-end gap-2">
                {(() => {
                  const chosenIds = places.filter(p => !!selected[p.id]).map(p => p.id);
                  const plan = chosenIds.join(',');
                  const url = plan ? `/dashboard/map?plan=${encodeURIComponent(plan)}` : "/ai/continue";
                  return (
                    <Link href={url} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow bg-emerald-600 text-white">
                      {anySelected ? `Continue (${selectedCount})` : 'Continue'}
                    </Link>
                  );
                })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Filters Modal */}
      {filterOpen && (
        <div className="fixed inset-0 z-[5000]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) setFilterOpen(false); }}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-16 sm:top-24 w-[calc(100%-24px)] sm:w-[520px] rounded-2xl bg-white shadow-xl border border-black/10 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Filter by route</h3>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-200 hover:bg-neutral-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Start location</span>
                <div className="relative w-full">
                  <div className="group flex items-center gap-3 rounded-2xl border border-emerald-300 bg-white px-3 py-2.5 shadow-sm focus-within:border-emerald-600 focus-within:shadow-lg transition w-full">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <Input
                      value={startLocation}
                      onChange={(e) => handleStartChange(e.target.value)}
                      onFocus={() => { setActivePin('start'); if (startSuggestions.length > 0) setStartSuggestOpen(true); }}
                      onBlur={() => setTimeout(() => setStartSuggestOpen(false), 120)}
                      placeholder="Search or drop a pin"
                      className="h-11 flex-1 rounded-2xl border-0 bg-transparent px-0 text-sm sm:text-base placeholder:text-neutral-500 text-neutral-900 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-neutral-200 hover:bg-neutral-50"
                      title="Use current location"
                      aria-label="Use current location"
                    >
                      <LocateFixed className="h-4 w-4 text-neutral-700" />
                    </button>
                  </div>
                  {startSuggestOpen && startSuggestions.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-auto rounded-2xl border border-emerald-200 bg-white shadow-lg">
                      {startSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-emerald-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleStartPick(suggestion)}
                        >
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">End location</span>
                <div className="relative w-full">
                  <div className="group flex items-center gap-3 rounded-2xl border border-sky-300 bg-white px-3 py-2.5 shadow-sm focus-within:border-sky-600 focus-within:shadow-lg transition w-full">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">
                      <Navigation2 className="h-4 w-4" />
                    </span>
                    <Input
                      value={endLocation}
                      onChange={(e) => handleEndChange(e.target.value)}
                      onFocus={() => { setActivePin('end'); if (endSuggestions.length > 0) setEndSuggestOpen(true); }}
                      onBlur={() => setTimeout(() => setEndSuggestOpen(false), 120)}
                      placeholder="Where do you want to go?"
                      className="h-11 flex-1 rounded-2xl border-0 bg-transparent px-0 text-sm sm:text-base placeholder:text-neutral-500 text-neutral-900 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  {endSuggestOpen && endSuggestions.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-auto rounded-2xl border border-sky-200 bg-white shadow-lg">
                      {endSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-sky-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleEndPick(suggestion)}
                        >
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Small map to pick Start/End by tapping */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-600">Set pin:</span>
                  <button
                    type="button"
                    onClick={() => setActivePin('start')}
                    className={`px-3 py-1 text-xs rounded-full border ${activePin==='start' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-neutral-300 text-neutral-700'}`}
                  >Start</button>
                  <button
                    type="button"
                    onClick={() => setActivePin('end')}
                    className={`px-3 py-1 text-xs rounded-full border ${activePin==='end' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-white border-neutral-300 text-neutral-700'}`}
                  >End</button>
                </div>
                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  {filterOpen && (
                    <RL.MapContainer
                      key={mapKey}
                      center={[startCoord?.lat || endCoord?.lat || 22.5726, startCoord?.lon || endCoord?.lon || 88.3639]}
                      zoom={12}
                      style={{ height: 220, width: '100%' }}
                    >
                      <FitToCenter center={activePin === 'start' ? startCoord : endCoord} />
                      <ClickCatcher onClick={(e: any) => {
                        const lat = e?.latlng?.lat;
                        const lon = e?.latlng?.lng;
                        if (typeof lat === 'number' && typeof lon === 'number') {
                          if (activePin === 'start') {
                            setStartCoord({ lat, lon });
                            setStartLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
                          } else {
                            setEndCoord({ lat, lon });
                            setEndLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
                          }
                        }
                      }} />
                      <RL.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                      {startCoord && <RL.Marker position={[startCoord.lat, startCoord.lon]} />}
                      {endCoord && <RL.Marker position={[endCoord.lat, endCoord.lon]} />}
                      {startCoord && endCoord && (
                        <RL.Polyline
                          positions={[[startCoord.lat, startCoord.lon], [endCoord.lat, endCoord.lon]] as any}
                          pathOptions={{ color: 'red', weight: 3, opacity: 0.9, dashArray: '4 6' } as any}
                        />
                      )}
                    </RL.MapContainer>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border border-neutral-300 bg-white hover:bg-neutral-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => { if (startLocation && endLocation) { fetchRoutePlaces(); setFilterOpen(false); } }}
                  disabled={!startLocation || !endLocation}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow ${(!startLocation || !endLocation) ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
