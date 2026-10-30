import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  Crosshair,
  Search,
  Route,
  ArrowRight,
  Star,
  CheckCircle2,
  FolderOpen,
  X,
  SlidersHorizontal,
  ChevronRight,
  Loader2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus
} from 'lucide-react';
import { Place } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';
import { getSafeImageUrl, handleImageError } from '../utils/imageHelper';

interface GuideScreenProps {
  places: Place[];
  onNavigateToMap: (place?: Place, options?: { addRoute?: boolean }) => void;
  onNavigateCustomRoute?: (places: Place[]) => void;
  onSelectPlace?: (place: Place) => void;
  onOpenDataManager?: () => void;
  customRoutePlaces?: Place[];
  onUpdateCustomRoutePlaces?: (places: Place[]) => void;
}

interface LocationPoint {
  name: string;
  area?: string;
  coords: [number, number]; // [lat, lng]
  image?: string;
}

// Popular landmark areas in Kolkata with accurate coordinates
const KOLKATA_LANDMARKS: LocationPoint[] = [
  { name: 'Esplanade (Dharmatala)', area: 'Central Kolkata', coords: [22.5645, 88.3524] },
  { name: 'Shyambazar Five Point', area: 'North Kolkata', coords: [22.6033, 88.3712] },
  { name: 'Sovabazar Sutanuti', area: 'North Kolkata', coords: [22.5979, 88.3619] },
  { name: 'Hatibagan Market', area: 'North Kolkata', coords: [22.5944, 88.3720] },
  { name: 'Bagbazar Ghat', area: 'North Kolkata', coords: [22.6045, 88.3664] },
  { name: 'College Square', area: 'Central Kolkata', coords: [22.5744, 88.3639] },
  { name: 'Sealdah Railway Station', area: 'Central Kolkata', coords: [22.5674, 88.3711] },
  { name: 'Howrah Railway Station', area: 'Howrah', coords: [22.5839, 88.3426] },
  { name: 'Park Street', area: 'Central Kolkata', coords: [22.5511, 88.3526] },
  { name: 'Victoria Memorial / Maidan', area: 'Central Kolkata', coords: [22.5448, 88.3426] },
  { name: 'Rabindra Sadan', area: 'South Kolkata', coords: [22.5393, 88.3496] },
  { name: 'Kalighat Metro & Temple', area: 'South Kolkata', coords: [22.5186, 88.3458] },
  { name: 'Gariahat Crossing', area: 'South Kolkata', coords: [22.5188, 88.3678] },
  { name: 'Rashbehari / Deshapriya Park', area: 'South Kolkata', coords: [22.5183, 88.3582] },
  { name: 'Maddox Square', area: 'South Kolkata', coords: [22.5283, 88.3592] },
  { name: 'Jadavpur 8B Bus Stand', area: 'South Kolkata', coords: [22.4975, 88.3718] },
  { name: 'Behala Chowrasta', area: 'South Kolkata', coords: [22.4842, 88.3188] },
  { name: 'Salt Lake City Centre 1', area: 'Salt Lake', coords: [22.5878, 88.4082] },
  { name: 'Salt Lake Karunamoyee', area: 'Salt Lake', coords: [22.5822, 88.4231] },
  { name: 'Sector V Webel More', area: 'Salt Lake', coords: [22.5735, 88.4331] },
  { name: 'New Town Biswa Bangla Gate', area: 'New Town', coords: [22.5855, 88.4682] },
  { name: 'Eco Park New Town', area: 'New Town', coords: [22.6074, 88.4678] },
  { name: 'Dum Dum Park', area: 'North Suburbs', coords: [22.6108, 88.4146] },
  { name: 'Lake Town Clock Tower', area: 'North Suburbs', coords: [22.6056, 88.4005] },
  { name: 'Sreebhumi Sporting Club', area: 'VIP Road', coords: [22.6006, 88.4009] },
  { name: 'Ultadanga Crossing', area: 'North Kolkata', coords: [22.5931, 88.3887] },
  { name: 'Garia / Kavi Subhash', area: 'South Suburbs', coords: [22.4637, 88.3976] }
];

