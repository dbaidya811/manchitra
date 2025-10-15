"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import { useSession } from "next-auth/react";

function LoginBeep() {
  const { status } = useSession();
  const prevStatus = React.useRef<string | null>(null);

  React.useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;

    // Only play when transitioning into authenticated for the first time
    if (was && was !== "authenticated" && status === "authenticated") {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        // Two short tones: 440Hz (A) then 660Hz (E)
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + duration + 0.02);
        };

        playTone(440, 0, 0.12);
        playTone(660, 0.15, 0.12);

        // Auto close context after a short while to free resources
        setTimeout(() => {
          try { ctx.close(); } catch {}
        }, 600);
      } catch {
        // no-op if audio fails
      }
    }
  }, [status]);

  return null;
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={60} // Re-enable automatic refetch every 60 seconds for session updates
      refetchOnWindowFocus={true} // Re-enable to update session when window regains focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <LoginBeep />
      {children}
    </SessionProvider>
  );
}
