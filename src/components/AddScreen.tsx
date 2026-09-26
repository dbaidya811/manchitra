import React, { useState, useRef } from 'react';
import {
  PlusCircle,
  MapPin,
  Camera,
  CheckCircle2,
  Sparkles,
  Database
} from 'lucide-react';
import { Place } from '../types';

interface AddScreenProps {
  onAddPlace: (newPlace: Place) => void;
  onSuccessNavigate: (place: Place) => void;
}

// In Add Screen, replace "Popular" with "Custom" so users can enter their own custom name!
const ADD_ZONE_OPTIONS = [
  { id: 'custom', label: 'Custom' },
  { id: 'north_kolkata', label: 'North Kolkata' },
  { id: 'south_kolkata', label: 'South Kolkata' },
  { id: 'central_kolkata', label: 'Central Kolkata' },
  { id: 'bidhannagar', label: 'Salt Lake' },
  { id: 'shovabazar', label: 'Shovabazar' },
  { id: 'alipore_port', label: 'Alipore & Port' },
  { id: 'northern_suburbs', label: 'Northern Suburbs' },
  { id: 'southern_suburbs', label: 'Southern Suburbs' }
];

export const AddScreen: React.FC<AddScreenProps> = ({ onAddPlace, onSuccessNavigate }) => {
  const [name, setName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('custom');
  const [customZoneName, setCustomZoneName] = useState('');
  const [lat, setLat] = useState('22.5726');
  const [lng, setLng] = useState('88.3639');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedPresetImage, setSelectedPresetImage] = useState('/images/1784480933103_unnamed.jpg');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(5));
          setLng(position.coords.longitude.toFixed(5));
        },
        () => {
          setLat('22.5726');
          setLng('88.3639');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setStatusMessage('Saving pandal to JSON file...');

    const latitude = parseFloat(lat) || 22.5726;
    const longitude = parseFloat(lng) || 88.3639;
    const finalImage = uploadedFilePreview || customImageUrl.trim() || selectedPresetImage;

    // Determine final zone name: either custom entered name or chosen preset zone
    const chosenOption = ADD_ZONE_OPTIONS.find((opt) => opt.id === selectedZoneId);
    const finalZone =
      selectedZoneId === 'custom'
        ? (customZoneName.trim() || 'Custom')
        : (chosenOption?.label || 'Kolkata');

    const newPlace: Place = {
      id: `pandal_${Date.now()}`,
      name: name.trim(),
      district: finalZone,
      division: 'Kolkata',
      zone: finalZone,
      category: finalZone.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      coordinates: [latitude, longitude],
      latitude: latitude,
      longitude: longitude,
      rating: 4.9,
      reviewCount: 1,
      image: finalImage,
      images: [finalImage],
      sourceUrl: sourceUrl.trim(),
      description: description.trim() || `${name.trim()} - Durga Puja pandal in Kolkata.`,
      isFavorite: false,
      isPopular: false,
      addedOn: new Date().toISOString()
    };

    // Store destination via backend API
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlace)
      });
      if (res.ok) {
        setStatusMessage('Destination published successfully!');
      } else {
        setStatusMessage('Destination added to local map.');
      }
    } catch {
      setStatusMessage('Destination added to local map.');
    }

    // Update frontend state & localStorage
    onAddPlace(newPlace);
    setIsSubmitting(false);
    setShowSuccessToast(true);

    setTimeout(() => {
      onSuccessNavigate(newPlace);
    }, 1200);
  };

  return (
    <div
      className="flex-1 overflow-y-auto touch-scroll no-scrollbar p-3.5 pb-24 space-y-3.5 bg-slate-50/60 dark:bg-slate-950 transition-colors"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs transition-colors">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
          <PlusCircle className="w-4 h-4" />
          <span>Add New Pandal</span>
        </div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
          Add New Durga Puja Pandal
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Any user can add new pandals. Your destination will be published directly to Manchitra and pinned on the map.
        </p>
      </div>

      {showSuccessToast && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-emerald-600/20 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold">Pandal Published Successfully!</div>
            <div className="text-[11px] text-emerald-100 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{statusMessage || 'Pinned directly on your live map!'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xs text-xs transition-colors"
      >
        {/* Place Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            Pandal Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Santosh Mitra Square, Ekdalia Evergreen, Bagbazar"
            className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 text-xs"
          />
        </div>

        {/* Zone Picker: "Popular" replaced by "Custom" */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              Zone / Area
            </label>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Select Custom or a Preset Zone
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ADD_ZONE_OPTIONS.map((cat) => {
              const isSelected = selectedZoneId === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedZoneId(cat.id)}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-medium text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.id === 'custom' && <Sparkles className="w-3 h-3 text-amber-300" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* If Custom is selected: User types their custom name */}
          {selectedZoneId === 'custom' && (
            <div className="pt-1 animate-in fade-in duration-200 space-y-1">
              <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                Custom Zone / Category Name (Enter any name of your choice) *
              </label>
              <input
                type="text"
                required
                value={customZoneName}
                onChange={(e) => setCustomZoneName(e.target.value)}
                placeholder="e.g. Howrah, Bonedi Bari, College Street, Behala"
                className="w-full bg-white dark:bg-slate-950 border-2 border-emerald-500 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none ring-2 ring-emerald-500/20"
              />
            </div>
          )}
        </div>

        {/* Coordinates */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              Coordinates (Latitude / Longitude)
            </label>
            <button
              type="button"
              onClick={handleGetLocation}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <MapPin className="w-3 h-3" />
              <span>Get Current Location</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              className="bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600"
            />
            <input
              type="text"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              className="bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Google Maps link */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            Google Maps Link (Optional)
          </label>
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="google.com/maps/place/..."
            className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 text-xs"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            Description &amp; Theme Details
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write theme or puja details about this pandal..."
            className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 text-xs"
          />
        </div>

        {/* Photo Upload */}
        <div className="space-y-2 pt-1">
          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block">
            Pandal Photo
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
            <Camera className="w-4 h-4" />
            <span className="font-semibold text-xs">Upload Photo from Device</span>
          </button>

          {uploadedFilePreview && (
            <div className="w-full h-36 rounded-2xl overflow-hidden border border-emerald-500 relative">
              <img
                src={uploadedFilePreview}
                alt="Uploaded Preview"
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
          disabled={isSubmitting || !name.trim()}
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl shadow-sm transition-all cursor-pointer text-xs flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isSubmitting ? 'Publishing Pandal...' : 'Save & Publish Pandal'}</span>
        </button>
      </form>
    </div>
  );
};
