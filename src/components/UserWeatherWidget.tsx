import React, { useEffect, useState } from 'react';
import {
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Droplets,
  Thermometer,
  Loader2,
  Wind
} from 'lucide-react';
import { fetchPandalWeather, PandalWeather } from '../utils/weather';

interface UserWeatherWidgetProps {
  userLocation: [number, number];
  variant?: 'nav-banner' | 'chip' | 'compact' | 'card';
  className?: string;
}

export const UserWeatherWidget: React.FC<UserWeatherWidgetProps> = ({
  userLocation,
  variant = 'chip',
  className = ''
}) => {
  const [weather, setWeather] = useState<PandalWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [lat, lng] = userLocation;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPandalWeather(lat, lng).then((data) => {
      if (isMounted) {
        setWeather(data);
        setLoading(false);
      }
    });

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchPandalWeather(lat, lng).then((data) => {
        if (isMounted) {
          setWeather(data);
        }
      });
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lat, lng]);

  const renderWeatherIcon = (iconType?: PandalWeather['iconType'], size = 'w-4 h-4') => {
    switch (iconType) {
      case 'clear':
        return <Sun className={`${size} text-amber-400 fill-amber-400 shrink-0`} />;
      case 'rain':
        return <CloudRain className={`${size} text-blue-400 fill-blue-300 shrink-0`} />;
      case 'thunder':
        return <CloudLightning className={`${size} text-purple-400 fill-purple-300 shrink-0`} />;
      case 'mist':
        return <CloudFog className={`${size} text-slate-300 shrink-0`} />;
      default:
        return <CloudSun className={`${size} text-amber-300 fill-amber-200 shrink-0`} />;
    }
  };

  // 1. Used inside NavigationOverlay (Top/Bottom persistent HUD)
  if (variant === 'nav-banner') {
    if (loading && !weather) {
      return (
        <div className={`flex items-center gap-1.5 text-[11px] text-slate-300 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 ${className}`}>
          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
          <span>Live weather...</span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-2 text-xs bg-slate-950/75 backdrop-blur-md text-white px-2.5 py-1 rounded-xl border border-white/15 shadow-sm ${className}`}
        title="Real-time Weather at your GPS location"
      >
        <div className="flex items-center gap-1 font-bold">
          {renderWeatherIcon(weather?.iconType, 'w-3.5 h-3.5')}
          <span className="text-white text-xs">{weather?.temperature}°C</span>
        </div>

        <span className="text-[10px] text-slate-300 font-medium truncate max-w-[85px]">
          {weather?.conditionText}
        </span>

        <div className="flex items-center gap-0.5 text-[10px] text-blue-300 pl-1.5 border-l border-white/20">
          <Droplets className="w-3 h-3 text-blue-400" />
          <span>{weather?.humidity}%</span>
        </div>
      </div>
    );
  }

  // 2. Compact pill style for floating map overlays
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1 rounded-full shadow-md text-xs ${className}`}
        title="Real-time Weather at Current Location"
      >
        {loading && !weather ? (
          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
        ) : (
          renderWeatherIcon(weather?.iconType, 'w-3.5 h-3.5')
        )}
        <span className="font-extrabold text-xs">
          {weather ? `${weather.temperature}°C` : '--°C'}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-700 pl-1.5 truncate max-w-[80px]">
          {weather?.conditionText || 'Loading...'}
        </span>
        <div className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 pl-1 border-l border-slate-200 dark:border-slate-700">
          <Droplets className="w-2.5 h-2.5" />
          <span>{weather ? `${weather.humidity}%` : '--%'}</span>
        </div>
      </div>
    );
  }

  // 3. Default floating chip with full metrics
  return (
    <div
      className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl p-2.5 shadow-lg flex items-center gap-3 transition-all ${className}`}
    >
      {/* Weather Icon and Temperature */}
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center">
          {loading && !weather ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            renderWeatherIcon(weather?.iconType, 'w-4 h-4')
          )}
        </div>
        <div>
          <div className="text-sm font-black leading-tight">
            {weather ? `${weather.temperature}°C` : '--°C'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[100px]">
            {weather?.conditionText || 'Checking sky...'}
          </div>
        </div>
      </div>

      {/* Humidity & Wind metrics */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1" title="Relative Humidity">
          <Droplets className="w-3 h-3 text-blue-500" />
          <span className="font-bold">{weather ? `${weather.humidity}%` : '--%'}</span>
        </div>

        {weather && (
          <div className="flex items-center gap-1" title="Feels Like Temperature">
            <Thermometer className="w-3 h-3 text-amber-500" />
            <span className="font-bold">{weather.feelsLike}°C</span>
          </div>
        )}
      </div>
    </div>
  );
};
