// Layered ceremony effects, synthesized locally without background music.
export function createOpeningAudio() {
  let context: AudioContext | null = null;
  function ready() { return context?.state === 'running' ? context : null; }
  function envelope(ctx: AudioContext, start: number, duration: number, level: number, attack = 0.006) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(ctx.destination);
    return gain;
  }
  function noise(ctx: AudioContext, start: number, duration: number, level: number, frequency: number, endFrequency = frequency, attack = 0.006, type: BiquadFilterType = 'bandpass') {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = envelope(ctx, start, duration, level, attack);
    filter.type = type; filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);filter.Q.value = 0.7;
    source.buffer = buffer; source.connect(filter); filter.connect(gain);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(start); source.stop(start + duration);
  }
  function tone(ctx: AudioContext, start: number, frequency: number, duration: number, level: number, endFrequency = frequency, type: OscillatorType = 'sine') {
    const oscillator = ctx.createOscillator();
    const gain = envelope(ctx, start, duration, level);
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
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
    charge() {
      const ctx = ready(); if (!ctx) return;
      const start = ctx.currentTime + 0.01;
      // A rising breath as the scissors are picked up; no continuing loop.
      noise(ctx, start, 0.52, 0.09, 450, 4800, 0.25, 'lowpass');
      tone(ctx, start, 85, 0.48, 0.045, 160, 'triangle');
    },
    cut() {
      const ctx = ready(); if (!ctx) return;
      const start = ctx.currentTime + 0.01;
      // Metallic snip, tactile pop and a short bright confirmation.
      noise(ctx, start, 0.075, 0.28, 3600);noise(ctx, start + 0.075, 0.055, 0.20, 2400);
      tone(ctx, start + 0.025, 180, 0.16, 0.11, 55);
      noise(ctx, start + 0.035, 0.32, 0.07, 2400, 900, 0.025, 'highpass');
      tone(ctx, start + 0.12, 1820, 0.62, 0.055);
      tone(ctx, start + 0.12, 2873, 0.45, 0.023);
    },
    reveal() {
      const ctx = ready(); if (!ctx) return;
      const start = ctx.currentTime + 0.16;
      // Confetti cannon, warm impact, sweeping air and scattered glass sparkles.
      noise(ctx, start, 0.18, 0.30, 1700, 420, 0.008, 'lowpass');
      tone(ctx, start, 130, 0.70, 0.16, 38);
      tone(ctx, start + 0.02, 68, 0.95, 0.075, 31);
      noise(ctx, start + 0.05, 1.25, 0.10, 900, 6500, 0.28, 'bandpass');
      const sparkles=[2280,3467,2711,4183,3109,4871];
      sparkles.forEach((frequency,i)=>{
        const delay=[0.12,0.26,0.43,0.67,0.91,1.22][i];
        tone(ctx, start + delay, frequency, 1.15 - i * 0.065, 0.037 - i * 0.003);
        tone(ctx, start + delay + 0.08, frequency * 1.414, 0.7, 0.012);
      });
    },
    dispose() { const old = context; context = null; if (old && old.state !== 'closed') void old.close().catch(() => {}); },
  };
}
