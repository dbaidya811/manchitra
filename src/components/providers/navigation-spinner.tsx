"use client";

import React from "react";
import { usePathname } from "next/navigation";

/**
 * Global navigation spinner: shows on internal link clicks (and router navigations)
 * if the new page takes a moment to render. Hides when pathname changes.
 */
export function NavigationSpinner() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);

  const showLater = React.useCallback(() => {
    if (timerRef.current != null) return;
    timerRef.current = window.setTimeout(() => setVisible(true), 250);
  }, []);

  const hideNow = React.useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  // Hide when route actually changes
  React.useEffect(() => {
    hideNow();
    // no cleanup needed here
  }, [pathname, hideNow]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      try {
        if (e.defaultPrevented) return;
        // Left-click only
        if (e.button !== 0) return;
        // Ignore with modifier keys
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // Find anchor
        let el = e.target as HTMLElement | null;
        while (el && el.tagName !== 'A') el = el.parentElement;
        const a = el as HTMLAnchorElement | null;
        if (!a) return;
        if (a.target && a.target !== "") return; // opening new tab or frame
        const href = a.getAttribute('href') || '';
        if (!href) return;
        // Internal navigation only
        const isInternal = href.startsWith('/') && !href.startsWith('//');
        if (!isInternal) return;
        // If navigating to the same path, ignore
        if (href === pathname) return;
        showLater();
      } catch {}
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pathname, showLater]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]" />
      <div className="relative p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/80 border border-black/10 dark:border-white/10 shadow-2xl pointer-events-auto">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
