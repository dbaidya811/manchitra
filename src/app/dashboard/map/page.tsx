"use client";

import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AnimatedSearch } from "@/components/dashboard/animated-search";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const RL = {
  MapContainer: dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false }),
  TileLayer: dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false }),
  CircleMarker: dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false }),
  Polyline: dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false }),
  Marker: dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false }),
  Tooltip: dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false }),
  Circle: dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false }),
} as const;

// Leaflet CSS is already provided via a <link> tag in src/app/layout.tsx
import { Loader } from "@/components/ui/loader";

export default function DashboardMapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dest, setDest] = useState<{ lat: number; lon: number } | null>(null);
  const [center, setCenter] = useState<[number, number]>([22.5726, 88.3639]);
  const [zoom, setZoom] = useState<number>(12);
  const [mounted, setMounted] = useState(false);
  const [mapKey, setMapKey] = useState<string>("");
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [startPos, setStartPos] = useState<{ lat: number; lon: number } | null>(null);
  const [browsePos, setBrowsePos] = useState<{ lat: number; lon: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  // Route visualization split
  const [routeAheadCoords, setRouteAheadCoords] = useState<Array<[number, number]>>([]);
  const [routePastCoords, setRoutePastCoords] = useState<Array<[number, number]>>([]);
  const [projPointOnRoute, setProjPointOnRoute] = useState<[number, number] | null>(null);
  const [routeBearingDeg, setRouteBearingDeg] = useState<number | null>(null);
  const [routing, setRouting] = useState<boolean>(false);
  const [liveUpdate] = useState<boolean>(true);
  const [destIcon, setDestIcon] = useState<any>(null);
  const [myPlaceIcon, setMyPlaceIcon] = useState<any>(null);
  const [otherPlaceIcon, setOtherPlaceIcon] = useState<any>(null);
  const [autoRouted, setAutoRouted] = useState(false);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeSteps, setRouteSteps] = useState<Array<{ text: string; type?: string; modifier?: string; location?: [number, number]; distance?: number }>>([]);
  // Track current active step index for UI highlighting/auto-scroll
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const stepsListRef = useRef<HTMLOListElement | null>(null);
  const [poiMarkers, setPoiMarkers] = useState<Array<{ id: string | number; lat: number; lon: number; title?: string; userEmail?: string | null }>>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [journeyCompleted, setJourneyCompleted] = useState<boolean>(false);
  const [showOffRouteScreen, setShowOffRouteScreen] = useState<boolean>(false);
  // Heading-up toggle
  const [headingUp, setHeadingUp] = useState<boolean>(true);
  // Voice guidance
  const [voiceOn, setVoiceOn] = useState<boolean>(false);
  const currentStepIdxRef = useRef<number>(0);
  const spokenRef = useRef<Record<number, { pre?: boolean; final?: boolean }>>({});
  // Show a clear warning when user goes off the planned route
  const [showWrongRoute, setShowWrongRoute] = useState<boolean>(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Routing control refs
  const routeAbortRef = useRef<AbortController | null>(null);
  const lastRouteAtRef = useRef<number>(0);
  const geoWatchRef = useRef<number | null>(null);
  // Reroute throttling helpers
  const lastReroutePosRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastRerouteTimeRef = useRef<number>(0);
  // Draggable, collapsible panel state
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [showRoutePreview, setShowRoutePreview] = useState<boolean>(false);
  // Auto-collapse route preview once per route session
  const panelAutoCollapsedRef = useRef<boolean>(false);
  // Inline route preview inside the green banner
  const [bannerDetailsOpen, setBannerDetailsOpen] = useState<boolean>(false);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 16, y: 120 });
  const [dragging, setDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Compass heading
  const [orientationHandler, setOrientationHandler] = useState<((e: DeviceOrientationEvent) => void) | null>(null);
  // Multi-stop plan from /ai (serial per-leg routing in selection order)
  const [planStops, setPlanStops] = useState<Array<{ id: number; name: string; lat: number; lon: number }>>([]);
  const [planIdx, setPlanIdx] = useState<number>(0);
  const [orderedPlanStops, setOrderedPlanStops] = useState<Array<{ id: number; name: string; lat: number; lon: number }>>([]);
  const [snappedOrderedPlanStops, setSnappedOrderedPlanStops] = useState<Array<{ id: number; name: string; lat: number; lon: number }>>([]);
  const selectedPlanIdSet = useMemo(() => new Set(orderedPlanStops.map(s => s.id)), [orderedPlanStops]);
  // Background connectors between consecutive stops (1->2, 2->3, ...)
  const [stopConnectors, setStopConnectors] = useState<Array<Array<[number, number]>>>([]);

  useEffect(() => {
    // Defer mount to avoid Leaflet double init in StrictMode/HMR
    setMounted(true);
    const id = requestAnimationFrame(() => setMapKey(Date.now().toString(36) + Math.random().toString(36).slice(2)));
    return () => cancelAnimationFrame(id);
  }, []);

  // Enable compass when component mounts
  useEffect(() => {
    const enableCompass = async () => {
      try {
        const hasDO = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
        if (!hasDO) return;
        
        const anyDO: any = (window as any).DeviceOrientationEvent;
        if (anyDO && typeof anyDO.requestPermission === 'function') {
          try {
            const perm = await anyDO.requestPermission();
            if (perm !== 'granted') return;
          } catch (_) {
            return;
          }
        }
        
        const handler = (e: DeviceOrientationEvent) => {
          let heading: number | null = null as any;
          const webkitHeading = (e as any).webkitCompassHeading;
          if (typeof webkitHeading === 'number') {
            heading = webkitHeading;
          } else if (typeof e.alpha === 'number') {
            const screenAngle = (screen.orientation && typeof screen.orientation.angle === 'number')
              ? screen.orientation.angle
              : (window as any).orientation || 0;
            heading = (360 - e.alpha + (screenAngle || 0)) % 360;
          }
          if (heading != null && !Number.isNaN(heading)) {
            setUserHeading(prevH => {
              if (prevH == null) return heading!;
              const alpha = 0.25;
              let diff = ((heading! - prevH + 540) % 360) - 180;
              return (prevH + alpha * diff + 360) % 360;
            });
          }
        };

  // Wrong route warning controller
  useEffect(() => {
    try {
      if (routeCoords.length === 0 || !userPos) { setShowWrongRoute(false); return; }
      if (!onRoute && offRouteMeters > 30) {
        setShowWrongRoute(true);
        if (voiceOn) speak('You are off route');
      } else {
        setShowWrongRoute(false);
      }
    } catch {}
  }, [onRoute, offRouteMeters, routeCoords.length, userPos, voiceOn]);
  
  // Speech synthesis helper (top-level)
  const speak = (text: string) => {
    try {
      if (!voiceOn) return;
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.15; // slightly higher pitch for a more feminine tone
      utter.lang = 'en-US';
      if (voiceRef.current) utter.voice = voiceRef.current;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  // Load voices and prefer a female-sounding one
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) return;
      // Heuristic preference order by common female voice names
      const preferred = [
        'Google US English',
        'Google UK English Female',
        'Microsoft Zira',
        'Microsoft Aria',
        'Samantha',
        'Victoria',
        'Veena',
      ];
      // Try exact preferred
      for (const name of preferred) {
        const v = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()) && v.lang.toLowerCase().startsWith('en'));
        if (v) { voiceRef.current = v; return; }
      }
      // Try any English voice with female-ish name keywords
      const femaleKeywords = ['female', 'zira', 'aria', 'samantha', 'victoria', 'jenny', 'linda'];
      const v2 = voices.find(v => v.lang.toLowerCase().startsWith('en') && femaleKeywords.some(k => v.name.toLowerCase().includes(k)));
      if (v2) { voiceRef.current = v2; return; }
      // Fallback: first English voice
      const v3 = voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (v3) voiceRef.current = v3;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = () => pickVoice();
    return () => {
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null as any;
      }
    };
  }, []);

  // Turn-by-turn voice: monitor distance to next maneuver and speak
  useEffect(() => {
    if (!voiceOn) return;
    if (!userPos || routeSteps.length === 0) return;
    let idx = currentStepIdxRef.current;
    if (idx >= routeSteps.length) return;
    const step = routeSteps[idx];
    if (!step?.location) return;
    const d = haversine([userPos.lat, userPos.lon], step.location);
    const rec = spokenRef.current[idx] || {};
    // Pre-alert around 100m
    if (!rec.pre && d <= 120 && d > 35) {
      const turn = step.modifier ? step.modifier.toLowerCase() : '';
      if (step.type && step.type.toLowerCase().includes('arrive')) {
        speak('In one hundred meters, you will arrive at your destination.');
      } else if (turn) {
        speak(`In one hundred meters, turn ${turn}.`);
      } else {
        speak('In one hundred meters, continue.');
      }
      spokenRef.current[idx] = { ...rec, pre: true };
    }
    // Final alert close to maneuver
    if (!rec.final && d <= 25) {
      const turn = step.modifier ? step.modifier.toLowerCase() : '';
      if (step.type && step.type.toLowerCase().includes('arrive')) {
        speak('You have arrived at your destination.');
      } else if (turn) {
        speak(`Turn ${turn} now.`);
      } else {
        speak('Proceed.');
      }
      spokenRef.current[idx] = { ...rec, final: true };
      const nextIdx = Math.min(idx + 1, routeSteps.length);
      currentStepIdxRef.current = nextIdx;
      setCurrentStepIdx(nextIdx);
    }
  }, [userPos, routeSteps, voiceOn]);

  // Auto-scroll the active step into view within the steps list
  useEffect(() => {
    try {
      const list = stepsListRef.current;
      if (!list) return;
      const child = list.children?.[currentStepIdx] as HTMLElement | undefined;
      if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {}
  }, [currentStepIdx, routeSteps.length]);
        
        window.addEventListener('deviceorientation', handler as any, { passive: true } as any);
        setOrientationHandler(() => handler);
      } catch (_) {
        // Silently fail if compass can't be enabled
      }
    };
    
    enableCompass();
    
    return () => {
      if (orientationHandler) {
        window.removeEventListener('deviceorientation', orientationHandler as any);
      }
    };
  }, []);

  // Auto-center to user's current location when page opens
  useEffect(() => {
    if (!mounted) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserPos(me);
        setCenter([me.lat, me.lon]);
        setZoom(16);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [mounted]);

  // Load multi-stop plan from query (?plan=1,2,3)
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (!plan) return;
    const ids = plan.split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
    if (ids.length === 0) return;
    (async () => {
      try {
        const res = await fetch('/api/places', { cache: 'no-store' });
        const data = await res.json();
        const list: any[] = Array.isArray(data?.places) ? data.places : [];
        const toCoords = (p: any): { lat: number | null; lon: number | null } => {
          if (typeof p.lat === 'number' && typeof p.lon === 'number') return { lat: p.lat, lon: p.lon };
          if (typeof p.location === 'string' && p.location.includes(',')) {
            const parts = p.location.split(',').map((s: string) => s.trim());
            const a = parseFloat(parts[0] || '');
            const b = parseFloat(parts[1] || '');
            if (!Number.isNaN(a) && !Number.isNaN(b)) {
              if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
              if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { lat: b, lon: a };
            }
          }
          return { lat: null, lon: null };
        };
        const byId = new Map(list.map((p) => [p.id, p]));
        const stops: Array<{ id: number; name: string; lat: number; lon: number }> = [];
        for (const id of ids) {
          const p = byId.get(id);
          if (!p) continue;
          const { lat, lon } = toCoords(p);
          if (lat == null || lon == null) continue;
          const name: string = (p.tags?.name || p.name || `Place #${id}`);
          stops.push({ id, name, lat, lon });
        }
        if (stops.length > 0) {
          setPlanStops(stops);
          setPlanIdx(0);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When we have plan stops, order them by distance from user's location and start routing to the nearest first
  useEffect(() => {
    if (planStops.length === 0) return;
    const begin = (from: { lat: number; lon: number }) => {
      const ordered = [...planStops].sort((a, b) => {
        const da = haversine([from.lat, from.lon], [a.lat, a.lon]);
        const db = haversine([from.lat, from.lon], [b.lat, b.lon]);
        return da - db;
      });
      setOrderedPlanStops(ordered);
      // Build background connectors between stop i -> i+1
      buildStopConnectors(ordered).catch(() => setStopConnectors([]));
      setPlanIdx(0);
      const first = ordered[0];
      setDest({ lat: first.lat, lon: first.lon });
      // Kick off routing from geolocation
      startNavigation();
    };
    if (userPos) { begin(userPos); return; }
    if (!navigator.geolocation) {
      const [lat, lon] = center;
      begin({ lat, lon });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => begin({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { const [lat, lon] = center; begin({ lat, lon }); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [planStops]);

  // Build OSRM connector polylines between consecutive ordered stops (not including user->first)
  const buildStopConnectors = async (stops: Array<{ id: number; name: string; lat: number; lon: number }>) => {
    try {
      if (!stops || stops.length < 2) { setStopConnectors([]); return; }
      const out: Array<Array<[number, number]>> = [];
      // Fetch each leg serially to be gentle on the demo server
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        const url = `https://router.project-osrm.org/route/v1/foot/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        const route = data?.routes?.[0];
        if (res.ok && route && Array.isArray(route.geometry?.coordinates)) {
          const coords: Array<[number, number]> = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          out.push(coords);
        }
      }
      setStopConnectors(out);
    } catch {
      setStopConnectors([]);
    }
  };

  // Load all places and extract lon/lat for markers
  useEffect(() => {
    const REFRESH_MS = 3000;
    let stopped = false;
    let timer: any;

    const scheduleNext = () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.hidden) {
        // Check again later when hidden
        timer = setTimeout(scheduleNext, REFRESH_MS);
      } else {
        timer = setTimeout(tick, REFRESH_MS);
      }
    };

    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch('/api/places', { cache: 'no-store' });
        const data = await res.json();
        const list = Array.isArray(data?.places) ? data.places : [];
        const out: Array<{ id: string | number; lat: number; lon: number; title?: string; userEmail?: string | null }> = [];
        for (const p of list) {
          let lat: number | null = null;
          let lon: number | null = null;
          if (typeof p.location === 'string' && p.location.includes(',')) {
            const parts = p.location.split(',').map((s: string) => s.trim());
            const a = parseFloat(parts[0] || '');
            const b = parseFloat(parts[1] || '');
            if (!Number.isNaN(a) && !Number.isNaN(b)) {
              if (Math.abs(a) <= 90 && Math.abs(b) <= 180) { lat = a; lon = b; }
              else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) { lat = b; lon = a; }
            }
          }
          if ((lat == null || lon == null) && typeof p.lat === 'number' && typeof p.lon === 'number') {
            lat = p.lat; lon = p.lon;
          }
          if (lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon)) {
            out.push({ id: p.id ?? p._id ?? `${lat},${lon}`, lat, lon, title: p.tags?.name || p.name || 'Place', userEmail: p.userEmail ?? null });
          }
        }
        setPoiMarkers(out);
      } catch {}
      finally {
        scheduleNext();
      }
    };

    const onVisibility = () => {
      if (stopped) return;
      if (!document.hidden) {
        // Fire immediately when returning to foreground
        clearTimeout(timer);
        tick();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, []);

  // Auto-fit bounds whenever the route updates
  useEffect(() => {
    if (!mapRef.current || routeCoords.length === 0) return;
    const lats = routeCoords.map(p => p[0]).concat(startPos ? [startPos.lat] : [], dest ? [dest.lat] : []);
    const lons = routeCoords.map(p => p[1]).concat(startPos ? [startPos.lon] : [], dest ? [dest.lon] : []);
    if (lats.length === 0 || lons.length === 0) return;
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    try {
      mapRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [40, 100] });
    } catch {}
  }, [routeCoords, startPos, dest]);

  // Bind map click once map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current as any;
    const onClick = (e: any) => {
      try {
        const to = { lat: e.latlng.lat, lon: e.latlng.lng };
        setDest(to);
        setCenter([to.lat, to.lon]);
        setZoom(15);
        if (userPos) {
          setStartPos(userPos);
          fetchRoute(userPos, to);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
              setUserPos(me);
              setStartPos(me);
              fetchRoute(me, to);
            },
            () => {
              const [clat, clon] = center;
              const from = { lat: clat, lon: clon };
              setStartPos(from);
              fetchRoute(from, to);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        } else {
          const [clat, clon] = center;
          const from = { lat: clat, lon: clon };
          setStartPos(from);
          fetchRoute(from, to);
        }
      } catch {}
    };
    map.on('click', onClick);
    return () => {
      try { map.off('click', onClick); } catch {}
    };
  }, [mapReady, userPos, center]);

  // Mark map as ready once the MapContainer mounts (keyed by mapKey)
  useEffect(() => {
    if (mapRef.current) setMapReady(true);
  }, [mapKey]);

  // Auto-start routing when destination is set (will use geolocation or map-center fallback)
  useEffect(() => {
    if (!autoRouted && dest) {
      startNavigation();
      setAutoRouted(true);
    }
  }, [dest, autoRouted]);

  // Small helper to render a maneuver icon
  const renderStepIcon = (type?: string, modifier?: string, color: string = '#ea580c', size: number = 16) => {
    const stroke = 1.8;
    // Normalize
    const t = (type || '').toLowerCase();
    const m = (modifier || '').toLowerCase();
    if (t.includes('roundabout')) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="6.5" stroke={color} strokeWidth={stroke} />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </svg>
      );
    }
    if (t.includes('arrive')) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v14" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <path d="M6 10l6 6 6-6" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (t.includes('depart') || t.includes('start')) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="12" r="2" fill={color} />
          <path d="M8 12h10" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </svg>
      );
    }
    // Turn arrows based on modifier
    let rotate = 0;
    if (m.includes('right')) rotate = 45;
    if (m === 'sharp right') rotate = 90;
    if (m.includes('left')) rotate = -45;
    if (m === 'sharp left') rotate = -90;
    if (m.includes('uturn')) rotate = 180;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: `rotate(${rotate}deg)` }}>
        <path d="M12 4v10" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        <path d="M8 8l4-4 4 4" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // Bearing and user arrow icon
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [userIcon, setUserIcon] = useState<any>(null);
  const [userArrowIcon, setUserArrowIcon] = useState<any>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  // Map rotation (heading-up like Google Maps)
  const [mapRotationDeg, setMapRotationDeg] = useState<number>(0);
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const icon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      setUserIcon(icon);
    })();
  }, [mounted]);

  // Build a navigation arrow icon for the user; rotate to face route direction (fallback to device heading)
  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      const size: [number, number] = [36, 36];
      const anchor: [number, number] = [18, 18];
      const rotation = (routeBearingDeg ?? userHeading ?? 0);
      const html = `
        <div style="transform: rotate(${rotation}deg); width:36px; height:36px; display:grid; place-items:center; position:relative;">
          <!-- soft shadow underneath -->
          <div style="position:absolute; bottom:2px; width:20px; height:6px; background:radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 70%); filter:blur(2px);"></div>
          <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#60a5fa"/>
                <stop offset="100%" stop-color="#2563eb"/>
              </linearGradient>
              <filter id="glow"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#1e3a8a" flood-opacity="0.5"/></filter>
            </defs>
            <!-- navigation arrow -->
            <path d="M12 2l6 12-6-3-6 3 6-12z" fill="url(#navGrad)" stroke="#1e3a8a" stroke-width="1" filter="url(#glow)"/>
          </svg>
        </div>`;
      const div = L.divIcon({ className: 'user-arrow', html, iconSize: size, iconAnchor: anchor });
      setUserArrowIcon(div);
    })();
  }, [routeBearingDeg, userHeading]);

  // Remove global geolocation watch; we start watching when navigation actually starts

  // Auto-follow map to user position in real-time (no reload needed)
  useEffect(() => {
    if (!autoFollow || !userPos) return;
    if (headingUp && userHeading != null) {
      // Look-ahead center ~80m in heading direction
      const dMeters = 80;
      const R = 6371000;
      const theta = (userHeading * Math.PI) / 180;
      const latRad = (userPos.lat * Math.PI) / 180;
      const dLat = (dMeters * Math.cos(theta)) / R;
      const dLon = (dMeters * Math.sin(theta)) / (R * Math.cos(latRad));
      const newLat = userPos.lat + (dLat * 180) / Math.PI;
      const newLon = userPos.lon + (dLon * 180) / Math.PI;
      setCenter([newLat, newLon]);
    } else {
      setCenter([userPos.lat, userPos.lon]);
    }
    setZoom((z) => Math.max(z, 16));
  }, [userPos, autoFollow, headingUp, userHeading]);

  // Compute approximate distance (meters) between two lat/lon
  const haversine = (a: [number, number], b: [number, number]) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  // Distance from point to polyline (meters)
  const pointToPolylineDistance = (pt: [number, number], line: Array<[number, number]>) => {
    if (line.length < 2) return Infinity;
    let min = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      // Project pt onto segment ab using simple planar approximation (ok for small spans)
      const toXY = (p: [number, number]) => {
        const x = p[1] * 111320 * Math.cos(((p[0] + pt[0]) / 2) * Math.PI / 180);
        const y = p[0] * 110540;
        return [x, y];
      };
      const P = toXY(pt), A = toXY(a), B = toXY(b);
      const AB = [B[0] - A[0], B[1] - A[1]] as const;
      const AP = [P[0] - A[0], P[1] - A[1]] as const;
      const ab2 = AB[0] * AB[0] + AB[1] * AB[1] || 1;
      let t = (AP[0] * AB[0] + AP[1] * AB[1]) / ab2;
      t = Math.max(0, Math.min(1, t));
      const proj: [number, number] = [A[0] + AB[0] * t, A[1] + AB[1] * t];
      const d = Math.hypot(P[0] - proj[0], P[1] - proj[1]);
      min = Math.min(min, d);
    }
    return min; // in meters due to scale factors
  };

  // Find the closest point on a polyline and return projection details
  const projectOnPolyline = (pt: [number, number], line: Array<[number, number]>) => {
    if (line.length < 2) return { index: 0, point: line[0] as [number, number], distance: Infinity };
    let best = { index: 0, point: line[0] as [number, number], distance: Infinity };
    const toXY = (p: [number, number]) => {
      const x = p[1] * 111320 * Math.cos(((p[0] + pt[0]) / 2) * Math.PI / 180);
      const y = p[0] * 110540;
      return [x, y];
    };
    const P = toXY(pt);
    for (let i = 0; i < line.length - 1; i++) {
      const A = toXY(line[i]);
      const B = toXY(line[i + 1]);
      const AB = [B[0] - A[0], B[1] - A[1]] as const;
      const AP = [P[0] - A[0], P[1] - A[1]] as const;
      const ab2 = AB[0] * AB[0] + AB[1] * AB[1] || 1;
      let t = (AP[0] * AB[0] + AP[1] * AB[1]) / ab2;
      t = Math.max(0, Math.min(1, t));
      const projXY: [number, number] = [A[0] + AB[0] * t, A[1] + AB[1] * t];
      const d = Math.hypot(P[0] - projXY[0], P[1] - projXY[1]);
      if (d < best.distance) {
        // Convert back to lat,lon approximately
        const toLatLon = (xy: [number, number]): [number, number] => {
          const lon = xy[0] / (111320 * Math.cos(((line[i][0] + pt[0]) / 2) * Math.PI / 180));
          const lat = xy[1] / 110540;
          return [lat, lon];
        };
        best = { index: i, point: toLatLon(projXY), distance: d };
      }
    }
    return best;
  };

  // Split route into past and ahead parts for visualization
  useEffect(() => {
    if (!userPos || routeCoords.length < 2) {
      setRoutePastCoords([]);
      setRouteAheadCoords(routeCoords);
      setProjPointOnRoute(null);
      return;
    }
    const { index, point } = projectOnPolyline([userPos.lat, userPos.lon], routeCoords);
    const past: Array<[number, number]> = [];
    const ahead: Array<[number, number]> = [];
    // Build past from start to projection point
    for (let i = 0; i < index; i++) past.push(routeCoords[i]);
    past.push(routeCoords[index]);
    past.push(point);
    // Build ahead from projection point to end
    ahead.push(point);
    ahead.push(routeCoords[index + 1]);
    for (let i = index + 2; i < routeCoords.length; i++) ahead.push(routeCoords[i]);
    setRoutePastCoords(past);
    setRouteAheadCoords(ahead);
    setProjPointOnRoute(point);
  }, [userPos, routeCoords]);

  // Compute bearing in degrees from A(lat,lon) to B(lat,lon)
  const bearingDeg = (a: [number, number], b: [number, number]) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const dLon = toRad(b[1] - a[1]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  // Determine route-bearing direction the user should face (towards next segment)
  useEffect(() => {
    if (projPointOnRoute && routeAheadCoords.length >= 2) {
      const dir = bearingDeg(projPointOnRoute, routeAheadCoords[1]);
      setRouteBearingDeg(dir);
    } else {
      setRouteBearingDeg(null);
    }
  }, [projPointOnRoute, routeAheadCoords]);

  // Apply 360° map rotation when heading-up is enabled
  useEffect(() => {
    try {
      if (!mapReady || !mapRef.current) return;
      const map: any = mapRef.current;
      const pane = map.getPane ? map.getPane('mapPane') : null;
      if (!pane) return;
      const deg = headingUp ? (routeBearingDeg ?? userHeading ?? 0) : 0;
      setMapRotationDeg(deg);
      pane.style.willChange = 'transform';
      pane.style.transition = 'transform 200ms linear';
      pane.style.transformOrigin = '50% 50%';
      pane.style.transform = `rotate(${deg}deg)`;
    } catch {}
  }, [headingUp, routeBearingDeg, userHeading, mapReady]);

  // Update heading and on-route check on live updates
  const [onRoute, setOnRoute] = useState<boolean>(true);
  const [offRouteMeters, setOffRouteMeters] = useState<number>(0);
  const [offRoutePopup, setOffRoutePopup] = useState<boolean>(false); // lightweight chip (kept), drives screen notice via showOffRouteScreen
  const prevUserRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!userPos) return;
    // Heading (prefer device heading if available from Geolocation, else compute from delta)
    if (prevUserRef.current) {
      const prev = prevUserRef.current;
      const d = haversine([prev.lat, prev.lon], [userPos.lat, userPos.lon]);
      if (d > 2) {
        const y = Math.sin((userPos.lon - prev.lon) * Math.PI / 180) * Math.cos(userPos.lat * Math.PI / 180);
        const x = Math.cos(prev.lat * Math.PI / 180) * Math.sin(userPos.lat * Math.PI / 180) - Math.sin(prev.lat * Math.PI / 180) * Math.cos(userPos.lat * Math.PI / 180) * Math.cos((userPos.lon - prev.lon) * Math.PI / 180);
        const computed = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        setUserHeading((prevH) => {
          if (prevH == null) return computed;
          // Smooth heading with simple low-pass filter
          const alpha = 0.3;
          let diff = ((computed - prevH + 540) % 360) - 180; // shortest angle diff
          const smoothed = (prevH + alpha * diff + 360) % 360;
          return smoothed;
        });
      }
    }
    prevUserRef.current = userPos;
    // On-route check
    if (routeCoords.length > 1) {
      const dMin = pointToPolylineDistance([userPos.lat, userPos.lon], routeCoords);
      setOffRouteMeters(dMin);
      setOnRoute(dMin < 35);
    }
    // Arrival detection: within 20m of destination
    if (dest) {
      const dToDest = haversine([userPos.lat, userPos.lon], [dest.lat, dest.lon]);
      if (dToDest <= 20) {
        if (orderedPlanStops.length > 0 && planIdx < orderedPlanStops.length - 1) {
          const nextIdx = planIdx + 1;
          const next = orderedPlanStops[nextIdx];
          setPlanIdx(nextIdx);
          setDest({ lat: next.lat, lon: next.lon });
          startNavigation();
          speak(`Proceeding to ${next.name}`);
        } else if (!journeyCompleted) {
          setJourneyCompleted(true);
          try { if (geoWatchRef.current != null) { navigator.geolocation.clearWatch(geoWatchRef.current); geoWatchRef.current = null; } } catch {}
          speak('You have arrived at your destination.');
        }
      }
    }
  }, [userPos, routeCoords]);

  // Request a multi-stop route via OSRM
  const fetchMultiRoute = async (points: Array<{ lat: number; lon: number }>) => {
    if (!points || points.length < 2) return;
    try {
      setRouting(true);
      setRouteError(null);
      const coords = points.map(p => `${p.lon},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      const route = data?.routes?.[0];
      if (res.ok && route) {
        const geo = route.geometry; // GeoJSON LineString
        const coordsLL: Array<[number, number]> = Array.isArray(geo?.coordinates) ? geo.coordinates.map((c: [number, number]) => [c[1], c[0]]) : [];
        setRouteCoords(coordsLL);
        // Ensure single continuous polyline rendering (no split past/ahead)
        setRouteAheadCoords([]);
        setRoutePastCoords([]);
        setProjPointOnRoute(null);
        setRouteDistance(typeof route.distance === 'number' ? route.distance : null);
        setRouteDuration(typeof route.duration === 'number' ? route.duration : null);
        // Flatten legs->steps into our UI steps
        const legs = Array.isArray(route.legs) ? route.legs : [];
        const stepsOut: Array<{ text: string; type?: string; modifier?: string; location?: [number, number]; distance?: number }> = [];
        for (const leg of legs) {
          const steps = Array.isArray(leg.steps) ? leg.steps : [];
          for (const s of steps) {
            const m = s?.maneuver || {};
            const road = s?.name || s?.ref || 'road';
            const type = m.type || 'Proceed';
            const mod = m.modifier ? ` ${m.modifier}` : '';
            const text = `${type}${mod} onto ${road}`.replace(/\s+/g, ' ').trim();
            const loc = Array.isArray(m.location) && m.location.length === 2 ? [m.location[1], m.location[0]] as [number, number] : undefined;
            stepsOut.push({ text, type: m.type, modifier: m.modifier, location: loc, distance: typeof s.distance === 'number' ? s.distance : undefined });
          }
        }
        setRouteSteps(stepsOut);
        setCurrentStepIdx(0);
        spokenRef.current = {};

        // Snap plan stop markers to OSRM waypoints so markers lie on the route line
        const wps: Array<{ name?: string; location?: [number, number] }> = Array.isArray((data as any)?.waypoints) ? (data as any).waypoints : [];
        if (wps.length >= 2 && orderedPlanStops.length > 0) {
          // waypoints[0] corresponds to start (user), next indices map to orderedPlanStops
          const snapped: Array<{ id: number; name: string; lat: number; lon: number }> = [];
          for (let i = 0; i < orderedPlanStops.length; i++) {
            const o = orderedPlanStops[i];
            const wp = wps[i + 1];
            if (wp && Array.isArray(wp.location) && wp.location.length === 2) {
              snapped.push({ id: o.id, name: o.name, lat: wp.location[1], lon: wp.location[0] });
            } else {
              snapped.push(o);
            }
          }
          setSnappedOrderedPlanStops(snapped);
        } else {
          setSnappedOrderedPlanStops(orderedPlanStops);
        }
      } else {
        setRouteCoords([]);
        setRouteDistance(null);
        setRouteDuration(null);
        setRouteSteps([]);
        setRouteError('No route found');
      }
    } catch (e) {
      setRouteCoords([]);
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteSteps([]);
      setRouteError('Routing failed');
    } finally {
      setRouting(false);
    }
  };

  // Off-route popup controller
  useEffect(() => {
    let timer: any;
    if (!onRoute && offRouteMeters > 35) {
      timer = setTimeout(() => {
        setOffRoutePopup(true);
        setShowOffRouteScreen(true);
      }, 3000);
    } else {
      setOffRoutePopup(false);
      setShowOffRouteScreen(false);
    }
    return () => timer && clearTimeout(timer);
  }, [onRoute, offRouteMeters]);

  // If device provides heading in geolocation updates, incorporate it
  // We already start a watch in startNavigation; patch into that watcher by reading heading when present

  // Drag handlers for the panel
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const startDrag = (clientX: number, clientY: number) => {
    dragOffsetRef.current = { x: clientX - panelPos.x, y: clientY - panelPos.y };
    setDragging(true);
  };
  const onMouseDownHeader = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };
  const onTouchStartHeader = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startDrag(t.clientX, t.clientY);
  };
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      const x = e.clientX - dragOffsetRef.current.x;
      const y = e.clientY - dragOffsetRef.current.y;
      const w = typeof window !== 'undefined' ? window.innerWidth : 0;
      const h = typeof window !== 'undefined' ? window.innerHeight : 0;
      setPanelPos({ x: clamp(x, 8, Math.max(8, w - 280)), y: clamp(y, 8, Math.max(8, h - 120)) });
    };
    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const x = t.clientX - dragOffsetRef.current.x;
      const y = t.clientY - dragOffsetRef.current.y;
      const w = typeof window !== 'undefined' ? window.innerWidth : 0;
      const h = typeof window !== 'undefined' ? window.innerHeight : 0;
      setPanelPos({ x: clamp(x, 8, Math.max(8, w - 280)), y: clamp(y, 8, Math.max(8, h - 120)) });
    };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', touch);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', touch);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, panelPos.x, panelPos.y]);

  // Create destination icon on client only
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const size: [number, number] = [28, 28];
      const anchor: [number, number] = [14, 28];
      const html = `
        <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="#22c55e" stroke="#0f5132" stroke-width="0.5"/>
        </svg>
      `;
      const icon = L.divIcon({ className: 'dest-pin', html, iconSize: size, iconAnchor: anchor });
      setDestIcon(icon);
    })();
  }, [mounted]);

  // Create custom icon for user's own places (blue pin image)
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const icon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/4601/4601807.png',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      setMyPlaceIcon(icon);
    })();
  }, [mounted]);

  // Create custom icon for other people's places (green pin image)
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const icon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      setOtherPlaceIcon(icon);
    })();
  }, [mounted]);

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const address = searchParams.get('address');
    const fromLat = searchParams.get('fromLat');
    const fromLon = searchParams.get('fromLon');
    // Helper to auto start a route to a known destination
    const autoStartTo = (to: { lat: number; lon: number }) => {
      // If fromLat/fromLon are provided via query, respect them and avoid prompting for geolocation
      if (fromLat && fromLon) {
        const fLat = parseFloat(fromLat);
        const fLon = parseFloat(fromLon);
        if (!Number.isNaN(fLat) && !Number.isNaN(fLon)) {
          const from = { lat: fLat, lon: fLon };
          setUserPos(from);
          setStartPos(from);
          fetchRoute(from, to);
          // Keep center towards the route; don't force center to from to avoid abrupt jump if already set
          return;
        }
      }
      // Try immediate geolocation; if denied/timeouts, fall back to current map center
      if (!navigator.geolocation) {
        const [clat, clon] = center;
        let from = { lat: clat, lon: clon };
        const sameAsDest = Math.hypot((from.lat - to.lat), (from.lon - to.lon)) < 0.0005;
        if (sameAsDest) {
          from = { lat: to.lat + 0.005, lon: to.lon + 0.005 };
        }
        setStartPos(from);
        fetchRoute(from, to);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserPos(me);
          setStartPos(me);
          fetchRoute(me, to);
          setCenter([me.lat, me.lon]);
          setZoom(14);
        },
        () => {
          const [clat, clon] = center;
          let from = { lat: clat, lon: clon };
          const sameAsDest = Math.hypot((from.lat - to.lat), (from.lon - to.lon)) < 0.0005;
          if (sameAsDest) {
            from = { lat: to.lat + 0.005, lon: to.lon + 0.005 };
          }
          setStartPos(from);
          fetchRoute(from, to);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    };
    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      setDest({ lat: latNum, lon: lonNum });
      setCenter([latNum, lonNum]);
      setZoom(15);
      // Start route immediately
      autoStartTo({ lat: latNum, lon: lonNum });
    } else if (address) {
      // Geocode address using Nominatim
      const geocode = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            const latNum = parseFloat(first.lat);
            const lonNum = parseFloat(first.lon);
            if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
              setDest({ lat: latNum, lon: lonNum });
              setCenter([latNum, lonNum]);
              setZoom(15);
              // Start route immediately
              autoStartTo({ lat: latNum, lon: lonNum });
            }
          }
        } catch (_) {
          // silently ignore
        } finally {
          // Keep query params so the map remains centered after mount
        }
      };
      geocode();
    }
  }, [searchParams, router]);

  // Removed auto-start routing to behave like a normal map unless user taps Start


  const handleLocationSelect = (location: { boundingbox: [string, string, string, string] }) => {
    const [minLat, maxLat, minLon, maxLon] = location.boundingbox;
    const lat = (parseFloat(minLat) + parseFloat(maxLat)) / 2;
    const lon = (parseFloat(minLon) + parseFloat(maxLon)) / 2;
    setCenter([lat, lon]);
    setZoom(12);
    setBrowsePos({ lat, lon });
  };

  // Request a route from userPos -> dest via OSRM with multi-endpoint fallback
  const fetchRoute = async (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
    try {
      // Throttle consecutive requests (avoid double-click or GPS jitter)
      const now = Date.now();
      if (now - lastRouteAtRef.current < 900) return;
      lastRouteAtRef.current = now;
      // Abort any previous request
      try { routeAbortRef.current?.abort(); } catch {}
      const ctrl = new AbortController();
      routeAbortRef.current = ctrl;
      const timeoutId = setTimeout(() => { try { ctrl.abort(); } catch {} }, 7000);

      setRouting(true);
      setRouteError(null);
      const endpoints = [
        `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`,
        `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`,
      ];

      let coords: Array<[number, number]> | undefined;
      let route: any = null;
      let distance: number | null = null;
      let duration: number | null = null;
      let stepsOut: Array<{ text: string; type?: string; modifier?: string; location?: [number, number]; distance?: number }> = [];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok) continue;
          const data = await res.json();
          route = data?.routes?.[0];
          coords = route?.geometry?.coordinates as Array<[number, number]> | undefined;
          if (Array.isArray(coords)) {
            distance = typeof route?.distance === 'number' ? route.distance : null;
            duration = typeof route?.duration === 'number' ? route.duration : null;
            const legs = route?.legs || [];
            stepsOut = [];
            for (const leg of legs) {
              for (const st of leg.steps || []) {
                const type = st?.maneuver?.type || 'Proceed';
                const modTxt = st?.maneuver?.modifier ? ` ${st.maneuver.modifier}` : '';
                const road = st?.name || 'road';
                const loc = Array.isArray(st?.maneuver?.location) && st.maneuver.location.length === 2
                  ? [st.maneuver.location[1], st.maneuver.location[0]] as [number, number]
                  : undefined;
                stepsOut.push({
                  text: `${type}${modTxt} onto ${road}`.trim(),
                  type: st?.maneuver?.type,
                  modifier: st?.maneuver?.modifier,
                  location: loc,
                  distance: typeof st?.distance === 'number' ? st.distance : undefined,
                });
              }
            }
            break;
          }
        } catch {}
      }

      if (Array.isArray(coords)) {
        // OSRM returns [lon,lat], convert to [lat,lon]
        const latlng: Array<[number, number]> = coords.map(([x, y]) => [y, x]);
        setRouteCoords(latlng);
        setRouteDistance(distance);
        setRouteDuration(duration);
        setRouteSteps(stepsOut);
        setRouteError(null);
        // reset voice trackers
        currentStepIdxRef.current = 0;
        setCurrentStepIdx(0);
        spokenRef.current = {};
      } else {
        setRouteCoords([]);
        setRouteDistance(null);
        setRouteDuration(null);
        setRouteSteps([]);
        setRouteError('No route found');
      }
    } catch (e) {
      setRouteCoords([]);
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteSteps([]);
      setRouteError('Routing failed');
    } finally {
      setRouting(false);
      try { routeAbortRef.current = null; } catch {}
      // Clear any running timeout on the controller if still pending
      // Note: timeout cleared when abort fires; nothing extra needed here
    }
  };

  // Voice guidance: speech helper and guidance effect
  const speak = (text: string) => {
    try {
      if (!voiceOn) return;
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  useEffect(() => {
    if (!voiceOn) return;
    if (!userPos || routeSteps.length === 0) return;
    let idx = currentStepIdxRef.current;
    if (idx >= routeSteps.length) return;
    const step = routeSteps[idx];
    if (!step?.location) return;
    const d = haversine([userPos.lat, userPos.lon], step.location);
    const rec = spokenRef.current[idx] || {};
    if (!rec.pre && d <= 120 && d > 35) {
      const turn = step.modifier ? step.modifier.toLowerCase() : '';
      if (step.type && step.type.toLowerCase().includes('arrive')) {
        speak('In one hundred meters, you will arrive at your destination.');
      } else if (turn) {
        speak(`In one hundred meters, turn ${turn}.`);
      } else {
        speak('In one hundred meters, continue.');
      }
      spokenRef.current[idx] = { ...rec, pre: true };
    }
    if (!rec.final && d <= 25) {
      const turn = step.modifier ? step.modifier.toLowerCase() : '';
      if (step.type && step.type.toLowerCase().includes('arrive')) {
        speak('You have arrived at your destination.');
      } else if (turn) {
        speak(`Turn ${turn} now.`);
      } else {
        speak('Proceed.');
      }
      spokenRef.current[idx] = { ...rec, final: true };
      currentStepIdxRef.current = Math.min(idx + 1, routeSteps.length);
    }
  }, [userPos, routeSteps, voiceOn]);

  const startNavigation = () => {
    if (!dest) return;
    if (!navigator.geolocation) {
      // Fallback: use current map center as start
      const [lat, lon] = center;
      let from = { lat, lon };
      // If center is same as destination (e.g., opened map centered on dest), nudge start slightly
      const sameAsDest = Math.hypot((from.lat - dest.lat), (from.lon - dest.lon)) < 0.0005; // ~50m
      if (sameAsDest) {
        from = { lat: dest.lat + 0.005, lon: dest.lon + 0.005 }; // ~500m offset
      }
      setStartPos(from);
      fetchRoute(from, dest);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)) {
          setUserHeading(((pos.coords.heading % 360) + 360) % 360);
        }
        if (typeof pos.coords.accuracy === 'number' && !Number.isNaN(pos.coords.accuracy)) {
          setUserAccuracy(pos.coords.accuracy);
        }
        setStartPos(me);
        setUserPos(me);
        fetchRoute(me, dest);
        setCenter([me.lat, me.lon]);
        setZoom(14);
        // Only follow live if enabled
        if (liveUpdate) {
          const watchId = navigator.geolocation.watchPosition(
            (upd) => {
              const cur = { lat: upd.coords.latitude, lon: upd.coords.longitude };
              setUserPos(cur);
              if (typeof upd.coords.heading === 'number' && !Number.isNaN(upd.coords.heading)) {
                setUserHeading(((upd.coords.heading % 360) + 360) % 360);
              }
              if (typeof upd.coords.accuracy === 'number' && !Number.isNaN(upd.coords.accuracy)) {
                setUserAccuracy(upd.coords.accuracy);
              }
              // Smart re-route: only when off-route or after time/distance thresholds
              const now = Date.now();
              let shouldReroute = false;
              if (!onRoute && offRouteMeters > 35) {
                shouldReroute = true;
              }
              if (!shouldReroute) {
                if (now - lastRerouteTimeRef.current > 15000) {
                  shouldReroute = true;
                } else if (lastReroutePosRef.current) {
                  const moved = haversine([lastReroutePosRef.current.lat, lastReroutePosRef.current.lon], [cur.lat, cur.lon]);
                  if (moved > 80) shouldReroute = true; // meters
                } else {
                  shouldReroute = true; // first time
                }
              }
              if (shouldReroute) {
                lastRerouteTimeRef.current = now;
                lastReroutePosRef.current = cur;
                fetchRoute(cur, dest);
              }
              // Auto-follow: center map to the user's current position
              setCenter([cur.lat, cur.lon]);
              setZoom((z) => Math.max(z, 16));
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
          );
          geoWatchRef.current = watchId as any;
          // Stop watching when leaving page
          window.addEventListener('beforeunload', () => navigator.geolocation.clearWatch(watchId), { once: true });
        }
      },
      // On error (denied/timeouts), route from current map center
      () => {
        const [lat, lon] = center;
        let from = { lat, lon };
        const sameAsDest = Math.hypot((from.lat - dest.lat), (from.lon - dest.lon)) < 0.0005; // ~50m
        if (sameAsDest) {
          from = { lat: dest.lat + 0.005, lon: dest.lon + 0.005 };
        }
        setStartPos(from);
        fetchRoute(from, dest);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const { data: session } = useSession();

  // Cleanup any active geolocation watch on unmount
  useEffect(() => {
    return () => {
      try {
        if (geoWatchRef.current != null) {
          navigator.geolocation.clearWatch(geoWatchRef.current);
          geoWatchRef.current = null;
        }
      } catch {}
    };
  }, []);

  return (
    <div className="relative h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
       <header className="absolute top-3 left-3 right-3 z-[2000] flex h-14 shrink-0 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 md:flex-1">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold text-transparent drop-shadow-sm">
            Manchitra
          </h1>
        </div>
        <div className="flex-1 flex justify-center">
            <AnimatedSearch onLocationSelect={handleLocationSelect} />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <UserProfile />
        </div>
      </header>
      <main className="relative h-full w-full z-0 pt-20 md:pt-24 px-3 md:px-4">
        {!mounted || !mapKey ? (
          <div className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8.5rem)] grid place-items-center">
            <Loader />
          </div>
        ) : (
          <div className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10">
          <RL.MapContainer
            key={mapKey}
            center={center}
            zoom={zoom}
            ref={mapRef as any}
            style={{ height: '100%', width: '100%' }}
          >
            <RL.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {dest && destIcon && (
              <RL.Marker position={[dest.lat, dest.lon]} icon={destIcon} />
            )}
            {browsePos && (
              <RL.CircleMarker center={[browsePos.lat, browsePos.lon]} radius={4} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1 }} />
            )}
            {userPos && (
              userArrowIcon ? (
                <RL.Marker position={[userPos.lat, userPos.lon]} icon={userArrowIcon} />
              ) : (
                <RL.CircleMarker center={[userPos.lat, userPos.lon]} radius={5} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }} />
              )
            )}
            {routeAheadCoords.length > 0 ? (
              <>
                {/* Past segment casing */}
                {routePastCoords.length > 1 && (
                  <RL.Polyline positions={routePastCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
                )}
                {/* Past segment (already traversed) */}
                {routePastCoords.length > 1 && (
                  <RL.Polyline positions={routePastCoords} pathOptions={{ color: '#9ca3af', weight: 5, opacity: 0.65 }} />
                )}
                {/* Ahead segment casing */}
                <RL.Polyline positions={routeAheadCoords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95 }} />
                {/* Ahead segment (remaining) */}
                <RL.Polyline positions={routeAheadCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.98 }} />
              </>
            ) : (
              routeCoords.length > 0 && (
                <>
                  {/* Single route casing */}
                  <RL.Polyline positions={routeCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.95 }} />
                  {/* Single route */}
                  <RL.Polyline positions={routeCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.98 }} />
                </>
              )
            )}
            {/* Background connectors between consecutive selected stops */}
            {stopConnectors.length > 0 && (
              <>
                {/* Casing for connectors */}
                {stopConnectors.map((seg, i) => (
                  <RL.Polyline key={`conn-case-${i}`} positions={seg} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.8, dashArray: '10 8', lineCap: 'round' }} />
                ))}
                {/* Colored connectors */}
                {stopConnectors.map((seg, i) => (
                  <RL.Polyline key={`conn-${i}`} positions={seg} pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.9, dashArray: '10 8', lineCap: 'round' }} />
                ))}
              </>
            )}
            {/* Selected plan stop markers (numbered in travel order, snapped to OSRM waypoints) */}
            {(snappedOrderedPlanStops.length > 0 ? snappedOrderedPlanStops : orderedPlanStops).map((s, idx) => (
              <RL.CircleMarker key={`plan-${s.id}`} center={[s.lat, s.lon]} radius={7} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}>
                <RL.Tooltip permanent direction="top" offset={[0, -12]} opacity={1} className="poi-label">
                  {`${idx + 1}. ${s.name}`}
                </RL.Tooltip>
              </RL.CircleMarker>
            ))}
            {/* All saved places markers (skip those already in current plan to avoid duplicate labels) */}
            {poiMarkers.filter((poi) => !selectedPlanIdSet.has(Number(poi.id))).map((poi) => {
              const mine = poi.userEmail && session?.user?.email && poi.userEmail === session.user.email;
              if (mine && myPlaceIcon) {
                return (
                  <RL.Marker
                    key={`poi-${poi.id}`}
                    position={[poi.lat, poi.lon]}
                    icon={myPlaceIcon}
                    eventHandlers={{
                      click: () => {
                        setDest({ lat: poi.lat, lon: poi.lon });
                        setCenter([poi.lat, poi.lon]);
                        setZoom(15);
                        if (userPos) {
                          fetchRoute({ lat: userPos.lat, lon: userPos.lon }, { lat: poi.lat, lon: poi.lon });
                        } else if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                              setUserPos(me);
                              setStartPos(me);
                              fetchRoute(me, { lat: poi.lat, lon: poi.lon });
                            },
                            () => {
                              const [lat, lon] = center; // fallback from current map center
                              const from = { lat, lon };
                              setStartPos(from);
                              fetchRoute(from, { lat: poi.lat, lon: poi.lon });
                            },
                            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                          );
                        } else {
                          const [lat, lon] = center; // final fallback
                          const from = { lat, lon };
                          setStartPos(from);
                          fetchRoute(from, { lat: poi.lat, lon: poi.lon });
                        }
                      },
                    }}
                  >
                    <RL.Tooltip permanent direction="top" offset={[0, -20]} opacity={1} className="poi-label">
                      {poi.title || 'Place'}
                    </RL.Tooltip>
                  </RL.Marker>
                );
              }
              // Others: green location pin with label
              return (
                <RL.Marker
                  key={`poi-${poi.id}`}
                  position={[poi.lat, poi.lon]}
                  icon={otherPlaceIcon || undefined}
                  eventHandlers={{
                    click: () => {
                      setDest({ lat: poi.lat, lon: poi.lon });
                      setCenter([poi.lat, poi.lon]);
                      setZoom(15);
                      if (userPos) {
                        fetchRoute({ lat: userPos.lat, lon: userPos.lon }, { lat: poi.lat, lon: poi.lon });
                      } else if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                            setUserPos(me);
                            setStartPos(me);
                            fetchRoute(me, { lat: poi.lat, lon: poi.lon });
                          },
                          () => {
                            const [lat, lon] = center; // fallback from current map center
                            const from = { lat, lon };
                            setStartPos(from);
                            fetchRoute(from, { lat: poi.lat, lon: poi.lon });
                          },
                          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                        );
                      } else {
                        const [lat, lon] = center; // final fallback
                        const from = { lat, lon };
                        setStartPos(from);
                        fetchRoute(from, { lat: poi.lat, lon: poi.lon });
                      }
                    },
                  }}
                >
                  <RL.Tooltip permanent direction="top" offset={[0, -20]} opacity={1} className="poi-label">
                    {poi.title || 'Place'}
                  </RL.Tooltip>
                </RL.Marker>
              );
            })}
          </RL.MapContainer>
          </div>
        )}
        {/* Auto-fit bounds when route updates */}
        {/* Maneuver banner (always visible) */}
        {routeSteps.length > 0 && userPos && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1800] w-[min(96vw,720px)] px-3">
            {(() => {
              const idx = Math.min(currentStepIdxRef.current, routeSteps.length - 1);
              const step = routeSteps[idx];
              const next = routeSteps[idx + 1];
              const d = step?.location ? Math.round(haversine([userPos.lat, userPos.lon], step.location)) : null;
              return (
                <div className="relative rounded-2xl border border-emerald-700/60 bg-emerald-600 text-white backdrop-blur ring-1 ring-emerald-700/70 shadow-2xl pl-5 pr-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{renderStepIcon(step?.type, step?.modifier, '#ffffff', 18)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base md:text-lg font-semibold truncate">{step?.text || 'Proceed'}</div>
                      <div className="text-[13px] md:text-sm text-white/90">
                        {typeof d === 'number' ? `${d} m` : ''}
                        {next ? <span className="ml-2 opacity-90">Then: {next.text}</span> : null}
                      </div>
                    </div>
                    {/* Dropdown to toggle inline Route Preview */}
                    <button
                      onClick={() => {
                        // Toggle inline details and keep floating panel closed
                        setBannerDetailsOpen(v => !v);
                        setPanelCollapsed(true);
                      }}
                      className="h-10 w-10 mr-1 flex items-center justify-center rounded-full bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur shadow-2xl focus:outline-none"
                      title="Toggle route preview"
                      aria-label="Toggle route preview"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M7 10l5 5 5-5H7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { const nextState = !voiceOn; setVoiceOn(nextState); if (nextState) speak('Voice guidance on'); else if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }}
                      className={`h-10 w-10 flex items-center justify-center rounded-full border backdrop-blur shadow-2xl focus:outline-none focus:ring-2 ${voiceOn ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500/60 focus:ring-blue-300/40' : 'bg-white/95 text-emerald-900 border-white/30 ring-1 ring-white/20'}`}
                      title="Toggle voice guidance"
                      aria-label="Toggle voice guidance"
                    >
                      {voiceOn ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M3 9v6h4l5 4V5L7 9H3z"/>
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z"/>
                          <path d="M14 3.23v2.06c2.89 1 5 3.77 5 6.71s-2.11 5.71-5 6.71v2.06c4.01-1.1 7-4.79 7-8.77s-2.99-7.67-7-8.77z"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M3 9v6h4l5 4V5L7 9H3z"/>
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" opacity=".35"/>
                          <path d="M14 3.23v2.06c2.89 1 5 3.77 5 6.71s-2.11 5.71-5 6.71v2.06c4.01-1.1 7-4.79 7-8.77s-2.99-7.67-7-8.77z" opacity=".2"/>
                          <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {bannerDetailsOpen && (
                    <div className="mt-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        {routeDistance != null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[12px] font-medium">
                            {(routeDistance/1000).toFixed(1)} km
                          </span>
                        )}
                        {routeDuration != null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[12px] font-medium">
                            {Math.ceil(routeDuration/60)} min
                          </span>
                        )}
                      </div>
                      {routeSteps.length > 0 && (
                        <ol ref={stepsListRef} className="max-h-40 overflow-auto space-y-1 pr-1 text-sm">
                          {routeSteps.slice(0, 15).map((s, i) => {
                            const active = i === currentStepIdx;
                            return (
                              <li
                                key={i}
                                className={`flex items-start gap-2 rounded-lg px-2 py-1 border ${active ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-emerald-50/60'}`}
                              >
                                <span className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-emerald-600' : ''}`}>
                                  {renderStepIcon(s.type, s.modifier, active ? '#059669' : '#0f172a', 14)}
                                </span>
                                <span className={`${active ? 'font-semibold text-emerald-800' : 'text-neutral-800'}`}>{s.text}</span>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
        {/* Re-center and Exit controls (icon buttons), moved higher */}
        <div className="absolute bottom-56 right-5 z-[1500] flex flex-col gap-3 items-end">
          <button
            onClick={() => { if (userPos) { setAutoFollow(true); setCenter([userPos.lat, userPos.lon]); setZoom((z) => Math.max(z, 16)); } }}
            className="h-11 w-11 inline-flex items-center justify-center rounded-full bg-white/90 dark:bg-black/50 border border-black/10 dark:border-white/10 shadow-xl hover:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-300/30"
            title="Re-center"
            aria-label="Re-center"
          >
            {/* target/locate icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
              <circle cx="12" cy="12" r="8.5" strokeDasharray="2 3" opacity="0.7" />
            </svg>
          </button>
          {(routeCoords.length > 0 || geoWatchRef.current != null) && (
            <button
              onClick={() => {
                // Stop any ongoing geolocation watch and pending route request
                try { if (geoWatchRef.current != null) { navigator.geolocation.clearWatch(geoWatchRef.current); geoWatchRef.current = null; } } catch {}
                try { routeAbortRef.current?.abort(); } catch {}
                // Clear route geometry and derived visualization
                setRouteCoords([]);
                setRouteAheadCoords([]);
                setRoutePastCoords([]);
                setProjPointOnRoute(null);
                setRouteBearingDeg(null);
                // Clear route metadata and steps
                setRouteDistance(null);
                setRouteDuration(null);
                setRouteSteps([]);
                setRouteError(null);
                // Reset guidance state
                currentStepIdxRef.current = 0;
                setCurrentStepIdx(0);
                spokenRef.current = {};
                setVoiceOn(false);
                try { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); } catch {}
                // Clear destination and starting pos to return to normal map browsing
                setDest(null);
                setStartPos(null);
                // UI flags
                setJourneyCompleted(false);
                setShowOffRouteScreen(false);
                setAutoRouted(false);
                setAutoFollow(false);
              }}
              className="h-12 w-12 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white shadow-2xl hover:from-red-600 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-300/40"
              title="Exit navigation"
              aria-label="Exit navigation"
            >
              {/* exit/close icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2">
                <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {/* Voice guidance + heading toggles (moved to right). Only when navigating (dest set and route exists), hidden while banner is visible */}
        {(dest && routeCoords.length > 0) && !(routeSteps.length > 0 && userPos) && (
        <div className="absolute bottom-48 right-5 z-[1500]">
          <button
            onClick={() => { const next = !voiceOn; setVoiceOn(next); if (next) speak('Voice guidance on'); else if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }}
            className={`h-12 w-12 flex items-center justify-center rounded-full border backdrop-blur shadow-2xl focus:outline-none focus:ring-4 ${voiceOn ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500/60 focus:ring-blue-300/40' : 'bg-white/90 text-neutral-900 border-black/10 dark:bg-black/40 dark:text-white'}`}
            title="Toggle voice guidance"
            aria-label="Toggle voice guidance"
          >
            {/* Speaker icon */}
            {voiceOn ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path d="M3 9v6h4l5 4V5L7 9H3z"/>
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z"/>
                <path d="M14 3.23v2.06c2.89 1 5 3.77 5 6.71s-2.11 5.71-5 6.71v2.06c4.01-1.1 7-4.79 7-8.77s-2.99-7.67-7-8.77z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path d="M3 9v6h4l5 4V5L7 9H3z"/>
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" opacity=".35"/>
                <path d="M14 3.23v2.06c2.89 1 5 3.77 5 6.71s-2.11 5.71-5 6.71v2.06c4.01-1.1 7-4.79 7-8.77s-2.99-7.67-7-8.77z" opacity=".2"/>
                <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
          {/* Heading toggle */}
          <div className="mt-2">
            <button
              onClick={() => setHeadingUp((v) => !v)}
              className={`h-12 w-12 flex items-center justify-center rounded-full border backdrop-blur shadow-2xl focus:outline-none focus:ring-4 ${headingUp ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-500/60 focus:ring-emerald-300/40' : 'bg-white/90 text-neutral-900 border-black/10 dark:bg-black/40 dark:text-white'}`}
              title={headingUp ? 'Heading-up on' : 'Heading-up off'}
              aria-label="Toggle heading-up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path d="M12 2l4 10h-8l4-10z"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
          </div>
        </div>
        )}
        {/* On-route status chip */
        }
        {(routeCoords.length > 0 && userPos) && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1500]">
            <div className={`rounded-full border shadow-lg px-3 py-1.5 text-xs font-semibold backdrop-blur ${onRoute ? 'bg-emerald-500/90 border-emerald-600 text-white' : 'bg-red-500/90 border-red-600 text-white'}`}>
              {onRoute ? 'On route' : `Wrong route ~${Math.round(offRouteMeters)} m`}
            </div>
          </div>
        )}

        {/* Prominent wrong-route banner */}
        {showWrongRoute && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000]">
            <div className="rounded-xl bg-red-600 text-white border border-red-700 shadow-xl px-4 py-2 text-sm font-semibold">
              Wrong route detected â€¢ ~{Math.round(offRouteMeters)} m from route
            </div>
          </div>
        )}

        {/* Journey Completed overlay */}
        {journeyCompleted && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
            <div className="rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-2xl p-6 w-[min(92vw,360px)] text-center border border-black/10 dark:border-white/10">
              <div className="text-2xl font-bold text-emerald-600 mb-2">Journey Completed</div>
              <div className="text-sm opacity-80 mb-4">You have arrived at your destination.</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setJourneyCompleted(false)} className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-800">Close</button>
              </div>
            </div>
          </div>
        )}

      {/* Off-route full-screen notice with re-route option */}
      {showOffRouteScreen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-2xl p-6 w-[min(92vw,360px)] text-center border border-black/10 dark:border-white/10">
            <div className="text-lg font-semibold text-red-600 mb-2">You are off the route</div>
            <div className="text-sm opacity-80 mb-4">About {Math.round(offRouteMeters)} m away from the planned path.</div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowOffRouteScreen(false)} className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-800">Dismiss</button>
              <button
                onClick={() => { if (userPos && dest) { fetchRoute({ lat: userPos.lat, lon: userPos.lon }, dest); setShowOffRouteScreen(false); } }}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white"
              >
                Re-route
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Route summary and steps panel (removed; using inline banner only) */}
        {false && (
          <div
            className="fixed z-[2000]"
            style={{ left: panelPos.x, top: panelPos.y, width: 'min(86vw, 320px)' }}
          >
            {/* Collapsed pill */}
            {panelCollapsed ? (
              <div
                onMouseDown={onMouseDownHeader}
                onTouchStart={onTouchStartHeader}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg px-3 py-2 cursor-move"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/90 text-white text-xs font-bold">R</span>
                <div className="text-sm font-semibold">Route</div>
                <div className="ml-auto flex items-center gap-2">
                  {routeDistance != null && (
                    <span className="text-[11px] text-orange-700 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-200">{(routeDistance/1000).toFixed(1)} km</span>
                  )}
                  {routeDuration != null && (
                    <span className="text-[11px] text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200">{Math.ceil(routeDuration/60)} min</span>
                  )}
                </div>
                <button onClick={() => setPanelCollapsed(false)} className="ml-2 text-xs px-2 py-1 rounded-full bg-black/10 dark:bg-white/10">Open</button>
              </div>
            ) : (
              <div className="relative rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md shadow-2xl overflow-hidden">
                <div
                  onMouseDown={onMouseDownHeader}
                  onTouchStart={onTouchStartHeader}
                  className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-yellow-300/20 to-orange-500/25 cursor-move"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/90 text-white text-xs font-bold">R</span>
                    <div className="text-sm font-semibold">Route Preview</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {routeDistance != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-200 px-2 py-1 text-[11px] font-medium">{(routeDistance/1000).toFixed(1)} km</span>
                    )}
                    {routeDuration != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px] font-medium">{Math.ceil(routeDuration/60)} min</span>
                    )}
                    <button onClick={() => setPanelCollapsed(true)} className="text-xs px-2 py-1 rounded-full bg-black/10 dark:bg-white/10">Fold</button>
                  </div>
                </div>
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {routeDistance != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-200 px-2 py-1 text-[11px] font-medium">
                        {(routeDistance/1000).toFixed(1)} km
                      </span>
                    )}
                    {routeDuration != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px] font-medium">
                        {Math.ceil(routeDuration/60)} min
                      </span>
                    )}
                  </div>
                </div>
                {routeSteps.length > 0 && (
                  <div className="px-2 pb-3">
                    <ol ref={stepsListRef} className="max-h-48 overflow-auto space-y-2 pr-1">
                      {routeSteps.slice(0, 20).map((s, i) => {
                        const active = i === currentStepIdx;
                        return (
                          <li
                            key={i}
                            className={`flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors border ${active ? 'bg-orange-50/90 dark:bg-orange-500/10 border-orange-200 ring-1 ring-orange-300/60 shadow-sm' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                          >
                            <span className={`mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center ${active ? 'text-orange-600' : ''}`}>
                              {renderStepIcon(s.type, s.modifier)}
                            </span>
                            <span className={`text-[12px] leading-5 ${active ? 'text-orange-900 dark:text-orange-200 font-semibold' : 'text-neutral-800 dark:text-neutral-200'}`}>{s.text}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <div className="relative z-[2000]"><MobileNav /></div>
    </div>
  );
}

