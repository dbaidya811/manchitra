import React, { useEffect, useState } from 'react';
import {
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Droplets,
  Wind,
  Calendar,
  Thermometer,
  Gauge,
  Radio,
  Loader2
} from 'lucide-react';
import {
  fetchPandalWeather,
  getCurrentDateInfo,
  PandalWeather,
  CurrentDateInfo
} from '../utils/weather';

interface PandalWeatherWidgetProps {
  latitude: number;
  longitude: number;
  pandalName?: string;
  compact?: boolean;
}

export const PandalWeatherWidget: React.FC<PandalWeatherWidgetProps> = ({
  latitude,
  longitude,
  pandalName,
  compact = false
}) => {
  const [weather, setWeather] = useState<PandalWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateInfo, setDateInfo] = useState<CurrentDateInfo>(() => getCurrentDateInfo());

  useEffect(() => {
    let isMounted = true;
    setDateInfo(getCurrentDateInfo());
    setLoading(true);

    fetchPandalWeather(latitude, longitude).then((w) => {
      if (isMounted) {
        setWeather(w);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  const renderWeatherIcon = (iconType?: PandalWeather['iconType'], size = 'w-5 h-5') => {
    switch (iconType) {
      case 'clear':
        return <Sun className={`${size} text-amber-500 fill-amber-400`} />;
      case 'rain':
        return <CloudRain className={`${size} text-blue-500 fill-blue-200`} />;
      case 'thunder':
        return <CloudLightning className={`${size} text-purple-500 fill-purple-200`} />;
      case 'mist':
        return <CloudFog className={`${size} text-slate-400`} />;
      default:
        return <CloudSun className={`${size} text-amber-500 fill-amber-200`} />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 gap-2">
        {/* Current Date in English */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px]">
            {dateInfo.formattedDate}
          </span>
        </div>

        {/* Real Area Weather in English */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200 dark:border-slate-700">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : (
            <>
              {renderWeatherIcon(weather?.iconType, 'w-4 h-4')}
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                {weather?.temperature}°C
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                {weather?.conditionText}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-xs space-y-3">
      {/* Header: Current Date and Live Area Weather Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">
              {dateInfo.fullDate}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Current Local Time • {dateInfo.timeString}
            </p>
          </div>
        </div>

        {/* Real GPS / Open-Meteo Sensor Live Badge */}
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Area Weather</span>
        </span>
      </div>

      {/* Real-time Weather Sensor Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Main Temperature & Condition */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/80 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            {renderWeatherIcon(weather?.iconType, 'w-5 h-5')}
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {weather ? `${weather.temperature}°C` : '--°C'}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1 truncate w-full">
            {weather?.conditionText || 'Partly Cloudy'}
          </span>
        </div>

        {/* Feels Like Temperature */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/80 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Thermometer className="w-4 h-4" />
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {weather ? `${weather.feelsLike}°C` : '--°C'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Feels Like
          </span>
        </div>

        {/* Relative Humidity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/80 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Droplets className="w-4 h-4" />
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {weather ? `${weather.humidity}%` : '--%'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Humidity
          </span>
        </div>
      </div>

      {/* Secondary Sensor Details: Wind Speed & Precipitation */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl px-3 py-1.5 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Wind: <strong className="text-slate-800 dark:text-slate-200">{weather?.windSpeed ?? 10} km/h</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-blue-500" />
          <span>Rain: <strong className="text-slate-800 dark:text-slate-200">{weather?.precipitation ?? 0} mm</strong></span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Radio className="w-3 h-3 text-emerald-500" />
          <span>Real Sensor</span>
        </div>
      </div>
    </div>
  );
};
