import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import {
  Navigation,
  LocateFixed,
  Loader2,
  Star,
  X,
  Route,
  Volume2,
  VolumeX,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Flag,
  ChevronRight,
  ChevronLeft,
  Check,
  Share2,
  Users,
  TriangleAlert
} from 'lucide-react';
import { Place } from '../types';
import { getSafeImageUrl, FALLBACK_PANDAL_IMAGE, handleImageError } from '../utils/imageHelper';
import {
  validateCoordinates,
  calculateDistanceKm,
  calculateBearing,
  calculateDistanceToRouteMeters,
  findNearestPointOnRoute,
  formatDistance,
  fetchRealRoadNavigationRoute,
  speakVoiceInstruction,
  stopVoiceInstruction,
  NavigationRoute,
  NavigationStep,
  KOLKATA_CENTER
} from '../utils/geo';
import { NavigationOverlay } from './NavigationOverlay';
import { PandalWeatherWidget } from './PandalWeatherWidget';
import { UserWeatherWidget } from './UserWeatherWidget';

// Protection: Monkey-patch L.LatLng and L.latLng to prevent "Invalid LatLng object: (NaN, NaN)"
const OriginalLatLng = L.LatLng;
(L as any).LatLng = function SafeLatLng(lat: any, lng: any, alt?: any) {
  let safeLat = Number(lat);
  let safeLng = Number(lng);
  if (isNaN(safeLat) || !isFinite(safeLat)) safeLat = 22.5726;
  if (isNaN(safeLng) || !isFinite(safeLng)) safeLng = 88.3639;
  return new (OriginalLatLng as any)(safeLat, safeLng, alt);
};
(L as any).LatLng.prototype = OriginalLatLng.prototype;

const origToLatLng = L.latLng;
(L as any).latLng = function safeToLatLng(a: any, b?: any, c?: any) {
  try {
    if (Array.isArray(a)) {
      const lat = Number(a[0]);
      const lng = Number(a[1]);
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        return new (OriginalLatLng as any)(22.5726, 88.3639);
      }
    }
    const res = origToLatLng(a, b, c);
    if (!res || isNaN(res.lat) || isNaN(res.lng)) {
      return new (OriginalLatLng as any)(22.5726, 88.3639);
    }
    return res;
  } catch {
    return new (OriginalLatLng as any)(22.5726, 88.3639);
  }
};

