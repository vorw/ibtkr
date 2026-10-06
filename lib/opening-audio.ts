// Small, locally synthesized effects. No downloads, tracking or background music.
export function createOpeningAudio() {
  let context: AudioContext | null = null;
  function ready() { return context?.state === 'running' ? context : null; }
  function envelope(ctx: AudioContext, start: number, duration: number, level: number) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(ctx.destination);
    return gain;
  }
  function snip(ctx: AudioContext, start: number, duration: number, level: number) {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = envelope(ctx, start, duration, level);
    filter.type = 'bandpass'; filter.frequency.value = 3200; filter.Q.value = 0.8;
    noise.buffer = buffer; noise.connect(filter); filter.connect(gain);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    noise.start(start); noise.stop(start + duration);
  }
  function tone(ctx: AudioContext, start: number, frequency: number, duration: number, level: number) {
    const oscillator = ctx.createOscillator();
    const gain = envelope(ctx, start, duration, level);
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.connect(gain);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + duration);
  }
  return {
    async unlock() {
      // Called only from a pointer/keyboard/tap gesture, never on page load.
      try {
        const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) return;
        context ??= new Audio();
        if (context.state === 'suspended') await context.resume();
      } catch { /* A browser/device audio restriction must not block the ceremony. */ }
    },
    cut() {
      const ctx = ready(); if (!ctx) return;
      const start = ctx.currentTime + 0.01;
      snip(ctx, start, 0.065, 0.25); snip(ctx, start + 0.07, 0.045, 0.16);
    },
    reveal() {
      const ctx = ready(); if (!ctx) return;
      const start = ctx.currentTime + 0.14;
      // A brief glassy success sparkle, ending within one second.
      tone(ctx, start, 1046.5, 0.42, 0.09);
      tone(ctx, start + 0.11, 1568, 0.48, 0.065);
      tone(ctx, start + 0.22, 2093, 0.55, 0.045);
    },
    dispose() { const old = context; context = null; if (old && old.state !== 'closed') void old.close().catch(() => {}); },
  };
}
