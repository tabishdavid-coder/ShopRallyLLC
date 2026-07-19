"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { formatPhoneInput } from "@/lib/phone";
import { isEstimateEditable } from "@/lib/estimate-editable";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import type { ShopNotesAiProposal, ShopNotesApplyItem } from "@/lib/shop-notes-ai-types";
import { releasedFeatureDenied } from "@/lib/subscription";
import { cleanEstimateLaborLine } from "@/lib/estimate-ai-labor";
import { assertShopAiRateLimit } from "@/server/services/ai/client";
import { buildShopNotesProposals } from "@/server/services/shop-notes-ai";
import { gates } from "@/server/permission-gates";
import { addConcern } from "@/server/actions/concerns";
import { updateCustomer } from "@/server/actions/customers";
import { updateVehicle } from "@/server/actions/vehicles";
import { addJob, addLaborLine, addPartLine, updateJob, updateLaborLine } from "@/server/actions/estimate";
import { getShopMatrices, shopLaborRate } from "@/server/pricing-matrix";

const ParseInput = z.object({
  roId: z.string().min(1),
  text: z.string().trim().min(8).max(4000),
  /** When triggered from a job card, bias matching toward this job. */
  focusJobId: z.string().min(1).optional(),
});

export type ParseShopNotesAiResult =
  | { ok: true; proposal: ShopNotesAiProposal }
  | { ok: false; error: string };

/** AI parse shop notes in context of an open RO — returns reviewable proposals. */
export async function parseShopNotesWithAi(
  raw: z.infer<typeof ParseInput>,
): Promise<ParseShopNotesAiResult> {
  const parsed = ParseInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Add a few words describing the vehicle, customer, or work needed." };
  }

  const shopId = await getShopId();
  const denied = await releasedFeatureDenied(shopId, "freeform_ro_intake");
  if (denied) return { ok: false, error: denied };

  const editDenied = await gates.estimateEdit(shopId);
  if (editDenied) return { ok: false, error: editDenied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: parsed.data.roId, shopId },
    select: { id: true, status: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  if (!isEstimateEditable(ro.status)) {
    return { ok: false, error: "This repair order is read-only." };
  }

  try {
    await assertShopAiRateLimit(shopId);
    const proposal = await buildShopNotesProposals(shopId, parsed.data.roId, parsed.data.text, {
      focusJobId: parsed.data.focusJobId,
    });
    return { ok: true, proposal };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not parse shop notes.",
    };
  }
}

const ApplyInput = z.object({
  roId: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum([
        "customer_phone",
        "customer_email",
        "customer_name",
        "vehicle_year",
        "vehicle_make",
        "vehicle_model",
        "vehicle_trim",
        "concern",
        "job",
        "part",
      ]),
      proposedValue: z.string().optional(),
      job: z
        .object({
          jobName: z.string().min(1),
          repairRequest: z.string(),
          laborHours: z.number().min(0.1).max(100),
          laborDescription: z.string(),
          jobNotes: z.string().nullable().optional(),
          targetJobId: z.string().nullable().optional(),
          laborLineId: z.string().nullable().optional(),
        })
        .optional(),
      part: z
        .object({
          description: z.string().min(1),
          vendor: z.string().nullable(),
          vendorPhone: z.string().nullable(),
          partNumber: z.string().nullable(),
          relatedJobName: z.string().nullable(),
          targetJobId: z.string().nullable().optional(),
        })
        .optional(),
    }),
  ),
});

export type ApplyShopNotesAiResult =
  | { ok: true; applied: number; skipped: number }
  | { ok: false; error: string };

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function resolveJobId(
  roJobs: { id: string; name: string }[],
  createdByName: Map<string, string>,
  relatedJobName: string | null,
  explicitTargetJobId?: string | null,
): string | null {
  if (explicitTargetJobId) {
    const explicit = roJobs.find((j) => j.id === explicitTargetJobId);
    if (explicit) return explicit.id;
  }
  if (relatedJobName) {
    const key = relatedJobName.trim().toLowerCase();
    for (const [name, id] of createdByName) {
      if (name.includes(key) || key.includes(name)) return id;
    }
    const match = roJobs.find((j) => {
      const n = j.name.toLowerCase();
      return n.includes(key) || key.includes(n);
    });
    if (match) return match.id;
  }
  if (roJobs.length > 0) return roJobs[roJobs.length - 1]!.id;
  return null;
}