interface MapScreenProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  onClearSelectedPlace: () => void;
  autoPlotRoute?: boolean;
  onResetAutoPlotRoute?: () => void;
  isVisible?: boolean;
  customRoutePlaces?: Place[];
  onClearCustomRoute?: () => void;
  onAddPlaceToCustomRoute?: (place: Place) => void;
  activeNavigationStops?: Place[] | null;
  onClearActiveNavigationStops?: () => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  onClearSelectedPlace,
  autoPlotRoute = false,
  onResetAutoPlotRoute,
  isVisible = true,
  customRoutePlaces,
  onClearCustomRoute,
  onAddPlaceToCustomRoute,
  activeNavigationStops,
  onClearActiveNavigationStops
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersMapRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLineRef = useRef<L.Polyline | L.LayerGroup | null>(null);
  const routeBoundsRef = useRef<L.LatLngBounds | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const customRouteLineRef = useRef<L.Polyline | null>(null);
  const customWaypointsRef = useRef<L.Marker[]>([]);
  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  });

  // User Location (Safe Kolkata Default)
  const [userLocation, setUserLocation] = useState<[number, number]>(KOLKATA_CENTER);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const userHeadingRef = useRef<number>(0);
  const rawHeadingRef = useRef<number>(0);
  const accumulatedHeadingRef = useRef<number>(0);
  const prevCoordsRef = useRef<[number, number] | null>(null);

  // Google Maps Style Real Road Navigation Mode State (100% Real Info, No Simulation)
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navRoute, setNavRoute] = useState<NavigationRoute | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [liveSpeed, setLiveSpeed] = useState<number | null>(null);
  const [liveRemainingDistance, setLiveRemainingDistance] = useState<string | null>(null);
  const [liveRemainingDuration, setLiveRemainingDuration] = useState<number | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const rerouteConnectorLineRef = useRef<L.LayerGroup | null>(null);
  const lastRerouteTimeRef = useRef<number>(0);
  const [navTargetStops, setNavTargetStops] = useState<Place[]>([]);
  const [justAddedToRoute, setJustAddedToRoute] = useState<boolean>(false);
  const [isAutoFollowing, setIsAutoFollowing] = useState<boolean>(true);
  const isAutoFollowingRef = useRef<boolean>(true);
  const isNavigatingRef = useRef<boolean>(false);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  // Create custom marker with real pandal photo (NO emojis)
  const createPandalIcon = useCallback((place: Place, isSelected: boolean) => {
    const imgUrl = getSafeImageUrl(place.image);
    const isPopular = Boolean(place.isPopular);
    const c = (place as any).crowdCount || 0;
    const badge = c >= 500
      ? { bg: '#dc2626' }
      : c >= 100
      ? { bg: '#ea580c' }
      : c >= 50
      ? { bg: '#ca8a04' }
      : null;

    return L.divIcon({
      className: 'custom-pandal-pin',
      html: `
        <div class="custom-pandal-pin-container ${isSelected ? 'custom-pandal-pin-selected' : ''} ${isPopular ? 'custom-pandal-pin-popular' : ''}">
          <div class="custom-pandal-pin-img-wrapper">
            <img
              src="${imgUrl}"
              alt="${place.name.replace(/"/g, '&quot;')}"
              onerror="this.onerror=null;this.src='${FALLBACK_PANDAL_IMAGE}';"
              style="width: 100%; height: 100%; object-fit: cover;"
            />
          </div>
          ${badge ? `<div style="position:absolute;top:-7px;left:50%;transform:translateX(-50%);background:${badge.bg};color:#fff;font-size:9px;font-weight:700;line-height:1;padding:3px 6px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.35);border:1.5px solid rgba(255,255,255,.9);">👥 ${c}</div>` : ''}
          <div class="custom-pandal-pin-tip"></div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -42]
    });
  }, []);

  // Create Authentic Navigation Beacon using user's chosen icon (Crisp, larger & Google Maps styled):
  // https://cdn-icons-png.flaticon.com/512/10324/10324799.png
  const createUserLocationIcon = useCallback((heading: number = 0) => {
    return L.divIcon({
      className: 'custom-user-nav-beacon',
      html: `
        <div class="gmaps-nav-marker-wrapper" style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <!-- Pulsing accuracy circle -->
          <div class="gmaps-nav-pulse-ring" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(26, 115, 232, 0.22); border: 2px solid rgba(26, 115, 232, 0.45); pointer-events: none;"></div>

          <!-- Directional Rotatable Arrow Container that rotates left/right according to user phone orientation -->
          <div id="gmaps-nav-arrow-rotator" style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transform-origin: center center; transition: transform 0.22s cubic-bezier(0.2, 0, 0, 1); pointer-events: none;">
            <!-- Forward Heading / Flashlight Beam (Google Maps signature view cone) -->
            <div style="position: absolute; width: 58px; height: 68px; top: -42px; left: -9px; pointer-events: none; opacity: 0.75; background: radial-gradient(ellipse at 50% 100%, rgba(26, 115, 232, 0.65) 0%, rgba(66, 133, 244, 0.28) 45%, rgba(66, 133, 244, 0.05) 75%, transparent 85%); clip-path: polygon(50% 100%, 8% 0%, 92% 0%); transform-origin: 50% 100%;"></div>

            <!-- Crisp Navigation Arrow from https://cdn-icons-png.flaticon.com/512/10324/10324799.png -->
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 3.5px #ffffff) drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
              <img
                src="/nav-arrow.png"
                onerror="this.onerror=null;this.src='https://cdn-icons-png.flaticon.com/512/10324/10324799.png';"
                alt="Navigation Arrow"
                style="width: 100%; height: 100%; object-fit: contain; filter: invert(34%) sepia(90%) saturate(2300%) hue-rotate(208deg) brightness(98%) contrast(97%);"
              />
            </div>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  }, []);

  // Butter-smooth dynamic heading updater: rotates left or right based on phone
  const updateHeading = useCallback((newHeading: number) => {
    if (isNaN(newHeading) || !isFinite(newHeading)) return;
    const normalized = ((newHeading % 360) + 360) % 360;

    let diff = normalized - (rawHeadingRef.current % 360);
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    if (Math.abs(diff) < 1.5) return;

    rawHeadingRef.current = normalized;
    accumulatedHeadingRef.current += diff;
    userHeadingRef.current = Math.round(normalized);

    const targetAngle = Math.round(accumulatedHeadingRef.current);
    const rotator = document.getElementById('gmaps-nav-arrow-rotator');
    if (rotator) {
      rotator.style.transform = `rotate(${targetAngle}deg)`;
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createUserLocationIcon(targetAngle));
    }
  }, [createUserLocationIcon]);

  // Initialize Leaflet Map (Daylight style, robust error prevention)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = selectedPlace
      ? validateCoordinates(selectedPlace.coordinates)
      : KOLKATA_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedPlace ? 15 : 13,
      zoomControl: false,
      attributionControl: true
    });

    // Clean daylight OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> Kolkata'
    }).addTo(map);

    // Marker Cluster Group: ONLY Pandal Image
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const childMarkers = cluster.getAllChildMarkers();
        const firstMarker = childMarkers[0] as L.Marker & { placeData?: Place };
        const representativeImg = getSafeImageUrl(firstMarker?.placeData?.image);

        return L.divIcon({
          html: `
            <div class="custom-cluster-image-wrapper">
              <div class="custom-cluster-image-inner">
                <img 
                  src="${representativeImg}" 
                  alt="Pandal Group" 
                  onerror="this.onerror=null;this.src='${FALLBACK_PANDAL_IMAGE}';" 
                />
              </div>
            </div>
          `,
          className: 'custom-cluster-image-pin',
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        });
      }
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
    mapInstanceRef.current = map;

    // User manual exploration detection: if user drags the map away during navigation,
    // do not force camera back automatically; only return when Re-center button is clicked.
    map.on('dragstart', () => {
      if (isNavigatingRef.current) {
        setIsAutoFollowing(false);
        isAutoFollowingRef.current = false;
      }
    });

    // Add initial user location pin with Google Maps 3D navigation arrow
    const userMarker = L.marker(initialCenter, {
      icon: createUserLocationIcon(userHeadingRef.current),
      zIndexOffset: 1000
    }).addTo(map);
    userMarkerRef.current = userMarker;

    // Fetch live user GPS position silently on start
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const liveCoords = validateCoordinates([pos.coords.latitude, pos.coords.longitude]);
            setUserLocation(liveCoords);
            userMarker.setLatLng(liveCoords);
            if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && pos.coords.heading >= 0) {
              updateHeading(pos.coords.heading);
            }
            prevCoordsRef.current = liveCoords;
          },
          () => {},
          { timeout: 5000 }
        );
      } catch {
        // ignore
      }
    }

    // Compass / Device Orientation listener to rotate arrow live with device
    let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
    try {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        orientationHandler = (e: DeviceOrientationEvent) => {
          try {
            if (!e) return;
            const webkitHeading = (e as any).webkitCompassHeading;
            if (typeof webkitHeading === 'number' && !isNaN(webkitHeading)) {
              updateHeading(webkitHeading);
              return;
            }
            if (typeof e.alpha === 'number' && !isNaN(e.alpha)) {
              updateHeading(360 - e.alpha);
            }
          } catch {
            // ignore
          }
        };
        window.addEventListener('deviceorientation', orientationHandler, { passive: true });
      }
    } catch {
      // ignore
    }

    return () => {
      if (orientationHandler) {
        try {
          window.removeEventListener('deviceorientation', orientationHandler);
        } catch {
          // ignore
        }
      }
      stopVoiceInstruction();
      map.remove();
      mapInstanceRef.current = null;
      clusterGroupRef.current = null;
    };
  }, [createUserLocationIcon, updateHeading]);

  // Invalidate map size on tab switch and safely fit active bounds
  useEffect(() => {
    if (isVisible && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      map.invalidateSize();
      const timer = setTimeout(() => {
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.invalidateSize();
        const size = mapInstanceRef.current.getSize();
        if (size.x > 0 && size.y > 0) {
          try {
            if (customRouteLineRef.current && customRouteLineRef.current.getBounds().isValid()) {
              mapInstanceRef.current.fitBounds(customRouteLineRef.current.getBounds(), { padding: [60, 60] });
            } else if (routeBoundsRef.current && routeBoundsRef.current.isValid()) {
              mapInstanceRef.current.fitBounds(routeBoundsRef.current, { padding: [80, 50], maxZoom: 16 });
            } else if (selectedPlace) {
              const coords = validateCoordinates(selectedPlace.coordinates);
              mapInstanceRef.current.flyTo(coords, 16, { animate: true, duration: 0.8 });
            }
          } catch {
            // ignore
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, selectedPlace]);

  // Plot pandal markers: Clicking a marker selects it and shows single clean card (NO DUPLICATE)
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    clusterGroup.clearLayers();
    markersMapRef.current = {};
    const batchMarkers: L.Marker[] = [];

    // The dataset contains repeated entries for the same pandal. Drop any record
    // whose name and coordinates were already plotted so a single pin is shown.
    const plottedKeys = new Set<string>();

    places.forEach((place) => {
      const coords = validateCoordinates(place.coordinates);

      const dedupeKey = `${(place.name || '').trim().toLowerCase()}|${coords[0].toFixed(4)}|${coords[1].toFixed(4)}`;
      if (plottedKeys.has(dedupeKey)) return;
      plottedKeys.add(dedupeKey);

      const isSelected = selectedPlace?.id === place.id;
      const marker = L.marker(coords, {
        icon: createPandalIcon(place, isSelected)
      }) as L.Marker & { placeData?: Place };

      marker.placeData = place;

      // Note: We deliberately do NOT bind a Leaflet HTML popup here!
      // This completely avoids the duplicate popup next to the bottom sheet.
      marker.on('click', () => {
        onSelectPlaceRef.current(place);
      });

      batchMarkers.push(marker);
      markersMapRef.current[place.id] = marker;
    });

    clusterGroup.addLayers(batchMarkers);
  }, [places, createPandalIcon]);

  // Update selection view
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlace) return;

    const coords = validateCoordinates(selectedPlace.coordinates);
    if (!isNavigating && isVisible) {
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        try {
          map.flyTo(coords, 16, {
            animate: true,
            duration: 0.8
          });
        } catch {
          // ignore
        }
      }
    }

    // Refresh icon highlight
    Object.keys(markersMapRef.current).forEach((id) => {
      const m = markersMapRef.current[id] as L.Marker & { placeData?: Place };
      if (m && m.placeData) {
        m.setIcon(createPandalIcon(m.placeData, id === selectedPlace.id));
      }
    });

    if (autoPlotRoute) {
      startNavigationToPlace(selectedPlace);
      onResetAutoPlotRoute?.();
    }
  }, [selectedPlace?.id, autoPlotRoute, createPandalIcon, isVisible]);

  // Start Google Maps Style Real Road Navigation for a Single Pandal
  const startNavigationToPlace = useCallback(async (targetPlace: Place) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const startCoords = validateCoordinates(userLocation);
    const endCoords = validateCoordinates(targetPlace.coordinates);

    setIsNavigating(true);
    setIsAutoFollowing(true);
    isAutoFollowingRef.current = true;
    setIsLoadingRoute(true);
    setActiveStepIndex(0);
    setNavTargetStops([targetPlace]);

    // HIDE ALL OTHER PANDALS from map during active navigation
    if (clusterGroupRef.current && map.hasLayer(clusterGroupRef.current)) {
      map.removeLayer(clusterGroupRef.current);
    }

    // Remove any previous route lines or markers
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    customWaypointsRef.current.forEach((m) => m.remove());
    customWaypointsRef.current = [];

    // Fetch genuine street-level road route from OSRM
    const route = await fetchRealRoadNavigationRoute(startCoords, [
      { name: targetPlace.name, coordinates: endCoords }
    ]);
    setNavRoute(route);
    setIsLoadingRoute(false);

    // Draw Google Maps genuine road line: high contrast casing + bright inner road
    const casing = L.polyline(route.waypoints, {
      color: '#1558d6',
      weight: 9,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round'
    });
    const core = L.polyline(route.waypoints, {
      color: '#4285f4',
      weight: 6,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    const routeLayer = L.layerGroup([casing, core]).addTo(map);
    routeLineRef.current = routeLayer;

    // Show ONLY this destination pandal pin
    const pinIcon = L.divIcon({
      className: 'custom-nav-dest-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="background: #dc2626; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span>🏁</span>
            <span>${targetPlace.name.slice(0, 22)}</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #dc2626;"></div>
        </div>
      `,
      iconSize: [140, 36],
      iconAnchor: [70, 36]
    });

    const pinMarker = L.marker(endCoords, { icon: pinIcon, zIndexOffset: 3000 }).addTo(map);
    customWaypointsRef.current.push(pinMarker);

    // Fit route in view safely
    const size = map.getSize();
    const bounds = casing.getBounds();
    routeBoundsRef.current = bounds;
    if (size.x > 0 && size.y > 0 && bounds.isValid()) {
      try {
        map.fitBounds(bounds, {
          padding: [80, 50],
          maxZoom: 16
        });
      } catch {
        // ignore
      }
    }

    // Voice announcement: speak starting direction
    const firstStep = route.steps[0];
    const initialSpeech = `Starting real road navigation to ${targetPlace.name}. ${firstStep?.voiceText || ''}`;
    speakVoiceInstruction(initialSpeech, isVoiceMuted);
  }, [userLocation, isVoiceMuted]);

  // Start Google Maps Style Real Road Multi-Stop Route Navigation (from Guide page)
  const startNavigationToCustomStops = useCallback(async (targetStops: Place[]) => {
    const map = mapInstanceRef.current;
    if (!map || targetStops.length === 0) return;

    const startCoords = validateCoordinates(userLocation);

    setIsNavigating(true);
    setIsAutoFollowing(true);
    isAutoFollowingRef.current = true;
    setIsLoadingRoute(true);
    setActiveStepIndex(0);
    setNavTargetStops(targetStops);

    // HIDE ALL OTHER PANDALS from map during active navigation
    if (clusterGroupRef.current && map.hasLayer(clusterGroupRef.current)) {
      map.removeLayer(clusterGroupRef.current);
    }

    // Clean up previous route lines and markers
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    customWaypointsRef.current.forEach((m) => m.remove());
    customWaypointsRef.current = [];

    // Fetch genuine street-level road route connecting user location through all stops
    const destinations = targetStops.map((s) => ({
      name: s.name,
      coordinates: validateCoordinates(s.coordinates)
    }));
    const route = await fetchRealRoadNavigationRoute(startCoords, destinations);
    setNavRoute(route);
    setIsLoadingRoute(false);

    // Draw Google Maps genuine road line: casing + core
    const casing = L.polyline(route.waypoints, {
      color: '#1558d6',
      weight: 9,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round'
    });
    const core = L.polyline(route.waypoints, {
      color: '#4285f4',
      weight: 6,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    const routeLayer = L.layerGroup([casing, core]).addTo(map);
    routeLineRef.current = routeLayer;

    // Display ONLY the custom route destination stops on the map
    targetStops.forEach((stop, idx) => {
      const coords = validateCoordinates(stop.coordinates);
      const isFinal = idx === targetStops.length - 1;
      const pinIcon = L.divIcon({
        className: 'custom-nav-dest-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="background: ${isFinal ? '#dc2626' : '#2563eb'}; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>${isFinal ? '🏁' : `${idx + 1}`}</span>
              <span>${stop.name.slice(0, 18)}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${isFinal ? '#dc2626' : '#2563eb'};"></div>
          </div>
        `,
        iconSize: [120, 36],
        iconAnchor: [60, 36]
      });

      const pinMarker = L.marker(coords, { icon: pinIcon, zIndexOffset: 3000 }).addTo(map);
      customWaypointsRef.current.push(pinMarker);
    });

    // Fit route in view
    const size = map.getSize();
    const bounds = casing.getBounds();
    routeBoundsRef.current = bounds;
    if (size.x > 0 && size.y > 0 && bounds.isValid()) {
      try {
        map.fitBounds(bounds, {
          padding: [80, 50],
          maxZoom: 16
        });
      } catch {
        // ignore
      }
    }

    const firstStep = route.steps[0];
    const initialSpeech = `Starting real road navigation with ${targetStops.length} stops. ${firstStep?.voiceText || ''}`;
    speakVoiceInstruction(initialSpeech, isVoiceMuted);
  }, [userLocation, isVoiceMuted]);

  // Handle Stop/Exit Navigation: restores all other pandals back to map
  const handleExitNavigation = useCallback(() => {
    stopVoiceInstruction();
    routeBoundsRef.current = null;
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    if (rerouteConnectorLineRef.current) {
      rerouteConnectorLineRef.current.remove();
      rerouteConnectorLineRef.current = null;
    }
    setIsRerouting(false);
    customWaypointsRef.current.forEach((m) => m.remove());
    customWaypointsRef.current = [];

    // RESTORE ALL PANDALS back to the map
    const map = mapInstanceRef.current;
    if (map && clusterGroupRef.current && !map.hasLayer(clusterGroupRef.current)) {
      map.addLayer(clusterGroupRef.current);
    }

    setIsNavigating(false);
    setIsAutoFollowing(true);
    isAutoFollowingRef.current = true;
    setNavRoute(null);
    setActiveStepIndex(0);
    setLiveSpeed(null);
    setLiveRemainingDistance(null);
    setLiveRemainingDuration(null);
    setNavTargetStops([]);
    onClearSelectedPlace();
    onClearActiveNavigationStops?.();
  }, [onClearSelectedPlace, onClearActiveNavigationStops]);

  // Handle Off-Route Re-routing and Connecting Road Line (Full Google Maps Style)
  const handleOffRouteReroute = useCallback(async (currentCoords: [number, number]) => {
    const map = mapInstanceRef.current;
    if (!map || !navRoute || navTargetStops.length === 0) return;

    // Debounce re-route requests: 4 seconds between OSRM calls
    const now = Date.now();
    if (now - lastRerouteTimeRef.current < 4000) return;
    lastRerouteTimeRef.current = now;

    setIsRerouting(true);

    // 1. Find nearest connection point on current route
    const nearestPt = findNearestPointOnRoute(currentCoords, navRoute.waypoints);

    // 2. Draw high-visibility Connecting Road Line from user's current road to the nearest route point
    if (rerouteConnectorLineRef.current) {
      rerouteConnectorLineRef.current.remove();
      rerouteConnectorLineRef.current = null;
    }

    const connectorCasing = L.polyline([currentCoords, nearestPt], {
      color: '#d97706', // amber-600
      weight: 6,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round'
    });
    const connectorCore = L.polyline([currentCoords, nearestPt], {
      color: '#fbbf24', // amber-400
      weight: 3.5,
      opacity: 1,
      dashArray: '8, 8',
      lineCap: 'round'
    });
    const connectorLayer = L.layerGroup([connectorCasing, connectorCore]).addTo(map);
    rerouteConnectorLineRef.current = connectorLayer;

    // 3. Voice announcement
    speakVoiceInstruction('Rerouting. Reconnecting from your current street to destination.', isVoiceMuted);

    try {
      // 4. Fetch optimal new road routing from current street to destination stops
      const destinations = navTargetStops.map((s) => ({
        name: s.name,
        coordinates: validateCoordinates(s.coordinates)
      }));

      const newRoute = await fetchRealRoadNavigationRoute(currentCoords, destinations);

      // If new route calculated successfully, replace the route line on map
      if (newRoute && newRoute.waypoints && newRoute.waypoints.length > 1) {
        // Remove previous route line
        if (routeLineRef.current) {
          routeLineRef.current.remove();
          routeLineRef.current = null;
        }

        // Draw new route
        const casing = L.polyline(newRoute.waypoints, {
          color: '#1558d6',
          weight: 9,
          opacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round'
        });
        const core = L.polyline(newRoute.waypoints, {
          color: '#4285f4',
          weight: 6,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        });
        const routeLayer = L.layerGroup([casing, core]).addTo(map);
        routeLineRef.current = routeLayer;

        // Smoothly fade out and remove the temporary connector line after 2 seconds
        setTimeout(() => {
          if (rerouteConnectorLineRef.current) {
            rerouteConnectorLineRef.current.remove();
            rerouteConnectorLineRef.current = null;
          }
        }, 2200);

        setNavRoute(newRoute);
        setActiveStepIndex(0);

        // Voice instruction for the new upcoming turn
        const firstStep = newRoute.steps[0];
        if (firstStep) {
          speakVoiceInstruction(`Route updated. ${firstStep.voiceText || ''}`, isVoiceMuted);
        }
      }
    } catch (err) {
      console.warn('Rerouting error:', err);
    } finally {
      setIsRerouting(false);
    }
  }, [navRoute, navTargetStops, isVoiceMuted]);

  // Recenter map on user's live position during active navigation (Re-engages auto-follow mode)
  const handleRecenterToLiveUser = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setIsAutoFollowing(true);
    isAutoFollowingRef.current = true;
    const current = validateCoordinates(userLocation);
    map.flyTo(current, 16, { duration: 0.8 });
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(current);
    }
  }, [userLocation]);

  // Trigger custom multi-stop route navigation when user clicked "Plot & Navigate"
  useEffect(() => {
    if (activeNavigationStops && activeNavigationStops.length > 0) {
      startNavigationToCustomStops(activeNavigationStops);
      onClearActiveNavigationStops?.();
    }
  }, [activeNavigationStops, startNavigationToCustomStops, onClearActiveNavigationStops]);

  // Handle next/prev step in navigation
  const handleStepChange = useCallback((newIndex: number) => {
    if (!navRoute || newIndex < 0 || newIndex >= navRoute.steps.length) return;
    setActiveStepIndex(newIndex);
    const step = navRoute.steps[newIndex];

    // Announce via voice
    speakVoiceInstruction(step.voiceText, isVoiceMuted);

    // Pan map to step coordinate
    if (mapInstanceRef.current && step.coordinates) {
      mapInstanceRef.current.panTo(step.coordinates, { animate: true, duration: 0.6 });
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(step.coordinates);
      }
    }
  }, [navRoute, isVoiceMuted]);

  // Real-time GPS Watcher during active navigation (No simulation, pure real-time tracking)
  useEffect(() => {
    if (!isNavigating || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const liveCoords = validateCoordinates([pos.coords.latitude, pos.coords.longitude]);
          setUserLocation(liveCoords);
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(liveCoords);
          }

          // Smoothly pan camera to follow user location in Google Maps style ONLY if user is in auto-follow mode
          // If user moved the map away, do NOT force camera back until they tap Re-center
          if (isAutoFollowingRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.panTo(liveCoords, { animate: true, duration: 0.6 });
          }

          // Update user heading: GPS heading if available, or bearing from movement
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && pos.coords.heading >= 0) {
            updateHeading(pos.coords.heading);
          } else if (prevCoordsRef.current) {
            const distKm = calculateDistanceKm(prevCoordsRef.current, liveCoords);
            if (distKm > 0.003) {
              const bearing = calculateBearing(prevCoordsRef.current, liveCoords);
              updateHeading(bearing);
            }
          }
          prevCoordsRef.current = liveCoords;

          // Real GPS Speed
          const spd = pos.coords.speed;
          if (spd !== null && !isNaN(spd) && spd > 0.5) {
            setLiveSpeed(Math.round(spd * 3.6));
          } else {
            setLiveSpeed(null);
          }

          // Check if user has progressed near the upcoming turn (< 40m)
          if (navRoute && activeStepIndex < navRoute.steps.length - 1) {
            const stepCoords = navRoute.steps[activeStepIndex].coordinates;
            const distKm = calculateDistanceKm(liveCoords, stepCoords);
            if (distKm <= 0.04) {
              const nextIdx = activeStepIndex + 1;
              setActiveStepIndex(nextIdx);
              const nextStep = navRoute.steps[nextIdx];
              speakVoiceInstruction(nextStep.voiceText, isVoiceMuted);
              if (isAutoFollowingRef.current) {
                mapInstanceRef.current?.panTo(nextStep.coordinates, { animate: true });
              }
            }
          }

          // Compute live remaining distance and time
          if (navRoute && navRoute.waypoints.length > 0) {
            const finalPt = navRoute.waypoints[navRoute.waypoints.length - 1];
            const distLeft = calculateDistanceKm(liveCoords, finalPt);
            setLiveRemainingDistance(formatDistance(distLeft));
            setLiveRemainingDuration(Math.max(1, Math.round((distLeft / 18) * 60)));

            // Off-Route Deviation Detection: if user turns onto another road (> 45m from planned route)
            if (navRoute.waypoints.length > 1 && !isRerouting) {
              const distToRouteMeters = calculateDistanceToRouteMeters(liveCoords, navRoute.waypoints);
              if (distToRouteMeters > 45) {
                handleOffRouteReroute(liveCoords);
              }
            }
          }
        },
        (err) => {
          console.warn('Real GPS tracking watch error:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000
        }
      );
    } catch (err) {
      console.warn('Failed to start geolocation watcher:', err);
    }

    return () => {
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
      }
    };
  }, [isNavigating, navRoute, activeStepIndex, isVoiceMuted, updateHeading, isRerouting, handleOffRouteReroute]);

  // User Locate button click
  const handleLocateMe = () => {
    if (isLocating) return;
    setIsLocating(true);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos = validateCoordinates([pos.coords.latitude, pos.coords.longitude]);
            setUserLocation(newPos);
            userMarkerRef.current?.setLatLng(newPos);
            if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && pos.coords.heading >= 0) {
              updateHeading(pos.coords.heading);
            }
            prevCoordsRef.current = newPos;
            mapInstanceRef.current?.flyTo(newPos, 15, { duration: 1 });
            setIsLocating(false);
          },
          () => {
            setIsLocating(false);
            const fallbackPos = KOLKATA_CENTER;
            setUserLocation(fallbackPos);
            userMarkerRef.current?.setLatLng(fallbackPos);
            mapInstanceRef.current?.flyTo(fallbackPos, 14, { duration: 1 });
          },
          { timeout: 6000 }
        );
      } catch {
        setIsLocating(false);
      }
    } else {
      setIsLocating(false);
    }
  };

  // Distance from user to currently selected place
  const selectedPlaceDistance = selectedPlace
    ? formatDistance(calculateDistanceKm(userLocation, selectedPlace.coordinates))
    : '';

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100">
      {/* Route Calculation Progress Indicator */}
      {isLoadingRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-xs animate-in fade-in duration-200 border border-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Tracing real Kolkata street route...</span>
        </div>
      )}

      {/* Persistent Real-Time Navigation Overlay (Turn-in directions, dynamic countdown, next stop remaining distance) */}
      <NavigationOverlay
        isNavigating={isNavigating}
        navRoute={navRoute}
        activeStepIndex={activeStepIndex}
        userLocation={userLocation}
        liveSpeed={liveSpeed}
        liveRemainingDistance={liveRemainingDistance}
        liveRemainingDuration={liveRemainingDuration}
        isVoiceMuted={isVoiceMuted}
        onToggleVoice={() => {
          const nextMuted = !isVoiceMuted;
          setIsVoiceMuted(nextMuted);
          if (!nextMuted && navRoute?.steps[activeStepIndex]) {
            speakVoiceInstruction(navRoute.steps[activeStepIndex].voiceText, false);
          } else {
            stopVoiceInstruction();
          }
        }}
        onStepChange={handleStepChange}
        onRecenter={handleRecenterToLiveUser}
        onExitNavigation={handleExitNavigation}
        targetStops={navTargetStops}
        userHeading={userHeadingRef.current}
        isRerouting={isRerouting}
        isAutoFollowing={isAutoFollowing}
      />

      {/* 2. Custom Multi-Stop Route Floating Header (When active from Guide, before starting navigation) */}
      {!isNavigating && customRoutePlaces && customRoutePlaces.length >= 2 && (
        <div className="absolute top-3 left-3 right-3 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500 rounded-2xl p-3 shadow-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Route className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Custom Route Ready ({customRoutePlaces.length} Stops)
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {customRoutePlaces.map((p) => p.name).slice(0, 2).join(' → ')}
                {customRoutePlaces.length > 2 ? ` +${customRoutePlaces.length - 2} more` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={() => startNavigationToCustomStops(customRoutePlaces)}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" />
              <span>Start</span>
            </button>
            <button
              onClick={onClearCustomRoute}
              className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Persistent User Location Live Weather Overlay (Real-time Temp, Condition, Humidity) */}
      {!isNavigating && (!customRoutePlaces || customRoutePlaces.length < 2) && (
        <div className="absolute top-3 left-3 z-20 pointer-events-auto animate-in fade-in duration-300">
          <UserWeatherWidget
            userLocation={userLocation}
            variant="compact"
          />
        </div>
      )}

      {/* 3. Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Locate Button */}
      <div
        className={`absolute right-4 z-20 transition-all duration-300 ${
          isNavigating ? 'bottom-28' : selectedPlace ? 'bottom-44' : 'bottom-6'
        }`}
      >
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer hover:border-emerald-500 text-slate-700"
          title="Locate My Position"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* SINGLE POPUP CARD WHEN CLICKING A PANDAL ON MAP (WITH CURRENT DATE & REAL-TIME WEATHER) */}
      {!isNavigating && selectedPlace && (
        <div className="absolute bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-6 duration-300">
          {(selectedPlace as any).crowdCount >= 500 && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-red-200 dark:border-red-900 bg-gradient-to-r from-red-600 to-orange-600 px-3.5 py-2.5 shadow-lg">
              <TriangleAlert className="w-4 h-4 shrink-0 fill-red-950/30 text-white" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white leading-tight">
                  High Crowd Alert — {(selectedPlace as any).crowdCount} people here right now
                </div>
                <div className="text-[10px] text-red-100 leading-tight">
                  Heavy rush at {selectedPlace.name}. Expect long queues & delays.
                </div>
              </div>
            </div>
          )}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl flex gap-3 relative">
            {/* Top Right Action Buttons: Share and Close */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
              <button
                onClick={() => {
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('pandal', selectedPlace.id);
                    const shareUrl = url.toString();
                    if (navigator.share) {
                      navigator.share({
                        title: `${selectedPlace.name} - Manchitra`,
                        text: `Explore ${selectedPlace.name} on Manchitra Durga Puja Guide!`,
                        url: shareUrl
                      }).catch(() => {});
                    } else if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Pandal link copied to clipboard!');
                    }
                  } catch {}
                }}
                className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                aria-label="Share Pandal"
                title="Share Pandal"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClearSelectedPlace}
                className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer transition-colors"
                aria-label="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pandal Photo Thumbnail */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 relative border border-slate-100 dark:border-slate-800">
              <img
                src={getSafeImageUrl(selectedPlace.image)}
                alt={selectedPlace.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
              <div className="absolute top-1 left-1 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded text-[9px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-0.5 shadow-xs border border-slate-200 dark:border-slate-800">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{selectedPlace.rating}</span>
              </div>
            </div>

            {/* Pandal Name, Details & Navigation Button */}
            <div className="flex-1 min-w-0 pr-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                    {selectedPlace.zone || selectedPlace.district || 'Kolkata'}
                  </span>
                  {selectedPlaceDistance && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      • {selectedPlaceDistance} away
                    </span>
                  )}
                  {(selectedPlace as any).crowdCount !== undefined && (selectedPlace as any).crowdCount > 0 && (() => {
                    const c = (selectedPlace as any).crowdCount as number;
                    const high = c >= 500;
                    const med = !high && c >= 100;
                    const level = high ? 'High' : med ? 'Medium' : 'Low';
                    const color = high
                      ? { text: 'text-red-700 dark:text-red-300', bg: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/60 dark:to-orange-950/40', border: 'border-red-200/80 dark:border-red-800', dot: 'bg-red-500', icon: 'text-red-600 dark:text-red-400' }
                      : med
                      ? { text: 'text-orange-700 dark:text-orange-300', bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/60 dark:to-amber-950/40', border: 'border-orange-200/80 dark:border-orange-800', dot: 'bg-orange-500', icon: 'text-orange-600 dark:text-orange-400' }
                      : { text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/40', border: 'border-emerald-200/80 dark:border-emerald-800', dot: 'bg-emerald-500', icon: 'text-emerald-600 dark:text-emerald-400' };
                    return (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${color.text} ${color.bg} px-2 py-0.5 rounded-full border ${color.border} shadow-xs`}>
                        <span className="relative flex w-1.5 h-1.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color.dot} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${color.dot}`}></span>
                        </span>
                        <Users className={`w-3 h-3 shrink-0 ${color.icon}`} />
                        {c} here · {level}
                      </span>
                    );
                  })()}
                </div>

                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate mt-1">
                  {selectedPlace.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {selectedPlace.description || 'Famous Durga Puja destination in Kolkata'}
                </p>

                {/* Real-time Weather & Current Date Widget for this Individual Pandal */}
                <div className="mt-1.5">
                  <PandalWeatherWidget
                    latitude={validateCoordinates(selectedPlace.coordinates)[0]}
                    longitude={validateCoordinates(selectedPlace.coordinates)[1]}
                    pandalName={selectedPlace.name}
                    compact={true}
                  />
                </div>
              </div>

              {/* Action Buttons: Navigate (Google Maps style) & Add Route */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => startNavigationToPlace(selectedPlace)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  <span>Navigate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onAddPlaceToCustomRoute) {
                      onAddPlaceToCustomRoute(selectedPlace);
                      setJustAddedToRoute(true);
                      setTimeout(() => setJustAddedToRoute(false), 2000);
                    }
                  }}
                  className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Add to Custom Route"
                >
                  {justAddedToRoute ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Added</span>
                    </>
                  ) : (
                    <>
                      <Route className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add Route</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

