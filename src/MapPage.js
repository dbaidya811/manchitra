import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom red location icon for searched locations
const redMarkerIcon = new L.DivIcon({
  className: 'custom-red-marker',
  html: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#c8102e" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Google Maps-like blue dot icon for user's live location
const liveLocationIcon = new L.DivIcon({
  className: 'custom-live-location',
  html: `<div style="width: 16px; height: 16px; background-color: #0088ff; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0, 136, 255, 0.8);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -15]
});

// Navigation arrow icon (Dynamic based on heading)
const getNavIcon = (heading) => new L.DivIcon({
  className: 'custom-nav-arrow',
  html: `<div style="transform: rotate(${heading || 0}deg); transition: transform 0.3s; display: flex; justify-content: center; align-items: center;"><svg viewBox="0 0 24 24" width="36" height="36" fill="#0088ff" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));"><polygon points="12 2 22 22 12 18 2 22"></polygon></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

// --- Voice Navigation Helpers ---
let voices = [];
const loadVoices = () => {
  if ('speechSynthesis' in window) {
    // Eagerly load voices
    voices = window.speechSynthesis.getVoices();
    // And also set up the event listener for when they change
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
    };
  }
};
loadVoices(); // Load voices when script is parsed

const speak = (text, settings = {}) => {
  const { voiceEnabled = true, voiceGender = 'female' } = settings;

  // If map voice is 'off', no voice comments will be made
  if (!voiceEnabled) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing voice
    }
    return;
  }

  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel(); // Cancel ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN'; // Indian English pronunciation
    utterance.rate = 0.9;

    if (voices.length > 0) {
      let selectedVoice = null;
      
      if (voiceGender === 'female') {
        // Common names for female voices (Google Female, Heera, Veena, Zira, etc.)
        selectedVoice = voices.find(v => v.lang.includes('en-IN') && /female|heera|veena|zira|samantha|hazel/i.test(v.name))
                     || voices.find(v => /female|heera|veena|zira|samantha|hazel/i.test(v.name));
      } else { // male
        // Common names for male voices (Google Male, Ravi, Rishi, David, etc.)
        selectedVoice = voices.find(v => v.lang.includes('en-IN') && /male|ravi|rishi|david|mark|george|alex/i.test(v.name))
                     || voices.find(v => /male|ravi|rishi|david|mark|george|alex/i.test(v.name));
      }
      
      // If the specific gender voice is not found, fallback to any default Indian English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('en-IN'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang; // Resetting language due to browser inconsistencies
      }
    }

    window.speechSynthesis.speak(utterance);
  }
};

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

const generateInstruction = (step) => {
  if (!step || !step.maneuver) return "continue straight";
  const { type, modifier } = step.maneuver;
  const name = step.name ? `onto ${step.name}` : '';
  
  switch (type) {
    case 'turn': return `turn ${modifier} ${name}`;
    case 'new name': return `continue ${name}`;
    case 'depart': return `head ${modifier || 'forward'} ${name}`;
    case 'arrive': return `arrive at your destination`;
    case 'roundabout': return `at the roundabout, take the exit ${name}`;
    case 'merge': return `merge ${modifier} ${name}`;
    case 'on ramp': return `take the ramp ${modifier} ${name}`;
    case 'off ramp': return `take the exit ${modifier} ${name}`;
    case 'fork': return `keep ${modifier} ${name}`;
    case 'end of road': return `at the end of the road, turn ${modifier} ${name}`;
    default: return `continue ${modifier || 'straight'} ${name}`;
  }
};

// Component to dynamically update the map center when a new location is selected
const MapUpdater = ({ center, routePath, isNavigating, userLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (isNavigating && userLocation) {
      map.setView(userLocation, 18, { animate: true }); // Lock and zoom to user when navigating
    } else if (routePath && routePath.length > 1) {
      const bounds = L.latLngBounds(routePath);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } else {
      map.flyTo(center, 14, { animate: true });
    }
  }, [center, map, routePath, isNavigating, userLocation]);
  return null;
};

const DEFAULT_SETTINGS = { voiceEnabled: true, voiceGender: 'female', useExternalMap: false };