/** Apply accepted shop-notes AI proposals to the current RO. */
export async function applyShopNotesProposals(
  raw: z.infer<typeof ApplyInput>,
): Promise<ApplyShopNotesAiResult> {
  const parsed = ApplyInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid proposal selection." };
  if (parsed.data.items.length === 0) {
    return { ok: false, error: "Select at least one change to apply." };
  }

  const shopId = await getShopId();
  const denied = await releasedFeatureDenied(shopId, "freeform_ro_intake");
  if (denied) return { ok: false, error: denied };

  const editDenied = await gates.estimateEdit(shopId);
  if (editDenied) return { ok: false, error: editDenied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: parsed.data.roId, shopId },
    select: {
      id: true,
      status: true,
      laborRateCents: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          notes: true,
          tags: true,
          marketingOptIn: true,
          transactionalSmsConsent: true,
          marketingEmailConsent: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          customerId: true,
          year: true,
          make: true,
          model: true,
          trim: true,
          vin: true,
          engine: true,
          transmission: true,
          drivetrain: true,
          bodyClass: true,
          plate: true,
          plateState: true,
          color: true,
          unitNumber: true,
          notes: true,
        },
      },
      jobs: {
        select: {
          id: true,
          name: true,
          note: true,
          laborLines: {
            select: { id: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      shop: { select: { laborRateCents: true } },
    },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  if (!isEstimateEditable(ro.status)) {
    return { ok: false, error: "This repair order is read-only." };
  }

  const baseRate = ro.laborRateCents ?? ro.shop.laborRateCents;
  const { laborTiers } = await getShopMatrices(shopId);
  const createdJobs = new Map<string, string>();
  let applied = 0;
  let skipped = 0;

  for (const item of parsed.data.items) {
    try {
      switch (item.kind) {
        case "customer_phone": {
          const phone = formatPhoneInput(item.proposedValue ?? "");
          if (!phone) {
            skipped++;
            break;
          }
          const res = await updateCustomer({
            id: ro.customer.id,
            type: ro.customer.company ? "business" : "person",
            firstName: ro.customer.firstName,
            lastName: ro.customer.lastName,
            company: ro.customer.company ?? undefined,
            phone,
            email: ro.customer.email ?? undefined,
            address: ro.customer.address ?? undefined,
            city: ro.customer.city ?? undefined,
            state: ro.customer.state ?? undefined,
            zip: ro.customer.zip ?? undefined,
            notes: ro.customer.notes ?? undefined,
            tags: ro.customer.tags,
            marketingOptIn: ro.customer.marketingOptIn,
            transactionalSmsConsent: ro.customer.transactionalSmsConsent,
            marketingEmailConsent: ro.customer.marketingEmailConsent,
          });
          if (res.ok) {
            ro.customer.phone = phone;
            applied++;
          } else skipped++;
          break;
        }
        case "customer_email": {
          const email = (item.proposedValue ?? "").trim();
          if (!email) {
            skipped++;
            break;
          }
          const res = await updateCustomer({
            id: ro.customer.id,
            type: ro.customer.company ? "business" : "person",
            firstName: ro.customer.firstName,
            lastName: ro.customer.lastName,
            company: ro.customer.company ?? undefined,
            phone: ro.customer.phone ?? undefined,
            email,
            address: ro.customer.address ?? undefined,
            city: ro.customer.city ?? undefined,
            state: ro.customer.state ?? undefined,
            zip: ro.customer.zip ?? undefined,
            notes: ro.customer.notes ?? undefined,
            tags: ro.customer.tags,
            marketingOptIn: ro.customer.marketingOptIn,
            transactionalSmsConsent: ro.customer.transactionalSmsConsent,
            marketingEmailConsent: ro.customer.marketingEmailConsent,
          });
          if (res.ok) {
            ro.customer.email = email;
            applied++;
          } else skipped++;
          break;
        }
        case "customer_name": {
          const { firstName, lastName } = splitName(item.proposedValue ?? "");
          if (!firstName) {
            skipped++;
            break;
          }
          const res = await updateCustomer({
            id: ro.customer.id,
            type: "person",
            firstName,
            lastName: lastName || ro.customer.lastName || "Customer",
            company: ro.customer.company ?? undefined,
            phone: ro.customer.phone ?? undefined,
            email: ro.customer.email ?? undefined,
            address: ro.customer.address ?? undefined,
            city: ro.customer.city ?? undefined,
            state: ro.customer.state ?? undefined,
            zip: ro.customer.zip ?? undefined,
            notes: ro.customer.notes ?? undefined,
            tags: ro.customer.tags,
            marketingOptIn: ro.customer.marketingOptIn,
            transactionalSmsConsent: ro.customer.transactionalSmsConsent,
            marketingEmailConsent: ro.customer.marketingEmailConsent,
          });
          if (res.ok) applied++;
          else skipped++;
          break;
        }
        case "vehicle_year":
        case "vehicle_make":
        case "vehicle_model":
        case "vehicle_trim": {
          const patch: Partial<typeof ro.vehicle> = {};
          if (item.kind === "vehicle_year") patch.year = Number(item.proposedValue);
          if (item.kind === "vehicle_make") patch.make = item.proposedValue ?? null;
          if (item.kind === "vehicle_model") patch.model = item.proposedValue ?? null;
          if (item.kind === "vehicle_trim") patch.trim = item.proposedValue ?? null;
          const res = await updateVehicle({
            id: ro.vehicle.id,
            customerId: ro.vehicle.customerId,
            year: patch.year ?? ro.vehicle.year,
            make: patch.make ?? ro.vehicle.make,
            model: patch.model ?? ro.vehicle.model,
            trim: patch.trim ?? ro.vehicle.trim,
            vin: ro.vehicle.vin ?? undefined,
            engine: ro.vehicle.engine ?? undefined,
            transmission: ro.vehicle.transmission ?? undefined,
            drivetrain: ro.vehicle.drivetrain ?? undefined,
            bodyClass: ro.vehicle.bodyClass ?? undefined,
            plate: ro.vehicle.plate ?? undefined,
            plateState: ro.vehicle.plateState ?? undefined,
            color: ro.vehicle.color ?? undefined,
            unitNumber: ro.vehicle.unitNumber ?? undefined,
            notes: ro.vehicle.notes ?? undefined,
          });
          if (res.ok) {
            Object.assign(ro.vehicle, patch);
            applied++;
          } else skipped++;
          break;
        }
        case "concern": {
          const text = (item.proposedValue ?? "").trim();
          if (!text) {
            skipped++;
            break;
          }
          const res = await addConcern({ roId: ro.id, kind: "CUSTOMER", text });
          if (res.ok) applied++;
          else skipped++;
          break;
        }
        case "job": {
          if (!item.job) {
            skipped++;
            break;
          }

          const cleaned = cleanEstimateLaborLine(
            item.job.jobName,
            item.job.laborDescription,
            [],
            item.job.jobNotes ?? "",
          );
          const laborDescription = cleaned.laborDescription || item.job.jobName;

          if (item.job.targetJobId) {
            const existingJob = ro.jobs.find((j) => j.id === item.job!.targetJobId);
            if (!existingJob) {
              skipped++;
              break;
            }

            const laborLineId =
              item.job.laborLineId ?? existingJob.laborLines[0]?.id ?? null;
            const rateCents = shopLaborRate(baseRate, item.job.laborHours, laborTiers);

            const jobRes = await updateJob(item.job.targetJobId, {
              name: item.job.jobName,
              description: item.job.jobNotes ?? existingJob.note,
            });
            if (!jobRes.ok) {
              skipped++;
              break;
            }

            if (laborLineId) {
              const laborRes = await updateLaborLine(laborLineId, {
                description: laborDescription,
                hours: item.job.laborHours,
                rateCents,
              });
              if (!laborRes.ok) {
                skipped++;
                break;
              }
            } else {
              const laborRes = await addLaborLine(item.job.targetJobId, {
                description: laborDescription,
                hours: item.job.laborHours,
                rateCents,
              });
              if (!laborRes.ok) {
                skipped++;
                break;
              }
            }

            existingJob.name = item.job.jobName;
            existingJob.note = item.job.jobNotes ?? existingJob.note;
            createdJobs.set(item.job.jobName.toLowerCase(), item.job.targetJobId);
            applied++;
            break;
          }

          const addRes = await addJob(ro.id, {
            name: item.job.jobName,
            description: item.job.jobNotes ?? item.job.repairRequest,
          });
          if (!addRes.ok) {
            skipped++;
            break;
          }
          const jobRow = await prisma.job.findFirst({
            where: { repairOrderId: ro.id, shopId, name: item.job.jobName },
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true },
          });
          if (!jobRow) {
            skipped++;
            break;
          }
          const rateCents = shopLaborRate(baseRate, item.job.laborHours, laborTiers);
          const laborRes = await addLaborLine(jobRow.id, {
            description: laborDescription,
            hours: item.job.laborHours,
            rateCents,
          });
          if (laborRes.ok) {
            ro.jobs.push({
              id: jobRow.id,
              name: jobRow.name,
              note: cleaned.jobNotes ?? null,
              laborLines: [{ id: "pending" }],
            });
            createdJobs.set(jobRow.name.toLowerCase(), jobRow.id);
            applied++;
          } else skipped++;
          break;
        }
        case "part": {
          if (!item.part) {
            skipped++;
            break;
          }
          const jobId = resolveJobId(
            ro.jobs,
            createdJobs,
            item.part.relatedJobName,
            item.part.targetJobId,
          );
          if (!jobId) {
            skipped++;
            break;
          }
          const vendorNote = [item.part.vendor, item.part.vendorPhone].filter(Boolean).join(" · ");
          const res = await addPartLine(jobId, {
            description: item.part.description,
            partNumber: item.part.partNumber,
            vendor: item.part.vendor ?? (vendorNote || null),
            qty: 1,
            costCents: 0,
            retailCents: 0,
          });
          if (res.ok) applied++;
          else skipped++;
          break;
        }
        default:
          skipped++;
      }
    } catch {
      skipped++;
    }
  }

  for (const path of revalidateEstimatePaths(ro.id)) {
    revalidatePath(path);
  }
  revalidatePath(`/repair-orders/${ro.id}`);

  if (applied === 0) {
    return { ok: false, error: "No changes could be applied. Try adjusting your selection." };
  }

  return { ok: true, applied, skipped };
}
