import { inngest } from "@/inngest/client";
import {
  processAutomationEvent,
  runScheduledAutomations,
} from "@/server/services/automation-engine";
import { AUTOMATION_TRIGGER_EVENT } from "@/server/services/automation-events";

/** Immediate automation triggers (RO completed, appointment booked, etc.). */
export const automationsTrigger = inngest.createFunction(
  {
    id: "automations-trigger",
    name: "Automation event trigger",
    triggers: [{ event: AUTOMATION_TRIGGER_EVENT }],
  },
  async ({ event, step }) => {
    await step.run("process-event", () =>
      processAutomationEvent(event.data as Parameters<typeof processAutomationEvent>[0]),
    );
    return { ok: true };
  },
);

/** Hourly — appointment BEFORE reminders + deliver due scheduled automation sends. */
export const automationsRunner = inngest.createFunction(
  {
    id: "automations-runner",
    name: "Automation scheduled runner",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("run-scheduled", () => runScheduledAutomations());
    return result;
  },
);
