/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Place, NavigationTab, CategoryType, UserProfile } from './types';
import { INITIAL_PLACES, INITIAL_USER } from './data/mockData';
import { DesktopDeviceWrapper } from './components/DesktopDeviceWrapper';
import { HeaderBar } from './components/HeaderBar';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { MapScreen } from './components/MapScreen';
import { AddScreen } from './components/AddScreen';
import { GuideScreen } from './components/GuideScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { DataManagerModal } from './components/DataManagerModal';
import { SplashScreen } from './components/SplashScreen';
import { validateCoordinates } from './utils/geo';
import { CheckCircle2 } from 'lucide-react';

// Robust place data sanitizer to strictly avoid any NaN or missing coordinates
function sanitizePlace(item: any, idx = 0): Place {
  const coords = validateCoordinates(
    item.coordinates ?? [item.latitude, item.longitude]
  );

  return {
    ...item,
    id: item.id || `place-${idx}-${Date.now()}`,
    name: item.name || 'Durga Puja Pandal',
    district: item.district || item.zone || 'Kolkata',
    division: item.division || 'Kolkata',
    zone: item.zone || item.district || 'Kolkata',
    category: item.category || 'popular',
    coordinates: coords,
    latitude: coords[0],
    longitude: coords[1],
    rating: typeof item.rating === 'number' && !isNaN(item.rating) ? item.rating : 4.8,
    reviewCount: typeof item.reviewCount === 'number' && !isNaN(item.reviewCount) ? item.reviewCount : 50,
    image:
      item.image ||
      (item.local_images && item.local_images[0]
        ? '/' + item.local_images[0].replace(/^\/+/, '')
        : '') ||
      'https://cdn-icons-png.flaticon.com/512/14025/14025686.png',
    images: item.images || item.local_images || [],
    description: item.description || 'Famous Durga Puja pandal in Kolkata, India.',
    sourceUrl: item.sourceUrl || item.source_url || '',
    isFavorite: Boolean(item.isFavorite),
    isPopular: Boolean(item.isPopular),
    addedBy: item.addedBy || 'Kolkata Community'
  };
}

