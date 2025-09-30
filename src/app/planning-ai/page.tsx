"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, ListOrdered } from "lucide-react";

export default function PlanningAIPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <section className="relative mx-auto max-w-4xl px-4 pt-16 pb-10 sm:pt-24">
        <div className="flex items-start sm:items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Planning AI
            </h1>
            <p className="mt-2 text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
              Get a hop-by-hop plan to visit multiple places efficiently. Pick your spots, and we'll build a simple, human-friendly sequence.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70">
            <div className="font-semibold">Pick places</div>
            <p className="text-sm text-muted-foreground">Choose any places from the map or your contributions.</p>
          </div>
          <div className="rounded-2xl p-4 border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70">
            <div className="font-semibold">Quick sequence</div>
            <p className="text-sm text-muted-foreground">We order them in an easy path with rough distances.</p>
          </div>
          <div className="rounded-2xl p-4 border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70">
            <div className="font-semibold">Simple steps</div>
            <p className="text-sm text-muted-foreground">View steps or open each spot for full directions.</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-semibold">Start from the Map</div>
              <div className="text-sm opacity-90">Tap places and add them to your plan. Then come back here to see a suggested order.</div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/map">
                <Button className="bg-white text-black hover:bg-white/90 rounded-full">
                  <MapPin className="h-4 w-4 mr-2" /> Open Map
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" className="rounded-full">
                  <ListOrdered className="h-4 w-4 mr-2" /> Recent Places
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-neutral-600 dark:text-neutral-400">
          Tip: When you see a place card, use the Steps button to view walking steps between your location and that spot.
        </div>
        {/* Mobile inline Continue button */}
        <div className="mt-4 sm:hidden">
          <Link href="/ai" className="block">
            <Button className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg">
              Continue
            </Button>
          </Link>
        </div>
      </section>
      {/* Sticky Continue bar */}
      <div
        className="hidden sm:block fixed bottom-0 left-0 right-0 z-[2100]"
        style={{
          paddingLeft: 'max(1rem, calc(env(safe-area-inset-left, 0px) + 1rem))',
          paddingRight: 'max(1rem, calc(env(safe-area-inset-right, 0px) + 1rem))',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        }}
      >
        <div className="mx-auto max-w-4xl">
          <Link href="/ai" className="block">
            <Button size="sm" className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg">
              Continue
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
