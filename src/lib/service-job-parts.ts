import type { PartStatus } from "@/generated/prisma";

/** Service job row for parts ordering — mirrors jobs on the Services tab. */
export type ServiceJobSummary = {
  id: string;
  name: string;
  partCount: number;
  laborCount: number;
  quotedCount: number;
  neededCount: number;
  orderedCount: number;
  /** Has labor lines but no part lines yet. */
  needsParts: boolean;
};

export function buildServiceJobSummaries(
  jobs: {
    id: string;
    name: string;
    laborLines: unknown[];
    partLines: { status: PartStatus }[];
  }[],
): ServiceJobSummary[] {
  return jobs.map((job) => {
    const quotedCount = job.partLines.filter((p) => p.status === "QUOTED").length;
    const neededCount = job.partLines.filter((p) => p.status === "NEEDED").length;
    const orderedCount = job.partLines.filter((p) => p.status === "ORDERED").length;
    const partCount = job.partLines.length;
    return {
      id: job.id,
      name: job.name,
      partCount,
      laborCount: job.laborLines.length,
      quotedCount,
      neededCount,
      orderedCount,
      needsParts: job.laborLines.length > 0 && partCount === 0,
    };
  });
}

export function serviceJobOptionLabel(job: ServiceJobSummary): string {
  if (job.needsParts) return `${job.name} · needs parts`;
  if (job.partCount === 0) return `${job.name} · no parts yet`;
  return `${job.name} · ${job.partCount} on service`;
}
