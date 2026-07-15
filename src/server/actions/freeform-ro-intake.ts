"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { withShopTransaction } from "@/db/tenant-context";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import { resolveAdvanced } from "@/lib/ro-settings";
import type { FreeformRoDraft } from "@/lib/freeform-ro-types";
import { customerSearchWhere } from "@/lib/customer-search";
import { ROStatus } from "@/generated/prisma";
import { gates } from "@/server/permission-gates";
import { ensureAutoApplyFees } from "@/server/ro-fees";
import { getLeadSourceNames } from "@/server/actions/marketing";
import { getShopMatrices, shopLaborRate } from "@/server/pricing-matrix";
import { recomputeRoTotals } from "@/server/estimate";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { releasedFeatureDenied } from "@/lib/subscription";
import { assertShopAiRateLimit } from "@/server/services/ai/client";
import { buildFreeformRoDraft } from "@/server/services/freeform-ro-intake";

const ParseInput = z.object({
  text: z.string().trim().min(8).max(4000),
});

export type ParseFreeformRoResult =
  | { ok: true; draft: FreeformRoDraft }
  | { ok: false; error: string };

/** AI parse + labor lookup for freeform RO intake ($20/mo add-on). */
export async function parseFreeformRoIntake(raw: z.infer<typeof ParseInput>): Promise<ParseFreeformRoResult> {
  const parsed = ParseInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Enter a short description of the vehicle and work needed." };

  const shopId = await getShopId();
  const denied = await releasedFeatureDenied(shopId, "freeform_ro_intake");
  if (denied) return { ok: false, error: denied };

  const viewDenied = await gates.jobBoardView(shopId);
  if (viewDenied) return { ok: false, error: viewDenied.error };

  try {
    await assertShopAiRateLimit(shopId);
    const draft = await buildFreeformRoDraft(shopId, parsed.data.text);
    draft.suggestedCustomerIds = await suggestCustomers(shopId, draft.customerHint);
    return { ok: true, draft };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to build repair order from your description.",
    };
  }
}

const CommitInput = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().min(1).optional(),
  createVehicle: z.boolean().optional(),
  draft: z.object({
    rawText: z.string(),
    vehicle: z.object({
      year: z.number().int().nullable(),
      make: z.string().nullable(),
      model: z.string().nullable(),
      trim: z.string().nullable(),
      vin: z.string().nullable(),
      plate: z.string().nullable(),
      plateState: z.string().nullable(),
      mileage: z.number().int().nullable(),
    }),
    concerns: z.array(z.string()),
    notes: z.string().nullable(),
    jobs: z.array(
      z.object({
        jobName: z.string(),
        repairRequest: z.string(),
        laborHours: z.number(),
        laborDescription: z.string(),
      }),
    ),
  }),
});

export type CommitFreeformRoResult =
  | { ok: true; id: string; number: number }
  | { ok: false; error: string };

