/**
 * Statistics used by the Insights screen.
 *
 * These numbers are meant to be handed to a doctor, so the goal is honesty
 * over impressiveness: Spearman rank correlation (which does not assume the
 * data is normally distributed or the relationship straight-line), an actual
 * p-value rather than a hand-wave, and the sample size always reported
 * alongside so a strong-looking result from nine data points is visibly weak.
 */

/** Average ranks, with ties sharing the mean of the ranks they span. */
function rank(values: number[]): number[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j++;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k].index] = shared;
    i = j + 1;
  }
  return ranks;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - meanX;
    const b = ys[i] - meanY;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/* ---------- p-values ---------- */

function logGamma(x: number): number {
  // Lanczos approximation, g = 7, n = 9.
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // Reflection formula keeps the approximation valid below 0.5.
    return (
      Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
    );
  }
  const z = x - 1;
  let a = c[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Continued-fraction expansion for the incomplete beta function. */
function betacf(a: number, b: number, x: number): number {
  const tiny = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

/** Regularized incomplete beta, I_x(a, b). */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(a, b, x)) / a
    : 1 - (front * betacf(b, a, 1 - x)) / b;
}

/** Two-tailed p-value for a t statistic with `df` degrees of freedom. */
function tDistTwoTailed(t: number, df: number): number {
  if (df <= 0) return 1;
  return incompleteBeta(df / 2, 0.5, df / (df + t * t));
}

export type Correlation = {
  /** Spearman's rho, -1 to 1. */
  r: number;
  /** Number of paired observations behind it. */
  n: number;
  /** Two-tailed p-value. */
  p: number;
};

/**
 * Spearman rank correlation between two equal-length series.
 * Returns null below 8 pairs, where a correlation is noise dressed as insight.
 */
export function spearman(xs: number[], ys: number[]): Correlation | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 8) return null;

  // A series with no variation (every reading identical) has no correlation
  // to measure, and would divide by zero below.
  if (new Set(xs).size < 2 || new Set(ys).size < 2) return null;

  const r = pearson(rank(xs.slice(0, n)), rank(ys.slice(0, n)));
  const df = n - 2;
  const denom = 1 - r * r;
  const t = denom <= 0 ? Infinity : r * Math.sqrt(df / denom);
  const p = Number.isFinite(t) ? tDistTwoTailed(t, df) : 0;
  return { r, n, p };
}

/** Wording chosen so nobody reads a weak signal as a diagnosis. */
export function describeStrength(r: number): string {
  const magnitude = Math.abs(r);
  if (magnitude >= 0.6) return "strong";
  if (magnitude >= 0.4) return "moderate";
  if (magnitude >= 0.2) return "weak";
  return "very weak";
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
