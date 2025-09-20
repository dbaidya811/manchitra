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
  useMap: undefined as any,
} as const;
import 'leaflet/dist/leaflet.css';

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
  const [routing, setRouting] = useState<boolean>(false);
  const [liveUpdate] = useState<boolean>(true);
  const [destIcon, setDestIcon] = useState<any>(null);
  const [myPlaceIcon, setMyPlaceIcon] = useState<any>(null);
  const [autoRouted, setAutoRouted] = useState(false);
  const mapRef = useRef<any>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeSteps, setRouteSteps] = useState<Array<{ text: string; type?: string; modifier?: string }>>([]);
  const [poiMarkers, setPoiMarkers] = useState<Array<{ id: string | number; lat: number; lon: number; title?: string; userEmail?: string | null }>>([]);
  // Draggable, collapsible panel state
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 16, y: 120 });
  const [dragging, setDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // Defer mount to avoid Leaflet double init in StrictMode/HMR
    setMounted(true);
    const id = requestAnimationFrame(() => setMapKey(Date.now().toString(36) + Math.random().toString(36).slice(2)));
    return () => cancelAnimationFrame(id);
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

  // Initialize panel collpased state and default position based on screen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSmall = window.matchMedia('(max-width: 768px)').matches;
    if (isSmall) setPanelCollapsed(true);
    // Default near bottom-left
    setPanelPos({ x: 16, y: Math.max(80, window.innerHeight - 220) });
  }, []);

  // Load all places and extract lon/lat for markers
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/places');
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
    })();
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

  // Small helper to render a maneuver icon
  const renderStepIcon = (type?: string, modifier?: string) => {
    const color = '#ea580c';
    const size = 16;
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
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const L = await import('leaflet');
      const size: [number, number] = [28, 28];
      const anchor: [number, number] = [14, 14];
      const rot = (userHeading ?? 0);
      const html = `
        <div style="transform: rotate(${rot}deg); transform-origin: 50% 50%;">
          <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l6 12-6-3-6 3 6-12z" fill="#2563eb" stroke="#1e3a8a" stroke-width="0.6"/>
          </svg>
        </div>`;
      setUserIcon(L.divIcon({ className: 'user-arrow', html, iconSize: size, iconAnchor: anchor }));
    })();
  }, [mounted, userHeading]);

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

  // Update heading and on-route check on live updates
  const [onRoute, setOnRoute] = useState<boolean>(true);
  const [offRouteMeters, setOffRouteMeters] = useState<number>(0);
  const [offRoutePopup, setOffRoutePopup] = useState<boolean>(false);
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
  }, [userPos, routeCoords]);

  // Off-route popup controller
  useEffect(() => {
    let timer: any;
    if (!onRoute && offRouteMeters > 35) {
      timer = setTimeout(() => setOffRoutePopup(true), 3000);
    } else {
      setOffRoutePopup(false);
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

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const address = searchParams.get('address');
    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      setDest({ lat: latNum, lon: lonNum });
      setCenter([latNum, lonNum]);
      setZoom(15);
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

  // Request a route from userPos -> dest via OSRM
  const fetchRoute = async (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
    try {
      setRouting(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      const route = data?.routes?.[0];
      const coords = route?.geometry?.coordinates as Array<[number, number]> | undefined;
      if (Array.isArray(coords)) {
        // OSRM returns [lon,lat], convert to [lat,lon]
        const latlng: Array<[number, number]> = coords.map(([x, y]) => [y, x]);
        setRouteCoords(latlng);
        setRouteDistance(typeof route?.distance === 'number' ? route.distance : null);
        setRouteDuration(typeof route?.duration === 'number' ? route.duration : null);
        const legs = route?.legs || [];
        const steps: Array<{ text: string; type?: string; modifier?: string }> = [];
        for (const leg of legs) {
          for (const st of leg.steps || []) {
            const type = st?.maneuver?.type || 'Proceed';
            const mod = st?.maneuver?.modifier ? ` ${st.maneuver.modifier}` : '';
            const road = st?.name || 'road';
            steps.push({ text: `${type}${mod} onto ${road}`.trim(), type: st?.maneuver?.type, modifier: st?.maneuver?.modifier });
          }
        }
        setRouteSteps(steps);
      } else {
        setRouteCoords([]);
        setRouteDistance(null);
        setRouteDuration(null);
        setRouteSteps([]);
      }
    } catch (_) {
      setRouteCoords([]);
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteSteps([]);
    } finally {
      setRouting(false);
    }
  };

  const startNavigation = () => {
    if (!dest) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)) {
          setUserHeading(((pos.coords.heading % 360) + 360) % 360);
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
              fetchRoute(cur, dest);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
          );
          // Stop watching when leaving page
          window.addEventListener('beforeunload', () => navigator.geolocation.clearWatch(watchId), { once: true });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const { data: session } = useSession();

  return (
    <div className="relative h-screen">
       <header className="absolute top-0 left-0 right-0 z-[2000] flex h-16 shrink-0 items-center justify-between gap-4 px-4 md:px-6 bg-transparent">
        <div className="flex items-center gap-2 md:flex-1">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent drop-shadow-md">
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
      <main className="relative h-full w-full z-0">
        {mounted && mapKey && (
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
            {startPos && (
              <RL.CircleMarker center={[startPos.lat, startPos.lon]} radius={5} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }} />
            )}
            {userPos && userIcon && (
              <RL.Marker position={[userPos.lat, userPos.lon]} icon={userIcon} />
            )}
            {routeCoords.length > 0 && (
              <RL.Polyline positions={routeCoords} pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.9 }} />
            )}
            {/* All saved places markers: custom icon for mine, orange dot for others */}
            {poiMarkers.map((poi) => {
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
                        }
                      },
                    }}
                  />
                );
              }
              // Others: orange circle marker
              return (
                <RL.CircleMarker
                  key={`poi-${poi.id}`}
                  center={[poi.lat, poi.lon]}
                  radius={4}
                  pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1 }}
                  eventHandlers={{
                    click: () => {
                      setDest({ lat: poi.lat, lon: poi.lon });
                      setCenter([poi.lat, poi.lon]);
                      setZoom(15);
                      if (userPos) {
                        fetchRoute({ lat: userPos.lat, lon: userPos.lon }, { lat: poi.lat, lon: poi.lon });
                      }
                    },
                  }}
                />
              );
            })}
          </RL.MapContainer>
        )}
        {/* Auto-fit bounds when route updates */}
        {/* Floating in-app navigation button */}
        {dest && (
          <div className="absolute bottom-24 right-4 z-[1500] text-right">
            <button
              onClick={startNavigation}
              className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-300 px-4 py-2 text-sm font-semibold"
              title="Start in-app directions"
            >
              {routing ? 'Routing…' : 'Start Directions'}
            </button>
          </div>
        )}
        {/* On-route status chip */}
        {(routeCoords.length > 0 && userPos) && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1500]">
            <div className={`rounded-full border shadow px-3 py-1 text-xs font-medium ${onRoute ? 'bg-emerald-500/90 border-emerald-600 text-white' : 'bg-red-500/90 border-red-600 text-white'}`}>
              {onRoute ? 'On route' : `Off route ~${Math.round(offRouteMeters)} m`}
            </div>
          </div>
        )}
        {/* Route summary and steps panel (modern style) - draggable & collapsible */}
        {(routeDistance != null || routeDuration != null || routeSteps.length > 0) && (
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
              <div className="relative rounded-2xl border border-white/20 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md shadow-xl overflow-hidden">
                <div
                  onMouseDown={onMouseDownHeader}
                  onTouchStart={onTouchStartHeader}
                  className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-yellow-400/20 to-orange-500/20 cursor-move"
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
                    <ol className="max-h-48 overflow-auto space-y-1 pr-1">
                      {routeSteps.slice(0, 20).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-lg px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <span className="mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center">
                            {renderStepIcon(s.type, s.modifier)}
                          </span>
                          <span className="text-[12px] leading-5 text-neutral-800 dark:text-neutral-200">{s.text}</span>
                        </li>
                      ))}
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
