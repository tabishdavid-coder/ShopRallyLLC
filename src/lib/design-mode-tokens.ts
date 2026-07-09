/** Dev-only design mode helpers — ShopRallyCRM :3031 (AP shell). Off on isolated :3030 preview. */

import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";

export const SHOPRALLY_CRM_DEV_PORT = 3031;

export const SHOPRALLY_CRM_DEV_ORIGIN = `http://localhost:${SHOPRALLY_CRM_DEV_PORT}`;

function designModeExplicitlyDisabled(): boolean {
  const flags = [
    process.env.NEXT_PUBLIC_DESIGN_MODE,
    process.env.NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE,
  ];
  return flags.some((v) => v === "false" || v === "0");
}

/** True on `npm run dev:3004` (legacy). Off on canonical :3031, isolated :3030 preview, and production. */
export function isDesignModeEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (designModeExplicitlyDisabled()) return false;
  if (process.env.NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE === "1") return true;
  if (isAutopilot3030Shell()) return false;
  return true;
}

/** Client components — same env rules as isDesignModeEnabled (NEXT_PUBLIC_* only). */
export function isDesignModeEnabledClient(): boolean {
  return isDesignModeEnabled();
}

export const DESIGN_MODE_QUERY = "design";

export function designModeOpenFromSearch(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(DESIGN_MODE_QUERY) === "open";
}