const MapPage = ({ settings = DEFAULT_SETTINGS, targetPandal, clearTarget, allPandals = [] }) => {

  // Kolkata coordinates as default
  const [position, setPosition] = useState([22.5726, 88.3639]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeSteps, setRouteSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [warned200m, setWarned200m] = useState(false);
  const [heading, setHeading] = useState(0);
  const [navInstruction, setNavInstruction] = useState({ text: '', distance: '' });

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Get user location automatically on mount
  useEffect(() => {
    let watchId;
    if ("geolocation" in navigator) {
      // Initial get position
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          setPosition(loc); 
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        { enableHighAccuracy: true }
      );

      // Continuous watch position for real-time navigation tracking
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            setHeading(pos.coords.heading);
          }
        },
        (error) => console.error("Geolocation watch error:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Debounced effect to fetch location suggestions from OpenStreetMap Nominatim API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);

      // 1. Search in local database (allPandals)
      const dbMatches = allPandals.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.area && p.area.toLowerCase().includes(searchQuery.toLowerCase()))
      ).filter(p => p.location && p.location.includes(',')).map(p => {
        const coords = p.location.split(',');
        return {
          place_id: `db-${p.id}`,
          display_name: `${p.name} (${p.area})`,
          lat: coords[0].trim(),
          lon: coords[1].trim(),
          isPandal: true
        };
      });

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await res.json();
        setSuggestions([...dbMatches, ...data]);
      } catch (error) {
        console.error("Location search failed:", error);
        setSuggestions(dbMatches); // Fallback to DB matches if API fails
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 600); // 600ms debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectLocation = async (loc) => {
    const newPos = [parseFloat(loc.lat), parseFloat(loc.lon)];
    setPosition(newPos);
    setSearchQuery(loc.display_name); // Set input to full location name
    setShowSuggestions(false);

    if (userLocation) {
      try {
        // Fetch real driving route from OSRM with steps=true for turn-by-turn navigation
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${newPos[1]},${newPos[0]}?overview=full&geometries=geojson&steps=true`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          // GeoJSON returns [lon, lat], convert to [lat, lon] for Leaflet
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoutePath(coords);
          setRouteSteps(data.routes[0].legs[0].steps || []);
          setCurrentStepIndex(0);
          setWarned200m(false);
          
          const distKm = (data.routes[0].distance / 1000).toFixed(1);
          const durMin = Math.round(data.routes[0].duration / 60);
          const speedKmH = durMin > 0 ? ((distKm / durMin) * 60).toFixed(1) : 0;

          setRouteInfo({
            distance: distKm,
            duration: durMin,
            speed: speedKmH
          });
        } else {
          setRoutePath([userLocation, newPos]); // Fallback straight line
          setRouteSteps([]);
          setRouteInfo(null);
          setIsNavigating(false);
        }
      } catch (error) {
        console.error("Routing failed:", error);
        setRoutePath([userLocation, newPos]); // Fallback straight line
        setRouteSteps([]);
        setRouteInfo(null);
        setIsNavigating(false);
      }
    }
  };

  // Auto-trigger navigation when targetPandal prop changes
  useEffect(() => {
    if (targetPandal && userLocation) {
      const [lat, lng] = targetPandal.coords;
      handleSelectLocation({ lat: lat.toString(), lon: lng.toString(), display_name: targetPandal.name });
      if (clearTarget) clearTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPandal, userLocation]);

  const handleStartNavigation = () => {
    // First check the external map setting
    if (settings.useExternalMap && position && userLocation) {
      const [destLat, destLon] = position;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${destLat},${destLon}&travelmode=driving`;
      window.open(url, '_blank');
      return; // Exit internal navigation
    }

    // Start internal navigation if route is available
    if (!routePath || routePath.length === 0) {
      alert("Please select a destination to start navigation.");
      return;
    }

    setIsNavigating(true);
    setCurrentStepIndex(0);
    setWarned200m(false);
    const firstInstruction = routeSteps.length > 0 ? generateInstruction(routeSteps[0]) : "forward";
    setNavInstruction({ text: firstInstruction, distance: 'Starting...' });
    speak(`Navigation started. ${firstInstruction}.`, settings);
  };

  const handleExitNavigation = () => {
    setIsNavigating(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Voice Navigation Real-time Tracker
  useEffect(() => {
    if (!isNavigating || !userLocation || routeSteps.length === 0) return;

    if (currentStepIndex < routeSteps.length - 1) {
      const nextStep = routeSteps[currentStepIndex + 1];
      const [nextLon, nextLat] = nextStep.maneuver.location;
      const dist = getDistanceMeters(userLocation[0], userLocation[1], nextLat, nextLon);

      const distText = dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist / 10) * 10 + ' m';
      setNavInstruction({ text: generateInstruction(nextStep), distance: distText });

      // Warn at 200m
      if (dist <= 200 && dist > 50 && !warned200m) {
        speak(`In ${Math.round(dist / 10) * 10} meters, ${generateInstruction(nextStep)}`, settings);
        setWarned200m(true);
      } 
      // Execute turn at 50m
      else if (dist <= 50) {
        speak(`${generateInstruction(nextStep)}`, settings);
        setCurrentStepIndex(prev => prev + 1);
        setWarned200m(false);
      }
    } else {
      // Last step / Arrived
      const destStep = routeSteps[routeSteps.length - 1];
      const [destLon, destLat] = destStep.maneuver.location;
      const dist = getDistanceMeters(userLocation[0], userLocation[1], destLat, destLon);
      
      if (dist <= 30) {
        setNavInstruction({ text: "Arrived at destination!", distance: "" });
        if (!warned200m) {
          speak("You have arrived at your destination.", settings);
          setWarned200m(true);
          setTimeout(() => setIsNavigating(false), 5000); // Auto exit after 5s
        }
      } else {
        const distText = dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist / 10) * 10 + ' m';
        setNavInstruction({ text: "Head to destination", distance: distText });
      }
    }
  }, [userLocation, isNavigating, routeSteps, currentStepIndex, warned200m, settings]);

  // Check if map is exactly at the user's location to hide the default marker
  const isPositionUserLocation = userLocation && position[0] === userLocation[0] && position[1] === userLocation[1];

  return (
    <div className="map-page" style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, zIndex: 0 }}>
      
      {/* Top Panel: Search Bar or Navigation Instruction */}
      {!isNavigating ? (
        <div className="map-search-container" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '25px', padding: '10px 15px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search location..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              if (e.target.value.trim() === '') {
                setRoutePath(null); // Clear the route if search box is cleared
                setRouteInfo(null);
                setRouteSteps([]);
                setIsNavigating(false);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '15px', backgroundColor: 'transparent', color: '#333' }}
          />
          {isLoading && (
            <div style={{ width: '16px', height: '16px', border: '2px solid #ccc', borderTopColor: '#ff7b00', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          )}
        </div>

        {/* Suggestions Dropdown List */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ marginTop: '8px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
            {suggestions.map((loc, index) => (
              <div 
                key={loc.place_id || index}
                onClick={() => handleSelectLocation(loc)}
                style={{ padding: '12px 15px', borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: loc.isPandal ? '#fff8f8' : 'transparent' }}
              >
                {loc.isPandal ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(200,16,46,0.1)" stroke="#c8102e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>
                  </svg>
                )}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: loc.isPandal ? '600' : 'normal', color: loc.isPandal ? '#c8102e' : '#333' }}>
                  {loc.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
        </div>
      ) : (
        <div className="map-search-container" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 1000, backgroundColor: '#0088ff', color: 'white', borderRadius: '16px', padding: '15px 20px', boxShadow: '0 4px 15px rgba(0, 136, 255, 0.4)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7"></polyline>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '20px', fontWeight: '700', textTransform: 'capitalize' }}>{navInstruction.text}</span>
            {navInstruction.distance && (
              <span style={{ fontSize: '15px', fontWeight: '500', opacity: 0.9 }}>in {navInstruction.distance}</span>
            )}
          </div>
        </div>
      )}

      {/* Route Info Bottom Bar */}
      {routeInfo && (
        <div className="map-bottom-panel" style={{ position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '16px', padding: '15px 20px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: '#0088ff' }}>{routeInfo.duration} min</span>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>{routeInfo.distance} km • Avg {routeInfo.speed} km/h</span>
            </div>
            
            {isNavigating ? (
              <button style={{ backgroundColor: '#c8102e', color: 'white', border: 'none', borderRadius: '25px', padding: '12px 24px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(200, 16, 46, 0.3)' }} onClick={handleExitNavigation}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Exit
              </button>
            ) : (
              <button style={{ backgroundColor: '#0088ff', color: 'white', border: 'none', borderRadius: '25px', padding: '12px 24px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 136, 255, 0.3)' }} onClick={handleStartNavigation}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                Start
              </button>
            )}
          </div>
        </div>
      )}

      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <MapUpdater center={position} routePath={routePath} isNavigating={isNavigating} userLocation={userLocation} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Route Polyline */}
        {routePath && (
          <Polyline positions={routePath} color="#0088ff" weight={5} opacity={0.7} />
        )}

        {/* Standard Marker (Hides if map is centered exactly on user's live location without search) */}
        {!isPositionUserLocation && (
          <Marker position={position} icon={redMarkerIcon}>
            <Popup>
              {searchQuery || "Kolkata"} <br /> Welcome to Pandal Hopping!
            </Popup>
          </Marker>
        )}

        {/* User's Live Location Blue Dot / Navigation Arrow */}
        {userLocation && (
          <Marker position={userLocation} icon={isNavigating ? getNavIcon(heading) : liveLocationIcon}>
            <Popup>{isNavigating ? "Navigating..." : "You are here!"}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapPage;