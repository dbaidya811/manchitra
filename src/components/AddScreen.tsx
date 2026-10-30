import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  MapPin,
  Camera,
  CheckCircle2,
  Sparkles,
  Database,
  AlertCircle,
  RefreshCw,
  Navigation,
  Edit3,
  Search,
  Crosshair
} from 'lucide-react';
import { Place } from '../types';
import { apiFetch } from '../lib/api';

interface AddScreenProps {
  existingPlaces?: Place[];
  onAddPlace: (newPlace: Place) => void;
  onUpdatePlace?: (updatedPlace: Place) => void;
  onSuccessNavigate: (place: Place) => void;
}

const ADD_ZONE_OPTIONS = [
  { id: 'custom', label: 'Custom' },
  { id: 'north_kolkata', label: 'North Kolkata' },
  { id: 'south_kolkata', label: 'South Kolkata' },
  { id: 'central_kolkata', label: 'Central Kolkata' },
  { id: 'bidhannagar', label: 'Salt Lake & New Town' },
  { id: 'shovabazar', label: 'Shovabazar' },
  { id: 'alipore_port', label: 'Alipore & South West' },
  { id: 'northern_suburbs', label: 'Northern Suburbs' },
  { id: 'southern_suburbs', label: 'Southern Suburbs' }
];

