"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/dashboard/user-profile";
import { ArrowLeft, Clock3, MapPin, Trash2, Search } from "lucide-react";

interface VisitItem {
  id: string | number | null;
  name: string;
  lat: number;
  lon: number;
  time: number; // epoch ms
}

export default function HistoryPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("visit-history");
      const arr: VisitItem[] = raw ? JSON.parse(raw) : [];
      // newest first
      arr.sort((a, b) => b.time - a.time);
      setVisits(arr);
    } catch {
      setVisits([]);
    }
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem("visit-history");
      setVisits([]);
    } catch {}
  };

  const openOnMap = (v: VisitItem) => {
    // Jump to map centered on this place
    router.push(`/dashboard/map?lat=${v.lat}&lon=${v.lon}`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter(v => (v.name || '').toLowerCase().includes(q));
  }, [visits, query]);

  // Group by local date string (e.g., "Today", "Yesterday", or date)
  const groups = useMemo(() => {
    const byDay: Record<string, VisitItem[]> = {};
    const today = new Date();
    const yday = new Date(Date.now() - 86400000);
    for (const v of filtered) {
      const d = new Date(v.time);
      const isToday = d.toDateString() === today.toDateString();
      const isYday = d.toDateString() === yday.toDateString();
      const key = isToday ? "Today" : isYday ? "Yesterday" : d.toLocaleDateString();
      (byDay[key] ||= []).push(v);
    }
    return Object.entries(byDay);
  }, [filtered]);

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-white/70 dark:bg-neutral-950/60 backdrop-blur-md px-4 md:px-6">
        <div className="flex items-center gap-3 md:flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-full"
            aria-label="Go back"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl font-bold text-transparent drop-shadow-sm">
            Manchitra
          </h1>
          <span className="hidden sm:inline text-sm font-semibold text-neutral-800 dark:text-neutral-100">· History</span>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <UserProfile />
        </div>
      </header>
      <main className="p-4 md:p-6">
        {/* Top bar: search + clear */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex items-center gap-2">
            {!confirming ? (
              <Button variant="outline" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Clear history
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700 dark:text-neutral-200">Confirm?</span>
                <Button size="sm" variant="destructive" onClick={() => { clearHistory(); setConfirming(false); }}>Yes</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>No</Button>
              </div>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 opacity-80" />
            <div className="text-sm text-neutral-600 dark:text-neutral-300">No history {query ? 'matching your search.' : 'yet.'}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([label, items]) => (
              <section key={label}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</h2>
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((v, i) => (
                    <li key={`${v.time}-${i}`} className="group rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 backdrop-blur p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                          {(v.name || 'P')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{v.name || `Place (${v.lat.toFixed(5)}, ${v.lon.toFixed(5)})`}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-neutral-600 dark:text-neutral-400">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {v.lat.toFixed(3)}, {v.lon.toFixed(3)}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {timeAgo(v.time)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" onClick={() => openOnMap(v)} className="rounded-full px-4">Open</Button>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
