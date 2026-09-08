"use client";

/**
 * A small inline SVG line chart. Hand-drawn rather than pulled from a charting
 * library so the app keeps zero runtime dependencies and stays fast to open on
 * an old phone.
 */
export function Sparkline({
  points,
  height = 56,
  label,
}: {
  /** Oldest first. `null` marks a gap in the data rather than a zero. */
  points: Array<number | null>;
  height?: number;
  label: string;
}) {
  const present = points.filter((p): p is number => p !== null);
  if (present.length < 2) return null;

  const min = Math.min(...present);
  const max = Math.max(...present);
  // A flat line would otherwise divide by zero and collapse to the top edge.
  const range = max - min || 1;
  const width = 100;
  const pad = 3;

  const coords = points.map((value, i) => {
    if (value === null) return null;
    const x = (i / (points.length - 1)) * width;
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return { x, y };
  });

  // Broken into segments so a data gap shows as a gap, not a straight line
  // across missing hours.
  const segments: string[] = [];
  let current: string[] = [];
  for (const point of coords) {
    if (!point) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      continue;
    }
    current.push(`${current.length === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`);
  }
  if (current.length > 1) segments.push(current.join(" "));

  const last = [...coords].reverse().find(Boolean);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
      role="img"
      aria-label={label}
    >
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {last ? (
        <circle cx={last.x} cy={last.y} r={2.2} fill="var(--accent)" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}
