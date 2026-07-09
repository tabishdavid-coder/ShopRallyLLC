/** Dashboard chart palette — distinct, on-brand fills (avoid flat charcoal bars). */

export const RO_STATUS_CHART_COLORS = {
  ESTIMATE: "oklch(0.78 0.11 230)",
  WIP: "oklch(0.42 0.06 260)",
  COMPLETED: "oklch(0.68 0.145 230)",
  INVOICED: "oklch(0.62 0.14 162)",
} as const;

export const PAYMENT_METHOD_CHART_COLORS: Record<string, string> = {
  CARD: "oklch(0.68 0.145 230)",
  CASH: "oklch(0.52 0.10 250)",
  CHECK: "oklch(0.62 0.14 162)",
  OTHER: "oklch(0.77 0.15 70)",
};

const PAYMENT_FALLBACK = [
  "oklch(0.68 0.145 230)",
  "oklch(0.52 0.10 250)",
  "oklch(0.62 0.14 162)",
  "oklch(0.77 0.15 70)",
  "oklch(0.55 0.12 290)",
];

export function paymentMethodColor(method: string, index: number): string {
  return PAYMENT_METHOD_CHART_COLORS[method] ?? PAYMENT_FALLBACK[index % PAYMENT_FALLBACK.length]!;
}

/** Cyan intensity scales with daily revenue. */
export function revenueBarColor(value: number, max: number): string {
  if (value <= 0) return "oklch(0.90 0.03 230)";
  if (max <= 0) return "oklch(0.68 0.145 230)";
  const t = Math.min(1, value / max);
  const lightness = 0.82 - t * 0.12;
  const chroma = 0.06 + t * 0.085;
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 230)`;
}

export function appointmentBarColor(count: number, isToday: boolean): string {
  if (isToday) return "oklch(0.596 0.226 25.5)";
  if (count <= 0) return "oklch(0.91 0.025 230)";
  return "oklch(0.68 0.145 230)";
}

export const CHART_CURSOR_FILL = "oklch(0.68 0.145 230 / 0.12)";