export default function App() {
  // Splash Screen on initial load:
  // Shows logo in center with "Manchitra", then transitions to dashboard
  const [showSplash, setShowSplash] = useState<boolean>(true);

  const [places, setPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('manchitra_kolkata_places');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 50) {
          return parsed.map((p, idx) => sanitizePlace(p, idx));
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_PLACES.map((p, idx) => sanitizePlace(p, idx));
  });

  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<Place | null>(null);
  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState<Place | null>(null);
  const [autoPlotRouteForPlace, setAutoPlotRouteForPlace] = useState<boolean>(false);
  const [customRoutePlaces, setCustomRoutePlaces] = useState<Place[]>([]);
  const [activeNavigationStops, setActiveNavigationStops] = useState<Place[] | null>(null);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dark Mode state: synced with localStorage and html.dark class
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('manchitra_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('manchitra_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  // Initial sync with backend places.json on disk
  useEffect(() => {
    fetch('/api/places')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sanitized = data.map((p, idx) => sanitizePlace(p, idx));
          setPlaces(sanitized);
        }
      })
      .catch((err) => {
        console.warn('API sync fallback to cached places:', err);
      });
  }, []);

  // Sync places to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('manchitra_kolkata_places', JSON.stringify(places));
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }
  }, [places]);

  const handleToggleFavorite = (placeId: string) => {
    setPlaces((prev) =>
      prev.map((place) =>
        place.id === placeId ? { ...place, isFavorite: !place.isFavorite } : place
      )
    );
  };

  const handleAddPlace = (newPlace: Place) => {
    const sanitized = sanitizePlace(newPlace);
    setPlaces((prev) => [sanitized, ...prev]);
    setUser((prev) => ({
      ...prev,
      contributionsCount: prev.contributionsCount + 1
    }));
  };

  const handleSelectPlace = useCallback((place: Place) => {
    const sanitized = sanitizePlace(place);
    if (activeTab === 'map') {
      setSelectedPlaceForMap(sanitized);
    } else {
      setSelectedPlaceForModal(sanitized);
    }
  }, [activeTab]);

  const handleNavigateToMap = useCallback((place?: Place, options?: { addRoute?: boolean }) => {
    if (place) {
      setSelectedPlaceForMap(sanitizePlace(place));
    }
    if (options?.addRoute) {
      setAutoPlotRouteForPlace(true);
    }
    setActiveTab('map');
  }, []);

  const handleNavigateToGuide = useCallback(() => {
    setActiveTab('guide');
  }, []);

  // Add a place to custom multi-stop route
  const handleAddPlaceToCustomRoute = useCallback((place: Place) => {
    const sanitized = sanitizePlace(place);
    setCustomRoutePlaces((prev) => {
      if (prev.some((p) => p.id === sanitized.id)) {
        setToastMessage(`"${sanitized.name}" is already in your Route`);
        return prev;
      }
      const updated = [...prev, sanitized];
      try {
        localStorage.setItem('manchitra_custom_route_stops', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not save custom route:', err);
      }
      setToastMessage(`Added "${sanitized.name}" to Custom Route!`);
      return updated;
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const handleSelectPlaceForMap = useCallback((place: Place | null) => {
    setSelectedPlaceForMap(place ? sanitizePlace(place) : null);
  }, []);

  const handleClearSelectedPlace = useCallback(() => {
    setSelectedPlaceForMap(null);
    setAutoPlotRouteForPlace(false);
  }, []);

  const handleResetAutoPlotRoute = useCallback(() => {
    setAutoPlotRouteForPlace(false);
  }, []);

  const handleClearCustomRoute = useCallback(() => {
    setCustomRoutePlaces([]);
    try {
      localStorage.removeItem('manchitra_custom_route_stops');
    } catch {
      // ignore
    }
  }, []);

  const handleUpdateCustomRoutePlaces = useCallback((newPlaces: Place[]) => {
    setCustomRoutePlaces(newPlaces);
    try {
      localStorage.setItem('manchitra_custom_route_stops', JSON.stringify(newPlaces));
    } catch (err) {
      console.warn('Could not save custom route:', err);
    }
  }, []);

  const handleClearActiveNavigationStops = useCallback(() => {
    setActiveNavigationStops(null);
  }, []);

  const handleImportJsonText = (jsonText: string) => {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON format error: Must be an array of places.');
    }

    const valid: Place[] = parsed.map((item, idx) => sanitizePlace(item, idx));
    setPlaces(valid);
    setToastMessage(`Successfully imported ${valid.length} places!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleImportJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        handleImportJsonText(text);
      } catch (err: unknown) {
        console.error('File parsing error:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadImages = (files: FileList) => {
    const newImgs: { name: string; url: string }[] = [];
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      newImgs.push({ name: file.name, url });
    });
    setUploadedImages((prev) => [...newImgs, ...prev]);
  };

  const handleOpenMapWithQuery = (query: string) => {
    setSearchQuery(query);
    setActiveTab('map');
  };

  return (
    <>
      {/* Launch Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <DesktopDeviceWrapper>
        <div
          className={`flex flex-col h-full w-full relative overflow-hidden transition-colors ${
            isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
          }`}
        >
          {/* Header Bar with search and brand */}
          <HeaderBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            places={places}
            onSelectPlace={handleSelectPlace}
            onOpenMapWithQuery={handleOpenMapWithQuery}
            activeTab={activeTab}
          />

          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-emerald-950/95 text-white px-4 py-2 rounded-2xl shadow-2xl border border-emerald-500/40 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[260px]">{toastMessage}</span>
            </div>
          )}

          {/* Main Content Area based on Active Navigation Tab */}
          <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
            {activeTab === 'home' && (
              <HomeScreen
                places={places}
                onSelectPlace={handleSelectPlace}
                onToggleFavorite={handleToggleFavorite}
                onNavigateToMap={handleNavigateToMap}
                onNavigateToGuide={handleNavigateToGuide}
                onAddPlaceToCustomRoute={handleAddPlaceToCustomRoute}
                onOpenDataManager={() => setIsDataManagerOpen(true)}
                onImportJsonText={handleImportJsonText}
                onImportJsonFile={handleImportJsonFile}
                onUploadImages={handleUploadImages}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
              />
            )}

            {/* Persistent MapScreen for 0ms instant switching and zero loading time */}
            <div className={`w-full h-full flex flex-col ${activeTab === 'map' ? 'block' : 'hidden'}`}>
              <MapScreen
                places={places}
                selectedPlace={selectedPlaceForMap}
                onSelectPlace={handleSelectPlaceForMap}
                onClearSelectedPlace={handleClearSelectedPlace}
                autoPlotRoute={autoPlotRouteForPlace}
                onResetAutoPlotRoute={handleResetAutoPlotRoute}
                isVisible={activeTab === 'map'}
                customRoutePlaces={customRoutePlaces}
                onClearCustomRoute={handleClearCustomRoute}
                onAddPlaceToCustomRoute={handleAddPlaceToCustomRoute}
                activeNavigationStops={activeNavigationStops}
                onClearActiveNavigationStops={handleClearActiveNavigationStops}
              />
            </div>

            {activeTab === 'add' && (
              <AddScreen
                onAddPlace={handleAddPlace}
                onSuccessNavigate={(newPlace) => {
                  setSelectedPlaceForMap(newPlace);
                  setActiveTab('map');
                }}
              />
            )}

            {activeTab === 'guide' && (
              <GuideScreen
                places={places}
                onNavigateToMap={handleNavigateToMap}
                onNavigateCustomRoute={(routePlaces) => {
                  handleUpdateCustomRoutePlaces(routePlaces);
                  setActiveNavigationStops(routePlaces);
                  setActiveTab('map');
                }}
                onSelectPlace={handleSelectPlace}
                onOpenDataManager={() => setIsDataManagerOpen(true)}
                customRoutePlaces={customRoutePlaces}
                onUpdateCustomRoutePlaces={handleUpdateCustomRoutePlaces}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                user={user}
                favoritePlaces={places.filter((p) => p.isFavorite)}
                contributionsCount={places.filter((p) => p.addedBy).length}
                onSelectPlace={handleSelectPlace}
                onToggleFavorite={handleToggleFavorite}
                onNavigateToMap={handleNavigateToMap}
                onOpenDataManager={() => setIsDataManagerOpen(true)}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
              />
            )}
          </main>

          {/* Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab !== 'map') {
                setSelectedPlaceForMap(null);
                setAutoPlotRouteForPlace(false);
                setActiveNavigationStops(null);
              }
            }}
          />

          {/* Place Detail Modal */}
          {selectedPlaceForModal && (
            <PlaceDetailModal
              place={selectedPlaceForModal}
              onClose={() => setSelectedPlaceForModal(null)}
              onToggleFavorite={handleToggleFavorite}
              onNavigateToMap={(place, options) => {
                setSelectedPlaceForModal(null);
                handleNavigateToMap(place, options);
              }}
              onNavigateToGuide={handleNavigateToGuide}
              onAddPlaceToCustomRoute={handleAddPlaceToCustomRoute}
            />
          )}

          {/* JSON & Image Asset Data Manager Modal */}
          {isDataManagerOpen && (
            <DataManagerModal
              places={places}
              uploadedImages={uploadedImages}
              onClose={() => setIsDataManagerOpen(false)}
              onImportJsonText={handleImportJsonText}
              onImportJsonFile={handleImportJsonFile}
              onUploadImages={handleUploadImages}
              onResetToDefaults={() => {
                setPlaces(INITIAL_PLACES.map((p, idx) => sanitizePlace(p, idx)));
                localStorage.removeItem('manchitra_kolkata_places');
              }}
            />
          )}
        </div>
      </DesktopDeviceWrapper>
    </>
  );
}
