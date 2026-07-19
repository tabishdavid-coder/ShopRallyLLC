import type { ROStatus } from "@/generated/prisma";

/** Canonical user-facing labels for the persisted RO workflow status. */
export const RO_STATUS_LABEL: Record<ROStatus, string> = {
  ESTIMATE: "Estimate",
  APPROVED: "Approved",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
};

/** Stage hues — aligned with job board (`globals.css` `--jb-stage-*`). */
const STAGE = {
  estimate: { cssVar: "--jb-stage-estimates", textMix: "#0a1a40" },
  wip: { cssVar: "--jb-stage-wip", textMix: "#3a2a00" },
  completed: { cssVar: "--jb-stage-completed", textMix: "#0a2a1a" },
  /** Brand navy from custom pipeline palette — distinct from completed green. */
  invoiced: { hex: "#16588e", textMix: "#051520" },
} as const;

function stageColorMix(
  cssVar: string,
  textMix: string,
  opts?: { bg?: number; text?: number; border?: number },
): string {
  const bg = opts?.bg ?? 14;
  const text = opts?.text ?? 90;
  const border = opts?.border ?? 28;
  return [
    `bg-[color-mix(in_oklab,var(${cssVar})_${bg}%,white)]`,
    `text-[color-mix(in_oklab,var(${cssVar})_${text}%,${textMix})]`,
    `border-[color-mix(in_oklab,var(${cssVar})_${border}%,transparent)]`,
  ].join(" ");
}

function hexColorMix(hex: string, textMix: string): string {
  return [
    `bg-[color-mix(in_oklab,${hex}_16%,white)]`,
    `text-[color-mix(in_oklab,${hex}_92%,${textMix})]`,
    `border-[color-mix(in_oklab,${hex}_30%,transparent)]`,
  ].join(" ");
}

/** Shared RO workflow badge color classes (bg + text + border). */
export function roStatusBadgeColors(status: ROStatus): string {
  switch (status) {
    case "ESTIMATE":
      return stageColorMix(STAGE.estimate.cssVar, STAGE.estimate.textMix);
    case "APPROVED":
    case "IN_PROGRESS":
      return stageColorMix(STAGE.wip.cssVar, STAGE.wip.textMix);
    case "COMPLETED":
      return stageColorMix(STAGE.completed.cssVar, STAGE.completed.textMix);
    case "INVOICED":
      return hexColorMix(STAGE.invoiced.hex, STAGE.invoiced.textMix);
    default:
      return stageColorMix(STAGE.estimate.cssVar, STAGE.estimate.textMix);
  }
}

/** Full badge class string for `<Badge>` and inline status pills. */
export function roStatusBadgeClass(status: ROStatus): string {
  return `border font-semibold ${roStatusBadgeColors(status)}`;
}

/** Shared RO status pill styles — semantic workflow colors, higher contrast. */
export const RO_STATUS_PILL: Record<
  ROStatus,
  { label: string; className: string }
> = {
  ESTIMATE: {
    label: RO_STATUS_LABEL.ESTIMATE,
    className: roStatusBadgeClass("ESTIMATE"),
  },
  APPROVED: {
    label: RO_STATUS_LABEL.APPROVED,
    className: roStatusBadgeClass("APPROVED"),
  },
  IN_PROGRESS: {
    label: RO_STATUS_LABEL.IN_PROGRESS,
    className: roStatusBadgeClass("IN_PROGRESS"),
  },
  COMPLETED: {
    label: RO_STATUS_LABEL.COMPLETED,
    className: roStatusBadgeClass("COMPLETED"),
  },
  INVOICED: {
    label: RO_STATUS_LABEL.INVOICED,
    className: roStatusBadgeClass("INVOICED"),
  },
};