const RADIUS_OPTIONS = [1.5, 2.5, 4, 5, 6, 8, 10];

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point P to line segment AB (in km)
function distanceToSegmentKm(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const avgLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(avgLat);

  const bx = (bLon - aLon) * 111.32 * cosLat;
  const by = (bLat - aLat) * 110.574;

  const px = (pLon - aLon) * 111.32 * cosLat;
  const py = (pLat - aLat) * 110.574;

  const segLenSq = bx * bx + by * by;
  if (segLenSq === 0) {
    return calculateDistanceKm(pLat, pLon, aLat, aLon);
  }

  let t = (px * bx + py * by) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = t * bx;
  const closestY = t * by;

  const dx = px - closestX;
  const dy = py - closestY;

  return Math.sqrt(dx * dx + dy * dy);
}

export const GuideScreen: React.FC<GuideScreenProps> = ({
  places,
  onNavigateToMap,
  onNavigateCustomRoute,
  onSelectPlace,
  onOpenDataManager,
  customRoutePlaces,
  onUpdateCustomRoutePlaces
}) => {
  // Guide Mode: 'custom_route' | 'current' | 'two_locations'
  const [guideMode, setGuideMode] = useState<'custom_route' | 'current' | 'two_locations'>('custom_route');

  // Selected distance radius for corridor / GPS
  const [selectedRadius, setSelectedRadius] = useState<number>(4);

  // User GPS coordinates (defaulting to Kolkata center)
  const [userCoords, setUserCoords] = useState<[number, number]>([22.5726, 88.3639]);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [hasGps, setHasGps] = useState<boolean>(false);
  const [locationStatusText, setLocationStatusText] = useState<string>('Kolkata Central');

  // Two location inputs state
  const [loc1Text, setLoc1Text] = useState<string>('Shyambazar Five Point');
  const [loc1Coords, setLoc1Coords] = useState<[number, number]>([22.6033, 88.3712]);
  const [loc1Active, setLoc1Active] = useState<boolean>(false);

  const [loc2Text, setLoc2Text] = useState<string>('Gariahat Crossing');
  const [loc2Coords, setLoc2Coords] = useState<[number, number]>([22.5188, 88.3678]);
  const [loc2Active, setLoc2Active] = useState<boolean>(false);

  // Custom Route State: derived directly from customRoutePlaces prop (single source of truth)
  const [localCustomStops, setLocalCustomStops] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('manchitra_custom_route_stops');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return places.slice(0, 3);
  });

  const customStops = (customRoutePlaces && customRoutePlaces.length > 0) ? customRoutePlaces : localCustomStops;

  const updateStops = (newStops: Place[]) => {
    setLocalCustomStops(newStops);
    try {
      localStorage.setItem('manchitra_custom_route_stops', JSON.stringify(newStops));
    } catch (err) {
      console.warn('Could not save custom route:', err);
    }
    onUpdateCustomRoutePlaces?.(newStops);
  };

  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [customSelectedZone, setCustomSelectedZone] = useState('All');

  const loc1Ref = useRef<HTMLDivElement>(null);
  const loc2Ref = useRef<HTMLDivElement>(null);

  // Try fetching user GPS on first mount
  useEffect(() => {
    detectUserGps(false);
  }, []);

  const detectUserGps = (userInitiated = true) => {
    if (!navigator.geolocation) {
      if (userInitiated) setLocationStatusText('GPS not supported on device');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserCoords(coords);
        setHasGps(true);
        setIsLocating(false);
        setLocationStatusText('My Real GPS Location');
      },
      () => {
        setIsLocating(false);
        if (userInitiated) {
          setLocationStatusText('Using Kolkata Central');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (loc1Ref.current && !loc1Ref.current.contains(e.target as Node)) {
        setLoc1Active(false);
      }
      if (loc2Ref.current && !loc2Ref.current.contains(e.target as Node)) {
        setLoc2Active(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combined searchable locations: places + Kolkata landmarks
  const allSuggestions = useMemo<LocationPoint[]>(() => {
    const placePoints: LocationPoint[] = places.map((p) => ({
      name: p.name,
      area: p.zone || p.district || 'Kolkata',
      coords: p.coordinates,
      image: p.image
    }));

    return [...KOLKATA_LANDMARKS, ...placePoints];
  }, [places]);

  const suggestions1 = useMemo(() => {
    const q = loc1Text.trim().toLowerCase();
    if (!q) return allSuggestions.slice(0, 7);
    return allSuggestions
      .filter((item) => item.name.toLowerCase().includes(q) || (item.area && item.area.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [loc1Text, allSuggestions]);

  const suggestions2 = useMemo(() => {
    const q = loc2Text.trim().toLowerCase();
    if (!q) return allSuggestions.slice(0, 7);
    return allSuggestions
      .filter((item) => item.name.toLowerCase().includes(q) || (item.area && item.area.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [loc2Text, allSuggestions]);

  // Filter and sort pandals according to selected radius and active location mode
  const filteredPandals = useMemo(() => {
    if (!places.length) return [];

    return places
      .map((place) => {
        const [pLat, pLon] = place.coordinates;
        let distance = 0;
        let contextLabel = '';

        if (guideMode === 'current') {
          distance = calculateDistanceKm(userCoords[0], userCoords[1], pLat, pLon);
          contextLabel = `${distance.toFixed(1)} km away`;
        } else if (guideMode === 'two_locations') {
          const d1 = calculateDistanceKm(loc1Coords[0], loc1Coords[1], pLat, pLon);
          const d2 = calculateDistanceKm(loc2Coords[0], loc2Coords[1], pLat, pLon);
          const corridorDist = distanceToSegmentKm(
            pLat,
            pLon,
            loc1Coords[0],
            loc1Coords[1],
            loc2Coords[0],
            loc2Coords[1]
          );

          distance = corridorDist;
          contextLabel = `${corridorDist.toFixed(1)} km from route`;
        }

        return {
          ...place,
          distanceFromOrigin: distance,
          contextLabel
        };
      })
      .filter((p) => p.distanceFromOrigin <= selectedRadius)
      .sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);
  }, [places, selectedRadius, guideMode, userCoords, loc1Coords, loc2Coords]);

  // Total distance of custom route in km
  const customRouteTotalKm = useMemo(() => {
    if (customStops.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < customStops.length - 1; i++) {
      total += calculateDistanceKm(
        customStops[i].coordinates[0],
        customStops[i].coordinates[1],
        customStops[i + 1].coordinates[0],
        customStops[i + 1].coordinates[1]
      );
    }
    return total;
  }, [customStops]);

  // Handlers for Custom Route manipulation
  const handleAddStop = (place: Place) => {
    if (customStops.some((p) => p.id === place.id)) return;
    updateStops([...customStops, place]);
  };

  const handleRemoveStop = (placeId: string) => {
    updateStops(customStops.filter((p) => p.id !== placeId));
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customStops.length) return;
    const copy = [...customStops];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    updateStops(copy);
  };

  const handleLoadPresetRoute = (zoneName: string) => {
    const matched = places.filter((p) => (p.zone || p.district || '').toLowerCase().includes(zoneName.toLowerCase())).slice(0, 5);
    if (matched.length > 0) {
      updateStops(matched);
    }
  };

  // Search filtered places for adding to custom route
  const availablePlacesToAdd = useMemo(() => {
    const q = customSearchQuery.trim().toLowerCase();
    return places.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || (p.zone && p.zone.toLowerCase().includes(q));
      const matchesZone = customSelectedZone === 'All' || (p.zone || p.district) === customSelectedZone;
      return matchesQuery && matchesZone;
    }).slice(0, 15);
  }, [places, customSearchQuery, customSelectedZone]);

  // Available unique zones for filtering
  const availableZones = useMemo(() => {
    const zonesSet = new Set<string>();
    places.forEach((p) => {
      const z = p.zone || p.district;
      if (z) zonesSet.add(z);
    });
    return ['All', ...Array.from(zonesSet).slice(0, 8)];
  }, [places]);

  const mainScrollRef = useDragScroll<HTMLDivElement>({ direction: 'vertical' });
  const radiusScrollRef = useDragScroll<HTMLDivElement>({ direction: 'horizontal' });

  return (
    <div
      ref={mainScrollRef}
      className="flex-1 min-h-0 overflow-y-auto touch-scroll no-scrollbar p-3.5 pb-24 space-y-3.5 bg-slate-50/60 dark:bg-slate-950 transition-colors overscroll-y-contain"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Header Info Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            <Compass className="w-4 h-4" />
            <span>Pandal Route Guide</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {places.length} Pandals Available
          </span>
        </div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
          Explore &amp; Plan Pandal Routes
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Build your custom pandal-hopping route or discover pandals near your location.
        </p>
      </div>

      {/* 3-Way Mode Selector: Custom Route / My Location / 2 Locations */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs space-y-3 transition-colors">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setGuideMode('custom_route')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              guideMode === 'custom_route'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="truncate">Custom Route</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideMode('current')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              guideMode === 'current'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="truncate">My Location</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideMode('two_locations')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              guideMode === 'two_locations'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span className="truncate">2 Locations</span>
          </button>
        </div>

        {/* ----------------- MODE 1: CUSTOM ROUTE BUILDER ----------------- */}
        {guideMode === 'custom_route' && (
          <div className="space-y-3 pt-0.5 animate-in fade-in duration-200">
            {/* Quick Presets Row */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Quick Templates:</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleLoadPresetRoute('North')}
                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  North Loop
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPresetRoute('South')}
                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  South Loop
                </button>
                <button
                  type="button"
                  onClick={() => updateStops([])}
                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[10px] hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Custom Stops List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span>Selected Stops ({customStops.length})</span>
                {customStops.length >= 2 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    ~{customRouteTotalKm.toFixed(1)} km total
                  </span>
                )}
              </div>

              {customStops.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Route is Empty</p>
                  <p className="text-[11px] text-slate-400">Search and tap "+ Add" below to create your custom route.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {customStops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-[11px]">
                            {stop.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {stop.zone || 'Kolkata'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveStop(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStop(idx, 'down')}
                          disabled={idx === customStops.length - 1}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(stop.id)}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-rose-500 cursor-pointer"
                          title="Remove stop"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button: Navigate Custom Route */}
              {customStops.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => onNavigateCustomRoute?.(customStops)}
                  className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Plot &amp; Navigate Custom Route on Map ({customStops.length} Stops)</span>
                </button>
              ) : (
                <p className="text-[10px] text-center text-slate-400 italic pt-1">
                  Add at least 2 pandals to plot and navigate your custom route on the map.
                </p>
              )}
            </div>

            {/* Section to Search and Add Pandals */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Add Pandals to Custom Route
                </span>
                <span className="text-[10px] text-slate-500">Tap + to add</span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  placeholder="Search pandal by name or area..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Zone Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {availableZones.map((z) => (
                  <button
                    type="button"
                    key={z}
                    onClick={() => setCustomSelectedZone(z)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      customSelectedZone === z
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>

              {/* Available Places List - Natural Flow for silky smooth touch scrolling */}
              <div className="space-y-1.5">
                {availablePlacesToAdd.map((place) => {
                  const isAdded = customStops.some((s) => s.id === place.id);
                  return (
                    <div
                      key={place.id}
                      className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getSafeImageUrl(place.image)}
                          alt={place.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          onError={handleImageError}
                        />
                        <div className="truncate">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-[11px]">
                            {place.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {place.zone || 'Kolkata'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => (isAdded ? handleRemoveStop(place.id) : handleAddStop(place))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                          isAdded
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODE 2: CURRENT LOCATION (GPS) ----------------- */}
        {guideMode === 'current' && (
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                  {locationStatusText}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {userCoords[0].toFixed(4)}°N, {userCoords[1].toFixed(4)}°E
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => detectUserGps(true)}
              disabled={isLocating}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Crosshair className="w-3 h-3" />
              )}
              <span>{isLocating ? 'Detecting...' : 'Detect GPS'}</span>
            </button>
          </div>
        )}

        {/* ----------------- MODE 3: 2 LOCATIONS CORRIDOR ----------------- */}
        {guideMode === 'two_locations' && (
          <div className="space-y-2.5 pt-0.5">
            {/* Location 1 Input */}
            <div className="relative" ref={loc1Ref}>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
                <span>Location 1 (Starting Point):</span>
              </label>

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={loc1Text}
                  onChange={(e) => {
                    setLoc1Text(e.target.value);
                    setLoc1Active(true);
                  }}
                  onFocus={() => setLoc1Active(true)}
                  placeholder="e.g. Shyambazar, Howrah, Hatibagan..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-medium"
                />
              </div>

              {/* Suggestions Dropdown for Location 1 */}
              {loc1Active && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                  {suggestions1.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLoc1Text(item.name);
                        setLoc1Coords(item.coords);
                        setLoc1Active(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-emerald-50/70 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate flex-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 truncate">
                          {item.name}
                        </div>
                        {item.area && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.area}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location 2 Input */}
            <div className="relative" ref={loc2Ref}>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
                <span>Location 2 (Destination / Area):</span>
              </label>

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <input
                  type="text"
                  value={loc2Text}
                  onChange={(e) => {
                    setLoc2Text(e.target.value);
                    setLoc2Active(true);
                  }}
                  onFocus={() => setLoc2Active(true)}
                  placeholder="e.g. Gariahat, Park Street, Maddox Square..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-medium"
                />
              </div>

              {/* Suggestions Dropdown for Location 2 */}
              {loc2Active && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                  {suggestions2.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLoc2Text(item.name);
                        setLoc2Coords(item.coords);
                        setLoc2Active(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-indigo-50/70 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate flex-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-800 dark:group-hover:text-indigo-400 truncate">
                          {item.name}
                        </div>
                        {item.area && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.area}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Radius Selector for GPS & 2 Locations modes */}
      {guideMode !== 'custom_route' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Corridor Search Radius
            </span>
            <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              {selectedRadius} km
            </span>
          </div>

          <div
            ref={radiusScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
          >
            {RADIUS_OPTIONS.map((rad) => {
              const isSelected = selectedRadius === rad;
              return (
                <button
                  type="button"
                  key={rad}
                  onClick={() => setSelectedRadius(rad)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {rad} km
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Corridor / GPS Results List */}
      {guideMode !== 'custom_route' && (
        <>
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Pandals within {selectedRadius} km</span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                {filteredPandals.length}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Nearest first</span>
          </div>

          {filteredPandals.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <MapPin className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Pandals within {selectedRadius} km
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try selecting a larger radius (e.g. 6 km, 8 km or 10 km).
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPandals.map((place) => (
                <div
                  key={place.id}
                  onClick={() => onSelectPlace?.(place)}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-2xl p-3 shadow-xs transition-all cursor-pointer flex gap-3"
                >
                  <img
                    src={getSafeImageUrl(place.image)}
                    alt={place.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                    onError={handleImageError}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {place.name}
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {place.contextLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {place.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">{place.zone || 'Kolkata'}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToMap(place, { addRoute: true });
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Navigate</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
