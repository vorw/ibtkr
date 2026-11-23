// Unpitched physical effects only: air, scissors, cloth and applause.
// No oscillators, notes, chimes, instruments or background music.
export function createOpeningAudio() {
  let context: AudioContext | null = null;
  function ready() {
    return context?.state === 'running' ? context : null;
  }
  function envelope(
    ctx: AudioContext,
    start: number,
    duration: number,
    level: number,
    attack = 0.006,
  ) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(ctx.destination);
    return gain;
  }
  function noise(
    ctx: AudioContext,
    start: number,
    duration: number,
    level: number,
    frequency: number,
    endFrequency = frequency,
    attack = 0.006,
    type: BiquadFilterType = 'bandpass',
  ) {
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duration),
      ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = envelope(ctx, start, duration, level, attack);
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + duration,
    );
    filter.Q.value = 0.35;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration);
  }
  return {
    async unlock() {
      // Called only from a pointer/keyboard/tap gesture, never on page load.
      try {
        const Audio =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Audio) return;
        context ??= new Audio();
        if (context.state === 'suspended') await context.resume();
      } catch {
        /* A browser/device audio restriction must not block the ceremony. */
      }
    },
    charge() {
      const ctx = ready();
      if (!ctx) return;
      const start = ctx.currentTime + 0.01;
      // A short dry metal scrape, like picking up a pair of scissors.
      noise(ctx, start, 0.23, 0.09, 2600, 1700, 0.025, 'highpass');
    },
    cut() {
      const ctx = ready();
      if (!ctx) return;
      const start = ctx.currentTime + 0.01;
      // Two blade contacts and a soft fabric tear, all broadband noise.
      noise(ctx, start, 0.065, 0.27, 3200, 3200, 0.004, 'highpass');
      noise(ctx, start + 0.065, 0.055, 0.19, 2400, 2400, 0.004, 'highpass');
      noise(ctx, start + 0.025, 0.24, 0.09, 1800, 950, 0.015, 'highpass');
    },
    reveal() {
      const ctx = ready();
      if (!ctx) return;
      const start = ctx.currentTime + 0.13;
      // Ribbon release / air, followed by a short irregular applause effect.
      noise(ctx, start, 0.72, 0.12, 1800, 4200, 0.15, 'lowpass');
      const claps = [
        0.11, 0.24, 0.4, 0.55, 0.73, 0.88, 1.07, 1.22, 1.42, 1.58, 1.78, 1.98,
      ];
      claps.forEach((delay, i) => {
        const level = (0.11 + (i % 3) * 0.018) * (1 - delay / 3.5);
        noise(
          ctx,
          start + delay,
          0.105,
          level,
          1500 + (i % 4) * 270,
          1500,
          0.003,
          'highpass',
        );
        noise(
          ctx,
          start + delay + 0.012,
          0.12,
          level * 0.45,
          1200,
          750,
          0.008,
          'lowpass',
        );
      });
    },
    dispose() {
      const old = context;
      context = null;
      if (old && old.state !== 'closed') void old.close().catch(() => {});
    },
  };
}
