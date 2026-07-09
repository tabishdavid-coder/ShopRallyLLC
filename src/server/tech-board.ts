import "server-only";

import { prisma } from "@/db/client";
import { ROStatus, type Prisma } from "@/generated/prisma";
import { getShopTechnicians } from "@/server/staff";

export type TechBoardJob = {
  jobId: string;
  jobName: string;
  hours: number;
  roId: string;
  roNumber: number;
  customerName: string;
  vehicleLabel: string;
};

export type TechBoardColumn = {
  technicianId: string | null;
  technicianName: string;
  jobs: TechBoardJob[];
  assignedHours: number;
  /** Placeholder until job clocks ship — always 0 for now. */
  completedHours: number;
  incompleteHours: number;
};

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  plateState: string | null;
} | null): string {
  if (!v) return "No vehicle";
  const base = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const plate = v.plate ? ` · ${v.plate}${v.plateState ? ` ${v.plateState}` : ""}` : "";
  return `${base}${plate}`;
}

function sumHours(jobs: TechBoardJob[]) {
  return jobs.reduce((s, j) => s + j.hours, 0);
}

export async function getTechBoard(
  shopId: string,
  opts?: { q?: string; technicianId?: string },
): Promise<TechBoardColumn[]> {
  const technicians = await getShopTechnicians(shopId, { boardEligible: true });
  const q = opts?.q?.trim().toLowerCase();

  const where: Prisma.RepairOrderWhereInput = {
    shopId,
    archivedAt: null,
    status: { in: [ROStatus.APPROVED, ROStatus.IN_PROGRESS] },
  };

  if (opts?.technicianId) {
    where.OR = [
      { technicianId: opts.technicianId },
      { jobs: { some: { technicianId: opts.technicianId, authorized: true } } },
    ];
  }

  const ros = await prisma.repairOrder.findMany({
    where,
    orderBy: [{ boardOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      number: true,
      technicianId: true,
      customer: { select: { firstName: true, lastName: true, company: true } },
      vehicle: {
        select: { year: true, make: true, model: true, plate: true, plateState: true },
      },
      jobs: {
        where: { authorized: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          technicianId: true,
          laborLines: { select: { hours: true } },
        },
      },
    },
  });

  const columns: Map<string, TechBoardColumn> = new Map();

  for (const tech of technicians) {
    columns.set(tech.id, {
      technicianId: tech.id,
      technicianName: tech.name,
      jobs: [],
      assignedHours: 0,
      completedHours: 0,
      incompleteHours: 0,
    });
  }

  columns.set("__unassigned", {
    technicianId: null,
    technicianName: "Unassigned",
    jobs: [],
    assignedHours: 0,
    completedHours: 0,
    incompleteHours: 0,
  });

  for (const ro of ros) {
    const customerName = ro.customer.company?.trim()
      ? ro.customer.company.trim()
      : `${ro.customer.lastName} ${ro.customer.firstName}`.trim();
    const vLabel = vehicleLabel(ro.vehicle);

    if (q) {
      const haystack = [customerName, vLabel, String(ro.number), ro.id].join(" ").toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    for (const job of ro.jobs) {
      const techId = job.technicianId ?? ro.technicianId;
      const key = techId ?? "__unassigned";
      if (!columns.has(key)) {
        columns.set(key, {
          technicianId: techId,
          technicianName: technicians.find((t) => t.id === techId)?.name ?? "Unknown",
          jobs: [],
          assignedHours: 0,
          completedHours: 0,
          incompleteHours: 0,
        });
      }
      const hours = job.laborLines.reduce((s, l) => s + l.hours, 0);
      columns.get(key)!.jobs.push({
        jobId: job.id,
        jobName: job.name,
        hours,
        roId: ro.id,
        roNumber: ro.number,
        customerName,
        vehicleLabel: vLabel,
      });
    }

    if (ro.jobs.length === 0) {
      const key = ro.technicianId ?? "__unassigned";
      if (!columns.has(key)) {
        columns.set(key, {
          technicianId: ro.technicianId,
          technicianName:
            technicians.find((t) => t.id === ro.technicianId)?.name ?? "Unassigned",
          jobs: [],
          assignedHours: 0,
          completedHours: 0,
          incompleteHours: 0,
        });
      }
      columns.get(key)!.jobs.push({
        jobId: `ro-${ro.id}`,
        jobName: "RO (no authorized jobs)",
        hours: 0,
        roId: ro.id,
        roNumber: ro.number,
        customerName,
        vehicleLabel: vLabel,
      });
    }
  }

  for (const col of columns.values()) {
    const h = sumHours(col.jobs);
    col.assignedHours = h;
    col.incompleteHours = h;
  }

  const unassigned = columns.get("__unassigned")!;
  const techCols = technicians.map((t) => columns.get(t.id)!);

  if (opts?.technicianId) {
    const match = techCols.find((c) => c.technicianId === opts.technicianId);
    if (match) return [match];
    if (unassigned.technicianId === null && unassigned.jobs.length > 0) return [unassigned];
    return [];
  }

  // Unassigned first, then roster order; hide empty tech columns unless they have work.
  const ordered: TechBoardColumn[] = [];
  if (unassigned.jobs.length > 0) ordered.push(unassigned);
  for (const col of techCols) {
    if (col.jobs.length > 0) ordered.push(col);
  }

  return ordered;
}
