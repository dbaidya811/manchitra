"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { UserProfile } from "@/components/dashboard/user-profile";
import { ArrowLeft, Clock3, MapPin, Trash2, Search } from "lucide-react";

interface VisitItem {
  id: string | number | null;
  name: string;
  lat: number;
  lon: number;
  time: number; // epoch ms
  status?: 'visited' | 'not-visited';
}

interface SearchItem {
  name: string;
  lat: number;
  lon: number;
  time: number; // epoch ms
}

interface PlaceItem {
  lat: number;
  lon: number;
  name: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [searches, setSearches] = useState<SearchItem[]>([]);
  const [places, setPlaces] = useState<PlaceItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("visit-history");
      const arrRaw: any[] = raw ? JSON.parse(raw) : [];
      // normalize legacy entries to have a status (default visited)
      const arr: VisitItem[] = arrRaw.map((e) => ({
        id: e.id ?? null,
        name: typeof e.name === 'string' ? e.name : 'Destination',
        lat: Number(e.lat),
        lon: Number(e.lon),
        time: Number(e.time) || Date.now(),
        status: e.status === 'not-visited' ? 'not-visited' : 'visited',
      }));
      // newest first
      arr.sort((a, b) => b.time - a.time);
      setVisits(arr);
    } catch {
      setVisits([]);
    }
    try {
      const rawS = localStorage.getItem("search-history");
      const arrS: SearchItem[] = rawS ? JSON.parse(rawS) : [];
      arrS.sort((a, b) => b.time - a.time);
      setSearches(arrS);
    } catch {
      setSearches([]);
    }
  }, []);

  // Load places to resolve names for visits by coordinate proximity
  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const res = await fetch('/api/places', { cache: 'no-store' });
        const data = await res.json();
        const list: any[] = Array.isArray(data?.places) ? data.places : [];
        const out: PlaceItem[] = [];
        for (const p of list) {
          let lat: number | null = null, lon: number | null = null;
          if (typeof p.lat === 'number' && typeof p.lon === 'number') { lat = p.lat; lon = p.lon; }
          else if (typeof p.location === 'string' && p.location.includes(',')) {
            const parts = p.location.split(',').map((s: string) => s.trim());
            const a = parseFloat(parts[0] || ''), b = parseFloat(parts[1] || '');
            if (!Number.isNaN(a) && !Number.isNaN(b)) {
              if (Math.abs(a) <= 90 && Math.abs(b) <= 180) { lat = a; lon = b; }
              else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) { lat = b; lon = a; }
            }
          }
          if (lat == null || lon == null) continue;
          const name: string = (p?.tags?.name || p?.name || 'Place');
          out.push({ lat, lon, name });
        }
        if (!stopped) setPlaces(out);
      } catch {
        if (!stopped) setPlaces([]);
      }
    })();
    return () => { stopped = true; };
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem("visit-history");
      setVisits([]);
    } catch {}
  };

  // Swipeable row: swipe from right to left to delete
  const SwipeableRow: React.FC<{ onDelete: () => void; children: React.ReactNode }> = ({ onDelete, children }) => {
    const [dx, setDx] = useState(0);
    const [startX, setStartX] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const [removing, setRemoving] = useState(false);
    const threshold = 80; // px to trigger delete on left-swipe

    const onStart = (clientX: number) => { setStartX(clientX); setDragging(true); };
    const onMove = (clientX: number) => {
      if (!dragging || startX == null) return;
      const delta = clientX - startX; // left swipe => negative
      setDx(Math.min(0, delta));
    };
    const onEnd = () => {
      if (!dragging) return;
      setDragging(false);
      if (dx <= -threshold) {
        setRemoving(true);
        setTimeout(() => onDelete(), 220);
      } else {
        setDx(0);
      }
    };

    return (
      <div
        className="relative overflow-hidden"
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => dragging && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={() => dragging && onEnd()}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
      >
        {/* Delete background (on right side) */}
        <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500/90 text-white">
          <span className="text-sm font-semibold">Delete</span>
        </div>
        {/* Foreground content */}
        <div className="transition-[transform,opacity] duration-200" style={{ transform: `translateX(${removing ? '-110%' : dx + 'px'})`, opacity: removing ? 0.15 : 1 }}>
          {children}
        </div>
      </div>
    );
  };

  const openOnMap = (v: VisitItem) => {
    // Jump to map centered on this place
    router.push(`/dashboard/map?lat=${v.lat}&lon=${v.lon}`);
  };

  // Remove a visit entry
  const deleteVisit = (v: VisitItem) => {
    try {
      const raw = localStorage.getItem("visit-history");
      const arrRaw: any[] = raw ? JSON.parse(raw) : [];
      const filteredRaw = arrRaw.filter((e) => {
        const sameTime = Number(e.time) === v.time;
        const sameCoords = Number(e.lat) === v.lat && Number(e.lon) === v.lon;
        if (v.time) return !(sameTime && sameCoords);
        return !sameCoords;
      });
      localStorage.setItem("visit-history", JSON.stringify(filteredRaw));
    } catch {}
    setVisits(prev => prev.filter(x => !(x.time === v.time && x.lat === v.lat && x.lon === v.lon)));
  };

  // Haversine distance in meters
  const haversineM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const la1 = toRad(a.lat);
    const la2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // Resolve best name for a visit using nearby place from DB
  const resolveName = (v: VisitItem): string => {
    const thresholdM = 50; // within 50m => same place
    let best: PlaceItem | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of places) {
      const d = haversineM({ lat: v.lat, lon: v.lon }, { lat: p.lat, lon: p.lon });
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && bestD <= thresholdM) return best.name;
    // Fallback: use stored name if it isn't the generic placeholder
    if (v.name && v.name.toLowerCase() !== 'destination') return v.name;
    return 'Place';
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter(v => (resolveName(v) || '').toLowerCase().includes(q));
  }, [visits, query, places]);

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

  const isSearchVisited = (s: SearchItem) => {
    const thresholdM = 100; // within 100m counts as visited
    // Only count entries actually marked as visited (arrived via navigation)
    return visits.some(v => v.status === 'visited' && haversineM({ lat: s.lat, lon: s.lon }, { lat: v.lat, lon: v.lon }) <= thresholdM);
  };

  const filteredSearches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searches;
    return searches.filter(s => (s.name || '').toLowerCase().includes(q));
  }, [searches, query]);
  const visitedSearches = useMemo(() => filteredSearches.filter(isSearchVisited), [filteredSearches, isSearchVisited]);
  const notVisitedSearches = useMemo(() => filteredSearches.filter(s => !isSearchVisited(s)), [filteredSearches, isSearchVisited]);

  return (
    <div className="relative w-screen max-w-[100vw] overflow-x-hidden min-h-[100svh] bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
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
      <main className="w-full p-4 md:p-6 pb-8">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-2 rounded-full h-9 pl-2 pr-3 border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 hover:bg-white/90 dark:hover:bg-neutral-900/70 shadow-sm transition"
              >
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">Clear history</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-amber-50/80 dark:bg-neutral-800/60 px-3 py-1.5 border border-amber-200/60 dark:border-neutral-700 shadow-sm">
                <span className="text-sm text-amber-900 dark:text-neutral-200">Confirm?</span>
                <Button size="sm" variant="destructive" className="rounded-full h-8 px-3" onClick={() => { clearHistory(); setConfirming(false); }}>Yes</Button>
                <Button size="sm" variant="outline" className="rounded-full h-8 px-3" onClick={() => setConfirming(false)}>No</Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Visits section (only if any) */}
          {filtered.length > 0 && (
            <>
              {groups.map(([label, items]) => (
                <section key={label}>
                  <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</h2>
                  <ol className="space-y-3">
                    {items.map((v, i) => (
                      <li key={`${v.time}-${i}`} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-neutral-900/60 p-3 sm:p-4 shadow-sm hover:shadow-md active:shadow transition">
                        <div className="flex items-start gap-3">
                          <Image src="/favicon.png" alt="Place" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-[14px] font-semibold text-neutral-900 dark:text-neutral-100 max-w-[75%]">{resolveName(v)}</div>
                              {/* Status tag based on entry status */}
                              {v.status === 'not-visited' ? (
                                <span className="shrink-0 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[11px] font-semibold">Not-Visited</span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold">Visited</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-[12px] text-neutral-600 dark:text-neutral-400">
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {v.lat.toFixed(3)}, {v.lon.toFixed(3)}</span>
                              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {timeAgo(v.time)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" onClick={() => openOnMap(v)} className="rounded-full h-8 px-3 sm:h-9 sm:px-4">Open</Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </>
          )}

          {/* 3-column Search History: All | Visited | Not-Visited (visible independently) */}
          {filteredSearches.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Search History</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* All */}
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-3">
                    <div className="mb-2 text-sm font-semibold">All</div>
                    <ol className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                      {filteredSearches.map((s, i) => {
                        const visited = isSearchVisited(s);
                        return (
                          <li key={`all-${s.time}-${i}`} className="rounded-xl border border-black/5 dark:border-white/5 p-2">
                            <div className="flex items-start gap-2">
                              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-[12px] font-bold">
                                {(s.name || 'S')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2"><div className="truncate text-sm font-medium">{s.name}</div>
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${visited ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{visited ? 'Visited' : 'Not-Visited'}</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.lat.toFixed(3)}, {s.lon.toFixed(3)}</span>
                                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {timeAgo(s.time)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end"><Button size="sm" onClick={() => router.push(`/dashboard/map?lat=${s.lat}&lon=${s.lon}`)} className="rounded-full px-3 py-1 h-7">Open</Button></div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  {/* Visited */}
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-3">
                    <div className="mb-2 text-sm font-semibold">Visited</div>
                    {visitedSearches.length === 0 ? (
                      <div className="text-sm text-neutral-500">No visited searches</div>
                    ) : (
                      <ol className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                        {visitedSearches.map((s, i) => (
                          <li key={`vis-${s.time}-${i}`} className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-2">
                            <div className="flex items-start gap-2">
                              <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[12px] font-bold">
                                {(s.name || 'S')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2"><div className="truncate text-sm font-medium">{s.name}</div>
                                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-emerald-200">Visited</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.lat.toFixed(3)}, {s.lon.toFixed(3)}</span>
                                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {timeAgo(s.time)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end"><Button size="sm" onClick={() => router.push(`/dashboard/map?lat=${s.lat}&lon=${s.lon}`)} className="rounded-full px-3 py-1 h-7">Open</Button></div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  {/* Not-Visited */}
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-3">
                    <div className="mb-2 text-sm font-semibold">Not-Visited</div>
                    {notVisitedSearches.length === 0 ? (
                      <div className="text-sm text-neutral-500">No not-visited searches</div>
                    ) : (
                      <ol className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                        {notVisitedSearches.map((s, i) => (
                          <li key={`nvis-${s.time}-${i}`} className="rounded-xl border border-red-200/60 bg-red-50/40 p-2">
                            <div className="flex items-start gap-2">
                              <div className="h-8 w-8 shrink-0 rounded-lg bg-red-500 text-white flex items-center justify-center text-[12px] font-bold">
                                {(s.name || 'S')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2"><div className="truncate text-sm font-medium">{s.name}</div>
                                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 border-red-200">Not-Visited</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.lat.toFixed(3)}, {s.lon.toFixed(3)}</span>
                                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {timeAgo(s.time)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end"><Button size="sm" onClick={() => router.push(`/dashboard/map?lat=${s.lat}&lon=${s.lon}`)} className="rounded-full px-3 py-1 h-7">Open</Button></div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
              </div>
            </section>
          )}

          {/* Overall empty state only if both are empty */}
          {filtered.length === 0 && filteredSearches.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 opacity-80" />
              <div className="text-sm text-neutral-600 dark:text-neutral-300">No history {query ? 'matching your search.' : 'yet.'}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}





