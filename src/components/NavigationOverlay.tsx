import React, { useMemo } from 'react';
import {
  Navigation,
  LocateFixed,
  Volume2,
  VolumeX,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Flag,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Clock,
  Compass,
  CloudSun,
  X
} from 'lucide-react';
import { NavigationRoute, NavigationStep, calculateDistanceKm, formatDistance } from '../utils/geo';
import { Place } from '../types';
import { UserWeatherWidget } from './UserWeatherWidget';

interface NavigationOverlayProps {
  isNavigating: boolean;
  navRoute: NavigationRoute | null;
  activeStepIndex: number;
  userLocation: [number, number];
  liveSpeed: number | null;
  liveRemainingDistance: string | null;
  liveRemainingDuration: number | null;
  isVoiceMuted: boolean;
  onToggleVoice: () => void;
  onStepChange: (index: number) => void;
  onRecenter: () => void;
  onExitNavigation: () => void;
  targetStops?: Place[];
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  isNavigating,
  navRoute,
  activeStepIndex,
  userLocation,
  liveSpeed,
  liveRemainingDistance,
  liveRemainingDuration,
  isVoiceMuted,
  onToggleVoice,
  onStepChange,
  onRecenter,
  onExitNavigation,
  targetStops = []
}) => {
  if (!isNavigating || !navRoute) return null;

  const currentStep: NavigationStep | undefined = navRoute.steps[activeStepIndex];
  const nextStep: NavigationStep | undefined = navRoute.steps[activeStepIndex + 1];

  // Dynamic real-time 'turn-in' distance calculation from user's current GPS position to turn coordinate
  const { distToTurnText, isTurnImminent } = useMemo(() => {
    if (!currentStep || !currentStep.coordinates) {
      return { distToTurnText: currentStep?.distanceText || 'Ahead', isTurnImminent: false };
    }

    const distKm = calculateDistanceKm(userLocation, currentStep.coordinates);
    const distMeters = Math.round(distKm * 1000);

    if (distMeters <= 35) {
      return { distToTurnText: 'Turn Now', isTurnImminent: true };
    }
    if (distMeters < 1000) {
      return { distToTurnText: `In ${distMeters} m`, isTurnImminent: distMeters <= 100 };
    }
    return { distToTurnText: `In ${distKm.toFixed(1)} km`, isTurnImminent: false };
  }, [userLocation, currentStep]);

  // Determine the next upcoming pandal stop in multi-stop or single-stop navigation
  const nextStopInfo = useMemo(() => {
    if (!targetStops || targetStops.length === 0) {
      return null;
    }

    // Find the next stop along the route that user hasn't yet arrived at (< 40m)
    let nextIdx = 0;
    for (let i = 0; i < targetStops.length; i++) {
      const stopDist = calculateDistanceKm(userLocation, targetStops[i].coordinates);
      if (stopDist > 0.04) {
        nextIdx = i;
        break;
      }
      nextIdx = i;
    }

    const stop = targetStops[nextIdx] || targetStops[targetStops.length - 1];
    const distKm = calculateDistanceKm(userLocation, stop.coordinates);
    const distText = formatDistance(distKm);

    return {
      stop,
      stopIndex: nextIdx + 1,
      totalStops: targetStops.length,
      distanceToStopText: distText
    };
  }, [targetStops, userLocation]);

  // Maneuver Turn Icon
  const renderManeuverIcon = (maneuver?: string) => {
    switch (maneuver) {
      case 'turn-right':
      case 'slight-right':
        return <CornerUpRight className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'turn-left':
      case 'slight-left':
        return <CornerUpLeft className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'u-turn':
        return <RotateCcw className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'arrive':
        return <Flag className="w-8 h-8 text-emerald-300 stroke-[2.5]" />;
      default:
        return <ArrowUp className="w-8 h-8 text-white stroke-[2.5]" />;
    }
  };

  return (
    <>
      {/* 1. TOP PERSISTENT 'TURN-IN' NAVIGATION BANNER */}
      {currentStep && (
        <div className="absolute top-2 left-2 right-2 z-40 animate-in slide-in-from-top-4 duration-300 flex flex-col gap-1.5 pointer-events-auto">
          {/* Main Turn-in Instruction Bar */}
          <div
            className={`text-white rounded-2xl p-3.5 shadow-2xl border transition-all duration-300 flex items-center justify-between gap-3 backdrop-blur-md ${
              isTurnImminent
                ? 'bg-amber-700/95 border-amber-400 shadow-amber-900/40 ring-2 ring-amber-400/50'
                : 'bg-[#0b5336]/95 border-emerald-600/40 shadow-emerald-950/50'
            }`}
          >
            {/* Big Maneuver Direction Arrow */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner transition-colors ${
                isTurnImminent
                  ? 'bg-amber-600/90 border-amber-300 animate-pulse'
                  : 'bg-emerald-800/80 border-emerald-500/40'
              }`}
            >
              {renderManeuverIcon(currentStep.maneuver)}
            </div>

            {/* Middle: Real-Time Turn-in Distance & Instructions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl sm:text-2xl font-black tracking-tight ${
                    isTurnImminent ? 'text-amber-200' : 'text-white'
                  }`}
                >
                  {distToTurnText}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${
                    isTurnImminent
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-800/80 text-emerald-200'
                  }`}
                >
                  {currentStep.maneuver === 'arrive' ? 'Arrival Point' : 'Turn-in Ahead'}
                </span>
              </div>

              {/* Turn Instruction Text */}
              <p className="text-xs sm:text-sm font-semibold text-emerald-50 truncate mt-0.5 leading-snug">
                {currentStep.instruction}
              </p>

              {/* Next Turn Preview */}
              {nextStep && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-200/90 truncate mt-0.5">
                  <span className="font-bold opacity-80">Then:</span>
                  <span className="truncate">{nextStep.instruction}</span>
                </div>
              )}
            </div>

            {/* Voice Assistant Audio Toggle */}
            <button
              onClick={onToggleVoice}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isVoiceMuted
                  ? 'bg-emerald-950/70 text-slate-300 hover:text-white border border-emerald-800'
                  : 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
              }`}
              title={isVoiceMuted ? 'Unmute Voice Assistant' : 'Mute Voice Assistant'}
              aria-label="Toggle voice guidance"
            >
              {isVoiceMuted ? (
                <VolumeX className="w-5 h-5 text-rose-300" />
              ) : (
                <Volume2 className="w-5 h-5 animate-pulse text-white" />
              )}
            </button>
          </div>

          {/* Persistent Next Stop & Real-Time User Location Weather Sub-Bar */}
          <div className="flex items-center gap-1.5 w-full">
            {nextStopInfo ? (
              <div className="flex-1 min-w-0 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white rounded-xl px-2.5 py-1.5 shadow-lg flex items-center justify-between gap-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-blue-300 tracking-wider block">
                      Next Stop ({nextStopInfo.stopIndex}/{nextStopInfo.totalStops})
                    </span>
                    <p className="text-xs font-bold text-slate-100 truncate">
                      {nextStopInfo.stop.name}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right pl-2 border-l border-slate-700">
                  <span className="text-xs font-black text-amber-300 block leading-tight">
                    {nextStopInfo.distanceToStopText}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">to stop</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  <Navigation className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-emerald-300 tracking-wider block">
                    Destination
                  </span>
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {navRoute.destinationName || targetStops[0]?.name || 'Pandal Destination'}
                  </p>
                </div>
              </div>
            )}

            {/* Real-time Weather at User's Current GPS Location */}
            <UserWeatherWidget
              userLocation={userLocation}
              variant="nav-banner"
              className="shrink-0"
            />
          </div>
        </div>
      )}

      {/* 2. BOTTOM PERSISTENT NAVIGATION CONTROLLER DECK */}
      <div className="absolute bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5">
          {/* Top Row: Total Remaining Time, Distance, and Exit Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {liveRemainingDuration ?? navRoute.totalDurationMinutes} min
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ({liveRemainingDistance ?? `${navRoute.totalDistanceKm} km`}) · ETA {navRoute.etaString}
              </span>
            </div>

            {/* Exit Navigation Button */}
            <button
              onClick={onExitNavigation}
              className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              Exit
            </button>
          </div>

          {/* Real-Time Live GPS Status & Speed Deck */}
          <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 tracking-wide uppercase">
                Real GPS
              </span>
              {liveSpeed !== null && (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                  {liveSpeed} km/h
                </span>
              )}
            </div>

            {/* Re-center Map on User GPS Button */}
            <button
              onClick={onRecenter}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
              title="Re-center map on your location"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Re-center</span>
            </button>
          </div>

          {/* Stepper Controls: Turn Maneuvers Browser */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onStepChange(activeStepIndex - 1)}
                disabled={activeStepIndex === 0}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-1">
                Turn {activeStepIndex + 1} of {navRoute.steps.length}
              </span>

              <button
                onClick={() => onStepChange(activeStepIndex + 1)}
                disabled={activeStepIndex === navRoute.steps.length - 1}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Summary text */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[170px] text-right">
              {currentStep.instruction}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
