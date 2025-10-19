"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/lib/types";
import { Ruler } from "lucide-react";

function InitialsAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = (name || "?").trim().split(/\s+/);
    const s = (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
    return s || "?";
  }, [name]);
  return (
    <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center font-semibold">
      {initials}
    </div>
  );
}

export default function AISelectionPage() {
  return (
    <Suspense fallback={<div style={{ height: 2 }} /> }>
      <AISelectionInner />
    </Suspense>
  );
}

function AISelectionInner() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Try user's places first, else fallback to all
        let res = await fetch("/api/places?mine=1", { cache: "no-store" });
        let data = await res.json();
        let list: Place[] = (res.ok && data?.ok && Array.isArray(data.places)) ? data.places : [];
        if (list.length === 0) {
          res = await fetch("/api/places", { cache: "no-store" });
          data = await res.json();
          list = (res.ok && data?.ok && Array.isArray(data.places)) ? data.places : [];
        }
        setPlaces(list);
      } catch (e: any) {
        setError("Failed to load places");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  const toggle = (id: number) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] bg-white overflow-x-hidden box-border" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }}>
      {/* Full-viewport background to eliminate right-side strip on mobile */}
      <div className="fixed inset-0 bg-white -z-10" />
      {/* Global fallback to ensure body/html background is white on very small screens (e.g., iPhone SE) */}
      <style jsx global>{`
        @media (max-width: 380px) {
          html, body, body > div:first-child, #__next, #__next > div {
            background-color: #ffffff !important;
          }
        }
      `}</style>
      <div className="mx-auto max-w-full sm:max-w-4xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Choose Places</h1>
          <p className="text-sm sm:text-base text-neutral-600">Select from your saved places to continue planning with AI.</p>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : places.length === 0 ? (
          <div className="text-sm text-neutral-600">No places found.</div>
        ) : (
          <div className="grid gap-3">
            {places.map((p) => {
              const name = p.tags?.name || (p as any)?.name || `Place #${p.id}`;
              const img = p.photos?.[0]?.preview;
              const isSel = !!selected[p.id];
              return (
                <label
                  key={p.id}
                  className={`flex w-full items-center gap-3 sm:gap-4 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer touch-manipulation min-h-[64px] border ring-2 ${
                    isSel ? 'bg-emerald-50 border-emerald-300 ring-emerald-200' : 'bg-white border-neutral-200 ring-transparent'
                  }`}
                  onClick={() => toggle(p.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSel}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(p.id); } }}
                >
                  {/* Left: image or initials */}
                  {img ? (
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-xl bg-neutral-100">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        unoptimized
                        sizes="48px"
                        className="object-cover"
                        priority={false}
                      />
                    </div>
                  ) : (
                    <InitialsAvatar name={name} />
                  )}

                  {/* Middle: name + area */}
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-900 font-semibold truncate text-sm sm:text-base">{name}</div>
                    {p.area ? (
                      <div className="text-xs sm:text-sm text-neutral-600 truncate">{p.area}</div>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Desktop action row */}
        <div className="mt-6 hidden sm:flex items-center justify-between">
          <button
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm ${
              anySelected
                ? "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
            }`}
            onClick={() => setSelected({})}
            disabled={!anySelected}
          >
            Clear
          </button>

          <div className="flex items-center gap-3">
          {(() => {
            const chosenIds = places.filter(p => !!selected[p.id]).map(p => p.id);
            const plan = chosenIds.join(',');
            const url = plan ? `/dashboard/map?plan=${encodeURIComponent(plan)}` : "/ai/continue";
            return (
              <Link href={url} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow bg-emerald-600 text-white">
                {anySelected ? `Continue (${selectedCount})` : 'Continue'}
              </Link>
            );
          })()}
          </div>
        </div>

        {/* Mobile sticky action bar */}
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-[2100] bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border-t border-black/10 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]"
          style={{
            paddingLeft: 'max(0.75rem, calc(env(safe-area-inset-left, 0px) + 0.75rem))',
            paddingRight: 'max(0.75rem, calc(env(safe-area-inset-right, 0px) + 0.75rem))',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          }}
        >
          <div className="mx-auto max-w-full sm:max-w-4xl pb-4">
            <div className="mb-2 h-0.5 w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow ${
                  anySelected
                    ? "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                    : "border border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                }`}
                onClick={() => setSelected({})}
                disabled={!anySelected}
              >
                Clear
              </button>
              <div className="col-span-1 flex items-center justify-end gap-2">
              {(() => {
                const chosenIds = places.filter(p => !!selected[p.id]).map(p => p.id);
                const plan = chosenIds.join(',');
                const url = plan ? `/dashboard/map?plan=${encodeURIComponent(plan)}` : "/ai/continue";
                return (
                  <Link href={url} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow bg-emerald-600 text-white">
                    {anySelected ? `Continue (${selectedCount})` : 'Continue'}
                  </Link>
                );
              })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
