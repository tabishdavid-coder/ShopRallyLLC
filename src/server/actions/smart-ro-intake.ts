"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { withShopTransaction } from "@/db/tenant-context";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import { resolveAdvanced } from "@/lib/ro-settings";
import { customerSearchWhere } from "@/lib/customer-search";
import { phoneDigitsKey } from "@/lib/phone";
import type { SmartRoStagingState } from "@/lib/smart-ro-intake-types";
import { ROStatus } from "@/generated/prisma";
import { gates } from "@/server/permission-gates";
import { ensureAutoApplyFees } from "@/server/ro-fees";
import { getShopMatrices, shopLaborRate } from "@/server/pricing-matrix";
import { recomputeRoTotals } from "@/server/estimate";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { smartRoIntakeDenied } from "@/lib/subscription";
import { parseSmartRoIntakeText } from "@/server/services/smart-ro-intake";

const ParseInput = z.object({
  text: z.string().trim().min(8).max(4000),
});

export type ParseSmartRoResult =
  | { ok: true; staging: SmartRoStagingState }
  | { ok: false; error: string };

/** Gemini parse — returns staging payload only (no DB writes). */
export async function parseSmartRoIntake(raw: z.infer<typeof ParseInput>): Promise<ParseSmartRoResult> {
  const parsed = ParseInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter a short description of the customer, vehicle, and work needed." };
  }

  const shopId = await getShopId();
  const denied = await smartRoIntakeDenied(shopId);
  if (denied) return { ok: false, error: denied };

  const viewDenied = await gates.jobBoardView(shopId);
  if (viewDenied) return { ok: false, error: viewDenied.error };

  try {
    const staging = await parseSmartRoIntakeText(shopId, parsed.data.text);
    staging.suggestedCustomerIds = await suggestCustomersByContact(shopId, staging.customer);
    return { ok: true, staging };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to parse your repair request.",
    };
  }
}

const StagingCustomerSchema = z.object({
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});

const StagingVehicleSchema = z.object({
  year: z.number().int().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  trim: z.string().nullable(),
  engine: z.string().nullable(),
  confidence_score: z.number().int().min(0).max(100),
});

const StagingLaborLineSchema = z.object({
  task_title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  estimated_hours: z.number().positive().max(99),
  confidence_score: z.number().int().min(0).max(100),
});

const CommitInput = z.object({
  rawText: z.string(),
  customer: StagingCustomerSchema,
  vehicle: StagingVehicleSchema,
  laborLines: z.array(StagingLaborLineSchema).min(1),
  /** When set, skip dedupe and use this customer. */
  customerId: z.string().optional(),
  /** When set, attach RO to existing vehicle (must belong to customer). */
  vehicleId: z.string().optional(),
  createVehicle: z.boolean().optional(),
});

export type CommitSmartRoResult =
  | { ok: true; id: string; number: number; customerId: string }
  | { ok: false; error: string };

