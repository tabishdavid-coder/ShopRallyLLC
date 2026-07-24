import "server-only";

import type { WiringSystem } from "@/generated/prisma";
import { prisma } from "@/db/client";

/** Per-shop mutex: one active download per vehicle+system at a time. */
export async function acquireDownloadMutex(
  shopId: string,
  vehicleId: string,
  wiringSystem: WiringSystem,
  sourceBrand: string,
): Promise<
  | { ok: true; jobId: string }
  | { ok: false; reason: "in_progress"; jobId: string }
  | { ok: false; reason: "error"; message: string }
> {
  const active = await prisma.wiringDiagramDownloadJob.findFirst({
    where: {
      shopId,
      vehicleId,
      wiringSystem,
      status: { in: ["PENDING", "RUNNING"] },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (active) {
    return { ok: false, reason: "in_progress", jobId: active.id };
  }

  try {
    const job = await prisma.wiringDiagramDownloadJob.create({
      data: {
        shopId,
        vehicleId,
        wiringSystem,
        sourceBrand,
        status: "PENDING",
      },
      select: { id: true },
    });
    return { ok: true, jobId: job.id };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Could not start download job.",
    };
  }
}

export async function markDownloadRunning(jobId: string, shopId: string): Promise<void> {
  await prisma.wiringDiagramDownloadJob.updateMany({
    where: { id: jobId, shopId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

export async function markDownloadCompleted(
  jobId: string,
  shopId: string,
  wiringDiagramId: string,
): Promise<void> {
  await prisma.wiringDiagramDownloadJob.updateMany({
    where: { id: jobId, shopId },
    data: {
      status: "COMPLETED",
      wiringDiagramId,
      completedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markDownloadFailed(
  jobId: string,
  shopId: string,
  errorMessage: string,
): Promise<void> {
  await prisma.wiringDiagramDownloadJob.updateMany({
    where: { id: jobId, shopId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: errorMessage.slice(0, 2000),
    },
  });
}

export async function releaseStaleRunningJobs(
  shopId: string,
  maxAgeMinutes = 15,
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000);
  const result = await prisma.wiringDiagramDownloadJob.updateMany({
    where: {
      shopId,
      status: "RUNNING",
      startedAt: { lt: cutoff },
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: "Download timed out (stale RUNNING job released).",
    },
  });
  return result.count;
}
