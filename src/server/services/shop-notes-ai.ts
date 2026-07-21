import "server-only";

import type { FreeformRoDraft } from "@/lib/freeform-ro-types";
import {
  appendJobNotes,
  cleanEstimateLaborLine,
  detectAmendExistingJobIntent,
  findBestMatchingJob,
  jobsAreSemanticallyRelated,
  mergeExpandedJobName,
  type EstimateAiJobRef,
} from "@/lib/estimate-ai-labor";
import type {
  ShopNotesAiProposal,
  ShopNotesProposalItem,
  ShopNotesProposalKind,
  CreateJobAiMode,
} from "@/lib/shop-notes-ai-types";
import { prisma } from "@/db/client";
import { formatPhoneInput, phoneMatchKey } from "@/lib/phone";
import { buildFreeformRoDraft } from "@/server/services/freeform-ro-intake";

type RoJobContext = EstimateAiJobRef & {
  repairRequest: string | null;
  laborHours: number | null;
};

type RoContext = {
  id: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    phone: string | null;
    email: string | null;
  };
  vehicle: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
  };
  concerns: { text: string }[];
  jobs: RoJobContext[];
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = phoneMatchKey(a);
  const kb = phoneMatchKey(b);
  return Boolean(ka && kb && ka === kb);
}

function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return norm(a) === norm(b) && Boolean(norm(a));
}

function concernExists(existing: { text: string }[], text: string): boolean {
  const t = norm(text);
  return existing.some((c) => norm(c.text) === t || norm(c.text).includes(t) || t.includes(norm(c.text)));
}

function jobExists(existing: { name: string }[], jobName: string, repairRequest: string): boolean {
  const n = norm(jobName);
  const r = norm(repairRequest);
  return existing.some((j) => {
    const jn = norm(j.name);
    return jn === n || jn.includes(n) || n.includes(jn) || jn.includes(r) || r.includes(jn);
  });
}

function pushItem(items: ShopNotesProposalItem[], item: ShopNotesProposalItem): void {
  if (items.some((i) => i.id === item.id)) return;
  items.push(item);
}

function vehicleFieldProposal(
  items: ShopNotesProposalItem[],
  kind: Extract<ShopNotesProposalKind, "vehicle_year" | "vehicle_make" | "vehicle_model" | "vehicle_trim">,
  label: string,
  current: string | number | null,
  proposed: string | number | null,
): void {
  if (proposed == null || proposed === "") return;
  const proposedStr = String(proposed);
  const currentStr = current != null && current !== "" ? String(current) : null;
  if (currentStr && norm(currentStr) === norm(proposedStr)) return;

  const mode = currentStr ? "update" : "fill";
  pushItem(items, {
    id: kind,
    kind,
    label,
    detail: null,
    currentValue: currentStr,
    proposedValue: proposedStr,
    mode,
    defaultAccepted: mode === "fill",
  });
}

function shouldUpdateExistingJob(
  matchedJob: RoJobContext | null,
  amendIntent: boolean,
  jobName: string,
  repairRequest: string,
): matchedJob is RoJobContext {
  if (!matchedJob || !amendIntent) return false;
  return jobsAreSemanticallyRelated(matchedJob.name, jobName, repairRequest);
}

function buildAmendJobProposals(
  focusJob: RoJobContext,
  draft: FreeformRoDraft,
): ShopNotesProposalItem[] {
  const items: ShopNotesProposalItem[] = [];

  draft.jobs.forEach((job, i) => {
    const cleaned = cleanEstimateLaborLine(
      job.jobName,
      job.laborDescription,
      job.laborOperations,
      job.notes,
    );
    const mergedNotes = cleaned.jobNotes
      ? appendJobNotes(focusJob.note, cleaned.jobNotes)
      : null;

    pushItem(items, {
      id: `job_labor_${focusJob.id}_${i}`,
      kind: "job",
      label: "Labor line",
      detail: `${cleaned.laborDescription} · ${job.laborHours.toFixed(2)} hr`,
      currentValue: focusJob.name,
      proposedValue: cleaned.laborDescription,
      mode: "add",
      defaultAccepted: true,
      targetJobId: focusJob.id,
      job: {
        targetJobId: focusJob.id,
        appendLabor: true,
        jobName: focusJob.name,
        repairRequest: job.repairRequest,
        laborHours: job.laborHours,
        laborDescription: cleaned.laborDescription,
        jobNotes: mergedNotes,
      },
    });
  });

  draft.partHints.forEach((part, i) => {
    const desc = part.description.trim();
    if (!desc) return;
    const vendorLine = [part.vendor, part.vendorPhone].filter(Boolean).join(" · ");

    pushItem(items, {
      id: `part_${focusJob.id}_${i}`,
      kind: "part",
      label: "Part line",
      detail: `${focusJob.name}${vendorLine ? ` · ${vendorLine}` : ""}`,
      currentValue: focusJob.name,
      proposedValue: desc,
      mode: "add",
      defaultAccepted: true,
      targetJobId: focusJob.id,
      part: {
        description: desc,
        vendor: part.vendor,
        vendorPhone: part.vendorPhone,
        partNumber: part.partNumber,
        relatedJobName: focusJob.name,
        targetJobId: focusJob.id,
      },
    });
  });

  return items;
}

