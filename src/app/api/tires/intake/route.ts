import { NextResponse } from "next/server";
import { z } from "zod";

import { createTireOrderForShop } from "@/server/actions/tires";
import { getShopByBookingSlug } from "@/server/booking";

/**
 * Public API stub for the marketing site's /shop-tires intake form.
 *
 * POST /api/tires/intake
 * Headers: x-api-key (optional — set TIRE_INTAKE_API_KEY in env when ready)
 * Body: JSON matching WebsiteTireIntake schema below.
 *
 * The separate website project should POST here after collecting the long
 * tire form + Stripe deposit. CRM creates customer, vehicle, appointment,
 * and TireOrder with source=WEBSITE.
 */
const WebsiteTireIntake = z.object({
  shopSlug: z.string().trim().min(1),
  submissionId: z.string().trim().min(1).max(120),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().max(160).optional().nullable(),
  vehicleYear: z.coerce.number().int().optional().nullable(),
  vehicleMake: z.string().trim().max(60).optional().nullable(),
  vehicleModel: z.string().trim().max(60).optional().nullable(),
  vehicleVin: z.string().trim().max(17).optional().nullable(),
  tireSizeFront: z.string().trim().max(40).optional().nullable(),
  tireSizeRear: z.string().trim().max(40).optional().nullable(),
  tireBrand: z.string().trim().max(80).optional().nullable(),
  tireQuantity: z.number().int().min(1).max(8).default(4),
  tireType: z.string().trim().max(40).optional().nullable(),
  dropOffType: z.string().trim().max(40).optional().nullable(),
  estimatedTotalCents: z.number().int().min(0).optional().nullable(),
  depositCents: z.number().int().min(0).default(0),
  depositPaid: z.boolean().optional(),
  depositMethod: z.enum(["CARD", "CASH", "CHECK", "OTHER"]).optional(),
  depositReference: z.string().trim().max(120).optional().nullable(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export async function POST(request: Request) {
  if (process.env.TIRE_INTAKE_ENABLED !== "true") {
    return NextResponse.json(
      { ok: false, error: "Website tire intake is disabled. Orders are handled via shop email until CRM is wired." },
      { status: 503 },
    );
  }

  const apiKey = process.env.TIRE_INTAKE_API_KEY;
  if (apiKey) {
    const provided = request.headers.get("x-api-key");
    if (provided !== apiKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = WebsiteTireIntake.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid intake payload." }, { status: 400 });
  }
  const data = parsed.data;

  const shop = await getShopByBookingSlug(data.shopSlug);
  if (!shop) {
    return NextResponse.json({ ok: false, error: "Shop not found." }, { status: 404 });
  }

  const depositPaid = data.depositPaid === true && data.depositCents > 0;

  const result = await createTireOrderForShop(shop.id, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    year: data.vehicleYear,
    make: data.vehicleMake,
    model: data.vehicleModel,
    vin: data.vehicleVin,
    tireSizeFront: data.tireSizeFront,
    tireSizeRear: data.tireSizeRear,
    tireBrand: data.tireBrand,
    tireQuantity: data.tireQuantity,
    tireType: data.tireType,
    dropOffType: data.dropOffType,
    estimatedTotalCents: data.estimatedTotalCents,
    depositCents: data.depositCents,
    recordDepositNow: depositPaid,
    depositMethod: depositPaid ? data.depositMethod ?? "CARD" : undefined,
    depositReference: data.depositReference,
    date: data.appointmentDate,
    startTime: data.appointmentTime,
    notes: data.notes,
    source: "WEBSITE",
    websiteSubmissionId: data.submissionId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    tireOrderId: result.id,
    tireOrderNumber: result.number,
  });
}
