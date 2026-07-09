import type { ComponentType, ComponentProps } from "react";

import type { CrmShell } from "@/components/crm/crm-shell";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";

type AppShellProps = ComponentProps<typeof CrmShell>;

/** Load AutopilotShell on Dev 3004 / :3030 preview; legacy CrmShell only when AP shell flag is off. */
export async function loadAppShell(): Promise<ComponentType<AppShellProps>> {
  if (!isAutopilot3030Shell()) {
    const mod = await import("@/components/crm/crm-shell");
    return mod.CrmShell;
  }

  const mod = await import("@/components/autopilot3030/shell/autopilot-shell");
  return mod.AutopilotShell;
}