export const AddScreen: React.FC<AddScreenProps> = ({
  existingPlaces = [],
  onAddPlace,
  onUpdatePlace,
  onSuccessNavigate
}) => {
  // Mode: 'add' (New Pandal) or 'update' (Update existing pandal with current location)
  const [mode, setMode] = useState<'add' | 'update'>('add');

  // Selected place for update mode
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [pandalSearchQuery, setPandalSearchQuery] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('custom');
  const [customZoneName, setCustomZoneName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedPresetImage, setSelectedPresetImage] = useState('/images/1784480933103_unnamed.jpg');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);

  // Live On-Site GPS Physical Location Verification States
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(true);
  const [isGpsVerified, setIsGpsVerified] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<Date | null>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically capture live high-precision GPS coordinates when user opens the screen
  useEffect(() => {
    detectLiveOnSiteLocation();
  }, []);

  const detectLiveOnSiteLocation = () => {
    setIsDetectingGps(true);
    setGpsError(null);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setIsDetectingGps(false);
      setIsGpsVerified(false);
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);

        setLat(currentLat.toFixed(6));
        setLng(currentLng.toFixed(6));
        setGpsAccuracy(accuracy);
        setIsGpsVerified(true);
        setIsDetectingGps(false);
        setLastVerifiedAt(new Date());
        setGpsError(null);
      },
      (err) => {
        setIsDetectingGps(false);
        setIsGpsVerified(false);
        let message = 'Unable to get GPS location. Please turn on your device GPS.';
        if (err.code === 1) {
          message =
            'Location permission denied. You must grant location permission while physically at the pandal to record its verified coordinates.';
        } else if (err.code === 2) {
          message =
            'Location unavailable. Please ensure GPS is active and you have a clear view of the sky.';
        } else if (err.code === 3) {
          message = 'Location request timed out. Please tap "Re-detect GPS Location".';
        }
        setGpsError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // When an existing place is picked in update mode, populate details
  const handleSelectPlaceForUpdate = (placeId: string) => {
    setSelectedPlaceId(placeId);
    const place = existingPlaces.find((p) => p.id === placeId);
    if (place) {
      setName(place.name);
      setDescription(place.description || '');
      setSelectedZoneId('custom');
      setCustomZoneName(place.zone || place.district || 'Kolkata');
      setSourceUrl(place.sourceUrl || place.source_url || '');
      if (place.image) {
        setSelectedPresetImage(place.image);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        setUploadedFilePreview(base64Url);
        setSelectedPresetImage(base64Url);
        setCustomImageUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter the pandal name.');
      return;
    }

    if (!isGpsVerified || !lat || !lng) {
      setErrorMessage(
        'Physical on-site location required: You must be present at the pandal and verify your current GPS location before submitting.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage('Saving pandal to SQLite database...');

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const finalImage = uploadedFilePreview || customImageUrl.trim() || selectedPresetImage;

    const chosenOption = ADD_ZONE_OPTIONS.find((opt) => opt.id === selectedZoneId);
    const finalZone =
      selectedZoneId === 'custom'
        ? customZoneName.trim() || 'Custom'
        : chosenOption?.label || 'Kolkata';

    try {
      if (mode === 'add') {
        const newPlacePayload: Partial<Place> & { accuracyMeters: number } = {
          id: `pandal_${Date.now()}`,
          name: name.trim(),
          district: finalZone,
          division: 'Kolkata',
          zone: finalZone,
          category: finalZone.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          coordinates: [latitude, longitude],
          latitude,
          longitude,
          rating: 4.8,
          reviewCount: 1,
          image: finalImage,
          images: [finalImage],
          sourceUrl: sourceUrl.trim(),
          description: description.trim() || `${name.trim()} - Durga Puja pandal in Kolkata.`,
          isFavorite: false,
          isPopular: false,
          addedBy: 'Verified On-Site Contributor',
          accuracyMeters: gpsAccuracy || 10
        };

        const result = await apiFetch<{ success: boolean; place: Place; totalPlaces: number }>(
          '/api/places',
          {
            method: 'POST',
            body: JSON.stringify(newPlacePayload)
          }
        );

        const savedPlace: Place = { ...(newPlacePayload as Place), ...(result?.place || {}) };
        setStatusMessage('Pandal successfully saved to SQLite database!');
        onAddPlace(savedPlace);
        setShowSuccessToast(true);

        setTimeout(() => {
          onSuccessNavigate(savedPlace);
        }, 1200);
      } else {
        // Mode === 'update'
        if (!selectedPlaceId) {
          setErrorMessage('Please select an existing pandal to update.');
          setIsSubmitting(false);
          return;
        }

        const updatePayload = {
          name: name.trim(),
          zone: finalZone,
          district: finalZone,
          coordinates: [latitude, longitude],
          latitude,
          longitude,
          description: description.trim(),
          sourceUrl: sourceUrl.trim(),
          image: finalImage,
          accuracyMeters: gpsAccuracy || 10
        };

        const result = await apiFetch<{ success: boolean; place: Place }>(
          `/api/places/${encodeURIComponent(selectedPlaceId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(updatePayload)
          }
        );

        const updatedPlace = result?.place || {
          ...existingPlaces.find((p) => p.id === selectedPlaceId)!,
          ...updatePayload
        };

        setStatusMessage('Pandal location updated in SQLite database!');
        onUpdatePlace?.(updatedPlace as Place);
        setShowSuccessToast(true);

        setTimeout(() => {
          onSuccessNavigate(updatedPlace as Place);
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Could not save to SQLite server. Please try again.'
      );
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlaces = existingPlaces.filter((p) =>
    p.name.toLowerCase().includes(pandalSearchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden overflow-y-auto touch-scroll no-scrollbar p-3 pb-24 bg-slate-50/60 dark:bg-slate-950 transition-colors box-border">
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">
              {mode === 'add' ? 'Pandal Recorded in SQLite!' : 'Location Updated in SQLite!'}
            </p>
            <p className="text-emerald-100 mt-0.5">
              Verified live coordinates saved permanently for all devotees.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Side-by-Side Switch Options */}
      <div className="w-full max-w-full overflow-hidden flex items-center gap-1.5 mb-2.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 box-border">
        <button
          type="button"
          onClick={() => {
            setMode('add');
            setName('');
            setDescription('');
          }}
          className={`flex-1 min-w-0 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'add'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Add New Pandal</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('update')}
          className={`flex-1 min-w-0 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'update'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Update Pandal</span>
        </button>
      </div>

      {/* Compact Minimal On-Site GPS Indicator */}
      <div className="w-full max-w-full overflow-hidden flex items-center justify-between px-3 py-2 mb-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-[11px] shadow-2xs box-border">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <Crosshair
            className={`w-3.5 h-3.5 shrink-0 ${
              isDetectingGps
                ? 'animate-spin text-amber-500'
                : isGpsVerified
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500'
            }`}
          />
          {isDetectingGps ? (
            <span className="text-slate-600 dark:text-slate-400 truncate">
              Detecting on-site GPS...
            </span>
          ) : isGpsVerified ? (
            <span className="text-slate-800 dark:text-slate-200 truncate font-medium">
              Live GPS: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{lat}, {lng}</strong>
              {gpsAccuracy !== null && (
                <span className="text-slate-400 text-[10px] ml-1">(±{gpsAccuracy}m)</span>
              )}
            </span>
          ) : (
            <span className="text-rose-600 dark:text-rose-400 truncate">
              {gpsError || 'Location required (Turn on device GPS)'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={detectLiveOnSiteLocation}
          disabled={isDetectingGps}
          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2 cursor-pointer flex items-center gap-1"
          title="Refresh current location"
        >
          <RefreshCw className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
          <span>{isDetectingGps ? 'Checking...' : 'Re-detect'}</span>
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {statusMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* In Update Mode: Pandal Selector */}
        {mode === 'update' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-2.5 shadow-xs">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Select Pandal to Update
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search pandal name..."
                value={pandalSearchQuery}
                onChange={(e) => setPandalSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-500"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
              {filteredPlaces.slice(0, 10).map((place) => (
                <button
                  type="button"
                  key={place.id}
                  onClick={() => handleSelectPlaceForUpdate(place.id)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedPlaceId === place.id
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{place.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {place.zone || place.district || 'Kolkata'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pandal Basic Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xs">
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Pandal Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Bagbazar Sarbojanin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-500"
              required
            />
          </div>

          {/* Zone Selector */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Zone / Location Area
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {ADD_ZONE_OPTIONS.map((zone) => (
                <button
                  type="button"
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-2 text-[11px] font-semibold rounded-xl border transition-all text-center cursor-pointer truncate ${
                    selectedZoneId === zone.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>

            {selectedZoneId === 'custom' && (
              <input
                type="text"
                placeholder="Enter custom area/locality name"
                value={customZoneName}
                onChange={(e) => setCustomZoneName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-500"
              />
            )}
          </div>

          {/* Description & Theme */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Pandal Theme &amp; Special Attractions
            </label>
            <textarea
              rows={3}
              placeholder="Share what makes this pandal special (art, idol theme, heritage, lighting)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Photo Upload & Gallery */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-xs">
          <label className="text-xs font-bold text-slate-900 dark:text-white block">
            Pandal Photo (Take on spot or upload)
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-xs">Take Photo or Upload from Phone</span>
          </button>

          {uploadedFilePreview && (
            <div className="w-full h-36 rounded-2xl overflow-hidden border border-emerald-500 relative">
              <img
                src={uploadedFilePreview}
                alt="Uploaded Pandal"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xs">
                Selected Photo
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !isGpsVerified}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md transition-all cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-98"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Writing to SQLite Database...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>
                {mode === 'add'
                  ? 'Record Pandal with Verified GPS Location'
                  : 'Update Pandal with Current GPS Location'}
              </span>
            </>
          )}
        </button>

        {!isGpsVerified && (
          <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-medium">
            ⚠️ You must be at the pandal site with GPS verified to publish.
          </p>
        )}
      </form>
    </div>
  );
};
