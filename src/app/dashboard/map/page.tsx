"use client";

// Code-split heavy UI pieces to speed up initial render
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { LocationPermissionGate } from "@/components/location-permission-gate";
import { Skeleton } from "@/components/ui/skeleton";

// Jitter filter thresholds (meters)
const ACCURACY_MAX_M = 80;    // Ignore GPS updates worse than this
const MIN_MOVE_M = 7;         // Ignore tiny positional noise
const RECENTER_MOVE_M = 18;   // Only recenter map after moving this much

const RL = {
  MapContainer: dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false }),
  TileLayer: dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false }),
  CircleMarker: dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false }),
  Polyline: dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false }),
  Marker: dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false }),
  Circle: dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false }),
  Tooltip: dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false }),
} as const;

// Leaflet CSS is already provided via a <link> tag in src/app/layout.tsx

// Lazy-load header components to reduce first contentful paint
const UserProfile = dynamic(() => import("@/components/dashboard/user-profile").then(m => m.UserProfile), { ssr: false, loading: () => null });
const MobileNav = dynamic(() => import("@/components/dashboard/mobile-nav").then(m => m.MobileNav), { ssr: false, loading: () => null });

function DashboardMapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dest, setDest] = useState<{ lat: number; lon: number } | null>(null);
  const [searchFocusId, setSearchFocusId] = useState<string | number | null>(null);
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
  const [voiceOn, setVoiceOn] = useState<boolean>(true);
  const currentStepIdxRef = useRef<number>(0);
  const spokenRef = useRef<Record<number, { pre?: boolean; final?: boolean }>>({});
  // Show a clear warning when user goes off the planned route
  const [showWrongRoute, setShowWrongRoute] = useState<boolean>(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Suppress arrival modal for a brief window after auto route
  const [arrivalSuppressed, setArrivalSuppressed] = useState<boolean>(false);
  const arrivalTimerRef = useRef<any>(null);
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
  // Guard so we don't initialize plan twice unnecessarily
  const planInitRef = useRef<boolean>(false);
  // Track which plan stops have been visited (arrived)
  const [visitedPlanIds, setVisitedPlanIds] = useState<Set<number>>(new Set());
  // Background connectors between consecutive stops (1->2, 2->3, ...)
  const [stopConnectors, setStopConnectors] = useState<Array<Array<[number, number]>>>([]);
  // Point-to-point: connectors from user location to each found place
  const [ptpConnectors, setPtpConnectors] = useState<Array<Array<[number, number]>>>([]);
  // Pandals (POIs) near the active route within a buffer (meters)
  const [nearRoutePandals, setNearRoutePandals] = useState<Array<{ id: string | number; name?: string; lat: number; lon: number; nearest: [number, number]; distM: number }>>([]);
  // Nearest list for mode=nearest
  const [nearestItems, setNearestItems] = useState<Array<{ id: string | number; name: string; lat: number; lon: number; distM: number }>>([]);
  const [nearestLoading, setNearestLoading] = useState<boolean>(false);
  const [nearestError, setNearestError] = useState<string | null>(null);
  const [recenterPending, setRecenterPending] = useState<boolean>(false);
  // One-time initializer for nearest-mode sequencing
  const nearestInitRef = useRef<boolean>(false);
  // Track which nearest item user clicked (for highlighting)
  const [selectedNearestId, setSelectedNearestId] = useState<string | number | null>(null);
  // Lock: once a nearest item is chosen, ignore further changes until user unlocks
  const [nearestLocked, setNearestLocked] = useState<boolean>(false);
  // Persistently mark clicked nearest items with a tick
  const [checkedNearestIds, setCheckedNearestIds] = useState<Set<string | number>>(new Set());
  // Remember the user's position when a nearest item is selected; unlock when user moves far enough
  const [lockedFromPos, setLockedFromPos] = useState<{ lat: number; lon: number } | null>(null);
  // Mobile: make nearest panel taller when toggled by edge arrow
  const [nearestTall, setNearestTall] = useState<boolean>(false);
  // Allow fully hiding the nearest panel; an edge opener will show it again
  const [nearestHidden, setNearestHidden] = useState<boolean>(false);
  // Mobile: draggable Y position for the right-edge opener button (in px from top)
  const [edgeBtnTop, setEdgeBtnTop] = useState<number>(0);
  // Session (used for greeting and labeling own POIs)
  const { data: session } = useSession();
  
  // Speech synthesis helper (defined early so all functions can use it)
  const speak = useCallback((text: string) => {
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
  }, [voiceOn]);
  
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const mid = Math.max(8, Math.min(window.innerHeight - 44, window.innerHeight / 2 - 18));
        setEdgeBtnTop(mid);
      }
    } catch {}
  }, []);

  // Silent background refresh (no spinner) at a fixed interval when tab is visible
  useEffect(() => {
    if (true) return;
    let timer: any;
    const tick = () => {
      try {
        if (!document.hidden) router.refresh();
      } catch {}
    };
    timer = setInterval(tick, 30_000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { try { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); } catch {} };
  }, [router]);


  // Memoize POI marker elements to avoid re-creating JSX on each render
  const poiMarkerElements = useMemo(() => {
    try {
      return [] as React.ReactNode[];
    } catch {
      return [] as React.ReactNode[];
    }
  }, [searchParams, dest, routeCoords, poiMarkers, selectedPlanIdSet, myPlaceIcon, otherPlaceIcon, session?.user?.email, userPos, center]);

  useEffect(() => {
    // Defer mount to avoid Leaflet double init in StrictMode/HMR
    setMounted(true);
    const id = requestAnimationFrame(() => setMapKey(Date.now().toString(36) + Math.random().toString(36).slice(2)));
    return () => cancelAnimationFrame(id);
  }, []);

  // Helpers: meters conversion and nearest point to polyline (planar approximation near current latitude)
  const toRad = (v: number) => (v * Math.PI) / 180;
  const haversineM = (a: [number, number], b: [number, number]) => {
    const R = 6371000;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const la1 = toRad(a[0]);
    const la2 = toRad(b[0]);
    const A = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(A));
  };
  const metersXY = (lat: number, lon: number, refLat: number) => {
    const R = 6371000;
    const x = toRad(lon) * R * Math.cos(toRad(refLat));
    const y = toRad(lat) * R;
    return { x, y };
  };
  const nearestOnSegment = (p: [number, number], a: [number, number], b: [number, number], refLat: number) => {
    const P = metersXY(p[0], p[1], refLat);
    const A = metersXY(a[0], a[1], refLat);
    const B = metersXY(b[0], b[1], refLat);
    const ABx = B.x - A.x, ABy = B.y - A.y;
    const APx = P.x - A.x, APy = P.y - A.y;
    const ab2 = ABx * ABx + ABy * ABy;
    let t = ab2 === 0 ? 0 : (APx * ABx + APy * ABy) / ab2;
    t = Math.max(0, Math.min(1, t));
    const Nx = A.x + ABx * t, Ny = A.y + ABy * t;
    // convert back to lat/lon
    const nLon = (Nx / (6371000 * Math.cos(toRad(refLat)))) * (180 / Math.PI);
    const nLat = (Ny / 6371000) * (180 / Math.PI);
    return [nLat, nLon] as [number, number];
  };
  const nearestPointOnPolyline = (p: [number, number], line: Array<[number, number]>) => {
    if (line.length < 2) return { nearest: line[0] || p, distM: haversineM(p, line[0] || p) };
    const refLat = p[0];
    let best: [number, number] = line[0];
    let bestD = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const n = nearestOnSegment(p, line[i], line[i + 1], refLat);
      const d = haversineM(p, n);
      if (d < bestD) { bestD = d; best = n; }
    }
    return { nearest: best, distM: bestD };
  };

  // Compute pandals within 5km on either side of the active route
  useEffect(() => {
    try {
      if (!routeCoords || routeCoords.length < 2) { setNearRoutePandals([]); return; }
      if (!poiMarkers || poiMarkers.length === 0) { setNearRoutePandals([]); return; }
      const maxDistM = 5000; // 5 km
      const list: Array<{ id: string | number; name?: string; lat: number; lon: number; nearest: [number, number]; distM: number }> = [];
      for (const poi of poiMarkers) {
        const p: [number, number] = [poi.lat, poi.lon];
        const { nearest, distM } = nearestPointOnPolyline(p, routeCoords);
        if (Number.isFinite(distM) && distM <= maxDistM) {
          list.push({ id: poi.id, name: poi.title, lat: poi.lat, lon: poi.lon, nearest, distM });
        }
      }
      // sort nearest first for stable rendering
      list.sort((a, b) => a.distM - b.distM);
      setNearRoutePandals(list);
    } catch { setNearRoutePandals([]); }
  }, [routeCoords, poiMarkers]);

  // Memoize route polylines (ahead/past/single) and near-route connectors to reduce re-renders
  const routeElements = useMemo(() => {
    const items: React.ReactNode[] = [];
    if (routeAheadCoords.length > 0) {
      if (routePastCoords.length > 1) {
        items.push(
          <RL.Polyline key="past-case" positions={routePastCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
        );
        items.push(
          <RL.Polyline key="past" positions={routePastCoords} pathOptions={{ color: '#9ca3af', weight: 5, opacity: 0.65 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
        );
      }
      items.push(
        <RL.Polyline key="ahead-case" positions={routeAheadCoords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
      );
      items.push(
        <RL.Polyline key="ahead" positions={routeAheadCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.98 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
      );
    } else if (routeCoords.length > 0) {
      items.push(
        <RL.Polyline key="single-case" positions={routeCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.95 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
      );
      items.push(
        <RL.Polyline key="single" positions={routeCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.98 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
      );
    }
    // Disabled blue dotted lines to nearby pandals
    /*
    if (nearRoutePandals.length > 0) {
      for (const n of nearRoutePandals) {
        items.push(
          <RL.Polyline
            key={`near-${n.id}`}
            positions={[n.nearest, [n.lat, n.lon]]}
            pathOptions={{ color: '#0ea5e9', weight: 3, opacity: 0.9, dashArray: '4 6' }}
            smoothFactor={1.5}
            interactive={false}
            bubblingMouseEvents={false}
          />
        );
      }
    }
    */
    return <>{items}</>;
  }, [routeAheadCoords, routePastCoords, routeCoords, nearRoutePandals]);

  // Skip polling when user hasn't moved significantly and there is no active navigation
  const lastTickCenterRef = useRef<[number, number] | null>(null);

  // Auto-unlock nearest selection only when the user moves far enough from the position at which it was locked
  useEffect(() => {
    try {
      if (searchParams.get('mode') !== 'nearest') return;
      if (!nearestLocked) return;
      if (!lockedFromPos || !userPos) return;
      const moved = haversine([userPos.lat, userPos.lon], [lockedFromPos.lat, lockedFromPos.lon]);
      if (moved >= 250) {
        // Allow changing destination again; keep current selection and route intact
        setNearestLocked(false);
        setLockedFromPos({ lat: userPos.lat, lon: userPos.lon });
      }
    } catch {}
  }, [userPos, lockedFromPos, nearestLocked, searchParams]);

  // Populate nearest list when mode=nearest is set via query string
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode !== 'nearest') { setNearestItems([]); return; }
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');
    const rStr = searchParams.get('r'); // meters
    const cLat = latStr ? parseFloat(latStr) : NaN;
    const cLon = lonStr ? parseFloat(lonStr) : NaN;
    const radiusM = rStr ? parseFloat(rStr) : NaN;
    if (Number.isNaN(cLat) || Number.isNaN(cLon) || Number.isNaN(radiusM)) { setNearestItems([]); return; }
    const centerPt: [number, number] = [cLat, cLon];
    const toMeters = (a: [number, number], b: [number, number]) => haversine(a, b);
    let stopped = false;
    setNearestLoading(true);
    setNearestError(null);
    (async () => {
      try {
        const res = await fetch('/api/places', { cache: 'no-store' });
        const data = await res.json();
        const list: any[] = Array.isArray(data?.places) ? data.places : [];
        const out: Array<{ id: string | number; name: string; lat: number; lon: number; distM: number }>=[];
        for (const p of list) {
          let lat: number | null = null, lon: number | null = null;
          if (typeof p.lat === 'number' && typeof p.lon === 'number') { lat = p.lat; lon = p.lon; }
          else if (typeof p.location === 'string' && p.location.includes(',')) {
            const parts = p.location.split(',').map((s: string) => s.trim());
            const a = parseFloat(parts[0] || ''), b = parseFloat(parts[1] || '');
            if (!Number.isNaN(a) && !Number.isNaN(b)) {
              if (Math.abs(a) <= 90 && Math.abs(b) <= 180) { lat = a; lon = b; }
              else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) { lat = b; lon = a; }
            }
          }
          if (lat == null || lon == null) continue;
          const d = toMeters(centerPt, [lat, lon]);
          if (d <= radiusM) {
            const name: string = (p.tags?.name || p.name || `Place #${p.id}`);
            out.push({ id: p.id ?? p._id ?? `${lat},${lon}`, name, lat, lon, distM: d });
          }
        }
        out.sort((a, b) => a.distM - b.distM);
        if (!stopped) setNearestItems(out);
      } catch {
        if (!stopped) { setNearestItems([]); setNearestError('Failed to load nearby places'); }
      } finally {
        if (!stopped) setNearestLoading(false);
      }
    })();
    return () => { stopped = true; };
  }, [searchParams]);

  // When in nearest mode and items are available, previously we auto-built a route chain.
  // Per new requirement: DO NOT auto route or draw connectors; just show the list.
  useEffect(() => {
    try {
      if (searchParams.get('mode') !== 'nearest') return;
      // Explicitly do nothing here; navigation starts only when a user clicks a list item.
      nearestInitRef.current = true;
    } catch {}
  }, [nearestItems, searchParams]);

  // If auto routing requested via query (?auto=1 or ?route=chain), suppress the arrival modal briefly
  useEffect(() => {
    try {
      const auto = searchParams.get('auto');
      const routeMode = searchParams.get('route');
      if ((auto === '1' || !!routeMode) && !arrivalSuppressed) {
        setArrivalSuppressed(true);
        if (arrivalTimerRef.current) { try { clearTimeout(arrivalTimerRef.current); } catch {} }
        arrivalTimerRef.current = setTimeout(() => setArrivalSuppressed(false), 9000);
      }
    } catch {}
    return () => { try { if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current); } catch {} };
  }, [searchParams, arrivalSuppressed]);

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

  // Duplicate speak function removed - now defined at component top

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
  }, [onRoute, offRouteMeters, routeCoords.length, userPos, voiceOn, speak]);

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
    const fromLat = searchParams.get('fromLat');
    const fromLon = searchParams.get('fromLon');
    const toLat = searchParams.get('toLat');
    const toLon = searchParams.get('toLon');
    const isPtP = fromLat && fromLon && toLat && toLon; // Point-to-point mode if from/to present
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
          
          // If point-to-point mode, filter and order locations along the route
          if (isPtP && fromLat && fromLon && toLat && toLon) {
            const startLat = parseFloat(fromLat);
            const startLon = parseFloat(fromLon);
            const endLat = parseFloat(toLat);
            const endLon = parseFloat(toLon);
            
            if (!Number.isNaN(startLat) && !Number.isNaN(startLon) && !Number.isNaN(endLat) && !Number.isNaN(endLon)) {
              // First, get the main route from start to end
              const mainRouteUrl = `https://router.project-osrm.org/route/v1/foot/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
              const routeRes = await fetch(mainRouteUrl, { cache: 'no-store' });
              const routeData = await routeRes.json();
              const mainRoute = routeData?.routes?.[0];
              
              if (mainRoute && Array.isArray(mainRoute.geometry?.coordinates)) {
                const mainRouteCoords: Array<[number, number]> = mainRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                
                // Helper: Haversine distance in meters
                const haversineM = (a: [number, number], b: [number, number]) => {
                  const R = 6371000;
                  const toRad = (v: number) => (v * Math.PI) / 180;
                  const dLat = toRad(b[0] - a[0]);
                  const dLon = toRad(b[1] - a[1]);
                  const la1 = toRad(a[0]);
                  const la2 = toRad(b[0]);
                  const A = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
                  return 2 * R * Math.asin(Math.sqrt(A));
                };
                
                // Helper: Find nearest point on route to a location
                const nearestOnRoute = (loc: { lat: number; lon: number }) => {
                  let minDist = Infinity;
                  for (const pt of mainRouteCoords) {
                    const d = haversineM([loc.lat, loc.lon], pt);
                    if (d < minDist) minDist = d;
                  }
                  return minDist;
                };
                
                // Filter locations within 10km of start OR end OR within 10km of the route
                const RADIUS_M = 10000; // 10km
                const filteredStops = stops.filter(s => {
                  const distFromStart = haversineM([s.lat, s.lon], [startLat, startLon]);
                  const distFromEnd = haversineM([s.lat, s.lon], [endLat, endLon]);
                  const distFromRoute = nearestOnRoute(s);
                  return distFromStart <= RADIUS_M || distFromEnd <= RADIUS_M || distFromRoute <= RADIUS_M;
                });
                
                if (filteredStops.length === 0) {
                  // No locations found within range
                  setPlanStops([]);
                  setPtpConnectors([]);
                  return;
                }
                
                // Order locations by their position along the route (nearest-first chain)
                const connectors: Array<Array<[number, number]>> = [];
                const remaining = [...filteredStops];
                let currentPos = { lat: startLat, lon: startLon };
                const orderedStops: typeof stops = [];
                
                // Greedy nearest-neighbor algorithm
                while (remaining.length > 0) {
                  let nearestIdx = 0;
                  let nearestDist = Infinity;
                  for (let i = 0; i < remaining.length; i++) {
                    const dist = haversineM([currentPos.lat, currentPos.lon], [remaining[i].lat, remaining[i].lon]);
                    if (dist < nearestDist) {
                      nearestDist = dist;
                      nearestIdx = i;
                    }
                  }
                  
                  const nextStop = remaining[nearestIdx];
                  orderedStops.push(nextStop);
                  
                  // Create connector from current position to next stop
                  connectors.push([
                    [currentPos.lat, currentPos.lon] as [number, number],
                    [nextStop.lat, nextStop.lon] as [number, number]
                  ]);
                  
                  // Update current position and remove visited stop
                  currentPos = { lat: nextStop.lat, lon: nextStop.lon };
                  remaining.splice(nearestIdx, 1);
                }
                
                // Update stops order to match the chain
                setPlanStops(orderedStops);
                setPtpConnectors(connectors);
                
                // Center map to show all points
                const allLats = [startLat, ...orderedStops.map(s => s.lat), endLat];
                const allLons = [startLon, ...orderedStops.map(s => s.lon), endLon];
                const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
                const centerLon = (Math.min(...allLons) + Math.max(...allLons)) / 2;
                setCenter([centerLat, centerLon]);
                setZoom(12);
              }
            }
          }
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When we have plan stops, order them by distance from the best available start
  useEffect(() => {
    if (planStops.length === 0) return;
    if (planInitRef.current) return;
    const routeMode = searchParams.get('route');
    const begin = (from: { lat: number; lon: number }) => {
      // If route=chain was requested, preserve the provided plan order
      const ordered = routeMode === 'chain'
        ? [...planStops]
        : [...planStops].sort((a, b) => {
            const da = haversine([from.lat, from.lon], [a.lat, a.lon]);
            const db = haversine([from.lat, from.lon], [b.lat, b.lon]);
            return da - db;
          });
      setOrderedPlanStops(ordered);
      // Reset visited markers when a new plan sequence begins
      setVisitedPlanIds(new Set());
      // Build background connectors between stop i -> i+1
      buildStopConnectors(ordered).catch(() => setStopConnectors([]));
      setPlanIdx(0);
      const first = ordered[0];
      setDest({ lat: first.lat, lon: first.lon });
      // Kick off routing from geolocation (or provided fromLat/fromLon)
      startNavigation();
      planInitRef.current = true;
    };
    // Prefer explicit fromLat/fromLon passed via query to avoid using device location
    const fromLat = searchParams.get('fromLat');
    const fromLon = searchParams.get('fromLon');
    if (fromLat && fromLon) {
      const fLat = parseFloat(fromLat);
      const fLon = parseFloat(fromLon);
      if (!Number.isNaN(fLat) && !Number.isNaN(fLon)) {
        const from = { lat: fLat, lon: fLon };
        setUserPos(from);
        setStartPos(from);
        begin(from);
        return;
      }
    }
    // If we already have live user position, use that to pick the nearest first
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
  }, [planStops, userPos, searchParams]);

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
    return;
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
  // Skip in nearest mode to avoid double-start (we fetchRoute directly on item click there)
  useEffect(() => {
    if (searchParams.get('mode') === 'nearest') return;
    if (!autoRouted && dest) {
      startNavigation();
      setAutoRouted(true);
    }
  }, [dest, autoRouted, searchParams]);

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
  const [userPulseIcon, setUserPulseIcon] = useState<any>(null);
  const [userArrowIcon, setUserArrowIcon] = useState<any>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  // Plan stop icons (visited/pending = red, current target = blue)
  const [planIconRed, setPlanIconRed] = useState<any>(null);
  const [planIconBlue, setPlanIconBlue] = useState<any>(null);
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

  // Build a pulsing user dot (CSS animated) as a Leaflet divIcon
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const html = `
        <div class="user-pulse">
          <div class="ring"></div>
          <div class="dot"></div>
        </div>`;
      const icon = L.divIcon({ className: 'user-pulse-icon', html, iconSize: [36, 36], iconAnchor: [18, 18] });
      setUserPulseIcon(icon);
    })();
  }, [mounted]);

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
      if (dToDest <= 20 && !arrivalSuppressed) {
        // Play arrival tone
        try { const audio = new Audio('/sound/b%20tone.wav'); audio.play().catch(() => {}); } catch {}
        const inNearest = searchParams.get('mode') === 'nearest';

        // Persist visit to localStorage on arrival: upgrade to visited
        try {
          const approxeq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
          // Try to determine a human-friendly name
          let arrivedName: string = 'Destination';
          let arrivedId: string | number | null = null;
          // If in nearest mode, try to match selectedNearestId or nearestItems by coords
          if (inNearest && nearestItems && nearestItems.length > 0) {
            const byId = nearestItems.find(it => it.id === selectedNearestId);
            if (byId) { arrivedName = byId.name || arrivedName; arrivedId = (byId.id as any) ?? null; }
            else {
              const byCoord = nearestItems.find(it => Math.hypot(it.lat - dest.lat, it.lon - dest.lon) < 0.0005);
              if (byCoord) { arrivedName = byCoord.name || arrivedName; arrivedId = (byCoord.id as any) ?? null; }
            }
          }
          // If multi-stop plan, use current stop name
          if (arrivedName === 'Destination' && orderedPlanStops && orderedPlanStops.length > 0 && planIdx < orderedPlanStops.length) {
            const cur = orderedPlanStops[planIdx];
            if (cur?.name) arrivedName = cur.name;
            if ((cur as any)?.id != null) arrivedId = (cur as any).id;
          }
          // Fallback to address from query if name is still generic
          if (!arrivedName || arrivedName === 'Destination') {
            const addr = searchParams.get('address');
            if (addr) arrivedName = addr;
          }
          const raw = localStorage.getItem('visit-history');
          const arr: Array<any> = raw ? JSON.parse(raw) : [];
          // Find a recent not-visited entry for this dest (within 50m) and upgrade it
          const within50m = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => haversine([a.lat, a.lon], [b.lat, b.lon]) <= 50;
          const idx = arr.findIndex((e: any) => within50m({ lat: e.lat, lon: e.lon }, { lat: dest.lat, lon: dest.lon }));
          if (idx >= 0) {
            arr[idx].status = 'visited';
            arr[idx].name = arrivedName || 'Destination';
            arr[idx].id = arrivedId;
            arr[idx].time = Date.now();
          } else {
            arr.unshift({ id: arrivedId, name: arrivedName || 'Destination', lat: dest.lat, lon: dest.lon, time: Date.now(), status: 'visited' });
          }
          localStorage.setItem('visit-history', JSON.stringify(arr.slice(0, 200)));
        } catch {}

        if (orderedPlanStops.length > 0 && planIdx < orderedPlanStops.length - 1) {
          const nextIdx = planIdx + 1;
          const next = orderedPlanStops[nextIdx];
          setPlanIdx(nextIdx);
          setDest({ lat: next.lat, lon: next.lon });
          startNavigation();
          speak(`Proceeding to ${next.name}`);
        } else if (!journeyCompleted && !inNearest) {
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

  // Off-route popup controller - DISABLED
  // useEffect(() => {
  //   let timer: any;
  //   if (!onRoute && offRouteMeters > 35) {
  //     timer = setTimeout(() => {
  //       setOffRoutePopup(true);
  //       setShowOffRouteScreen(true);
  //     }, 3000);
  //   } else {
  //     setOffRoutePopup(false);
  //     setShowOffRouteScreen(false);
  //   }
  //   return () => timer && clearTimeout(timer);
  // }, [onRoute, offRouteMeters]);

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
      const html = `<img src="https://cdn-icons-png.flaticon.com/512/4601/4601807.png" alt="mine" style="width:28px;height:28px;object-fit:contain;"/>`;
      const icon = L.divIcon({ className: 'my-place poi-pop', html, iconSize: [28, 28], iconAnchor: [14, 28] });
      setMyPlaceIcon(icon);
    })();
  }, [mounted]);

  // Create custom icon for other people's places (green pin image)
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const html = `<img src="https://cdn-icons-png.flaticon.com/512/2776/2776067.png" alt="place" style="width:26px;height:26px;object-fit:contain;"/>`;
      const icon = L.divIcon({ className: 'other-place poi-pop', html, iconSize: [26, 26], iconAnchor: [13, 26] });
      setOtherPlaceIcon(icon);
    })();
  }, [mounted]);

  // Create icons for plan stops using provided image; blue for current, red for visited/pending
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const size: [number, number] = [28, 28];
      const anchor: [number, number] = [14, 28];
      const baseUrl = 'https://cdn-icons-png.flaticon.com/512/727/727606.png';
      const redHtml = `
        <div style="width:${size[0]}px;height:${size[1]}px;display:grid;place-items:center;filter:saturate(1.2);">
          <img src="${baseUrl}" alt="location" style="width:100%;height:100%;object-fit:contain;filter:none;"/>
        </div>`;
      const blueHtml = `
        <div style="width:${size[0]}px;height:${size[1]}px;display:grid;place-items:center;">
          <img src="${baseUrl}" alt="location" style="width:100%;height:100%;object-fit:contain;filter:hue-rotate(200deg) saturate(2) brightness(1.1);"/>
        </div>`;
      setPlanIconRed(L.divIcon({ className: 'plan-stop-red poi-pop', html: redHtml, iconSize: size, iconAnchor: anchor }));
      setPlanIconBlue(L.divIcon({ className: 'plan-stop-blue poi-pop', html: blueHtml, iconSize: size, iconAnchor: anchor }));
    })();
  }, [mounted]);

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const address = searchParams.get('address');
    const fromLat = searchParams.get('fromLat');
    const fromLon = searchParams.get('fromLon');
    const mode = searchParams.get('mode');
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
      if (mode !== 'nearest') {
        autoStartTo({ lat: latNum, lon: lonNum });
      }
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
              if (mode !== 'nearest') {
                autoStartTo({ lat: latNum, lon: lonNum });
              }
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

        // Persist this navigation attempt to history (so user sees it even if not arrived) as not-visited
        try {
          const inNearest = searchParams.get('mode') === 'nearest';
          let name: string = 'Destination';
          let pid: string | number | null = null;
          if (inNearest && nearestItems && nearestItems.length > 0) {
            const byId = nearestItems.find(it => it.id === selectedNearestId);
            if (byId) { name = byId.name || name; pid = (byId.id as any) ?? null; }
            else {
              const byCoord = nearestItems.find(it => Math.hypot(it.lat - to.lat, it.lon - to.lon) < 0.0005);
              if (byCoord) { name = byCoord.name || name; pid = (byCoord.id as any) ?? null; }
            }
          }
          if (name === 'Destination' && orderedPlanStops && orderedPlanStops.length > 0) {
            const match = orderedPlanStops.find(s => Math.hypot(s.lat - to.lat, s.lon - to.lon) < 0.0005);
            if (match?.name) name = match.name;
            if ((match as any)?.id != null) pid = (match as any).id;
          }
          const raw = localStorage.getItem('visit-history');
          const arr: Array<any> = raw ? JSON.parse(raw) : [];
          // If existing entry within 50m exists, do not downgrade visited; otherwise add not-visited
          const toMeters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => haversine([a.lat, a.lon], [b.lat, b.lon]);
          const idx = arr.findIndex((e: any) => toMeters({ lat: e.lat, lon: e.lon }, { lat: to.lat, lon: to.lon }) <= 50);
          if (idx === -1) {
            arr.unshift({ id: pid, name, lat: to.lat, lon: to.lon, time: Date.now(), status: 'not-visited' });
            localStorage.setItem('visit-history', JSON.stringify(arr.slice(0, 200)));
          }
        } catch {}
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

  const startNavigationTo = useCallback((target: { lat: number; lon: number }) => {
    try {
      const fromLat = searchParams.get('fromLat');
      const fromLon = searchParams.get('fromLon');
      if (fromLat && fromLon) {
        const fLat = parseFloat(fromLat);
        const fLon = parseFloat(fromLon);
        if (!Number.isNaN(fLat) && !Number.isNaN(fLon)) {
          const from = { lat: fLat, lon: fLon };
          setUserPos(from);
          setStartPos(from);
          fetchRoute(from, target);
          return;
        }
      }
    } catch {}
    if (!navigator.geolocation) {
      const [lat, lon] = center;
      let from = { lat, lon };
      const sameAsDest = Math.hypot((from.lat - target.lat), (from.lon - target.lon)) < 0.0005;
      if (sameAsDest) {
        from = { lat: target.lat + 0.005, lon: target.lon + 0.005 };
      }
      setStartPos(from);
      fetchRoute(from, target);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setStartPos(me);
        setUserPos(me);
        fetchRoute(me, target);
        setCenter([me.lat, me.lon]);
        setZoom(14);
      },
      () => {
        const [lat, lon] = center;
        let from = { lat, lon };
        const sameAsDest = Math.hypot((from.lat - target.lat), (from.lon - target.lon)) < 0.0005;
        if (sameAsDest) {
          from = { lat: target.lat + 0.005, lon: target.lon + 0.005 };
        }
        setStartPos(from);
        fetchRoute(from, target);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [center, fetchRoute, searchParams]);

  // Duplicate speak function removed - using the one defined earlier with voice preferences

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
    // If fromLat/fromLon are in the query, respect them for initial leg
    try {
      const fromLat = searchParams.get('fromLat');
      const fromLon = searchParams.get('fromLon');
      if (fromLat && fromLon) {
        const fLat = parseFloat(fromLat);
        const fLon = parseFloat(fromLon);
        if (!Number.isNaN(fLat) && !Number.isNaN(fLon)) {
          const from = { lat: fLat, lon: fLon };
          setUserPos(from);
          setStartPos(from);
          fetchRoute(from, dest);
          // Do not return; continue to initialize geolocation so live guidance can follow the user
        }
      }
    } catch {}
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
        // Initial center once; auto-follow effect will keep view sensible without jitter
        setCenter([me.lat, me.lon]);
        setZoom(14);
        // Only follow live if enabled
        if (liveUpdate) {
          const watchId = navigator.geolocation.watchPosition(
            (upd) => {
              const cur = { lat: upd.coords.latitude, lon: upd.coords.longitude };
              const acc = typeof upd.coords.accuracy === 'number' ? upd.coords.accuracy : null;
              // Drop very inaccurate fixes
              if (acc != null && acc > ACCURACY_MAX_M) return;
              // Drop micro-movements that are likely noise
              if (userPos) {
                const movedSmall = haversine([userPos.lat, userPos.lon], [cur.lat, cur.lon]);
                if (movedSmall < MIN_MOVE_M) return;
              }
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
              // Auto-follow: center to user only after meaningful movement
              if (autoFollow) {
                try {
                  const movedFromCenter = haversine([center[0], center[1]], [cur.lat, cur.lon]);
                  if (movedFromCenter >= RECENTER_MOVE_M) {
                    setCenter([cur.lat, cur.lon]);
                    setZoom((z) => Math.max(z, 16));
                  }
                } catch {}
              }
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

  // Show a small, non-blocking tip when routing but user location is unavailable
  const [showLocTip, setShowLocTip] = useState(false);
  useEffect(() => {
    if ((routeCoords.length > 0 || geoWatchRef.current != null) && !userPos && !showLocTip) {
      setShowLocTip(true);
      const t = setTimeout(() => setShowLocTip(false), 5000);
      return () => clearTimeout(t);
    }
  }, [routeCoords.length, userPos, showLocTip]);

  return (
    <div className="relative h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
       <header className="absolute top-3 left-3 right-3 z-[2000] flex h-14 shrink-0 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border-2 border-orange-400/30 dark:border-orange-500/30 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-xl slide-in-right">
        <div className="flex items-center gap-2 md:flex-1">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl md:text-3xl font-extrabold text-transparent drop-shadow-md tracking-tight">
            Manchitra
          </h1>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <UserProfile />
        </div>
      </header>

      {/* Nearest list panel (when mode=nearest) */}
      {searchParams.get('mode') === 'nearest' && (
        <div className="absolute top-[72px] left-3 right-3 z-[1900] md:left-auto md:right-3 md:w-[360px]">
          {!nearestHidden && (
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Nearest within radius</div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-700 sm:hidden"
                onClick={() => setNearestHidden(true)}
                title="Hide"
                aria-label="Hide list"
              >
                {/* Chevron to the right indicates collapse */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            {nearestLoading ? (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">Loading…</div>
            ) : nearestError ? (
              <div className="text-xs text-red-600">{nearestError}</div>
            ) : nearestItems.length === 0 ? (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">No places found in this area.</div>
            ) : (
              <ol className={`${nearestTall ? 'max-h-[75vh]' : 'max-h-64'} overflow-auto space-y-2`}>
                {nearestItems.map((it, idx) => (
                  <li key={it.id}>
                    <button
                      className={`w-full text-left rounded-xl border shadow-sm px-3 py-2 flex items-center gap-2 ${selectedNearestId === it.id
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-white/70 dark:bg-black/30 border-neutral-200 dark:border-white/10 hover:bg-white'}`}
                      onClick={() => {
                        const to = { lat: it.lat, lon: it.lon };
                        setSelectedNearestId(it.id);
                        // Tick all items up to the clicked index (1..idx+1)
                        setCheckedNearestIds(prev => {
                          const s = new Set(prev);
                          for (let j = 0; j <= idx; j++) {
                            s.add(nearestItems[j].id);
                          }
                          return s;
                        });
                        setDest(to);
                        // Immediately compute a route so the red polyline shows without delay
                        try {
                          if (userPos) {
                            fetchRoute({ lat: userPos.lat, lon: userPos.lon }, to);
                            setStartPos({ lat: userPos.lat, lon: userPos.lon });
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
                        // Do not start live navigation in nearest mode; avoid double-start
                        setCenter([it.lat, it.lon]);
                        setZoom((z) => Math.max(z, 15));
                        // Do not modify URL/query; keep nearest list anchored to original radius center
                        // Persist visit to localStorage history
                        try {
                          const raw = localStorage.getItem('visit-history');
                          const arr: Array<{ id: string | number | null; name: string; lat: number; lon: number; time: number }> = raw ? JSON.parse(raw) : [];
                          arr.unshift({ id: it.id ?? null, name: it.name, lat: it.lat, lon: it.lon, time: Date.now() });
                          const trimmed = arr.slice(0, 200);
                          localStorage.setItem('visit-history', JSON.stringify(trimmed));
                        } catch {}
                      }}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-semibold bg-emerald-600`}>
                        {checkedNearestIds.has(it.id) ? (
                          // Check icon
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <>{idx + 1}</>
                        )}
                      </span>
                      <span className={`flex-1 truncate text-sm ${selectedNearestId === it.id ? 'text-emerald-800' : 'text-neutral-900 dark:text-neutral-100'}`}>{it.name}</span>
                      <span className={`text-xs ${selectedNearestId === it.id ? 'text-emerald-700' : 'text-neutral-600 dark:text-neutral-400'}`}>{Math.round(it.distM)} m</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          )}
          {/* Mobile edge opener: only visible when the panel is hidden */}
          {nearestHidden && (
            <button
              className="sm:hidden fixed right-[2px] z-[2000] h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-neutral-200 shadow flex items-center justify-center"
              style={{ top: edgeBtnTop }}
              onClick={() => setNearestHidden(false)}
              aria-label="Show nearest list"
              title="Show nearest"
              onTouchStart={(e) => {
                try {
                  const t = e.touches && e.touches[0];
                  if (!t) return;
                  const y = t.clientY - 18; // center the 36px button
                  const maxY = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
                  const clamped = Math.max(8, Math.min(maxY, y));
                  setEdgeBtnTop(clamped);
                } catch {}
              }}
              onTouchMove={(e) => {
                try {
                  e.preventDefault();
                  const t = e.touches && e.touches[0];
                  if (!t) return;
                  const y = t.clientY - 18;
                  const maxY = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
                  const clamped = Math.max(8, Math.min(maxY, y));
                  setEdgeBtnTop(clamped);
                } catch {}
              }}
            >
              {/* Chevron left to indicate opening */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-neutral-700"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      )}
      <main className="relative h-full w-full z-0 pt-20 md:pt-24 px-3 md:px-4">
        {(!mounted || !mapKey) ? (
          // Render a blank container without any spinner or loading text
          <div className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden relative">
            <Skeleton className="absolute inset-0 h-full w-full" />
          </div>
        ) : (
          <div className="relative h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 fade-in">
          {/* Ambient and grid overlays */}
          <div className="map-ambient" />
          <div className="map-grid-overlay" />
          {/* Modern corner accents */}
          <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-emerald-500/30 rounded-tl-2xl pointer-events-none z-[1000]"></div>
          <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-emerald-500/30 rounded-tr-2xl pointer-events-none z-[1000]"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-emerald-500/30 rounded-bl-2xl pointer-events-none z-[1000]"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-emerald-500/30 rounded-br-2xl pointer-events-none z-[1000]"></div>
          <RL.MapContainer
            key={mapKey}
            center={center}
            zoom={zoom}
            ref={mapRef as any}
            style={{ height: '100%', width: '100%' }}
            preferCanvas={true}
            zoomAnimation={true}
            markerZoomAnimation={true}
            fadeAnimation={true}
            zoomAnimationThreshold={4}
            wheelDebounceTime={40}
            wheelPxPerZoomLevel={60}
            zoomSnap={0.5}
            zoomDelta={0.5}
          >
            <RL.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              keepBuffer={1}
              detectRetina={false}
            />
            {dest && destIcon && (
              <RL.Marker position={[dest.lat, dest.lon]} icon={destIcon} />
            )}
            {browsePos && (
              <RL.CircleMarker center={[browsePos.lat, browsePos.lon]} radius={4} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1, className: 'poi-pop' }} />
            )}
            {userPos && (
              <>
                {userPulseIcon && (
                  <RL.Marker position={[userPos.lat, userPos.lon]} icon={userPulseIcon} zIndexOffset={-100} />
                )}
                {userArrowIcon ? (
                  <RL.Marker position={[userPos.lat, userPos.lon]} icon={userArrowIcon} />
                ) : (
                  <RL.CircleMarker center={[userPos.lat, userPos.lon]} radius={5} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }} />
                )}
              </>
            )}
            {routeAheadCoords.length > 0 ? (
              <>
                {/* Past segment casing */}
                {routePastCoords.length > 1 && (
                  <RL.Polyline positions={routePastCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                )}
                {/* Past segment (already traversed) */}
                {routePastCoords.length > 1 && (
                  <RL.Polyline positions={routePastCoords} pathOptions={{ color: '#9ca3af', weight: 5, opacity: 0.65 }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                )}
                {/* Ahead segment casing */}
                <RL.Polyline positions={routeAheadCoords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95 }} smoothFactor={1.2} interactive={false} bubblingMouseEvents={false} />
                {/* Ahead segment (remaining) */}
                <RL.Polyline positions={routeAheadCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.98 }} smoothFactor={1.2} interactive={false} bubblingMouseEvents={false} />
              </>
            ) : (
              routeCoords.length > 0 && (
                <>
                  {/* Single route casing */}
                  <RL.Polyline positions={routeCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.95 }} smoothFactor={1.2} interactive={false} bubblingMouseEvents={false} />
                  {/* Single route */}
                  <RL.Polyline positions={routeCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.98 }} smoothFactor={1.2} interactive={false} bubblingMouseEvents={false} />
                </>
              )
            )}
            {/* Pandals within 5km of route: draw connector polylines from route to POI */}
            {/* Disabled blue dotted lines
            {nearRoutePandals.length > 0 && nearRoutePandals.map((n) => (
              <RL.Polyline
                key={`near-${n.id}`}
                positions={[n.nearest, [n.lat, n.lon]]}
                pathOptions={{ color: '#0ea5e9', weight: 3, opacity: 0.9, dashArray: '4 6' }}
                smoothFactor={1.5}
                interactive={false}
                bubblingMouseEvents={false}
              />
            ))}
            */}
            {/* User -> near-route POI connectors */}
            {/* Disabled blue dotted lines
            {userPos && nearRoutePandals.length > 0 && nearRoutePandals.map((n) => (
              <RL.Polyline
                key={`user-to-${n.id}`}
                positions={[[userPos.lat, userPos.lon], [n.lat, n.lon]]}
                pathOptions={{ color: '#0ea5e9', weight: 2, opacity: 0.8, dashArray: '2 6' }}
                smoothFactor={1.5}
                interactive={false}
                bubblingMouseEvents={false}
              />
            ))}
            */}
            {/* Future legs between planned stops: hide entirely in nearest mode */}
            {stopConnectors.length > 0 && searchParams.get('mode') !== 'nearest' && (
              <>
                {/* Casing for future connectors */}
                {stopConnectors.slice(Math.max(0, planIdx)).map((seg, i) => (
                  <RL.Polyline key={`conn-case-${i + planIdx}`} positions={seg} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.8, lineCap: 'round' }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                ))}
                {/* Colored future connectors */}
                {stopConnectors.slice(Math.max(0, planIdx)).map((seg, i) => (
                  <RL.Polyline key={`conn-${i + planIdx}`} positions={seg} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.95, lineCap: 'round' }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                ))}
              </>
            )}
            {/* Point-to-point connectors: first is red (user → 1st), rest are green */}
            {false && ptpConnectors.length > 0 && (
              <>
                {/* Casing for ptp connectors */}
                {ptpConnectors.map((seg, i) => (
                  <RL.Polyline key={`ptp-case-${i}`} positions={seg} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9, lineCap: 'round' }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                ))}
                {/* First connector: red (user → 1st location) */}
                {ptpConnectors.length > 0 && (
                  <RL.Polyline key="ptp-first" positions={ptpConnectors[0]} pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.95, lineCap: 'round', dashArray: '8 4' }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                )}
                {/* Rest of connectors: green (1st → 2nd, 2nd → 3rd, etc.) */}
                {ptpConnectors.slice(1).map((seg, i) => (
                  <RL.Polyline key={`ptp-${i + 1}`} positions={seg} pathOptions={{ color: '#10b981', weight: 5, opacity: 0.95, lineCap: 'round', dashArray: '8 4' }} smoothFactor={1.5} interactive={false} bubblingMouseEvents={false} />
                ))}
              </>
            )}
            {/* Selected plan stop markers (hide in nearest mode). Current target = blue icon, visited/pending = red icon */}
            {searchParams.get('mode') !== 'nearest' && (
              <>
                {(snappedOrderedPlanStops.length > 0 ? snappedOrderedPlanStops : orderedPlanStops).map((s, idx) => {
                  const isVisited = visitedPlanIds.has(s.id) || idx < planIdx;
                  const isCurrent = idx === planIdx && !isVisited;
                  const iconToUse = isCurrent ? planIconBlue : planIconRed;
                  return (
                    <RL.Marker key={`plan-${s.id}`} position={[s.lat, s.lon]} icon={iconToUse || planIconRed}>
                      <RL.Tooltip permanent direction="top" offset={[0, -24]} opacity={1} className="!bg-white !text-black !border !border-black/20 !rounded-full !px-2 !py-0.5 !text-[11px] !font-semibold shadow">
                        {idx + 1}
                      </RL.Tooltip>
                    </RL.Marker>
                  );
                })}
              </>
            )}
            {/* All saved places markers (disabled per requirement) */}
            {false && searchParams.get('mode') !== 'nearest' && poiMarkers.filter((poi) => !selectedPlanIdSet.has(Number(poi.id))).map((poi) => {
              const mine = poi.userEmail && session?.user?.email && poi.userEmail === session.user.email;
              const iconToUse = mine ? myPlaceIcon : otherPlaceIcon;
              if (iconToUse) {
                return (
                  <RL.Marker
                    key={`poi-${poi.id}`}
                    position={[poi.lat, poi.lon]}
                    icon={iconToUse}
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
                  />
                );
              }
              return null;
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
        {/* Re-center and Exit controls (icon buttons), positioned above footer */}
        <div className="absolute bottom-56 right-5 z-[3500] flex flex-col gap-3 items-end">
          <button
            onClick={() => {
              try {
                setAutoFollow(true);
                setRecenterPending(true);
                // If we already know user position, use immediately
                if (userPos) {
                  // Smooth fly when map is ready; fallback to state update
                  try {
                    if (mapRef.current && typeof mapRef.current.flyTo === 'function') {
                      const nextZ = Math.max(zoom, 16);
                      mapRef.current.flyTo([userPos.lat, userPos.lon], nextZ, { animate: true, duration: 0.6 });
                      setZoom(nextZ);
                      setCenter([userPos.lat, userPos.lon]);
                    } else {
                      setCenter([userPos.lat, userPos.lon]);
                      setZoom((z) => Math.max(z, 16));
                    }
                  } catch {
                    setCenter([userPos.lat, userPos.lon]);
                    setZoom((z) => Math.max(z, 16));
                  }
                  setTimeout(() => setRecenterPending(false), 150);
                  return;
                }
                if (typeof navigator !== 'undefined' && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                      setUserPos(me);
                      try {
                        if (mapRef.current && typeof mapRef.current.flyTo === 'function') {
                          const nextZ = Math.max(zoom, 16);
                          mapRef.current.flyTo([me.lat, me.lon], nextZ, { animate: true, duration: 0.6 });
                          setZoom(nextZ);
                          setCenter([me.lat, me.lon]);
                        } else {
                          setCenter([me.lat, me.lon]);
                          setZoom((z) => Math.max(z, 16));
                        }
                      } catch {
                        setCenter([me.lat, me.lon]);
                        setZoom((z) => Math.max(z, 16));
                      }
                      setRecenterPending(false);
                    },
                    (err) => {
                      try { console.warn('Geolocation error:', err); } catch {}
                      // Basic feedback for user
                      alert('Location permission blocked or unavailable. Please enable location access.');
                      setRecenterPending(false);
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                  );
                } else if (startPos) {
                  // Fallback: center to known start position
                  try {
                    if (mapRef.current && typeof mapRef.current.flyTo === 'function') {
                      const nextZ = Math.max(zoom, 15);
                      mapRef.current.flyTo([startPos.lat, startPos.lon], nextZ, { animate: true, duration: 0.5 });
                      setZoom(nextZ);
                      setCenter([startPos.lat, startPos.lon]);
                    } else {
                      setCenter([startPos.lat, startPos.lon]);
                      setZoom((z) => Math.max(z, 15));
                    }
                  } catch {
                    setCenter([startPos.lat, startPos.lon]);
                    setZoom((z) => Math.max(z, 15));
                  }
                  setRecenterPending(false);
                } else if (browsePos) {
                  // Fallback: center to last browsed position
                  try {
                    if (mapRef.current && typeof mapRef.current.flyTo === 'function') {
                      const nextZ = Math.max(zoom, 14);
                      mapRef.current.flyTo([browsePos.lat, browsePos.lon], nextZ, { animate: true, duration: 0.5 });
                      setZoom(nextZ);
                      setCenter([browsePos.lat, browsePos.lon]);
                    } else {
                      setCenter([browsePos.lat, browsePos.lon]);
                      setZoom((z) => Math.max(z, 14));
                    }
                  } catch {
                    setCenter([browsePos.lat, browsePos.lon]);
                    setZoom((z) => Math.max(z, 14));
                  }
                  setRecenterPending(false);
                } else {
                  setRecenterPending(false);
                }
              } catch {}
            }}
            className={`h-11 w-11 inline-flex items-center justify-center rounded-full bg-white/90 dark:bg-black/50 border border-black/10 dark:border-white/10 shadow-xl hover:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-300/30 transition-transform duration-150 ease-out hover:scale-105 active:scale-95 ${recenterPending ? 'opacity-70 cursor-wait' : ''}`}
            title="Re-center"
            aria-label="Re-center"
            disabled={recenterPending}
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
              className="h-12 w-12 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white shadow-2xl hover:from-red-600 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-300/40 transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
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
        <div className="absolute bottom-64 right-5 z-[1500]">
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
        {/* Location tip when routing but no live location */}
        {showLocTip && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-xl bg-white/95 dark:bg-neutral-900/95 border-2 border-orange-500/40 dark:border-orange-400/40 px-6 py-4 shadow-2xl text-center">
              <div className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">Please turn on your location</div>
            </div>
          </div>
        )}
        {/* Removed Location Required overlay */}

        {/* Removed Wrong-route banner popup */}
        {/* Journey Completed overlay (hidden in nearest mode) */}
        {journeyCompleted && searchParams.get('mode') !== 'nearest' && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 fade-in">
            <div className="rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-2xl p-6 w-[min(92vw,360px)] text-center border border-black/10 dark:border-white/10 bounce-in glow-pulse">
              <div className="text-2xl font-bold text-emerald-600 mb-2">🎉 Journey Completed</div>
              <div className="text-sm opacity-80 mb-4">You have arrived at your destination.</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setJourneyCompleted(false)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Removed Off-route full-screen notice popup */}
        {/* Removed legacy route summary panel */}
      </main>
    </div>
  );
}

import { Suspense } from 'react';

export default function DashboardMapPageWrapper() {
  return (
    <Suspense fallback={<div style={{ height: 2 }} /> }>
      <DashboardMapPage />
    </Suspense>
  );
}

