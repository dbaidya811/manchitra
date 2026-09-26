import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, ArrowLeft } from 'lucide-react';
import { Place, NavigationTab } from '../types';
import { POPULAR_SEARCH_TAGS } from '../data/mockData';

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onOpenMapWithQuery?: (query: string) => void;
  activeTab?: NavigationTab;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchQuery,
  onSearchChange,
  places,
  onSelectPlace,
  onOpenMapWithQuery,
  activeTab
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isSearchDisabled = activeTab === 'guide' || activeTab === 'profile';

  // Close search when navigating to guide or profile
  useEffect(() => {
    if (isSearchDisabled && isSearchOpen) {
      setIsSearchOpen(false);
      onSearchChange('');
    }
  }, [activeTab, isSearchDisabled, isSearchOpen, onSearchChange]);

  // Focus search input when search is opened
  useEffect(() => {
    if (isSearchOpen && !isSearchDisabled) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen, isSearchDisabled]);

  // Matching places restricted to pandal name and area name
  const filteredSuggestions = searchQuery.trim()
    ? places
        .filter((p) => {
          const q = searchQuery.toLowerCase().trim();
          const pandalName = p.name.toLowerCase();
          const areaName = (p.zone || p.district || '').toLowerCase();
          return pandalName.includes(q) || areaName.includes(q);
        })
        .slice(0, 8)
    : [];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 transition-colors">
      {!isSearchOpen || isSearchDisabled ? (
        /* Standard Header: Logo + App Name on the left, ONLY Search Icon on the right (hidden on guide & profile) */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <img
              src="https://cdn-icons-png.flaticon.com/512/14025/14025686.png"
              alt="Manchitra"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight">
                Manchitra
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wider">
                Explore & Navigate
              </span>
            </div>
          </div>

          {/* Right side: Search icon shown ONLY when not on guide or profile */}
          {!isSearchDisabled && (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer bg-transparent border-0 outline-none"
              aria-label="Search"
              title="Search Pandals & Areas"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        /* Expanded Search Bar: ONLY search icon and text, NO background box, NO border box */
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <button
            onClick={() => {
              setIsSearchOpen(false);
              onSearchChange('');
            }}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Completely boxless and backgroundless search input */}
          <div className="flex-1 flex items-center bg-transparent border-0 px-1 py-1">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search pandal or area name..."
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer bg-transparent border-0"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Autocomplete Dropdown when search is open */}
      {isSearchOpen && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-slate-200 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {searchQuery.trim() && filteredSuggestions.length > 0 && (
            <div className="p-2 divide-y divide-slate-100 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Pandals ({filteredSuggestions.length})</span>
                {activeTab === 'map' && (
                  <span className="text-emerald-700 font-bold normal-case">Tap to jump on map</span>
                )}
              </div>
              {filteredSuggestions.map((place) => (
                <button
                  key={place.id}
                  onClick={() => {
                    onSelectPlace(place);
                    setIsSearchOpen(false);
                    onSearchChange('');
                  }}
                  className="w-full flex items-center gap-3 p-2 text-left hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer"
                >
                  <img
                    src={place.image || 'https://cdn-icons-png.flaticon.com/512/14025/14025686.png'}
                    alt={place.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/14025/14025686.png';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 truncate">
                      {place.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{place.zone || place.district}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-medium">Kolkata, India</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-500 shrink-0">
                    ★ {place.rating}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && filteredSuggestions.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              <p>No pandals found for "{searchQuery}"</p>
              {onOpenMapWithQuery && (
                <button
                  onClick={() => {
                    onOpenMapWithQuery(searchQuery);
                    setIsSearchOpen(false);
                  }}
                  className="mt-2 text-emerald-600 font-semibold hover:underline"
                >
                  Search on Map &rarr;
                </button>
              )}
            </div>
          )}

          {/* Quick Suggested Tags */}
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1.5 tracking-wider">
              Popular Kolkata Pandals &amp; Areas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    onSearchChange(tag);
                  }}
                  className="px-2.5 py-1 text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
