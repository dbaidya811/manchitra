"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/lib/types";

function InitialsAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = (name || "?").trim().split(/\s+/);
    const s = (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
    return s || "?";
  }, [name]);
  return (
    <div className="relative h-12 w-12 shrink-0 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center font-semibold">
      {initials}
    </div>
  );
}

export default function AISelectionPage() {
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

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Choose Places</h1>
          <p className="text-neutral-600">Select from your saved places to continue planning with AI.</p>
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
              const name = p.tags?.name || p.name || `Place #${p.id}`;
              const img = p.photos?.[0]?.preview;
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Left: image or initials */}
                  {img ? (
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <InitialsAvatar name={name} />
                  )}

                  {/* Middle: name + area */}
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-900 font-semibold truncate">{name}</div>
                    {p.area ? (
                      <div className="text-sm text-neutral-600 truncate">{p.area}</div>
                    ) : null}
                  </div>

                  {/* Right: checkbox */}
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-emerald-600 rounded"
                    checked={!!selected[p.id]}
                    onChange={() => toggle(p.id)}
                  />
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            onClick={() => setSelected({})}
          >
            Clear
          </button>

          <button
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow ${
              anySelected ? "bg-emerald-600 text-white" : "bg-neutral-300 text-neutral-700 cursor-not-allowed"
            }`}
            disabled={!anySelected}
            onClick={() => {
              const chosenIds = places.filter(p => !!selected[p.id]).map(p => p.id);
              if (chosenIds.length === 0) return;
              const plan = chosenIds.join(',');
              router.push(`/dashboard/map?plan=${encodeURIComponent(plan)}`);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