/** Step A–C: dedupe customer, link/create vehicle, commit estimate with jobs + labor. */
export async function commitSmartRoIntake(
  raw: z.infer<typeof CommitInput>,
): Promise<CommitSmartRoResult> {
  const parsed = CommitInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid staging data. Check required fields." };

  const shopId = await getShopId();
  const denied = await smartRoIntakeDenied(shopId);
  if (denied) return { ok: false, error: denied };

  const editDenied = await gates.estimateEdit(shopId);
  if (editDenied) return { ok: false, error: editDenied.error };

  const d = parsed.data;
  const v = d.vehicle;

  if (!v.year || !v.make?.trim() || !v.model?.trim()) {
    return { ok: false, error: "Vehicle year, make, and model are required." };
  }

  let customerId = d.customerId;
  if (!customerId) {
    const resolved = await resolveOrCreateCustomer(shopId, d.customer);
    if (!resolved.ok) return resolved;
    customerId = resolved.id;
  } else {
    const exists = await prisma.customer.findFirst({
      where: { id: customerId, shopId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "Customer not found." };
  }

  let vehicleId = d.vehicleId;
  if (!vehicleId || d.createVehicle) {
    const created = await prisma.vehicle.create({
      data: {
        shopId,
        customerId,
        year: v.year,
        make: v.make.trim(),
        model: v.model.trim(),
        trim: v.trim?.trim() || null,
        engine: v.engine?.trim() || null,
      },
      select: { id: true },
    });
    vehicleId = created.id;
  } else {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, shopId, customerId },
      select: { id: true },
    });
    if (!vehicle) return { ok: false, error: "Vehicle not found for this customer." };
  }

  const [shop, currentUser, { laborTiers }] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId }, select: { roAdvanced: true, laborRateCents: true } }),
    getCurrentUser(),
    getShopMatrices(shopId),
  ]);
  const advanced = resolveAdvanced(shop?.roAdvanced);
  if (advanced.reqOdometer) {
    return {
      ok: false,
      error: "Odometer is required for this shop. Use manual intake or add mileage to your notes.",
    };
  }

  const baseRate = shop?.laborRateCents ?? 15000;
  const concerns = d.laborLines.map((line) => line.task_title.trim());

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

    const created = await tx.repairOrder.create({
      data: {
        shopId,
        number,
        customerId,
        vehicleId: vehicleId!,
        status: ROStatus.ESTIMATE,
        serviceWriterId,
        notes: d.rawText.trim().slice(0, 2000) || null,
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
          create: d.laborLines.map((line, i) => {
            const hours = Math.max(0.1, line.estimated_hours);
            const rateCents = shopLaborRate(baseRate, hours, laborTiers);
            return {
              shopId,
              name: line.task_title.trim(),
              sortOrder: i + 1,
              laborLines: {
                create: [
                  {
                    shopId,
                    description: line.description.trim() || line.task_title.trim(),
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

    return created;
  });

  await ensureAutoApplyFees(shopId, ro.id);
  await recomputeRoTotals(ro.id);
  for (const path of revalidateEstimatePaths(ro.id)) {
    revalidatePath(path);
  }
  revalidatePath("/job-board");

  return { ok: true, id: ro.id, number: ro.number, customerId };
}

async function suggestCustomersByContact(
  shopId: string,
  customer: z.infer<typeof StagingCustomerSchema>,
): Promise<string[]> {
  const terms = [customer.phone, customer.email].filter((t): t is string => Boolean(t?.trim()));
  const ids = new Set<string>();
  for (const term of terms.slice(0, 2)) {
    const rows = await prisma.customer.findMany({
      where: customerSearchWhere(shopId, term.trim()),
      take: 5,
      select: { id: true },
    });
    for (const row of rows) ids.add(row.id);
  }
  return [...ids];
}

type CustomerResolve =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function resolveOrCreateCustomer(
  shopId: string,
  customer: z.infer<typeof StagingCustomerSchema>,
): Promise<CustomerResolve> {
  const phone = customer.phone?.trim() || null;
  const email = customer.email?.trim() || null;

  if (phone) {
    const digits = phoneDigitsKey(phone);
    const byPhone = await prisma.customer.findFirst({
      where: {
        shopId,
        OR: [
          { phoneDigits: digits },
          { phone: { contains: phone, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (byPhone) return { ok: true, id: byPhone.id };
  }

  if (email) {
    const byEmail = await prisma.customer.findFirst({
      where: {
        shopId,
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (byEmail) return { ok: true, id: byEmail.id };
  }

  const { firstName, lastName, company } = splitCustomerName(customer.name);
  if (!firstName && !lastName && !company) {
    return { ok: false, error: "Customer name or phone/email is required to create a repair order." };
  }

  const created = await prisma.customer.create({
    data: {
      shopId,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      company: company ?? "",
      phone: phone ?? "",
      phoneDigits: phone ? phoneDigitsKey(phone) : null,
      email: email ?? "",
    },
    select: { id: true },
  });

  return { ok: true, id: created.id };
}

function splitCustomerName(name: string | null): {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
} {
  if (!name?.trim()) return { firstName: null, lastName: null, company: null };
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "", company: null };
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
    company: null,
  };
}
