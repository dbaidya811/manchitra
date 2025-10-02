"use client";

import React, { useEffect, useState } from "react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      // If already consented, do not show
      const ls = typeof window !== "undefined" ? localStorage.getItem("cookie_consent") : null;
      const ck = typeof document !== "undefined" ? document.cookie.includes("cookie_consent=accepted") : false;
      if (!ls && !ck) setVisible(true);
      setMounted(true);
    } catch {
      setVisible(true);
      setMounted(true);
    }
  }, []);

  const accept = () => {
    try {
      // Persist in cookie (1 year) and localStorage
      document.cookie = `cookie_consent=accepted; max-age=${60 * 60 * 24 * 365}; path=/`;
      localStorage.setItem("cookie_consent", "accepted");
    } catch {}
    setVisible(false);
  };

  const decline = () => {
    try {
      document.cookie = `cookie_consent=declined; max-age=${60 * 60 * 24 * 365}; path=/`;
      localStorage.setItem("cookie_consent", "declined");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[5000] px-3 pb-[max(12px,calc(env(safe-area-inset-bottom,0px)+12px))]">
      <div
        className={[
          "mx-auto w-full max-w-[92vw] sm:max-w-2xl",
          "rounded-[22px] border border-black/10 dark:border-white/10",
          "bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl",
          "shadow-[0_20px_60px_rgba(0,0,0,0.25)] ring-1 ring-white/30 dark:ring-white/10",
          "transition-all duration-300 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        ].join(" ")}
      >
        <div className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
          {/* Icon */}
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md cc-float">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M20 12a8 8 0 1 1-9.8-7.84 1 1 0 0 1 1.14.72A2.5 2.5 0 0 0 13.75 7 2.5 2.5 0 0 0 16 9.25 2.5 2.5 0 0 0 18.75 12 1.25 1.25 0 0 0 20 13.25 1.25 1.25 0 0 0 21.25 12c0-.44-.09-.86-.25-1.25A8 8 0 0 1 20 12Z" />
            </svg>
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] sm:text-sm leading-snug text-neutral-800 dark:text-neutral-200">
              We use cookies to improve your experience, analyze traffic, and remember preferences. By clicking Accept, you consent to our use of cookies.
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400">
              You can change your choice anytime in your browser settings.
            </div>
          </div>
          {/* Actions */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={decline}
              className="rounded-full border border-black/10 dark:border-white/10 text-[12px] sm:text-sm font-semibold px-3 py-1.5 sm:px-4 sm:py-2 text-neutral-800 dark:text-neutral-100 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 backdrop-blur"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="rounded-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-white text-[12px] sm:text-sm font-semibold px-3 py-1.5 sm:px-4 sm:py-2 shadow-md cc-pulse"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
      {/* Local animations (scoped) */}
      <style jsx>{`
        @keyframes cc-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .cc-float { animation: cc-float 3s ease-in-out infinite; }
        @keyframes cc-pulse {
          0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
        .cc-pulse:hover { animation: cc-pulse 1.2s ease-out; }
      `}</style>
    </div>
  );
}
