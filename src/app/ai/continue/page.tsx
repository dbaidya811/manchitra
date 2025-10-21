"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MapPin, ArrowRight, LocateFixed, ArrowRightLeft, Loader2 } from "lucide-react";

export default function AIContinuePage() {
  return (
    <Suspense fallback={<div style={{ height: 2 }} /> }>
      <ContinueInner />
    </Suspense>
  );
}

function ContinueInner() {
  const search = useSearchParams();
  const router = useRouter();
  const plan = search.get("plan") || "";
  const [isLoadingNearest, setIsLoadingNearest] = useState(false);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);
  const [isLoadingPointToPoint, setIsLoadingPointToPoint] = useState(false);

  // If plan ids are present, go straight to the map
  useEffect(() => {
    if (plan) {
      router.replace(`/dashboard/map?plan=${encodeURIComponent(plan)}`);
    }
  }, [plan, router]);

  const handleNearestPandelClick = async () => {
    setIsLoadingNearest(true);
    // Simulate loading or perform any async operation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Example delay
    router.push(`/ai/nearest`);
    setIsLoadingNearest(false);
  };

  const handleSelectedPandelClick = async () => {
    setIsLoadingSelected(true);
    // Simulate loading or perform any async operation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Example delay
    const url = plan ? `/dashboard/map?plan=${encodeURIComponent(plan)}` : `/ai`;
    router.push(url);
    setIsLoadingSelected(false);
  };

  const handlePointToPointClick = async () => {
    setIsLoadingPointToPoint(true);
    // Simulate loading or perform any async operation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Example delay
    router.push(`/ai/point-to-point/start`);
    setIsLoadingPointToPoint(false);
  };

  return (
    <div
      className="min-h-screen w-full bg-white"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
      }}
    >
      <div className="mx-auto max-w-full sm:max-w-3xl px-3 sm:px-4 py-6 sm:py-10">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Continue Planning</h1>
          <p className="text-sm sm:text-base text-neutral-600">Choose how you want to continue.</p>
        </div>

        <div className="grid gap-3 sm:gap-5">
          {/* Option 0: Nearest Pandal */}
          <button
            className="group w-full flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all touch-manipulation active:scale-[.997]"
            onClick={handleNearestPandelClick}
            disabled={isLoadingNearest}
          >
            <div className="flex items-center gap-3 sm:gap-4 text-left">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                <LocateFixed className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Nearest pandal</div>
                <div className="text-xs sm:text-sm text-neutral-600 truncate">Find pandals near your current location</div>
              </div>
            </div>
            {isLoadingNearest ? (
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            ) : (
              <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
            )}
          </button>

          {/* Option 1: Selected Pandals */}
          <button
            className="group w-full flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all touch-manipulation active:scale-[.997]"
            onClick={handleSelectedPandelClick}
            disabled={isLoadingSelected}
          >
            <div className="flex items-center gap-3 sm:gap-4 text-left">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Selected pandal</div>
                <div className="text-xs sm:text-sm text-neutral-600 truncate">Use the places you selected just now</div>
              </div>
            </div>
            {isLoadingSelected ? (
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            ) : (
              <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
            )}
          </button>

          {/* Option 2: Point to point */}
          <button
            className="group w-full flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all touch-manipulation active:scale-[.997]"
            onClick={handlePointToPointClick}
            disabled={isLoadingPointToPoint}
          >
            <div className="flex items-center gap-3 sm:gap-4 text-left">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Point to point</div>
                <div className="text-xs sm:text-sm text-neutral-600 truncate">Create a simple route between two places</div>
              </div>
            </div>
            {isLoadingPointToPoint ? (
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            ) : (
              <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
