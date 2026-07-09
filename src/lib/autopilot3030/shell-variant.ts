/** True when the Autopilot command-rail shell is active (Dev 3031 default + optional :3030 preview). */
export function isAutopilot3030Shell(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_AP_SHELL === "3030"
  );
}

/** Isolated `npm run dev:3030` preview — design mode off, preview banner on. */
export function isIsolated3030Preview(): boolean {
  return (
    isAutopilot3030Shell() &&
    process.env.NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE !== "1"
  );
}
