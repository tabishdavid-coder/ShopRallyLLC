/** Live merged CRM surfaces — open with design panel via ?design=open */

import { DESIGN_MODE_QUERY } from "@/lib/design-mode-tokens";

export type MergedCrmSurface = {
  id: string;
  title: string;
  description: string;
  href: string;
  shell: "master" | "shop" | "archive";
};

export const MERGED_CRM_SURFACES: MergedCrmSurface[] = [
  {
    id: "master-home",
    title: "Master CRM overview",
    description: "Platform operator shell — shops, billing, enter Shop CRM.",
    href: "/platform",
    shell: "master",
  },
  {
    id: "shop-dashboard",
    title: "Shop CRM dashboard",
    description: "Merged shop shell — KPIs, job board pulse, create RO FAB.",
    href: "/dashboard",
    shell: "shop",
  },
  {
    id: "ro-intake",
    title: "Create RO intake",
    description: "Batch 5 — slide-over + full-page new RO.",
    href: "/repair-orders/new",
    shell: "shop",
  },
  {
    id: "platform-review",
    title: "Platform release review",
    description: "Batch 4 archive — live iframe tour inside Master CRM.",
    href: "/platform/review/batch-04",
    shell: "master",
  },
  {
    id: "intake-review",
    title: "Shop intake review",
    description: "Batch 5 archive — live CRM iframe + INTAKE tour.",
    href: "/design-review/batch-05-ro-intake",
    shell: "archive",
  },
  {
    id: "merge-review",
    title: "Merge archive",
    description: "Batch 6 — Clerk landing docs + full batch checklist.",
    href: "/design-review/batch-06-clerk-merge",
    shell: "archive",
  },
  {
    id: "estimate-first-intake",
    title: "Estimate-first intake (v2)",
    description: "Order Process Lab — draft RO on estimate, full customer/vehicle subforms, required concern + odometer.",
    href: "/design-review/estimate-first-intake",
    shell: "shop",
  },
  {
    id: "estimate-building-lab",
    title: "Estimate Building Lab",
    description: "Blended Tekmetric + AutoLeap estimate builder — isolated design lab on live ROs.",
    href: "/design-review/estimate-building",
    shell: "shop",
  },
  {
    id: "design-hub",
    title: "Design review hub",
    description: "All batches 1–6 approved — full release archive.",
    href: "/design-review",
    shell: "archive",
  },
];

/** Append design=open so the dev dock opens on navigation. */
export function designModeHref(path: string, extraParams?: Record<string, string>): string {
  const [base, existing] = path.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set(DESIGN_MODE_QUERY, "open");
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      params.set(k, v);
    }
  }
  return `${base}?${params.toString()}`;
}
