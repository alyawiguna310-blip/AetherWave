// AetherWave visual engine helpers.
// Everything here is pure (no React) so it can be tested on its own.

export const BAR_COUNT = 56;
export const SYSTEM_FFT_SIZE = 2048;
export const SYSTEM_SAMPLE_RATE = 16000;

const MIN_HZ = 40;

/* ------------------------------------------------------------------ */
/* Colour helper                                                       */
/* ------------------------------------------------------------------ */

/** Turns "#rgb" / "#rrggbb" into rgba(). Falls back to the raw colour. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ------------------------------------------------------------------ */
/* Analyser (local files) -> bars                                      */
/* ------------------------------------------------------------------ */

/**
 * Maps linear FFT bins onto log-spaced bars. The old code sampled bins
 * linearly, so ~80% of the bars showed treble that most songs barely have.
 */
export function analyserToBars(
  data: Uint8Array,
  sampleRate: number,
  count = BAR_COUNT,
  out: number[] = new Array(count).fill(0),
): number[] {
  const nyquist = sampleRate / 2;
  const maxHz = Math.min(16000, nyquist * 0.95);
  const binHz = nyquist / data.length;
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    const loBin = (MIN_HZ * Math.pow(maxHz / MIN_HZ, t0)) / binHz;
    const hiBin = (MIN_HZ * Math.pow(maxHz / MIN_HZ, t1)) / binHz;
    let v: number;
    if (hiBin - loBin < 1) {
      // Narrower than one bin (bass): interpolate instead of repeating bins.
      const pos = Math.min(data.length - 2, (loBin + hiBin) / 2);
      const a = Math.floor(pos);
      v = data[a] + (data[a + 1] - data[a]) * (pos - a);
    } else {
      const a = Math.floor(loBin);
      const b = Math.min(data.length - 1, Math.ceil(hiBin));
      let sum = 0;
      let peak = 0;
      for (let k = a; k <= b; k++) { sum += data[k]; if (data[k] > peak) peak = data[k]; }
      // Blend of average and peak keeps treble lively without being spiky.
      v = (sum / (b - a + 1)) * 0.6 + peak * 0.4;
    }
    // Gentle tilt: music rolls off ~3-4 dB/oct, so lift the top end.
    const tilt = 1 + 0.55 * t0;
    out[i] = Math.min(1, Math.max(0, (v / 255) * tilt));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* WASAPI loopback PCM -> bars                                         */
/* ------------------------------------------------------------------ */

/** Hann-windowed FFT of the ring buffer, log-spaced bars, dB scaled. */
export function calculateSystemSpectrum(buffer: Float32Array, writeIndex: number): number[] {
  const size = SYSTEM_FFT_SIZE;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const sample = buffer[(writeIndex + i) % size] ?? 0;
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    real[i] = sample * hann;
  }
  let j = 0;
  for (let i = 1; i < size; i++) {
    let bit = size >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let wr = 1, wi = 0;
      const half = length >> 1;
      for (let k = 0; k < half; k++) {
        const even = start + k, odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr; imag[odd] = imag[even] - ti;
        real[even] += tr; imag[even] += ti;
        const nextWr = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal; wr = nextWr;
      }
    }
  }
  const bars: number[] = [];
  const maxHz = SYSTEM_SAMPLE_RATE / 2 * 0.98;
  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const t = bar / BAR_COUNT;
    const lowHz = MIN_HZ * Math.pow(maxHz / MIN_HZ, t);
    const highHz = MIN_HZ * Math.pow(maxHz / MIN_HZ, (bar + 1) / BAR_COUNT);
    const first = Math.max(1, Math.floor((lowHz * size) / SYSTEM_SAMPLE_RATE));
    const last = Math.min(size / 2, Math.max(first + 1, Math.ceil((highHz * size) / SYSTEM_SAMPLE_RATE)));
    let power = 0, bins = 0;
    for (let bin = first; bin < last; bin++) { power += real[bin] * real[bin] + imag[bin] * imag[bin]; bins++; }
    const magnitude = bins ? Math.sqrt(power / bins) / size : 0;
    // dB scale (-78 dB floor .. -18 dB ceiling) reads far more naturally than sqrt(x).
    const db = 20 * Math.log10(magnitude + 1e-9) + 10 * t; // +10 dB tilt toward treble
    bars.push(Math.min(1, Math.max(0, (db + 78) / 60)));
  }
  return bars;
}

/* ------------------------------------------------------------------ */
/* Smoothing: fast attack, slow decay, falling peak caps               */
/* ------------------------------------------------------------------ */

export class LevelSmoother {
  readonly levels = new Float32Array(BAR_COUNT);
  readonly peaks = new Float32Array(BAR_COUNT);
  private vel = new Float32Array(BAR_COUNT);

  reset() { this.levels.fill(0); this.peaks.fill(0); this.vel.fill(0); }

