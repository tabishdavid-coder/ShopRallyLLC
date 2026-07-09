import "server-only";

import { inngest } from "@/inngest/client";
import type { AutomationEvent } from "@/server/services/automation-engine";

export const AUTOMATION_TRIGGER_EVENT = "automation/trigger";

/** Fire-and-forget automation trigger via Inngest (non-blocking for HTTP handlers). */
export async function emitAutomationEvent(event: AutomationEvent): Promise<void> {
  try {
    await inngest.send({
      name: AUTOMATION_TRIGGER_EVENT,
      data: event,
    });
  } catch (e) {
    console.warn("[automation] Failed to enqueue event:", e);
  }
}
