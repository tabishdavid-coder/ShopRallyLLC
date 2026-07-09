/** Full-width jobs workspace canvas — slate panel fills the main column. */
export const ESTIMATE_JOBS_CANVAS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-100/65";

/** Scrollable jobs body (toolbar + totals bar stay fixed on the canvas). */
export const ESTIMATE_JOBS_SCROLL = "min-h-0 min-w-0 flex-1 overflow-y-auto";

/** Horizontal inset for jobs list + RO fees — no max-width cap. */
export const ESTIMATE_JOBS_CONTENT = "w-full min-w-0 px-3 sm:px-4";