  /** dt in seconds. Frame-rate independent. */
  update(target: ArrayLike<number>, dt: number) {
    dt = Math.min(0.1, Math.max(0.001, dt));
    const attack = 1 - Math.exp(-dt / 0.03);
    const decay = 1 - Math.exp(-dt / 0.16);
    for (let i = 0; i < BAR_COUNT; i++) {
      const t = target[i] ?? 0;
      const l = this.levels[i];
      this.levels[i] = l + (t - l) * (t > l ? attack : decay);
      if (this.levels[i] >= this.peaks[i]) {
        this.peaks[i] = this.levels[i];
        this.vel[i] = 0;
      } else {
        this.vel[i] += 2.2 * dt;               // gravity
        this.peaks[i] = Math.max(this.levels[i], this.peaks[i] - this.vel[i] * dt);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Simulated spectrum (YouTube iframe audio can't be analysed)         */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Beat-synced fake spectrum. Each video gets its own tempo + character from a
 * hash of its id, with kick on the beat, snare on 2 & 4, hats on 8ths and
 * slowly drifting "sections", so it stops looking like one fixed bell curve.
 */
export class SimulatedSpectrum {
  private seed = 1;
  private bpm = 110;
  private phases = new Float32Array(BAR_COUNT);
  private speeds = new Float32Array(BAR_COUNT);
  private out: number[] = new Array(BAR_COUNT).fill(0);
  private t0 = 0;

  setSeed(id: string) {
    this.seed = hashString(id || "aetherwave");
    this.bpm = 84 + (this.seed % 56);                 // 84..139 BPM
    let s = this.seed;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < BAR_COUNT; i++) {
      this.phases[i] = rnd() * Math.PI * 2;
      this.speeds[i] = 1.2 + rnd() * 3.2;
    }
    this.t0 = 0;
  }

  frame(nowMs: number): number[] {
    if (!this.t0) this.t0 = nowMs;
    const t = (nowMs - this.t0) / 1000;
    const beatLen = 60 / this.bpm;
    const beatPos = t / beatLen;
    const inBeat = beatPos % 1;
    const bar = Math.floor(beatPos / 4);
    const beatIdx = Math.floor(beatPos) % 4;

    const kick = Math.pow(Math.max(0, 1 - inBeat * 2.6), 2.2);                     // every beat
    const snare = (beatIdx === 1 || beatIdx === 3) ? Math.pow(Math.max(0, 1 - inBeat * 3.2), 2) : 0;
    const hat = Math.pow(Math.max(0, 1 - ((beatPos * 2) % 1) * 3.8), 2);           // 8th notes
    const energy = 0.72 + 0.28 * Math.sin(bar * 0.9 + (this.seed % 7)) * Math.sin(t / 11 + 1); // sections

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = i / (BAR_COUNT - 1);
      // Natural spectral tilt: strong bass, steadily weaker highs (but never dead).
      const base = 0.55 * Math.pow(1 - x, 1.3) + 0.2;
      const kickBand = Math.exp(-Math.pow((x - 0.06) / 0.1, 2)) * kick * 0.75;
      const snareBand = Math.exp(-Math.pow((x - 0.42) / 0.2, 2)) * snare * 0.55;
      const hatBand = Math.exp(-Math.pow((x - 0.85) / 0.17, 2)) * hat * 0.5;
      // Per-bar smooth jitter so neighbouring bars aren't clones.
      const wob =
        0.5 + 0.5 * Math.sin(t * this.speeds[i] + this.phases[i]) * Math.sin(t * 0.7 * this.speeds[i] + i);
      const level = (base * (0.55 + 0.45 * wob) + kickBand + snareBand + hatBand) * energy;
      this.out[i] = Math.min(1, Math.max(0.02, level));
    }
    return this.out;
  }
}

/* ------------------------------------------------------------------ */
/* Idle breathing                                                      */
/* ------------------------------------------------------------------ */

export function idleLevels(now: number, out: number[] = new Array(BAR_COUNT).fill(0)): number[] {
  for (let i = 0; i < BAR_COUNT; i++) {
    const base = 0.018 + Math.abs(Math.sin(i * 0.43) * 0.022 + Math.sin(i * 0.16) * 0.012);
    out[i] = base + Math.abs(Math.sin(now / 2200 + i * 0.3)) * 0.028;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

export function drawBars(
  ctx: Ctx, width: number, height: number,
  levels: ArrayLike<number>, peaks: ArrayLike<number>,
  accent: string, dpr: number, active: boolean,
) {
  const count = BAR_COUNT;
  const gap = Math.max(2 * dpr, width * 0.004);
  const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
  const mid = height / 2;
  const radius = Math.min(barWidth / 2, 3 * dpr);

  // One shared symmetric gradient (bright in the middle, soft at the tips)
  // instead of 56 gradients per frame.
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, withAlpha(accent, 0.35));
  grad.addColorStop(0.5, withAlpha(accent, 1));
  grad.addColorStop(1, withAlpha(accent, 0.35));
  ctx.fillStyle = grad;
  ctx.globalAlpha = active ? 0.95 : 0.38;

  for (let i = 0; i < count; i++) {
    const h = Math.max(2 * dpr, levels[i] * height * 0.9);
    const x = i * (barWidth + gap);
    ctx.beginPath();
    ctx.roundRect(x, mid - h / 2, barWidth, h, radius);
    ctx.fill();
  }

  if (active) {
    // Falling peak caps
    ctx.fillStyle = withAlpha(accent, 0.9);
    ctx.globalAlpha = 0.8;
    const capH = Math.max(2, 2 * dpr);
    for (let i = 0; i < count; i++) {
      const x = i * (barWidth + gap);
      const ph = peaks[i] * height * 0.9;
      if (ph < 6 * dpr) continue;
      ctx.fillRect(x, mid - ph / 2 - capH * 1.6, barWidth, capH);
      ctx.fillRect(x, mid + ph / 2 + capH * 0.6, barWidth, capH);
    }
  }
  ctx.globalAlpha = 1;
}

/** Smooth mirrored waveform ribbon built from the spectrum envelope. */
export function drawWave(
  ctx: Ctx, width: number, height: number,
  levels: ArrayLike<number>, accent: string, active: boolean, now: number,
) {
  const n = BAR_COUNT;
  const cy = height / 2;
  const amp = height * 0.46;
  const ripple = active ? Math.sin(now / 240) * 0.04 : 0;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push((i / (n - 1)) * width);
    const wobble = Math.sin(i * 0.9 + now / 180) * (active ? 0.12 : 0.02);
    ys.push(Math.max(1, levels[i] * amp * (1 + wobble + ripple)));
  }
  const path = (sign: 1 | -1) => {
    ctx.moveTo(xs[0], cy + sign * ys[0]);
    for (let i = 1; i < n - 1; i++) {
      const mx = (xs[i] + xs[i + 1]) / 2;
      const my = cy + sign * (ys[i] + ys[i + 1]) / 2;
      ctx.quadraticCurveTo(xs[i], cy + sign * ys[i], mx, my);
    }
    ctx.lineTo(xs[n - 1], cy + sign * ys[n - 1]);
  };

  // Filled body
  const fill = ctx.createLinearGradient(0, cy - amp, 0, cy + amp);
  fill.addColorStop(0, withAlpha(accent, 0.05));
  fill.addColorStop(0.5, withAlpha(accent, active ? 0.35 : 0.12));
  fill.addColorStop(1, withAlpha(accent, 0.05));
  ctx.beginPath();
  path(1);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], cy - ys[i]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 1;
  ctx.fill();

  // Glowing edges
  ctx.lineWidth = active ? 2.2 : 1.2;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = active ? 10 : 0;
  ctx.globalAlpha = active ? 0.95 : 0.35;
  ctx.beginPath(); path(1); ctx.stroke();
  ctx.beginPath(); path(-1); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export function drawCircle(
  ctx: Ctx, width: number, height: number,
  levels: ArrayLike<number>, accent: string, active: boolean, now: number,
) {
  const cx = width / 2, cy = height / 2;
  const maxR = Math.min(cx, cy) * 0.86;
  const bass = (levels[1] + levels[2] + levels[3] + levels[4]) / 4;
  const baseR = maxR * (0.34 + (active ? bass * 0.08 : 0));
  const spin = (now / 4000) * Math.PI * 2 * 0.08;

  const glow = ctx.createRadialGradient(cx, cy, baseR * 0.6, cx, cy, maxR);
  glow.addColorStop(0, withAlpha(accent, active ? 0.18 + bass * 0.2 : 0.06));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.fill();

  // Mirror the spectrum left/right so the ring is symmetric and seamless
  // (bass at the bottom, treble at the top) instead of a hard seam at 12 o'clock.
  const half = BAR_COUNT;
  const total = half * 2;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, ((Math.PI * 2 * baseR) / total) * 0.55);
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = active ? 6 : 0;
  for (let k = 0; k < total; k++) {
    const idx = k < half ? k : total - 1 - k;
    const level = levels[idx];
    const angle = (k / total) * Math.PI * 2 + Math.PI / 2 + spin;
    const len = Math.max(1.5, level * (maxR - baseR));
    ctx.globalAlpha = active ? 0.45 + level * 0.55 : 0.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * baseR, cy + Math.sin(angle) * baseR);
    ctx.lineTo(cx + Math.cos(angle) * (baseR + len), cy + Math.sin(angle) * (baseR + len));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = active ? 0.9 : 0.25;
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(cx, cy, baseR * (0.2 + bass * 0.06), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}
