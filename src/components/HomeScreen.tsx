import React, { useState, useRef } from 'react';
import {
  MapPin,
  Star,
  Heart,
  Navigation,
  Flame,
  Upload,
  FileText,
  Route
} from 'lucide-react';
import { Place, CategoryType } from '../types';
import { ZONE_CATEGORIES } from '../data/mockData';
import { useDragScroll } from '../hooks/useDragScroll';
import { getSafeImageUrl, handleImageError } from '../utils/imageHelper';

interface HomeScreenProps {
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onToggleFavorite: (placeId: string) => void;
  onNavigateToMap: (place?: Place) => void;
  onNavigateToGuide: () => void;
  onAddPlaceToCustomRoute?: (place: Place) => void;
  onOpenDataManager?: () => void;
  onImportJsonText?: (jsonText: string) => void;
  onImportJsonFile?: (file: File) => void;
  onUploadImages?: (files: FileList) => void;
  selectedCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  searchQuery: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  places,
  onSelectPlace,
  onToggleFavorite,
  onNavigateToMap,
  onAddPlaceToCustomRoute,
  onImportJsonText,
  onImportJsonFile,
  selectedCategory,
  onSelectCategory,
  searchQuery
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Click & Drag to scroll refs for mouse and touch drag experience
  const mainScrollRef = useDragScroll<HTMLDivElement>({ direction: 'vertical', speed: 1.2 });
  const zoneScrollRef = useDragScroll<HTMLDivElement>({ direction: 'horizontal', speed: 1.2 });
  const popularScrollRef = useDragScroll<HTMLDivElement>({ direction: 'horizontal', speed: 1.2 });
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Filtered places according to zone category and search query
  const filteredPlaces = places.filter((place) => {
    let matchesCategory = true;
    if (selectedCategory === 'popular') {
      matchesCategory = !!place.isPopular;
    } else if (selectedCategory) {
      const targetZone = ZONE_CATEGORIES.find((z) => z.id === selectedCategory)?.label || selectedCategory;
      const placeZone = place.zone || place.district || '';
      matchesCategory =
        placeZone.toLowerCase().includes(targetZone.toLowerCase()) ||
        targetZone.toLowerCase().includes(placeZone.toLowerCase()) ||
        Boolean(place.category && place.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    const matchesSearch =
      !searchQuery ||
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (place.zone && place.zone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (place.district && place.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (place.description && place.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Featured places: Popular destinations first
  const featuredPlaces = places.filter((p) => p.isPopular).slice(0, 8);

  const handleApplyPastedJson = () => {
    try {
      setPasteError(null);
      if (!pastedJson.trim()) return;
      onImportJsonText?.(pastedJson);
      setShowPasteModal(false);
      setPastedJson('');
    } catch (err: unknown) {
      setPasteError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleCategoryClick = (catId: CategoryType) => {
    if (selectedCategory === catId) {
      onSelectCategory(''); // toggle off to show all
    } else {
      onSelectCategory(catId);
    }
  };

  return (
    <div
      ref={mainScrollRef}
      className="flex-1 min-h-0 overflow-y-auto touch-scroll space-y-3 pb-24 bg-slate-50/60 dark:bg-slate-950 transition-colors"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Zone Filter Horizontal Scroll: NO icons, NO "All Place", NO "Hills" */}
      <div className="px-3 pt-2.5">
        <div
          ref={zoneScrollRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar smooth-horizontal-scroll py-1 touch-pan-x"
          style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {ZONE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id as CategoryType)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden file input for uploading JSON */}
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportJsonFile?.(file);
          e.target.value = '';
        }}
        accept=".json,application/json"
        className="hidden"
      />

      {/* If places empty: fallback upload UI in English */}
      {places.length === 0 ? (
        <div className="px-3 space-y-3">
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-3xl p-5 shadow-xs text-center space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Ready for Your Places Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                All demo data removed. Upload or paste your JSON data to populate the map.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => jsonFileInputRef.current?.click()}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs font-bold">Upload JSON</span>
              </button>

              <button
                onClick={() => setShowPasteModal(true)}
                className="p-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">Paste JSON Code</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Featured Popular Places Carousel */}
          {!searchQuery && (!selectedCategory || selectedCategory === 'popular') && featuredPlaces.length > 0 && (
            <div className="px-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Popular Places ({featuredPlaces.length})</span>
                </div>
                <button
                  onClick={() => onSelectCategory('popular')}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>

              <div
                ref={popularScrollRef}
                className="flex gap-3 overflow-x-auto no-scrollbar smooth-horizontal-scroll py-1 touch-pan-x"
                style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
              >
                {featuredPlaces.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace(place)}
                    style={{ scrollSnapAlign: 'start' }}
                    className="w-[82vw] max-w-[310px] sm:w-[310px] h-[195px] rounded-2xl relative overflow-hidden shrink-0 cursor-pointer group shadow-sm border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all bg-slate-900"
                  >
                    <img
                      src={getSafeImageUrl(place.image)}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Rating badge */}
                    <div className="absolute top-2.5 right-2.5 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1 text-[11px] font-bold text-slate-900 dark:text-slate-100 shadow-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{place.rating}</span>
                    </div>

                    {/* Zone Tag */}
                    <div className="absolute top-2.5 left-2.5 bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white shadow-xs">
                      {place.zone || 'Kolkata'}
                    </div>

                    {/* Content at Bottom */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-left">
                      <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                        {place.name}
                      </h3>
                      <p className="text-[11px] text-slate-200 line-clamp-1 mt-0.5">
                        {place.description}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/20 text-[10px] text-slate-300">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddPlaceToCustomRoute?.(place);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                          title="Add to Custom Route in Guide"
                        >
                          <Route className="w-2.5 h-2.5" />
                          <span>Add Route</span>
                        </button>
                        <span className="text-emerald-300 font-semibold group-hover:underline">View Details &rarr;</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Places List / Grid */}
          <div className="px-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <span>
                  {searchQuery
                    ? `Search Results (${filteredPlaces.length})`
                    : selectedCategory
                    ? `${ZONE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory} (${filteredPlaces.length})`
                    : `All Places (${filteredPlaces.length})`}
                </span>
              </div>

              <button
                onClick={() => onNavigateToMap()}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>View on Map</span>
                <Navigation className="w-3 h-3" />
              </button>
            </div>

            {/* Places Card List */}
            {filteredPlaces.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No places found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try another keyword or select a different zone</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-3 flex gap-3 transition-all hover:shadow-xs group cursor-pointer relative"
                    onClick={() => onSelectPlace(place)}
                  >
                    {/* Thumbnail */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 relative bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                      <img
                        src={getSafeImageUrl(place.image)}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={handleImageError}
                      />
                      <div className="absolute top-1.5 left-1.5 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] text-slate-900 dark:text-slate-100 font-bold flex items-center gap-0.5 shadow-xs border dark:border-slate-800">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>{place.rating}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {place.name}
                          </h4>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(place.id);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 -mt-1 -mr-1 cursor-pointer"
                            aria-label="Save Favorite"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                place.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate font-medium text-emerald-800 dark:text-emerald-300">{place.zone || place.district}</span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {place.description}
                        </p>
                      </div>

                      {/* Bottom Actions: Add Route & Map */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 mt-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[90px]">
                          {place.isPopular ? '★ Popular' : 'Kolkata'}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddPlaceToCustomRoute?.(place);
                            }}
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg cursor-pointer transition-colors active:scale-95 shadow-xs"
                            title="Add to Custom Route in Guide"
                          >
                            <Route className="w-2.5 h-2.5" />
                            <span>Add Route</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToMap(place);
                            }}
                            className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                          >
                            <Navigation className="w-2.5 h-2.5" />
                            <span>Map</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Paste Raw JSON Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Paste JSON Code</h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <textarea
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder="Paste JSON array format here..."
              rows={8}
              className="w-full bg-transparent border border-slate-300 rounded-xl p-3 text-xs font-mono focus:border-emerald-600 focus:outline-none"
            />
            {pasteError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {pasteError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPastedJson}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Apply Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
