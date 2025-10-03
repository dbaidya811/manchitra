"use client";

import React from "react";

/**
 * Global fetch spinner: shows a fullscreen subtle spinner when any fetch takes >400ms.
 * Auto-instruments window.fetch on the client to track in-flight requests.
 */
export function FetchSpinner() {
  const [visible, setVisible] = React.useState(false);
  const inflightRef = React.useRef(0);
  const timerRef = React.useRef<number | null>(null);
  const patchedRef = React.useRef(false);

  React.useEffect(() => {
    if (patchedRef.current) return;
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;
    patchedRef.current = true;

    const origFetch = window.fetch.bind(window);
    const start = () => {
      inflightRef.current++;
      if (timerRef.current != null) return;
      // Only show after a small delay to avoid flicker on fast calls
      timerRef.current = window.setTimeout(() => {
        if (inflightRef.current > 0) setVisible(true);
      }, 400);
    };
    const stop = () => {
      inflightRef.current = Math.max(0, inflightRef.current - 1);
      if (inflightRef.current === 0) {
        if (timerRef.current != null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setVisible(false);
      }
    };

    // Patch fetch
    (window as any).fetch = async (...args: any[]) => {
      try {
        start();
        const res = await origFetch(...args as any);
        return res;
      } finally {
        stop();
      }
    };

    return () => {
      try { (window as any).fetch = origFetch; } catch {}
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]" />
      {/* Spinner */}
      <div className="relative p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/80 border border-black/10 dark:border-white/10 shadow-2xl pointer-events-auto">
        <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
