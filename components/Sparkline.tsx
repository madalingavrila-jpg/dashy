"use client";

type SparkPoint = { month: string; value: number };

type SparklineProps = {
  points: SparkPoint[];
  width?: number;
  height?: number;
  className?: string;
  /** Tailwind stroke color class, e.g. "text-won" (Bolt green). */
  colorClass?: string;
};

/**
 * Tiny dependency-free SVG sparkline (launch-to-date evolution). Draws a line +
 * subtle area fill + an end dot. Falls back to a flat baseline for ≤1 point.
 */
export function Sparkline({
  points,
  width = 96,
  height = 28,
  className = "",
  colorClass = "text-won",
}: SparklineProps) {
  const values = points.map((p) => p.value);
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  if (!points.length) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          className="text-outline-variant"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + (points.length > 1 ? i * stepX : innerW / 2);
    const y = pad + innerH - ((p.value - min) / range) * innerH;
    return { x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M${coords[0].x.toFixed(1)},${(height - pad).toFixed(1)} ` +
    coords.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` L${coords[coords.length - 1].x.toFixed(1)},${(height - pad).toFixed(1)} Z`;
  const last = coords[coords.length - 1];
  const tone = colorClass;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`${tone} ${className}`}
      role="img"
      aria-label="Launch-to-date GMV trend"
    >
      <path d={areaPath} fill="currentColor" opacity={0.12} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r={2.1} fill="currentColor" />
    </svg>
  );
}