function buildProposalsFromDraft(
  ro: RoContext,
  draft: FreeformRoDraft,
  sourceText: string,
  opts?: { focusJobId?: string | null; mode?: CreateJobAiMode },
): ShopNotesProposalItem[] {
  const mode = opts?.mode ?? "create-job";
  const focusJobId = opts?.focusJobId ?? null;

  if (mode === "amend-job" && focusJobId) {
    const focusJob = ro.jobs.find((j) => j.id === focusJobId);
    if (!focusJob) {
      throw new Error("Job not found on this repair order.");
    }
    return buildAmendJobProposals(focusJob, draft);
  }

  const items: ShopNotesProposalItem[] = [];
  const hint = draft.customerHint;
  const amendIntent = detectAmendExistingJobIntent(sourceText);
  const matchedJob = findBestMatchingJob(ro.jobs, sourceText, {
    focusJobId,
    amendIntent,
  });

  if (hint?.phone && !phonesMatch(ro.customer.phone, hint.phone)) {
    const formatted = formatPhoneInput(hint.phone);
    pushItem(items, {
      id: "customer_phone",
      kind: "customer_phone",
      label: "Customer phone",
      detail: null,
      currentValue: ro.customer.phone ? formatPhoneInput(ro.customer.phone) : null,
      proposedValue: formatted,
      mode: ro.customer.phone ? "update" : "fill",
      defaultAccepted: !ro.customer.phone,
    });
  }

  if (hint?.email && !emailsMatch(ro.customer.email, hint.email)) {
    pushItem(items, {
      id: "customer_email",
      kind: "customer_email",
      label: "Customer email",
      detail: null,
      currentValue: ro.customer.email,
      proposedValue: hint.email.trim(),
      mode: ro.customer.email ? "update" : "fill",
      defaultAccepted: !ro.customer.email,
    });
  }

  const hintName = [hint?.firstName, hint?.lastName].filter(Boolean).join(" ").trim();
  const currentName = [ro.customer.firstName, ro.customer.lastName].filter(Boolean).join(" ").trim();
  if (hintName && norm(hintName) !== norm(currentName)) {
    const missingName = !ro.customer.firstName?.trim() && !ro.customer.lastName?.trim();
    pushItem(items, {
      id: "customer_name",
      kind: "customer_name",
      label: "Customer name",
      detail: hint?.company ? `Company: ${hint.company}` : null,
      currentValue: currentName || null,
      proposedValue: hintName,
      mode: missingName ? "fill" : "update",
      defaultAccepted: missingName,
    });
  }

  const v = draft.vehicle;
  vehicleFieldProposal(items, "vehicle_year", "Vehicle year", ro.vehicle.year, v.year);
  vehicleFieldProposal(items, "vehicle_make", "Vehicle make", ro.vehicle.make, v.make);
  vehicleFieldProposal(items, "vehicle_model", "Vehicle model", ro.vehicle.model, v.model);
  vehicleFieldProposal(items, "vehicle_trim", "Vehicle trim", ro.vehicle.trim, v.trim);

  draft.concerns.forEach((text, i) => {
    const trimmed = text.trim();
    if (!trimmed || concernExists(ro.concerns, trimmed)) return;
    pushItem(items, {
      id: `concern_${i}`,
      kind: "concern",
      label: "Customer concern",
      detail: "Adds to Concerns tab — does not remove existing concerns.",
      currentValue: null,
      proposedValue: trimmed,
      mode: "add",
      defaultAccepted: true,
    });
  });

  draft.jobs.forEach((job, i) => {
    const cleaned = cleanEstimateLaborLine(
      job.jobName,
      job.laborDescription,
      job.laborOperations,
      job.notes,
    );

    if (shouldUpdateExistingJob(matchedJob, amendIntent, job.jobName, job.repairRequest)) {
      const mergedName = mergeExpandedJobName(matchedJob.name, job.jobName);
      const mergedNotes = appendJobNotes(matchedJob.note, cleaned.jobNotes);
      pushItem(items, {
        id: `job_update_${matchedJob.id}`,
        kind: "job",
        label: "Update existing job",
        detail: `${cleaned.laborDescription} · ${job.laborHours.toFixed(2)} hr labor`,
        currentValue: matchedJob.name,
        proposedValue: mergedName,
        mode: "update",
        defaultAccepted: true,
        targetJobId: matchedJob.id,
        job: {
          targetJobId: matchedJob.id,
          laborLineId: matchedJob.laborLineId ?? null,
          jobName: mergedName,
          repairRequest: job.repairRequest,
          laborHours: job.laborHours,
          laborDescription: cleaned.laborDescription,
          jobNotes: mergedNotes,
        },
      });
      return;
    }

    if (jobExists(ro.jobs, job.jobName, job.repairRequest)) return;

    pushItem(items, {
      id: `job_${i}`,
      kind: "job",
      label: "Suggested job",
      detail: `${cleaned.laborDescription} · ${job.laborHours.toFixed(2)} hr · ${job.resolution}`,
      currentValue: null,
      proposedValue: job.jobName,
      mode: "add",
      defaultAccepted: true,
      job: {
        jobName: job.jobName,
        repairRequest: job.repairRequest,
        laborHours: job.laborHours,
        laborDescription: cleaned.laborDescription,
        jobNotes: cleaned.jobNotes,
      },
    });
  });

  draft.partHints.forEach((part, i) => {
    const desc = part.description.trim();
    if (!desc) return;
    const vendorLine = [part.vendor, part.vendorPhone].filter(Boolean).join(" · ");
    const partTargetJob =
      matchedJob &&
      amendIntent &&
      jobsAreSemanticallyRelated(
        matchedJob.name,
        part.relatedRepair ?? part.description,
        part.description,
      )
        ? matchedJob
        : null;

    pushItem(items, {
      id: `part_${i}`,
      kind: "part",
      label: partTargetJob ? "Add part to existing job" : "Suggested part line",
      detail: partTargetJob
        ? `${partTargetJob.name}${vendorLine ? ` · ${vendorLine}` : ""}`
        : vendorLine || part.relatedRepair || null,
      currentValue: partTargetJob?.name ?? null,
      proposedValue: desc,
      mode: partTargetJob ? "update" : "add",
      defaultAccepted: true,
      targetJobId: partTargetJob?.id ?? null,
      part: {
        description: desc,
        vendor: part.vendor,
        vendorPhone: part.vendorPhone,
        partNumber: part.partNumber,
        relatedJobName: partTargetJob?.name ?? part.relatedRepair,
        targetJobId: partTargetJob?.id ?? null,
      },
    });
  });

  return items;
}

