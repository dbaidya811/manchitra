'use client';

import { useState } from "react";
import { SavedPlan } from "@/lib/types";

interface SharePageClientProps {
  shareId: string;
  initialPlan: SavedPlan;
  originalUserEmail: string;
}

export function SharePageClient({ shareId, initialPlan, originalUserEmail }: SharePageClientProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToMyPlans = async () => {
    setIsAdding(true);
    try {
      const res = await fetch(`/api/share/${shareId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_to_my_plans" }),
      });

      const data = await res.json();

      if (data.ok) {
        alert("Plan Added!");
        window.location.href = "/dashboard/plan-save";
      } else {
        throw new Error(data.error || "Failed to add plan");
      }
    } catch (error) {
      console.error("Failed to add plan:", error);
      alert("Failed to add plan. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const sharePlan = async () => {
    const shareUrl = `${window.location.origin}/share/${shareId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: initialPlan.name || "ManChitra Plan",
          text: initialPlan.description || "Check out this shared plan on ManChitra!",
          url: shareUrl,
        });
        return;
      } catch (error) {
        // If the user cancels or share fails, fall back to copy below
        console.warn("Native share failed, falling back to copy", error);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied! Share it with your friends.");
    } catch (error) {
      alert("Failed to copy link automatically. Please copy it manually: " + shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Shared Plan</h1>
          <p className="text-gray-600 dark:text-gray-400">Someone shared this plan with you</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{initialPlan.name}</h2>
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-sm">
              Shared Plan
            </span>
          </div>

          {initialPlan.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">{initialPlan.description}</p>
          )}

          <div className="text-sm text-gray-500 mb-4">
            Created: {new Date(initialPlan.createdAt).toLocaleDateString()}
          </div>

          {initialPlan.destinations.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Destinations ({initialPlan.destinations.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {initialPlan.destinations.map((destination, index) => {
                  const isObject = typeof destination === "object" && destination !== null;
                  const label = isObject
                    ? destination.displayName || `${destination.lat}, ${destination.lon}`
                    : destination;
                  const area = isObject && destination.area ? ` (${destination.area})` : "";

                  return (
                    <span
                      key={index}
                      className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded text-sm"
                    >
                      {label}
                      {area}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 mb-4">Shared by: {originalUserEmail}</div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToMyPlans}
                disabled={isAdding}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  "Add to My Plans"
                )}
              </button>

              <button
                onClick={sharePlan}
                className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Share Plan
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 mb-4">This link will expire in 7 days</p>
          <a href="/dashboard" className="text-gray-600 hover:text-gray-900 underline">
            Go to ManChitra Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
