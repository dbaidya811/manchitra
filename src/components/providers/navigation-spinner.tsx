"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A minimal top progress bar inspired by GitHub/Google sign-in flows.
// Shows on route changes and hides with a small delay for a smooth finish.
export function NavigationSpinner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const startTimer = useRef<any>(null);
  const doneTimer = useRef<any>(null);

  // Combine into a single key to detect navigation changes (pathname or query changes)
  const navKey = useMemo(() => `${pathname}?${searchParams?.toString() || ""}`, [pathname, searchParams]);

  useEffect(() => {
    // Start the bar shortly after a navigation begins (debounce tiny changes)
    if (startTimer.current) clearTimeout(startTimer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);
    setFinishing(false);
    startTimer.current = setTimeout(() => setVisible(true), 50);

    // Ensure the bar completes even for fast navigations
    doneTimer.current = setTimeout(() => {
      setFinishing(true);
      // allow the finishing animation to play before hiding
      setTimeout(() => setVisible(false), 350);
    }, 1200);

    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [navKey]);

  // Optionally, show briefly on first mount (useful for OAuth callback landings)
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setVisible(true), 0);
    const d = setTimeout(() => {
      setFinishing(true);
      setTimeout(() => setVisible(false), 350);
    }, 700);
    return () => { clearTimeout(t); clearTimeout(d); };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes nprog-slide {
          0% { transform: translateX(-40%); }
          50% { transform: translateX(20%); }
          100% { transform: translateX(100%); }
        }
        @keyframes nprog-pulse {
          0% { opacity: .7; }
          50% { opacity: 1; }
          100% { opacity: .7; }
        }
      `}</style>
      <div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-[9999] h-[3px]"
        style={{
          background: "linear-gradient(90deg, rgba(59,130,246,0.0) 0%, rgba(59,130,246,0.35) 50%, rgba(59,130,246,0.0) 100%)",
          boxShadow: "0 0 12px rgba(59,130,246,0.45)",
        }}
      >
        <div
          className="h-full w-1/3"
          style={{
            background: finishing
              ? "linear-gradient(90deg, #22c55e 0%, #86efac 100%)"
              : "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
            animation: `nprog-slide ${finishing ? 0.35 : 0.9}s ease-in-out ${finishing ? 1 : 'infinite'}, nprog-pulse 1.2s ease-in-out infinite`,
          }}
        />
      </div>
    </>
  );
}
