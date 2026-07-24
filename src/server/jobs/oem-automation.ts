import "server-only";

import { prisma } from "@/db/client";
import { AutomationJobStatus, type Prisma } from "@/generated/prisma";
import { OEM_AUTOMATION_JOBS, type OemAutomationJobName } from "@/lib/oem-automation-sources";
import { runPlatformHealthChecks } from "@/server/platform/oem-automation";

function nextCronApprox(jobName: OemAutomationJobName): Date {
  const now = new Date();
  if (jobName === "quarterly_scrape") {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 3);
    d.setHours(1, 0, 0, 0);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(jobName === "daily_telemetry_update" ? 2 : 3, 0, 0, 0);
  return d;
}

async function startRun(jobName: OemAutomationJobName) {
  return prisma.automationJobRun.create({
    data: {
      jobName,
      status: AutomationJobStatus.running,
      nextScheduledAt: nextCronApprox(jobName),
    },
  });
}

async function finishRun(
  id: string,
  status: AutomationJobStatus,
  detail?: Record<string, unknown>,
  errorMessage?: string,
) {
  return prisma.automationJobRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      status,
      detail: detail as Prisma.InputJsonValue | undefined,
      errorMessage,
    },
  });
}

export async function recordAutomationJobRun(
  jobName: OemAutomationJobName,
  detail: Record<string, unknown>,
  status: AutomationJobStatus = AutomationJobStatus.success,
  errorMessage?: string,
) {
  return prisma.automationJobRun.create({
    data: {
      jobName,
      status,
      startedAt: new Date(),
      finishedAt: new Date(),
      detail: detail as Prisma.InputJsonValue,
      nextScheduledAt: nextCronApprox(jobName),
      errorMessage,
    },
  });
}

export async function runOemAutomationJob(
  jobName: OemAutomationJobName,
): Promise<{ ok: boolean; detail?: Record<string, unknown>; error?: string }> {
  if (!OEM_AUTOMATION_JOBS.includes(jobName)) {
    return { ok: false, error: `Unknown job: ${jobName}` };
  }

  const run = await startRun(jobName);
  try {
    let detail: Record<string, unknown> = {};

    if (jobName === "daily_health_check") {
      detail = await runPlatformHealthChecks();
    } else if (jobName === "daily_telemetry_update") {
      detail = {
        note: "Telemetry batch recorded — full processing runs in Python scheduler when deployed.",
        recorded_at: new Date().toISOString(),
      };
    } else if (jobName === "quarterly_scrape") {
      detail = {
        note: "Quarterly scrape queued — run Python scheduler for full OEM harvest.",
        recorded_at: new Date().toISOString(),
      };
    }

    await finishRun(run.id, AutomationJobStatus.success, detail);
    return { ok: true, detail };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Job failed";
    await finishRun(run.id, AutomationJobStatus.failed, undefined, message);
    return { ok: false, error: message };
  }
}

export async function runAllOemAutomationJobs() {
  const results: Record<string, { ok: boolean; error?: string }> = {};
  for (const job of OEM_AUTOMATION_JOBS) {
    const r = await runOemAutomationJob(job);
    results[job] = { ok: r.ok, error: r.error };
  }
  return results;
}
