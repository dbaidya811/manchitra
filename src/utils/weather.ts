/**
 * Real-time weather and current date utility for individual pandals
 * 100% English, real meteorological data directly from Open-Meteo API.
 * No religious tithi or festival day labels.
 */

export interface PandalWeather {
  temperature: number; // Celsius
  feelsLike: number; // Celsius
  humidity: number; // Percentage
  windSpeed: number; // km/h
  precipitation: number; // mm
  conditionText: string; // English
  iconType: 'clear' | 'cloudy' | 'rain' | 'thunder' | 'mist';
  isDay: boolean;
  fetchedAt: Date;
  isLive: boolean;
}

export interface CurrentDateInfo {
  formattedDate: string; // e.g. "Sat, Sep 26, 2026"
  fullDate: string; // e.g. "Saturday, September 26, 2026"
  dayName: string; // e.g. "Saturday"
  timeString: string; // e.g. "1:15 PM"
}

// In-memory cache for weather requests keyed by "lat,lng"
const weatherCache = new Map<string, { data: PandalWeather; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh data

/**
 * Returns current calendar date and time in English
 */
export function getCurrentDateInfo(date: Date = new Date()): CurrentDateInfo {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const fullDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return {
    formattedDate,
    fullDate,
    dayName,
    timeString
  };
}

/**
 * Maps WMO weather code to standard English descriptions
 */
function getEnglishWeatherCondition(code: number): {
  conditionText: string;
  iconType: PandalWeather['iconType'];
} {
  switch (code) {
    case 0:
      return { conditionText: 'Clear Sky', iconType: 'clear' };
    case 1:
      return { conditionText: 'Mainly Clear', iconType: 'clear' };
    case 2:
      return { conditionText: 'Partly Cloudy', iconType: 'cloudy' };
    case 3:
      return { conditionText: 'Overcast', iconType: 'cloudy' };
    case 45:
    case 48:
      return { conditionText: 'Fog & Mist', iconType: 'mist' };
    case 51:
    case 53:
    case 55:
      return { conditionText: 'Light Drizzle', iconType: 'rain' };
    case 56:
    case 57:
      return { conditionText: 'Freezing Drizzle', iconType: 'rain' };
    case 61:
      return { conditionText: 'Light Rain', iconType: 'rain' };
    case 63:
      return { conditionText: 'Moderate Rain', iconType: 'rain' };
    case 65:
      return { conditionText: 'Heavy Rain', iconType: 'rain' };
    case 80:
    case 81:
    case 82:
      return { conditionText: 'Passing Showers', iconType: 'rain' };
    case 95:
      return { conditionText: 'Thunderstorm', iconType: 'thunder' };
    case 96:
    case 99:
      return { conditionText: 'Severe Thunderstorm', iconType: 'thunder' };
    default:
      return { conditionText: 'Partly Cloudy', iconType: 'cloudy' };
  }
}

/**
 * Fetches real-time live weather for specific pandal coordinates via Open-Meteo
 */
export async function fetchPandalWeather(
  latitude: number,
  longitude: number
): Promise<PandalWeather> {
  const safeLat = Number(latitude) || 22.5726;
  const safeLng = Number(longitude) || 88.3639;
  const cacheKey = `${safeLat.toFixed(3)},${safeLng.toFixed(3)}`;

  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const code = Number(current.weather_code) ?? 2;
      const { conditionText, iconType } = getEnglishWeatherCondition(code);

      const weather: PandalWeather = {
        temperature: Math.round(Number(current.temperature_2m)),
        feelsLike: Math.round(Number(current.apparent_temperature)),
        humidity: Math.round(Number(current.relative_humidity_2m)),
        windSpeed: Math.round(Number(current.wind_speed_10m)),
        precipitation: Number(current.precipitation) || 0,
        conditionText,
        iconType,
        isDay: current.is_day === 1,
        fetchedAt: new Date(),
        isLive: true
      };

      weatherCache.set(cacheKey, { data: weather, timestamp: Date.now() });
      return weather;
    }
  } catch (err) {
    console.warn('Real-time weather fetch failed, retrying or using cache:', err);
  }

  // Fallback only if network completely unavailable, flagged as non-live
  return {
    temperature: 29,
    feelsLike: 34,
    humidity: 76,
    windSpeed: 10,
    precipitation: 0,
    conditionText: 'Partly Cloudy',
    iconType: 'cloudy',
    isDay: true,
    fetchedAt: new Date(),
    isLive: false
  };
}
