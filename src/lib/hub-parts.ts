import type { PartStatus } from "@/generated/prisma";

/** Part line row for parts ordering pipeline (Tekmetric PartsHub / AutoLeap manual order). */
export type HubPart = {
  id: string;
  jobId: string;
  description: string;
  brand: string | null;
  partNumber: string | null;
  quantity: number;
  costCents: number;
  retailCents: number;
  status: PartStatus;
  vendor: string | null;
  jobName: string;
};

export function buildHubParts(
  jobs: {
    id: string;
    name: string;
    partLines: {
      id: string;
      description: string;
      brand: string | null;
      partNumber: string | null;
      quantity: number;
      costCents: number;
      retailCents: number;
      status: PartStatus;
      vendor: string | null;
    }[];
  }[],
): HubPart[] {
  return jobs.flatMap((job) =>
    job.partLines.map((p) => ({
      id: p.id,
      jobId: job.id,
      description: p.description,
      brand: p.brand,
      partNumber: p.partNumber,
      quantity: p.quantity,
      costCents: p.costCents,
      retailCents: p.retailCents,
      status: p.status,
      vendor: p.vendor,
      jobName: job.name,
    })),
  );
}
