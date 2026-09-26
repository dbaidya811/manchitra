import React, { useState } from 'react';
import {
  X,
  MapPin,
  Star,
  Heart,
  Navigation,
  Share2,
  Check,
  Compass,
  Route
} from 'lucide-react';
import { Place } from '../types';
import { validateCoordinates } from '../utils/geo';
import { PandalWeatherWidget } from './PandalWeatherWidget';

interface PlaceDetailModalProps {
  place: Place | null;
  onClose: () => void;
  onToggleFavorite: (placeId: string) => void;
  onNavigateToMap: (place: Place, options?: { addRoute?: boolean }) => void;
  onNavigateToGuide?: () => void;
  onAddPlaceToCustomRoute?: (place: Place) => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onToggleFavorite,
  onNavigateToMap,
  onAddPlaceToCustomRoute
}) => {
  const [copied, setCopied] = useState(false);

  if (!place) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${place.name} - Manchitra`,
          text: `${place.name}, ${place.zone || 'Kolkata'} - Durga Puja Parikrama on Manchitra.`,
          url: window.location.href
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText?.(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddRoute = () => {
    if (onAddPlaceToCustomRoute) {
      onAddPlaceToCustomRoute(place);
    } else {
      onNavigateToMap(place, { addRoute: true });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl transition-colors">
        {/* Cover Image */}
        <div className="relative h-64 w-full shrink-0 bg-slate-100 dark:bg-slate-800">
          <img
            src={place.image || 'https://cdn-icons-png.flaticon.com/512/14025/14025686.png'}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://cdn-icons-png.flaticon.com/512/14025/14025686.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

          {/* Top Actions */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-100 flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 shadow-md transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-100 flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 shadow-md transition-colors cursor-pointer"
                aria-label="Share"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
              </button>

              <button
                onClick={() => onToggleFavorite(place.id)}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 shadow-md transition-colors cursor-pointer"
                aria-label="Favorite"
              >
                <Heart
                  className={`w-5 h-5 ${
                    place.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-700 dark:text-slate-200'
                  }`}
                />
              </button>
            </div>
          </div>

          {copied && (
            <div className="absolute top-14 right-3 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-md animate-in fade-in">
              Link copied!
            </div>
          )}

          {/* Title on bottom of cover */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                {place.zone || 'Kolkata'}
              </span>
              {place.isPopular && (
                <span className="bg-amber-500/95 text-slate-900 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                  Popular Pandal
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold line-clamp-1">{place.name}</h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2.5 rounded-2xl text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-slate-900 dark:text-white font-bold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{place.rating}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{place.reviewCount} reviews</div>
            </div>

            <div className="border-l border-slate-200 dark:border-slate-700">
              <div className="text-slate-900 dark:text-white font-bold text-sm truncate px-1">
                {place.zone || 'Kolkata'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Zone / Area</div>
            </div>
          </div>

          {/* Current Date & Real-Time Weather for this specific Pandal */}
          <PandalWeatherWidget
            latitude={validateCoordinates(place.coordinates)[0]}
            longitude={validateCoordinates(place.coordinates)[1]}
            pandalName={place.name}
          />

          {/* OpenStreetMap Coordinates */}
          <div className="flex items-center justify-between text-xs bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-medium">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {place.zone || 'Kolkata'}, India
              </span>
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
              {validateCoordinates(place.coordinates)[0].toFixed(4)}° N, {validateCoordinates(place.coordinates)[1].toFixed(4)}° E
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5">
              Description &amp; Highlights
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {place.description || 'Explore this destination and experience its special architecture and theme.'}
            </p>
          </div>
        </div>

        {/* Bottom Actions: Replaced Google Maps with Add Route option */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-colors">
          <button
            onClick={handleAddRoute}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Route className="w-4 h-4" />
            <span>Add Route</span>
          </button>

          <button
            onClick={() => {
              onNavigateToMap(place);
              onClose();
            }}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>View on Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};
