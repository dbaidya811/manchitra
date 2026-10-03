import React, { useState, useEffect } from 'react';
import {
  Heart,
  MapPin,
  Settings,
  Bell,
  ShieldCheck,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  FileText,
  Lock,
  X,
  Star,
  Navigation,
  Trash2,
  CheckCircle2,
  LogOut,
  LogIn,
  Loader2,
  AlertCircle,
  Pencil,
  Landmark,
  ArrowLeft,
  Download
} from 'lucide-react';
import { Place, AuthUser, AuthStatus } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';
import { ApiError, APK_DOWNLOAD_URL, apiFetch } from '../lib/api';
import { getSafeImageUrl, handleImageError, FALLBACK_PANDAL_IMAGE } from '../utils/imageHelper';

interface ProfileScreenProps {
  authUser: AuthUser | null;
  authStatus: AuthStatus;
  onSignIn: () => void;
  onSignOut: () => void;
  favoritePlaces: Place[];
  addedPlaces?: Place[];
  myContributions: Place[];
  onUpdatePlace: (place: Place) => void;
  onDeletePlace: (placeId: string) => void;
  contributionsCount?: number;
  onSelectPlace: (place: Place) => void;
  onToggleFavorite?: (placeId: string) => void;
  onNavigateToMap?: (place?: Place, options?: { addRoute?: boolean }) => void;
  onOpenDataManager?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface EditFormState {
  name: string;
  zone: string;
  lat: string;
  lng: string;
  description: string;
  sourceUrl: string;
  imageUrl: string;
}

const EMPTY_EDIT_FORM: EditFormState = {
  name: '',
  zone: '',
  lat: '',
  lng: '',
  description: '',
  sourceUrl: '',
  imageUrl: ''
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  authUser,
  authStatus,
  onSignIn,
  onSignOut,
  favoritePlaces,
  myContributions,
  onUpdatePlace,
  onDeletePlace,
  contributionsCount,
  onSelectPlace,
  onToggleFavorite,
  onNavigateToMap,
  isDarkMode,
  onToggleDarkMode
}) => {
  // Legal Modals state
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // App install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (typeof window !== 'undefined' ? (window as any).deferredInstallPrompt : null)
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // True when running inside the Capacitor Android shell
  const isNativeApp = Boolean(
    typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform
  );

  // My Contributions: edit / delete the pandals this account published
  const [showContributions, setShowContributions] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Place | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [contributionError, setContributionError] = useState<string | null>(null);

  // Settings state
  const [notificationsActive, setNotificationsActive] = useState<boolean>(true);

  // Check if the app is already running as an installed standalone window
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    if ((window as any).deferredInstallPrompt) {
      setDeferredPrompt((window as any).deferredInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePromptAvailable = () => {
      if ((window as any).deferredInstallPrompt) {
        setDeferredPrompt((window as any).deferredInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
      setInstallSuccessMessage('Manchitra was installed successfully!');
      setTimeout(() => setInstallSuccessMessage(null), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredInstallPrompt : null);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setInstallSuccessMessage('Manchitra was installed successfully!');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') (window as any).deferredInstallPrompt = null;
    } else {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true);
        setInstallSuccessMessage('Manchitra is already installed on your device!');
      } else {
        setInstallSuccessMessage(
          'Manchitra could not be installed automatically here. Open your browser menu and choose "Install app", or download the Android app below.'
        );
      }
    }
  };

  const mainScrollRef = useDragScroll<HTMLDivElement>({ direction: 'vertical', speed: 1.2 });
  const savedScrollRef = useDragScroll<HTMLDivElement>({ direction: 'vertical', speed: 1.2 });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const openEditModal = (place: Place) => {
    setContributionError(null);
    setEditForm({
      name: place.name || '',
      zone: place.zone || place.district || '',
      lat: String(place.latitude ?? place.coordinates?.[0] ?? ''),
      lng: String(place.longitude ?? place.coordinates?.[1] ?? ''),
      description: place.description || '',
      sourceUrl: place.sourceUrl || '',
      imageUrl:
        place.image && place.image.startsWith('data:') ? '' : place.image || ''
    });
    setEditingPlace(place);
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPlace) return;

    setIsSaving(true);
    setContributionError(null);
    try {
      const result = await apiFetch<{ place: Place }>(
        `/api/places/${encodeURIComponent(editingPlace.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: editForm.name.trim(),
            zone: editForm.zone.trim(),
            coordinates: [Number(editForm.lat), Number(editForm.lng)],
            description: editForm.description.trim(),
            sourceUrl: editForm.sourceUrl.trim(),
            image: editForm.imageUrl.trim() || undefined
          })
        }
      );
      onUpdatePlace({ ...editingPlace, ...(result?.place || {}) });
      setEditingPlace(null);
    } catch (err) {
      setContributionError(
        err instanceof ApiError ? err.message : 'Could not save your changes.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    setContributionError(null);
    try {
      await apiFetch(`/api/places/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE'
      });
      onDeletePlace(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setContributionError(
        err instanceof ApiError ? err.message : 'Could not delete this pandal.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={mainScrollRef}
      className="flex-1 min-h-0 overflow-y-auto touch-scroll p-3 space-y-4 pb-24 bg-slate-50 dark:bg-slate-950 transition-colors select-none"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* ACCOUNT SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs transition-colors">
        {authStatus === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-semibold">Checking your session...</span>
          </div>
        ) : !authUser ? (
          /* LOGGED OUT STATE: no name or email is shown before a real sign-in */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Sign in to Manchitra
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Required to add a pandal
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignIn}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with email or Google</span>
            </button>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                We send a one-time verification code to your email. No password is required or
                stored.
              </span>
            </div>
          </div>
        ) : (
          /* LOGGED IN STATE: real session identity from the server */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center shrink-0 overflow-hidden">
                {authUser.picture ? (
                  <img
                    src={authUser.picture}
                    alt={authUser.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                    {authUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {authUser.name}
                  </h2>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {authUser.email}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Verified account</span>
                  </span>
                  {typeof contributionsCount === 'number' && (
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      {contributionsCount} contributed
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                title="Sign Out"
              >
                {isSigningOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTRIBUTION OPTION: only available to a signed in account */}
      {authUser && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 shadow-xs transition-colors">
          <button
            type="button"
            onClick={() => {
              setContributionError(null);
              setShowContributions(true);
            }}
            className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Contribution
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Pandals you added &mdash; edit or delete them
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/60">
                {myContributions.length}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* DEDICATED SAVED PANDALS BOX */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Saved Pandals
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Your bookmarked pandals for Pujo visits
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-900/60">
            {favoritePlaces.length} Saved
          </span>
        </div>

        {/* Saved List Content */}
        {favoritePlaces.length === 0 ? (
          <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
              No saved pandals yet
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Tap the heart icon on any pandal card on the Home or Guide screen to bookmark it here.
            </p>
          </div>
        ) : (
          <div
            ref={savedScrollRef}
            className="space-y-2.5 max-h-80 overflow-y-auto no-scrollbar pt-1 select-none"
          >
            {favoritePlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-2.5 flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
              >
                {/* Pandal Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-700 relative">
                  <img
                    src={getSafeImageUrl(place.image)}
                    alt={place.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={handleImageError}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {place.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {place.zone || place.district || 'Kolkata'}
                    </span>
                    {place.rating && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {place.rating}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Add Route & Unsave */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {onNavigateToMap && (
                    <button
                      type="button"
                      onClick={() => onNavigateToMap(place, { addRoute: true })}
                      title="Add Route on Map"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(place.id)}
                      title="Remove from saved"
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APP PREFERENCES & FULL APP DARK MODE TOGGLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 space-y-3.5 text-xs shadow-xs transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>App Preferences</span>
        </h3>

        {/* FULL APP DARK MODE SHIFT SWITCH */}
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100">
                Dark Mode
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {isDarkMode ? 'Dark theme enabled across all screens' : 'Switch app to dark mode'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative ${
              isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label="Toggle Dark Mode"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center ${
                isDarkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {isDarkMode ? (
                <Moon className="w-3 h-3 text-indigo-600" />
              ) : (
                <Sun className="w-3 h-3 text-amber-500" />
              )}
            </div>
          </button>
        </div>

        {/* Notifications Setting */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">Live Crowd & Weather Alerts</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Pujo traffic updates & advisories</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsActive(!notificationsActive)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
              notificationsActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notificationsActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* PRIVACY POLICY & TERMS AND CONDITIONS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 space-y-2 text-xs shadow-xs transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 pb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Security & Legal</span>
        </h3>

        {/* Privacy Policy Button */}
        <button
          type="button"
          onClick={() => setShowPrivacyModal(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Privacy Policy
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                How GPS location and user data are kept private
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Terms and Conditions Button */}
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Terms and Conditions
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Pujo navigation guidelines and safety disclaimer
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* APP INSTALL OPTION AT THE BOTTOM */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-900 rounded-3xl p-4 text-white shadow-md space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white p-2 shadow-xs shrink-0 flex items-center justify-center">
            <img
              src="./logo.png"
              alt="Manchitra"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold text-white mb-1">
              <Smartphone className="w-3 h-3" />
              <span>Mobile App</span>
            </div>
            <h3 className="font-extrabold text-sm text-white">
              Install Manchitra App
            </h3>
            <p className="text-[11px] text-emerald-100 leading-snug mt-0.5">
              Get Manchitra on your phone for quicker launch and smooth pandal navigation, without
              searching the App Store.
            </p>
          </div>
        </div>

        {installSuccessMessage && (
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-xs text-white font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            <span>{installSuccessMessage}</span>
          </div>
        )}

        <div className="pt-1 space-y-2">
          {isInstalled || isNativeApp ? (
            <div className="w-full py-2.5 px-3 bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isNativeApp ? 'Running the Android app' : 'Installed on this device'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-98"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install App</span>
            </button>
          )}

          {/* Native Android build: downloads the signed APK from GitHub Releases */}
          {APK_DOWNLOAD_URL && (
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              download="manchitra.apk"
              className="w-full py-2.5 px-4 bg-emerald-950/40 hover:bg-emerald-900/50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 border border-white/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Android App (APK)</span>
            </a>
          )}
        </div>
      </div>

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Privacy Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto no-scrollbar space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  1. Real-time GPS Location Privacy
                </h4>
                <p>
                  Manchitra requests your GPS coordinates solely to calculate distances from your location to Kolkata Durga Puja pandals and plot routes on the interactive map. Your location is processed entirely inside your browser and is never stored on external servers or shared with third parties.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  2. Email Verification Codes & Google Sign-In
                </h4>
                <p>
                  Signing in is required to add a pandal. We email you a 6-digit one-time code and
                  store only its hash together with your email address and the pandals you add.
                  No password is ever created or stored. Google Sign-In is used solely to confirm
                  your identity; we do not access your Google contacts, drive files, or private
                  correspondence. You may sign out at any time, which deletes your session on our
                  server.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  3. Local Browser Storage
                </h4>
                <p>
                  Saved pandals, custom added routes, and theme preferences (such as Dark Mode) are stored locally in your browser's private localStorage. You may clear your saved data at any time through your browser settings.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  4. Map Infrastructure
                </h4>
                <p>
                  Map tiles are served via OpenStreetMap open infrastructure to conserve mobile data during festive pandal hopping.
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TERMS AND CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Terms and Conditions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto no-scrollbar space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  1. Navigation & Route Advisory
                </h4>
                <p>
                  All suggested walking routes and distances are intended as guides. During Durga Puja, Kolkata Police may implement temporary barricades, one-way pedestrian corridors, and VIP queues. Please always follow on-ground police instructions.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  2. Pujo Timings & Entry Regulations
                </h4>
                <p>
                  Darshan timings, inauguration schedules, and entry passes are established by individual Durga Puja committees. Manchitra strives to provide up-to-date guidance but is not liable for schedule changes or crowd-control restrictions.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  3. Community Etiquette & Safety
                </h4>
                <p>
                  Respect festive traditions, public spaces, and pandal premises. Do not litter, keep children in sight in crowded zones, and cooperate with volunteers and emergency personnel.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                  4. Intellectual Property
                </h4>
                <p>
                  Pandal photographs, themes, and idols are cultural creations of their respective artist teams and committees.
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Accept Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MY CONTRIBUTION VIEW: opened from the Profile "Contribution" option */}
      {showContributions && authUser && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowContributions(false);
                setContributionError(null);
              }}
              disabled={isSaving}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                My Contribution
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {myContributions.length} pandal{myContributions.length === 1 ? '' : 's'} added by you
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-8 space-y-2.5">
            {contributionError && !editingPlace && !deleteTarget && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{contributionError}</span>
              </div>
            )}

            {myContributions.length === 0 ? (
              <div className="mt-8 p-8 text-center space-y-2 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <Landmark className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  You have not added any pandals yet
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Use the + button on the bottom bar to add a pandal. Anything you publish will
                  appear here so you can correct or remove it later.
                </p>
              </div>
            ) : (
              myContributions.map((place) => (
                <div
                  key={place.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3 flex gap-3 transition-all group shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowContributions(false);
                      onSelectPlace(place);
                    }}
                    className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="View details"
                  >
                    <img
                      src={getSafeImageUrl(place.image)}
                      alt={place.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={handleImageError}
                    />
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                        {place.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium text-emerald-800 dark:text-emerald-300 truncate">
                          {place.zone || place.district || 'Kolkata'}
                        </span>
                      </div>
                      {place.addedOn && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Added on {new Date(place.addedOn).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(place)}
                        className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContributionError(null);
                          setDeleteTarget(place);
                        }}
                        className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* EDIT MY CONTRIBUTION MODAL */}
      {editingPlace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Edit Pandal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlace(null)}
                disabled={isSaving}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3 overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Pandal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Zone / Area
                </label>
                <input
                  type="text"
                  value={editForm.zone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, zone: e.target.value }))}
                  placeholder="e.g. Bagbazar, Salt Lake"
                  className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Coordinates (Latitude / Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={editForm.lat}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lat: e.target.value }))}
                    placeholder="Latitude"
                    className="bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    required
                    value={editForm.lng}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lng: e.target.value }))}
                    placeholder="Longitude"
                    className="bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Must be inside West Bengal (lat 15-30, lng 75-95).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Google Maps Link
                </label>
                <input
                  type="text"
                  value={editForm.sourceUrl}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sourceUrl: e.target.value }))
                  }
                  placeholder="google.com/maps/place/..."
                  className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Photo URL
                </label>
                <input
                  type="text"
                  value={editForm.imageUrl}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="Leave empty to keep the current photo"
                  className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              {contributionError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] text-rose-800 dark:text-rose-200 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span>{contributionError}</span>
                </div>
              )}
            </form>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingPlace(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving || editForm.name.trim().length < 2}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MY CONTRIBUTION CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="p-5 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Delete this pandal?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {deleteTarget.name}
                </span>{' '}
                will be removed from Manchitra for every user. This cannot be undone.
              </p>

              {contributionError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] text-rose-800 dark:text-rose-200 font-semibold flex items-start gap-2 text-left">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span>{contributionError}</span>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setContributionError(null);
                }}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                Keep It
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
