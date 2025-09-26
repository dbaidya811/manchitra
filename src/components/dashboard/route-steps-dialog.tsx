"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Navigation, Route as RouteIcon, Play, Pause, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface RouteStep {
  title: string;
  detail?: string;
}

interface RouteStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeName: string;
  steps: RouteStep[];
}

export function RouteStepsDialog({ open, onOpenChange, placeName, steps }: RouteStepsDialogProps) {
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Load a female-ish English voice
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || !voices.length) return;
      const pref = ['Google UK English Female', 'Microsoft Zira', 'Microsoft Aria', 'Samantha', 'Victoria', 'Google US English'];
      for (const name of pref) {
        const v = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()) && v.lang.toLowerCase().startsWith('en'));
        if (v) { voiceRef.current = v; return; }
      }
      const v2 = voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (v2) voiceRef.current = v2;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = () => pick();
    return () => { window.speechSynthesis.onvoiceschanged = null as any; };
  }, []);

  // Stop TTS on close/unmount
  useEffect(() => {
    if (!open) {
      try { window.speechSynthesis.cancel(); } catch {}
      setPlaying(false);
      setIdx(0);
    }
  }, [open]);

  const speak = (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1.0;
      u.pitch = 1.15;
      if (voiceRef.current) u.voice = voiceRef.current;
      if (onEnd) u.onend = onEnd;
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const playCurrent = () => {
    if (!steps || steps.length === 0) return;
    const current = steps[idx];
    const text = current.detail ? `${current.title}. ${current.detail}.` : current.title;
    // Speak only the current step and stop when it finishes (no auto-advance)
    speak(text, () => {
      setPlaying(false);
    });
  };

  const onPlayPause = () => {
    if (!playing) {
      setPlaying(true);
      playCurrent();
    } else {
      setPlaying(false);
      try { window.speechSynthesis.cancel(); } catch {}
    }
  };

  const onNext = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setIdx(i => Math.min(i + 1, Math.max(0, steps.length - 1)));
    if (playing) setTimeout(playCurrent, 50);
  };

  // If index changes while playing (manual), speak that step
  useEffect(() => {
    if (playing) playCurrent();
    // Scroll active item into view smoothly
    try {
      const el = itemRefs.current[idx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 text-lg">
            <span className="inline-flex items-center gap-2">
              <RouteIcon className="h-5 w-5 text-orange-500" />
              Route to {placeName}
            </span>
            <span className="inline-flex items-center gap-2">
              <button
                className={`h-9 w-9 inline-flex items-center justify-center rounded-full border ${playing ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-neutral-700'}`}
                onClick={onPlayPause}
                title={playing ? 'Pause voice' : 'Play voice'}
                aria-label={playing ? 'Pause voice' : 'Play voice'}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-full border bg-white text-neutral-700"
                onClick={onNext}
                title="Next step"
                aria-label="Next step"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div ref={listRef} className="max-h-80 overflow-auto pr-1">
            <ol className="space-y-4">
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1;
                const active = i === idx;
                return (
                  <li ref={(el) => { itemRefs.current[i] = el; }} key={i} className={`grid grid-cols-[24px_1fr] gap-3 transition-colors ${active ? 'bg-orange-100/70 rounded-lg p-3 border border-orange-200 ring-1 ring-orange-300/50' : ''}`}>
                    {/* Left timeline + number bubble */}
                    <div className="relative flex justify-center">
                      <span className={`z-10 inline-flex h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-orange-600 ring-2 ring-orange-200' : 'bg-orange-500'} text-white text-[10px] font-bold`}>
                        {i + 1}
                      </span>
                      {!isLast && (
                        <span className="pointer-events-none absolute top-5 bottom-[-14px] w-[2px] bg-orange-200" />
                      )}
                    </div>
                    {/* Step content */}
                    <div>
                      <div className={`font-semibold text-sm ${active ? 'text-orange-900' : 'text-foreground'}`}>{s.title}</div>
                      {s.detail && (
                        <div className={`text-xs mt-0.5 ${active ? 'text-orange-700' : 'text-muted-foreground'}`}>{s.detail}</div>
                      )}
                    </div>
                  </li>
                );
              })}
              {/* Arrival item */}
              <li className="grid grid-cols-[24px_1fr] gap-3">
                <div className="relative flex justify-center">
                  <span className="z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm">You have arrived at {placeName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5" /> Enjoy your visit!
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
