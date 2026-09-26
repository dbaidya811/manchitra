/**
 * Geo calculation & Google Maps style turn-by-turn navigation utilities
 */

export const KOLKATA_CENTER: [number, number] = [22.5726, 88.3639];

/**
 * Safely parses and validates lat/lng coordinates, guaranteeing valid numbers.
 */
export function validateCoordinates(
  coords: any,
  fallbackLat = 22.5726,
  fallbackLng = 88.3639
): [number, number] {
  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && isFinite(lat) && isFinite(lng)) {
      return [lat, lng];
    }
  }

  if (coords && typeof coords === 'object') {
    const lat = Number(coords.latitude ?? coords.lat);
    const lng = Number(coords.longitude ?? coords.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && isFinite(lat) && isFinite(lng)) {
      return [lat, lng];
    }
  }

  return [fallbackLat, fallbackLng];
}

/**
 * Haversine distance in kilometers
 */
export function calculateDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = validateCoordinates(coord1);
  const [lat2, lon2] = validateCoordinates(coord2);

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
  return Math.round(R * c * 10) / 10;
}

/**
 * Formats distance into meters (e.g. 250 m) or kilometers (e.g. 2.4 km)
 */
export function formatDistance(km: number): string {
  if (isNaN(km) || km < 0) return '100 m';
  if (km < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 10) * 10);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

export type ManeuverType =
  | 'straight'
  | 'turn-left'
  | 'turn-right'
  | 'slight-left'
  | 'slight-right'
  | 'u-turn'
  | 'arrive';

export interface NavigationStep {
  id: string;
  maneuver: ManeuverType;
  distanceMeters: number;
  distanceText: string;
  instruction: string;
  voiceText: string;
  coordinates: [number, number];
}

export interface NavigationRoute {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  etaString: string;
  waypoints: [number, number][];
  steps: NavigationStep[];
  destinationName?: string;
}

/**
 * Generates realistic Kolkata road navigation steps and waypoints
 */
export function generateNavigationRoute(
  startCoord: [number, number],
  endCoord: [number, number],
  destinationName: string
): NavigationRoute {
  const start = validateCoordinates(startCoord);
  const end = validateCoordinates(endCoord);

  const straightDistKm = calculateDistanceKm(start, end);
  // Realistic urban Kolkata road route is ~1.25x straight line
  const routeDistKm = Math.max(0.4, Math.round(straightDistKm * 1.25 * 10) / 10);
  // Average city traffic speed ~18 km/h during puja
  const durationMinutes = Math.max(3, Math.round((routeDistKm / 18) * 60));

  // Compute ETA formatted
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const etaString = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Generate intermediate realistic waypoints that simulate Kolkata roads
  const dLat = end[0] - start[0];
  const dLng = end[1] - start[1];

  // 6 realistic polyline segments
  const waypoints: [number, number][] = [
    start,
    [start[0] + dLat * 0.18, start[1] + dLng * 0.05],
    [start[0] + dLat * 0.38, start[1] + dLng * 0.32],
    [start[0] + dLat * 0.62, start[1] + dLng * 0.58],
    [start[0] + dLat * 0.82, start[1] + dLng * 0.88],
    end
  ];

  // Generate turn-by-turn maneuvers
  const step1Dist = Math.round(routeDistKm * 0.2 * 1000);
  const step2Dist = Math.round(routeDistKm * 0.35 * 1000);
  const step3Dist = Math.round(routeDistKm * 0.3 * 1000);
  const step4Dist = Math.round(routeDistKm * 0.15 * 1000);

  // Determine turn directions based on relative bearing
  const turnsToRight = dLng > 0;

  const steps: NavigationStep[] = [
    {
      id: 'step-1',
      maneuver: 'straight',
      distanceMeters: step1Dist,
      distanceText: formatDistance(step1Dist / 1000),
      instruction: `Head straight towards main connector road`,
      voiceText: `Head straight for ${formatDistance(step1Dist / 1000)}.`,
      coordinates: waypoints[1]
    },
    {
      id: 'step-2',
      maneuver: turnsToRight ? 'turn-right' : 'turn-left',
      distanceMeters: step2Dist,
      distanceText: formatDistance(step2Dist / 1000),
      instruction: `In ${formatDistance(step1Dist / 1000)}, turn ${turnsToRight ? 'right' : 'left'} onto the main arterial road`,
      voiceText: `In ${formatDistance(step1Dist / 1000)}, turn ${turnsToRight ? 'right' : 'left'}.`,
      coordinates: waypoints[2]
    },
    {
      id: 'step-3',
      maneuver: 'straight',
      distanceMeters: step3Dist,
      distanceText: formatDistance(step3Dist / 1000),
      instruction: `Continue straight along the Puja corridor for ${formatDistance(step3Dist / 1000)}`,
      voiceText: `Continue straight for ${formatDistance(step3Dist / 1000)}.`,
      coordinates: waypoints[3]
    },
    {
      id: 'step-4',
      maneuver: turnsToRight ? 'turn-left' : 'turn-right',
      distanceMeters: step4Dist,
      distanceText: formatDistance(step4Dist / 1000),
      instruction: `Turn ${turnsToRight ? 'left' : 'right'} towards ${destinationName} entrance`,
      voiceText: `Turn ${turnsToRight ? 'left' : 'right'} towards ${destinationName} entrance.`,
      coordinates: waypoints[4]
    },
    {
      id: 'step-5',
      maneuver: 'arrive',
      distanceMeters: 50,
      distanceText: '50 m',
      instruction: `Arrived! ${destinationName} is ahead on your right.`,
      voiceText: `You have arrived at your destination: ${destinationName}!`,
      coordinates: end
    }
  ];

  return {
    totalDistanceKm: routeDistKm,
    totalDurationMinutes: durationMinutes,
    etaString,
    waypoints,
    steps
  };
}