/** Create a repair order with jobs + labor from a confirmed freeform draft. */
export async function commitFreeformRoIntake(
  raw: z.infer<typeof CommitInput>,
): Promise<CommitFreeformRoResult> {
  const parsed = CommitInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid repair order draft." };

  const shopId = await getShopId();
  const denied = await releasedFeatureDenied(shopId, "freeform_ro_intake");
  if (denied) return { ok: false, error: denied };

  const editDenied = await gates.estimateEdit(shopId);
  if (editDenied) return { ok: false, error: editDenied.error };

  const d = parsed.data;
  const customer = await prisma.customer.findFirst({
    where: { id: d.customerId, shopId },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  let vehicleId = d.vehicleId;
  if (!vehicleId || d.createVehicle) {
    const v = d.draft.vehicle;
    if (!v.year && !v.make && !v.model && !v.vin) {
      return { ok: false, error: "Vehicle year, make, and model are required." };
    }
    const created = await prisma.vehicle.create({
      data: {
        shopId,
        customerId: d.customerId,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        vin: v.vin,
        plate: v.plate,
        plateState: v.plateState,
      },
      select: { id: true },
    });
    vehicleId = created.id;
  } else {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, shopId, customerId: d.customerId },
      select: { id: true },
    });
    if (!vehicle) return { ok: false, error: "Vehicle not found for this customer." };
  }

  const [shop, allowedSources, currentUser, { laborTiers }] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId }, select: { roAdvanced: true, laborRateCents: true } }),
    getLeadSourceNames(),
    getCurrentUser(),
    getShopMatrices(shopId),
  ]);
  const advanced = resolveAdvanced(shop?.roAdvanced);
  const mileageIn = d.draft.vehicle.mileage;
  if (
    advanced.reqOdometer &&
    (mileageIn == null || mileageIn <= 0)
  ) {
    return { ok: false, error: "Odometer is required for this shop. Add mileage to your description or create manually." };
  }

  const ro = await withShopTransaction(shopId, async (tx) => {
    const last = await tx.repairOrder.findFirst({
      where: { shopId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 1000) + 1;

    let serviceWriterId: string | null = null;
    if (currentUser.id !== "stub-platform-admin") {
      const membership = await tx.membership.findFirst({
        where: { shopId, userId: currentUser.id, active: true },
        select: { userId: true },
      });
      if (membership) serviceWriterId = currentUser.id;
    }
    if (!serviceWriterId) {
      const writer = await tx.membership.findFirst({
        where: {
          shopId,
          active: true,
          role: { in: ["SERVICE_WRITER", "OWNER", "MANAGER"] },
        },
        orderBy: { role: "asc" },
        select: { userId: true },
      });
      serviceWriterId = writer?.userId ?? null;
    }

    const baseRate = shop?.laborRateCents ?? 15000;
    const concerns = d.draft.concerns.filter((c) => c.trim());

    const created = await tx.repairOrder.create({
      data: {
        shopId,
        number,
        customerId: d.customerId,
        vehicleId: vehicleId!,
        status: ROStatus.ESTIMATE,
        serviceWriterId,
        mileageIn: mileageIn ?? null,
        notes: d.draft.notes,
        concerns,
        vehicleConcerns: concerns.length
          ? {
              create: concerns.map((text, i) => ({
                shopId,
                kind: "CUSTOMER" as const,
                text,
                sortOrder: i,
              })),
            }
          : undefined,
        jobs: {
          create: d.draft.jobs.map((job, i) => {
            const hours = Math.max(0.1, job.laborHours);
            const rateCents = shopLaborRate(baseRate, hours, laborTiers);
            return {
              shopId,
              name: job.jobName,
              sortOrder: i + 1,
              laborLines: {
                create: [
                  {
                    shopId,
                    description: job.laborDescription || job.jobName,
                    hours,
                    rateCents,
                    totalCents: Math.round(hours * rateCents),
                  },
                ],
              },
            };
          }),
        },
      },
      select: { id: true, number: true },
    });

    if (mileageIn) {
      await tx.mileageRecord.create({
        data: { shopId, vehicleId: vehicleId!, miles: mileageIn, source: "RO" },
      });
    }

    return created;
  });

  await ensureAutoApplyFees(shopId, ro.id);
  await recomputeRoTotals(ro.id);
  for (const path of revalidateEstimatePaths(ro.id)) {
    revalidatePath(path);
  }
  revalidatePath("/job-board");

  return { ok: true, id: ro.id, number: ro.number };
}

async function suggestCustomers(
  shopId: string,
  hint: FreeformRoDraft["customerHint"],
): Promise<string[]> {
  if (!hint) return [];
  const terms = [hint.phone, hint.email, hint.company, hint.lastName, hint.firstName].filter(
    (t): t is string => Boolean(t?.trim()),
  );
  const ids = new Set<string>();
  for (const term of terms.slice(0, 3)) {
    const rows = await prisma.customer.findMany({
      where: customerSearchWhere(shopId, term.trim()),
      take: 5,
      select: { id: true },
    });
    for (const row of rows) ids.add(row.id);
  }
  return [...ids];
}
