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
  AlertCircle
} from 'lucide-react';
import { Place, UserProfile } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';
import { getSafeImageUrl, handleImageError, FALLBACK_PANDAL_IMAGE } from '../utils/imageHelper';

interface ProfileScreenProps {
  user: UserProfile;
  favoritePlaces: Place[];
  addedPlaces?: Place[];
  contributionsCount?: number;
  onSelectPlace: (place: Place) => void;
  onToggleFavorite?: (placeId: string) => void;
  onNavigateToMap?: (place?: Place, options?: { addRoute?: boolean }) => void;
  onOpenDataManager?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface GoogleAuthUser {
  name: string;
  email: string;
  picture?: string;
  isConnected: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  favoritePlaces,
  onSelectPlace,
  onToggleFavorite,
  onNavigateToMap,
  isDarkMode,
  onToggleDarkMode
}) => {
  // Google Sign-In state: MUST NOT show any name/email until logged in!
  const [googleUser, setGoogleUser] = useState<GoogleAuthUser>(() => {
    try {
      const saved = localStorage.getItem('manchitra_google_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isConnected && parsed.name && parsed.email) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return {
      name: '',
      email: '',
      picture: '',
      isConnected: false
    };
  });

  // Legal Modals state
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (typeof window !== 'undefined' ? (window as any).deferredInstallPrompt : null)
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  // Settings state
  const [notificationsActive, setNotificationsActive] = useState<boolean>(true);

  // Check if running in standalone PWA mode
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
          'To install Manchitra: Tap your browser menu (⋮) or Share button (⎋), then select "Install app" or "Add to Home Screen" ⊞.'
        );
      }
    }
  };

  // Google Sign-In disabled notification as requested:
  const handleGoogleSignIn = () => {
    setGoogleNotice('Current time system is not working');
    setTimeout(() => setGoogleNotice(null), 5000);
  };

  const handleDisconnectGoogle = () => {
    const disconnected: GoogleAuthUser = {
      name: '',
      email: '',
      picture: '',
      isConnected: false
    };
    setGoogleUser(disconnected);
    localStorage.removeItem('manchitra_google_user');
  };

  const mainScrollRef = useDragScroll<HTMLDivElement>({ direction: 'vertical', speed: 1.2 });
  const savedScrollRef = useDragScroll<HTMLDivElement>({ direction: 'vertical', speed: 1.2 });

  return (
    <div
      ref={mainScrollRef}
      className="flex-1 min-h-0 overflow-y-auto touch-scroll p-3 space-y-4 pb-24 bg-slate-50 dark:bg-slate-950 transition-colors select-none"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* GOOGLE ACCOUNT SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs transition-colors">
        {!googleUser.isConnected ? (
          /* LOGGED OUT STATE: Absolutely NO name or email shown before logging in! */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Google Sign-In
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sign in to sync your saved pandals & routes
                </p>
              </div>
            </div>

            {/* Clean, authentic Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {googleNotice && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{googleNotice}</span>
              </div>
            )}
          </div>
        ) : (
          /* LOGGED IN STATE: Name and Email appear ONLY after signing in */
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                  {googleUser.name}
                </h2>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {googleUser.email}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Google Account Connected</span>
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* PWA APP INSTALL OPTION AT THE BOTTOM */}
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
              <span>Progressive Web App</span>
            </div>
            <h3 className="font-extrabold text-sm text-white">
              Install Manchitra App
            </h3>
            <p className="text-[11px] text-emerald-100 leading-snug mt-0.5">
              Install Manchitra directly to your phone's home screen for rapid pandal navigation without App Store downloads.
            </p>
          </div>
        </div>

        {installSuccessMessage && (
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-xs text-white font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            <span>{installSuccessMessage}</span>
          </div>
        )}

        <div className="pt-1">
          {isInstalled ? (
            <div className="w-full py-2.5 px-3 bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Installed on this device</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-98"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install to Home Screen</span>
            </button>
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
                  2. Google Sign-In & User Identity
                </h4>
                <p>
                  Google Sign-In is used exclusively to associate your profile and bookmarks. We do not access your Google contacts, drive files, or private correspondence.
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
    </div>
  );
};