/**
 * Generates realistic Kolkata road navigation steps and waypoints for multi-stop routes
 * starting directly from user's current GPS position
 */
export function generateMultiStopNavigationRoute(
  startCoord: [number, number],
  destinations: { name: string; coordinates: [number, number] }[]
): NavigationRoute {
  const start = validateCoordinates(startCoord);
  if (!destinations || destinations.length === 0) {
    return generateNavigationRoute(start, start, 'Location');
  }

  if (destinations.length === 1) {
    return generateNavigationRoute(start, destinations[0].coordinates, destinations[0].name);
  }

  const allPoints: { name: string; coord: [number, number] }[] = [
    { name: 'Your Location', coord: start },
    ...destinations.map((d) => ({ name: d.name, coord: validateCoordinates(d.coordinates) }))
  ];

  const waypoints: [number, number][] = [];
  const steps: NavigationStep[] = [];
  let totalDistKm = 0;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const legStart = allPoints[i].coord;
    const legEnd = allPoints[i + 1].coord;
    const targetName = allPoints[i + 1].name;
    const isFinalLeg = i === allPoints.length - 2;

    const straightDist = calculateDistanceKm(legStart, legEnd);
    const legDistKm = Math.max(0.3, Math.round(straightDist * 1.25 * 10) / 10);
    totalDistKm += legDistKm;

    const dLat = legEnd[0] - legStart[0];
    const dLng = legEnd[1] - legStart[1];
    const turnsToRight = dLng > 0;

    // Realistic intermediate turns for this road corridor
    const pt1: [number, number] = [legStart[0] + dLat * 0.25, legStart[1] + dLng * 0.1];
    const pt2: [number, number] = [legStart[0] + dLat * 0.6, legStart[1] + dLng * 0.45];
    const pt3: [number, number] = [legStart[0] + dLat * 0.85, legStart[1] + dLng * 0.85];

    if (i === 0) {
      waypoints.push(legStart);
    }
    waypoints.push(pt1, pt2, pt3, legEnd);

    const legMeters = Math.round(legDistKm * 1000);
    const s1 = Math.round(legMeters * 0.35);
    const s2 = Math.round(legMeters * 0.45);
    const s3 = Math.max(50, legMeters - s1 - s2);

    // Step 1: Head towards next corridor
    steps.push({
      id: `leg-${i}-step-1`,
      maneuver: i === 0 ? 'straight' : (turnsToRight ? 'turn-right' : 'turn-left'),
      distanceMeters: s1,
      distanceText: formatDistance(s1 / 1000),
      instruction: i === 0 ? `Head towards Stop 1: ${targetName}` : `Continue towards Stop ${i + 1}: ${targetName}`,
      voiceText: `Head towards ${targetName}.`,
      coordinates: pt1
    });

    // Step 2: Turn onto connector road
    steps.push({
      id: `leg-${i}-step-2`,
      maneuver: turnsToRight ? 'turn-right' : 'turn-left',
      distanceMeters: s2,
      distanceText: formatDistance(s2 / 1000),
      instruction: `In ${formatDistance(s1 / 1000)}, turn ${turnsToRight ? 'right' : 'left'} onto main road`,
      voiceText: `Turn ${turnsToRight ? 'right' : 'left'}.`,
      coordinates: pt2
    });

    // Step 3: Arrive at stop
    steps.push({
      id: `leg-${i}-step-3`,
      maneuver: 'arrive',
      distanceMeters: s3,
      distanceText: formatDistance(s3 / 1000),
      instruction: isFinalLeg
        ? `Arrived! ${targetName} is ahead on your right.`
        : `Arriving at Stop ${i + 1}: ${targetName}`,
      voiceText: isFinalLeg
        ? `You have reached your final destination: ${targetName}!`
        : `Arriving at ${targetName}.`,
      coordinates: legEnd
    });
  }

  const durationMinutes = Math.max(5, Math.round((totalDistKm / 18) * 60));
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const etaString = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    totalDistanceKm: Math.round(totalDistKm * 10) / 10,
    totalDurationMinutes: durationMinutes,
    etaString,
    waypoints,
    steps
  };
}

/**
 * Fetches real road navigation route using OSRM driving engine
 * with fallbacks to realistic urban corridor routing.
 * Follows actual Kolkata streets, alleys, avenues, and flyovers.
 */