async function loadRoContext(shopId: string, roId: string): Promise<RoContext | null> {
  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: {
      id: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          email: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          trim: true,
        },
      },
      vehicleConcerns: {
        where: { kind: "CUSTOMER" },
        select: { text: true },
        orderBy: { sortOrder: "asc" },
      },
      jobs: {
        select: {
          id: true,
          name: true,
          note: true,
          laborLines: {
            select: { id: true, description: true, hours: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!ro) return null;

  return {
    id: ro.id,
    customer: ro.customer,
    vehicle: ro.vehicle,
    concerns: ro.vehicleConcerns,
    jobs: ro.jobs.map((job) => {
      const primaryLabor = job.laborLines[0];
      return {
        id: job.id,
        name: job.name,
        note: job.note,
        laborLineId: primaryLabor?.id ?? null,
        laborDescription: primaryLabor?.description ?? null,
        repairRequest: job.note,
        laborHours: primaryLabor?.hours ?? null,
      };
    }),
  };
}

/** Parse shop notes against an open RO and return reviewable proposals (additive by default). */
export async function buildShopNotesProposals(
  shopId: string,
  roId: string,
  text: string,
  opts?: { focusJobId?: string | null; mode?: CreateJobAiMode },
): Promise<ShopNotesAiProposal> {
  const ro = await loadRoContext(shopId, roId);
  if (!ro) throw new Error("Repair order not found.");

  const draft = await buildFreeformRoDraft(shopId, text);
  const items = buildProposalsFromDraft(ro, draft, text.trim(), opts);

  if (items.length === 0) {
    const amendEmpty =
      opts?.mode === "amend-job"
        ? "Nothing new to add — describe the labor or parts you want on this job (e.g. rear rotors, extra 0.5 hr bleed)."
        : "Nothing new to apply — the note may already match this repair order, or try adding year, make, model, and the work needed.";
    throw new Error(amendEmpty);
  }

  return {
    roId,
    sourceText: text.trim(),
    items,
  };
}
