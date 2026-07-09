/** Shared Recharts styling — readable ticks, consistent spacing. */
export const CHART_TICK = {
  fontSize: 12,
  fill: "oklch(0.37 0.045 249)",
  fontWeight: 500 as const,
};

export const CHART_TICK_COMPACT = {
  fontSize: 11,
  fill: "oklch(0.37 0.045 249)",
  fontWeight: 500 as const,
};

export const CHART_GRID = {
  strokeDasharray: "3 6",
  stroke: "oklch(0.90 0.012 247)",
  vertical: false as const,
};

export const CHART_HEIGHT = {
  full: 240,
  compact: 156,
} as const;

export const CHART_MARGIN = {
  bar: { top: 10, right: 12, left: 2, bottom: 4 },
  barCompact: { top: 6, right: 8, left: 0, bottom: 2 },
  horizontal: { top: 6, right: 12, left: 4, bottom: 4 },
  horizontalCompact: { top: 4, right: 8, left: 0, bottom: 2 },
} as const;

/** Short x-axis label for daily charts — avoids cramped weekday strings in compact cards. */
export function formatChartDayLabel(isoDate: string, style: "compact" | "full" = "compact"): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (style === "compact") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Evenly spaced tick indices for daily series (always includes first and last day). */
export function chartDayTickIndices(pointCount: number, maxTicks: number): number[] {
  if (pointCount <= 0) return [];
  if (pointCount <= maxTicks) {
    return Array.from({ length: pointCount }, (_, i) => i);
  }
  const last = pointCount - 1;
  const step = Math.max(1, Math.round(last / (maxTicks - 1)));
  const indices: number[] = [0];
  for (let i = step; i < last; i += step) {
    indices.push(i);
  }
  if (indices[indices.length - 1] !== last) {
    indices.push(last);
  }
  return indices;
}

export function formatAxisDollars(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `$${value}`;
}