export async function fetchRealRoadNavigationRoute(
  startCoord: [number, number],
  destinations: { name: string; coordinates: [number, number] }[]
): Promise<NavigationRoute> {
  const start = validateCoordinates(startCoord);
  if (!destinations || destinations.length === 0) {
    return generateNavigationRoute(start, start, 'Destination');
  }

  const validDestinations = destinations.map((d) => ({
    name: d.name,
    coordinates: validateCoordinates(d.coordinates)
  }));

  // Build coordinate sequence: [start, ...destinations]
  const allCoords = [start, ...validDestinations.map((d) => d.coordinates)];
  // OSRM expects: {lng},{lat};{lng},{lat}...
  const coordParam = allCoords.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM status ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const totalDistKm = Math.max(0.1, Math.round((primaryRoute.distance / 1000) * 10) / 10);
      const trafficDurationMin = Math.max(2, Math.round(primaryRoute.duration / 60));

      const now = new Date();
      now.setMinutes(now.getMinutes() + trafficDurationMin);
      const etaString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Real road geometry: OSRM is [lon, lat], Leaflet expects [lat, lon]
      const realWaypoints: [number, number][] = primaryRoute.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );

      // Parse turn-by-turn steps from OSRM legs
      const steps: NavigationStep[] = [];
      let stepCounter = 1;

      primaryRoute.legs.forEach((leg: any, legIdx: number) => {
        const destName = validDestinations[legIdx]?.name || 'Destination';
        const legSteps = leg.steps || [];

        legSteps.forEach((s: any, sIdx: number) => {
          const isDepart = s.maneuver?.type === 'depart';
          const isArrive = s.maneuver?.type === 'arrive' || sIdx === legSteps.length - 1;
          const modifier = (s.maneuver?.modifier || '').toLowerCase();
          const streetName = s.name ? s.name.trim() : '';

          let maneuver: ManeuverType = 'straight';
          if (isArrive) {
            maneuver = 'arrive';
          } else if (modifier.includes('right')) {
            maneuver = modifier.includes('slight') ? 'slight-right' : 'turn-right';
          } else if (modifier.includes('left')) {
            maneuver = modifier.includes('slight') ? 'slight-left' : 'turn-left';
          } else if (modifier.includes('u-turn') || modifier.includes('uturn')) {
            maneuver = 'u-turn';
          }

          const distMeters = Math.round(s.distance || 50);
          const distText = formatDistance(distMeters / 1000);

          let instruction = '';
          let voiceText = '';

          if (isDepart) {
            instruction = streetName
              ? `Head onto ${streetName} towards ${destName}`
              : `Proceed towards ${destName}`;
            voiceText = `Head towards ${destName}.`;
          } else if (isArrive) {
            instruction = `Arrived at ${destName}`;
            voiceText = `You have arrived at ${destName}!`;
          } else {
            const turnWord =
              maneuver === 'turn-right'
                ? 'right'
                : maneuver === 'turn-left'
                ? 'left'
                : maneuver === 'slight-right'
                ? 'slight right'
                : maneuver === 'slight-left'
                ? 'slight left'
                : 'straight';

            if (turnWord === 'straight') {
              instruction = streetName
                ? `Continue straight onto ${streetName} for ${distText}`
                : `Continue straight for ${distText}`;
              voiceText = `Continue straight for ${distText}.`;
            } else {
              instruction = streetName
                ? `In ${distText}, turn ${turnWord} onto ${streetName}`
                : `In ${distText}, turn ${turnWord}`;
              voiceText = `In ${distText}, turn ${turnWord}.`;
            }
          }

          const coord: [number, number] = [s.maneuver.location[1], s.maneuver.location[0]];

          steps.push({
            id: `step-${stepCounter++}`,
            maneuver,
            distanceMeters: distMeters,
            distanceText: distText,
            instruction,
            voiceText,
            coordinates: coord
          });
        });
      });

      if (steps.length === 0) {
        steps.push({
          id: 'step-arrive',
          maneuver: 'arrive',
          distanceMeters: 50,
          distanceText: '50 m',
          instruction: `Arrive at ${validDestinations[0].name}`,
          voiceText: `You have arrived at ${validDestinations[0].name}!`,
          coordinates: validDestinations[0].coordinates
        });
      }

      return {
        totalDistanceKm: totalDistKm,
        totalDurationMinutes: trafficDurationMin,
        etaString,
        waypoints: realWaypoints,
        steps,
        destinationName: validDestinations[validDestinations.length - 1]?.name
      };
    }
  } catch (error) {
    console.warn('Real OSRM road routing failed, falling back to urban corridor routing:', error);
  }

  // Graceful fallback to multi-stop route
  return generateMultiStopNavigationRoute(start, validDestinations);
}

/**
 * Speech synthesis with browser check and error suppression
 */
export function speakVoiceInstruction(text: string, isMuted = false): void {
  if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop ongoing utterances
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN'; // Indian English cadence for local street names

    // Select suitable voice if available
    const voices = window.speechSynthesis.getVoices();
    const inVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));
    if (inVoice) {
      utterance.voice = inVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis voice guide error:', err);
  }
}

export function stopVoiceInstruction(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}
