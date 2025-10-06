export async function playLikeSound(durationMs: number = 180, freqHz: number = 880) {
  try {
    // 1) Try asset first (preferred): public/sound/b_tone.wav
    try {
      const a = new Audio('/sound/b_tone.wav');
      await a.play();
      return;
    } catch {}
    // 2) Fallback: Web Audio API beep (no asset needed)
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) { return; }
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqHz;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
    setTimeout(() => { try { ctx.close(); } catch {} }, durationMs + 120);
  } catch {}
}

export function playSaveSound() {
  return playLikeSound(160, 820);
}
