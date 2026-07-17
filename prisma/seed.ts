/**
 * Seed: the demo shop is "In & Out AutoHaus Garage" (id `shop_demo`, matching the
 * tenant stub in src/lib/shop.ts). It imports the real customer export from
 * prisma/data/customers.csv, then attaches sample vehicles + repair orders to two
 * real customers so downstream modules have data to render.
 *
 * Idempotent: wipes all data, then recreates.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import {
  PrismaClient,
  AgreementType,
  Role,
  ROStatus,
  InvoiceStatus,
  PaymentMethod,
  PartSource,
  InspectionStatus,
  InspectionItemStatus,
  AppointmentStatus,
  PurchaseOrderStatus,
  TireOrderStatus,
  TireOrderSource,
  type Prisma,
} from "../src/generated/prisma";
import { phoneDigitsKey } from "../src/lib/phone";
import { defaultBookingSettings } from "../src/lib/booking-settings";
import { LEAD_SOURCES } from "../src/lib/options";
import { AUTOMATION_TEMPLATES } from "../src/lib/automations";
import { CAMPAIGN_TEMPLATES } from "../src/lib/campaigns";
import { MOCK_GOOGLE_REVIEWS } from "../src/lib/google-reviews-mock";
import { OILCARE_TERMS_DEFAULT, PLAN_TEMPLATES } from "../src/lib/maintenance-programs";
import {
  DEFAULT_ESTIMATE_TERMS_HTML,
  DEFAULT_INVOICE_TERMS_HTML,
} from "../src/lib/estimate-terms-default";
import { ensureAutoApplyFees } from "../src/lib/ro-fees-apply";
import { FAQ_SEED } from "./data/faqs";
import { hashAgreementContent } from "../src/lib/agreement-hash";
import {
  AGREEMENT_SEED_DEFINITIONS,
  AGREEMENT_SEED_EFFECTIVE_AT,
  AGREEMENT_SEED_VERSION,
  buildPlaceholderAgreementHtml,
} from "../src/lib/agreement-content";

const prisma = new PrismaClient();

const TAX_BPS = 800; // 8.00%
const dollars = (d: number) => Math.round(d * 100); // → integer cents

/** Tekmetric-style default parts matrix (Standard Parts sample). */
const DEFAULT_PART_MATRIX = [
  { minCents: 0, maxCents: 499, multiplier: 4.0 },
  { minCents: 500, maxCents: 1000, multiplier: 3.5 },
  { minCents: 1001, maxCents: 2000, multiplier: 3.25 },
  { minCents: 2001, maxCents: 4000, multiplier: 3.0 },
  { minCents: 4001, maxCents: 6499, multiplier: 2.75 },
  { minCents: 6500, maxCents: 9999, multiplier: 2.5 },
  { minCents: 10000, maxCents: 14999, multiplier: 2.25 },
  { minCents: 15000, maxCents: 50000, multiplier: 2.0 },
  { minCents: 50001, maxCents: 300000, multiplier: 1.75 },
  { minCents: 300001, maxCents: null, multiplier: 1.43 },
] as const;

/** Tekmetric-style default labor matrix. */
const DEFAULT_LABOR_MATRIX = [
  { minHours: 0, maxHours: 1.0, multiplier: 1 },
  { minHours: 1.01, maxHours: 3.0, multiplier: 1.05 },
  { minHours: 3.01, maxHours: 4.0, multiplier: 1.1 },
  { minHours: 4.01, maxHours: 5.0, multiplier: 1.12 },
  { minHours: 5.01, maxHours: 7.0, multiplier: 1.15 },
  { minHours: 7.01, maxHours: 8.0, multiplier: 1.2 },
  { minHours: 8.01, maxHours: 9.0, multiplier: 1.1 },
  { minHours: 9.01, maxHours: 10.0, multiplier: 1.05 },
  { minHours: 10.01, maxHours: null, multiplier: 1.02 },
] as const;

/** Format a raw phone to (XXX) XXX-XXXX when it's a clean 10/11-digit US number. */
function formatPhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return trimmed; // extensions / odd lengths kept as-is
}

type CsvRow = {
  CustomerId: string;
  "First Name": string;
  "Last Name": string;
  "Primary Phone": string;
  Email: string;
  Type: string;
  "Address Line 1": string;
  "Address Line 2": string;
  City: string;
  "State/Province": string;
  Zip: string;
  "Lead Source": string;
  Notes: string;
  "Tax Exempt": string;
};

function loadCustomers(shopId: string): Prisma.CustomerCreateManyInput[] {
  const csv = readFileSync(join(__dirname, "data", "customers.csv"), "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  return rows.map((r) => {
    const leadSource = r["Lead Source"]?.trim();
    return {
      shopId,
      firstName: r["First Name"]?.trim() || "",
      lastName: r["Last Name"]?.trim() || "",
      email: r.Email?.trim() || null,
      phone: formatPhone(r["Primary Phone"]),
      phoneDigits: phoneDigitsKey(formatPhone(r["Primary Phone"])),
      address: r["Address Line 1"]?.trim() || null,
      city: r.City?.trim() || null,
      state: r["State/Province"]?.trim() || null,
      zip: r.Zip?.trim() || null,
      notes: r.Notes?.trim() || null,
      tags: leadSource ? [leadSource] : [],
    };
  });
}

async function wipe() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inspectionItem.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.laborLine.deleteMany();
  await prisma.partLine.deleteMany();
  await prisma.job.deleteMany();
  await prisma.cannedJobLaborLine.deleteMany();
  await prisma.cannedJobPartLine.deleteMany();
  await prisma.cannedJob.deleteMany();
  await prisma.redeemedEntitlement.deleteMany();
  await prisma.planRedemption.deleteMany();
  await prisma.repairOrder.deleteMany();
  await prisma.mileageRecord.deleteMany();
  await prisma.tireOrder.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.automationSend.deleteMany();
  await prisma.marketingAutomation.deleteMany();
  await prisma.campaignSend.deleteMany();
  await prisma.marketingCampaign.deleteMany();
  await prisma.googleReview.deleteMany();
  await prisma.shopIntegration.deleteMany();
  await prisma.subscriptionPayment.deleteMany();
  await prisma.subscriptionVehicle.deleteMany();
  await prisma.subscriptionEntitlement.deleteMany();
  await prisma.planSubscription.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.loginEvent.deleteMany();
  await prisma.legalAcceptance.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.shopWebsiteConfig.deleteMany();
  await prisma.faqArticle.deleteMany();
  await prisma.agreementDocument.deleteMany();
  await prisma.planEntitlement.deleteMany();
  await prisma.planVehicleClassPrice.deleteMany();
  await prisma.maintenancePlan.deleteMany();
  await prisma.maintenanceProgramService.deleteMany();
  await prisma.maintenanceProgramSettings.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.platform.deleteMany();
}

async function main() {
  await wipe();

  // ── Platform ───────────────────────────────────────────
  const platform = await prisma.platform.create({
    data: { id: "platform_rp", name: "ShopRally" },
  });

  // ── Platform legal documents (v1.0.0 placeholders) ─────
  for (const def of AGREEMENT_SEED_DEFINITIONS) {
    const contentHtml = buildPlaceholderAgreementHtml(def.title, [...def.sections]);
    await prisma.agreementDocument.create({
      data: {
        type: def.type as AgreementType,
        version: AGREEMENT_SEED_VERSION,
        title: def.title,
        contentHtml,
        contentHash: hashAgreementContent(contentHtml),
        effectiveAt: AGREEMENT_SEED_EFFECTIVE_AT,
        isCurrent: true,
        requiresReaccept: true,
      },
    });
  }

  const agreementDocs = await prisma.agreementDocument.findMany({
    where: { isCurrent: true },
  });

  // ── Shops ──────────────────────────────────────────────
  const demo = await prisma.shop.create({
    data: {
      id: "shop_demo",
      platformId: platform.id,
      name: "In & Out AutoHaus Garage",
      code: "IO",
      masterId: "RP-IO-784291",
      masterIdCreatedAt: new Date(),
      phone: "(518) 555-0100",
      email: "service@inandoutautohaus.com",
      address: "123 State Street",
      city: "Schenectady",
      state: "NY",
      zip: "12305",
      laborRateCents: dollars(150),
      taxRateBps: TAX_BPS,
      landlineNumber: "(518) 555-0100",
      twilioPhoneNumber: "+15185550100",
      smsEnabled: true,
      apptDayStart: "06:00",
      apptDayEnd: "19:00",
      apptDefaultDurationMins: 60,
      bookingSlug: "in-and-out-autohaus",
      clerkOrgId: process.env.CLERK_DEMO_ORG_ID?.trim() || null,
      onlineBookingEnabled: true,
      bookingSettings: defaultBookingSettings("06:00", "19:00") as unknown as Prisma.InputJsonValue,
      partMatrix: {
        create: DEFAULT_PART_MATRIX.map((t, i) => ({ ...t, sortOrder: i })),
      },
      laborMatrix: {
        create: DEFAULT_LABOR_MATRIX.map((t, i) => ({ ...t, sortOrder: i })),
      },
      plan: "PROFESSIONAL",
      billingStatus: "ACTIVE",
      estimateTermsHtml: DEFAULT_ESTIMATE_TERMS_HTML,
      invoiceTermsHtml: DEFAULT_INVOICE_TERMS_HTML,
      estimateTermsVersion: "1.0",
      estimateTermsUpdatedAt: new Date(),
    },
  });

  await prisma.leadSource.createMany({
    data: LEAD_SOURCES.map((name, i) => ({
      shopId: demo.id,
      name,
      sortOrder: i,
    })),
  });

  // ShopWebsiteConfig schema placeholder — unpublished until customer purchases Website & SEO add-on.
  await prisma.shopWebsiteConfig.create({
    data: {
      shopId: demo.id,
      published: false,
      heroHeadline: "Trusted Auto Repair in Schenectady",
      heroSubtext: "Fast, honest service with online booking — brakes, maintenance, diagnostics & more.",
      aboutText:
        "In & Out AutoHaus Garage has served Schenectady drivers for over 15 years. Our ASE-certified technicians use modern diagnostics and quality parts. We explain every repair in plain English — no surprises.",
      servicesJson: [
        {
          title: "General Repair & Maintenance",
          description: "Oil changes, factory maintenance, fluids, filters, and multi-point inspections.",
        },
        {
          title: "Brake Service",
          description: "Pads, rotors, calipers, and brake fluid — safety inspected on every job.",
        },
        {
          title: "Engine Diagnostics",
          description: "Check-engine light, performance issues, and computer diagnostics.",
        },
        {
          title: "Tires & Alignment",
          description: "Tire sales, rotation, balancing, and precision wheel alignment.",
        },
      ],
      metaTitle: "In & Out AutoHaus Garage | Auto Repair in Schenectady, NY",
      metaDescription:
        "Schenectady auto repair you can trust. Brakes, maintenance, diagnostics & tires. Book online at In & Out AutoHaus Garage.",
      keywords: ["auto repair schenectady", "brake service schenectady", "oil change schenectady"],
      schemaEnabled: true,
    },
  });

  // RO Settings → Shop Fees (auto-applied to every repair order).
  await prisma.shopFeeTemplate.createMany({
    data: [
      {
        shopId: demo.id,
        name: "Shop Supplies",
        autoApply: true,
        method: "PERCENT",
        base: "LABOR_PARTS",
        amount: 300, // 3%
        taxable: false,
        sortOrder: 0,
      },
      {
        shopId: demo.id,
        name: "Environmental Fee",
        autoApply: true,
        method: "FIXED",
        base: "LABOR_PARTS",
        amount: dollars(5),
        taxable: false,
        sortOrder: 1,
      },
    ],
  });

  await prisma.shop.create({
    data: {
      id: "shop_eastside",
      platformId: platform.id,
      name: "Eastside Auto Care",
      code: "EA",
      masterId: "RP-EA-392847",
      masterIdCreatedAt: new Date(),
      city: "Albany",
      state: "NY",
      plan: "STARTER",
      billingStatus: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  /** Core plan QA tenant — Macuto Auto Repair (platform admin + Core fidelity). */
  const macuto = await prisma.shop.create({
    data: {
      id: "shop_macuto",
      platformId: platform.id,
      name: "Macuto Auto Repair",
      code: "MAC",
      masterId: "RP-MAC-104827",
      masterIdCreatedAt: new Date(),
      phone: "(718) 555-0199",
      email: "service@macutoautorepair.com",
      address: "450 Grand Concourse",
      city: "Bronx",
      state: "NY",
      zip: "10451",
      laborRateCents: dollars(125),
      taxRateBps: TAX_BPS,
      apptDayStart: "08:00",
      apptDayEnd: "18:00",
      apptDefaultDurationMins: 60,
      plan: "STARTER",
      billingStatus: "ACTIVE",
      legalEntityName: "Macuto Auto Repair",
      legalEntityState: "NY",
      estimateTermsHtml: DEFAULT_ESTIMATE_TERMS_HTML,
      invoiceTermsHtml: DEFAULT_INVOICE_TERMS_HTML,
      estimateTermsVersion: "1.0",
      estimateTermsUpdatedAt: new Date(),
      planFeatures: {
        freeformRoIntake: true,
        _release: { aiSuite: true },
      },
    },
  });

  await prisma.leadSource.createMany({
    data: LEAD_SOURCES.map((name, i) => ({
      shopId: macuto.id,
      name,
      sortOrder: i,
    })),
  });

  // ── Users + memberships ────────────────────────────────
  const platformAdmin = await prisma.user.create({
    data: {
      email: "platform@repairpilot.com",
      firstName: "Platform",
      lastName: "Admin",
      isPlatformAdmin: true,
    },
  });
  const owner = await prisma.user.create({
    data: { email: "david@inandout.test", firstName: "David", lastName: "Tabish" },
  });
  const carlos = await prisma.user.create({
    data: { email: "carlos@inandout.test", firstName: "Carlos", lastName: "Mendez" },
  });
  const priya = await prisma.user.create({
    data: {
      email: "priya@inandout.test",
      firstName: "Priya",
      lastName: "Patel",
      phone: "(518) 555-0142",
    },
  });
  // Macuto staff — dedicated advisor + technician so pickers stay separate in Core QA.
  const elena = await prisma.user.create({
    data: { email: "elena@macutoautorepair.test", firstName: "Elena", lastName: "Macuto" },
  });
  const miguel = await prisma.user.create({
    data: { email: "miguel@macutoautorepair.test", firstName: "Miguel", lastName: "Santos" },
  });
  // canPerformWork drives technician pickers/tech board; advisors and
  // non-wrenching owners must be false so tech and advisor lists stay separate.
  await prisma.membership.createMany({
    data: [
      { shopId: demo.id, userId: owner.id, role: Role.OWNER, canPerformWork: false },
      {
        shopId: demo.id,
        userId: carlos.id,
        role: Role.TECHNICIAN,
        payrollType: "FLAT_RATE",
        permissionGroup: "Technician",
        permissionMode: "GROUP",
        canPerformWork: true,
      },
      {
        shopId: demo.id,
        userId: priya.id,
        role: Role.SERVICE_WRITER,
        payrollType: "HOURLY",
        permissionGroup: "Service Advisor",
        permissionMode: "GROUP",
        canPerformWork: false,
      },
      { shopId: macuto.id, userId: owner.id, role: Role.OWNER, canPerformWork: false },
      { shopId: macuto.id, userId: platformAdmin.id, role: Role.OWNER, canPerformWork: false },
      {
        shopId: macuto.id,
        userId: elena.id,
        role: Role.SERVICE_WRITER,
        payrollType: "HOURLY",
        permissionGroup: "Service Advisor",
        permissionMode: "GROUP",
        canPerformWork: false,
      },
      {
        shopId: macuto.id,
        userId: miguel.id,
        role: Role.TECHNICIAN,
        payrollType: "FLAT_RATE",
        permissionGroup: "Technician",
        permissionMode: "GROUP",
        canPerformWork: true,
      },
    ],
  });

  // Demo shop legal acceptances — keep shop_demo unblocked by compliance gate.
  await prisma.shop.update({
    where: { id: demo.id },
    data: {
      legalEntityName: demo.name,
      legalEntityState: "NY",
    },
  });
  for (const doc of agreementDocs) {
    await prisma.legalAcceptance.create({
      data: {
        shopId: demo.id,
        userId: owner.id,
        agreementType: doc.type,
        agreementVersion: doc.version,
        contentHash: doc.contentHash,
        signerName: "David Tabish",
        signerTitle: "Owner",
        signerEmail: owner.email,
        acceptanceMethod: "clickwrap_checkbox",
        metadata: {
          legalEntityName: demo.name,
          legalEntityState: "NY",
          seeded: true,
        },
      },
    });
    await prisma.legalAcceptance.create({
      data: {
        shopId: macuto.id,
        userId: owner.id,
        agreementType: doc.type,
        agreementVersion: doc.version,
        contentHash: doc.contentHash,
        signerName: "David Tabish",
        signerTitle: "Owner",
        signerEmail: owner.email,
        acceptanceMethod: "clickwrap_checkbox",
        metadata: {
          legalEntityName: macuto.name,
          legalEntityState: "NY",
          seeded: true,
        },
      },
    });
  }

  // ── Macuto (Core) — estimate demo RO ───────────────────
  const macutoCustomer = await prisma.customer.create({
    data: {
      id: "cust_macuto_maria",
      shopId: macuto.id,
      firstName: "Maria",
      lastName: "Cortes",
      phone: "(718) 555-0144",
      phoneDigits: phoneDigitsKey("(718) 555-0144"),
      email: "maria.cortes@example.com",
    },
  });

  const macutoVehicle = await prisma.vehicle.create({
    data: {
      id: "veh_macuto_accord",
      shopId: macuto.id,
      customerId: macutoCustomer.id,
      year: 2014,
      make: "Honda",
      model: "Accord",
      trim: "EX-L",
      engine: "3.5L V6",
      transmission: "6-Speed Automatic",
      drivetrain: "FWD",
      plate: "MAC-1041",
      plateState: "NY",
      color: "Modern Steel Metallic",
    },
  });

  await prisma.cannedJob.create({
    data: {
      shopId: macuto.id,
      name: "Front brake pads & rotors",
      category: "Brakes",
      description: "Replace front brake pads and rotors",
      sortOrder: 0,
      usageCount: 3,
      createdById: owner.id,
    },
  });

  const macutoLabor = dollars(187.5);
  const macutoParts = dollars(89) + dollars(178);
  const macutoSupplies = dollars(6);
  const macutoTax = Math.round(((macutoLabor + macutoParts + macutoSupplies) * TAX_BPS) / 10000);

  await prisma.repairOrder.create({
    data: {
      id: "ro_macuto_1001",
      shopId: macuto.id,
      number: 1001,
      customerId: macutoCustomer.id,
      vehicleId: macutoVehicle.id,
      status: ROStatus.ESTIMATE,
      serviceWriterId: elena.id,
      technicianId: miguel.id,
      mileageIn: 87420,
      laborRateCents: dollars(125),
      concerns: ["Front brakes grinding", "Steering wheel vibration when braking"],
      laborSubtotalCents: macutoLabor,
      partsSubtotalCents: macutoParts,
      shopSuppliesCents: macutoSupplies,
      taxCents: macutoTax,
      totalCents: macutoLabor + macutoParts + macutoSupplies + macutoTax,
      jobs: {
        create: [
          {
            shopId: macuto.id,
            name: "Front brake pads & rotors",
            authorized: false,
            laborLines: {
              create: [
                {
                  shopId: macuto.id,
                  description: "R&R front brake pads and rotors",
                  hours: 1.5,
                  rateCents: dollars(125),
                  totalCents: macutoLabor,
                  technicianId: miguel.id,
                },
              ],
            },
            partLines: {
              create: [
                {
                  shopId: macuto.id,
                  description: "Front brake pad set",
                  partNumber: "BP-HA14F",
                  brand: "Akebono",
                  quantity: 1,
                  costCents: dollars(52),
                  retailCents: dollars(89),
                  totalCents: dollars(89),
                },
                {
                  shopId: macuto.id,
                  description: "Front brake rotor",
                  partNumber: "RT-HA14F",
                  brand: "Bosch",
                  quantity: 2,
                  costCents: dollars(78),
                  retailCents: dollars(89),
                  totalCents: dollars(178),
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Demo login history for the owner (Employees → History tab).
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  await prisma.loginEvent.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      shopId: demo.id,
      userId: owner.id,
      loggedInAt: new Date(Date.now() - i * 86400000 * 2 - 3600000 * 9),
      ipAddress: "67.249.239.227",
      userAgent: ua,
    })),
  });

  // ── Canned jobs (demo templates) ───────────────────────
  await prisma.cannedJob.createMany({
    data: [
      {
        shopId: demo.id,
        name: "Synthetic oil & filter change",
        category: "Maintenance",
        description: "Full synthetic oil change with filter replacement",
        sortOrder: 0,
        usageCount: 12,
        lastUsedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        createdById: owner.id,
      },
      {
        shopId: demo.id,
        name: "Front brake pads & rotors",
        category: "Brakes",
        description: "Replace front brake pads and rotors",
        sortOrder: 1,
        usageCount: 5,
        lastUsedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        createdById: owner.id,
      },
      {
        shopId: demo.id,
        name: "NYS inspection",
        category: "Inspection",
        sortOrder: 2,
        usageCount: 8,
        createdById: priya.id,
      },
      {
        shopId: demo.id,
        name: "Coolant flush",
        category: "Fluids",
        sortOrder: 3,
        usageCount: 2,
        createdById: owner.id,
      },
      {
        shopId: demo.id,
        name: "Tire rotation",
        category: "Maintenance",
        description: "Rotate tires and check tread depth",
        sortOrder: 4,
        usageCount: 6,
        createdById: owner.id,
      },
      {
        shopId: demo.id,
        name: "Brake inspection",
        category: "Brakes",
        description: "Visual brake pad, rotor, and fluid check",
        sortOrder: 5,
        usageCount: 4,
        createdById: owner.id,
      },
      {
        shopId: demo.id,
        name: "Multi-point inspection",
        category: "Inspection",
        description: "21-point vehicle health inspection",
        sortOrder: 6,
        usageCount: 10,
        createdById: priya.id,
      },
      {
        shopId: demo.id,
        name: "Battery test & service",
        category: "Maintenance",
        description: "Load test battery and clean terminals",
        sortOrder: 7,
        usageCount: 3,
        createdById: owner.id,
      },
    ],
  });

  const canned = await prisma.cannedJob.findMany({ where: { shopId: demo.id }, orderBy: { sortOrder: "asc" } });

  await prisma.cannedJobLaborLine.createMany({
    data: [
      { shopId: demo.id, cannedJobId: canned[0].id, description: "Full synthetic oil & filter change", hours: 0.5, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[1].id, description: "Replace front brake pads and rotors", hours: 2.0, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[2].id, description: "NYS safety & emissions inspection", hours: 0.5, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[3].id, description: "Drain, flush cooling system, refill coolant", hours: 1.2, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[4].id, description: "Rotate tires, check pressure & tread", hours: 0.4, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[5].id, description: "Visual brake inspection", hours: 0.3, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[6].id, description: "21-point inspection checklist", hours: 0.3, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[7].id, description: "Battery load test & terminal clean", hours: 0.2, sortOrder: 0 },
    ],
  });

  await prisma.cannedJobPartLine.createMany({
    data: [
      { shopId: demo.id, cannedJobId: canned[0].id, description: "Oil filter", brand: "Motorcraft", partNumber: "OF-1240", costCents: dollars(7), quantity: 1, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[0].id, description: "5W-30 full synthetic (6 qt)", brand: "Mobil 1", partNumber: "OIL-530", costCents: dollars(28), quantity: 1, sortOrder: 1 },
      { shopId: demo.id, cannedJobId: canned[1].id, description: "Front brake pad set", brand: "Akebono", partNumber: "BP-4821", costCents: dollars(48), quantity: 1, sortOrder: 0 },
      { shopId: demo.id, cannedJobId: canned[1].id, description: "Front rotor", brand: "Bosch", partNumber: "RT-9920", costCents: dollars(95), quantity: 2, sortOrder: 1 },
      { shopId: demo.id, cannedJobId: canned[3].id, description: "Coolant concentrate (1 gal)", brand: "Prestone", partNumber: "AF-550", costCents: dollars(18), quantity: 1, sortOrder: 0 },
    ],
  });

  // ── Import real customers from CSV ─────────────────────
  const customers = loadCustomers(demo.id);
  await prisma.customer.createMany({ data: customers });
  console.log(`  imported ${customers.length} customers from CSV`);

  // ── Attach sample vehicles + ROs to two real customers ──
  const david = await prisma.customer.findFirst({
    where: {
      shopId: demo.id,
      OR: [
        { firstName: "Tabish", lastName: "David" },
        { phone: "(518) 227-9897" },
      ],
    },
  });
  const mark = await prisma.customer.findFirst({
    where: {
      shopId: demo.id,
      OR: [
        { firstName: "Mark", lastName: "Johnson" },
        { phone: "(919) 836-3766" },
      ],
    },
  });

  if (david) {
    const camry = await prisma.vehicle.create({
      data: {
        shopId: demo.id,
        customerId: david.id,
        vin: "4T1B11HK1KU123456",
        year: 2019,
        make: "Toyota",
        model: "Camry",
        trim: "LE",
        engine: "2.5L L4",
        transmission: "8-Speed Automatic",
        drivetrain: "FWD",
        plate: "BWX-4421",
        plateState: "NY",
        color: "Silver",
      },
    });

    const labor = dollars(250);
    const parts = dollars(80) + dollars(160) * 2;
    const supplies = dollars(8);
    const tax = Math.round(((labor + parts + supplies) * TAX_BPS) / 10000);

    await prisma.repairOrder.create({
      data: {
        shopId: demo.id,
        number: 1001,
        customerId: david.id,
        vehicleId: camry.id,
        status: ROStatus.IN_PROGRESS,
        serviceWriterId: priya.id,
        technicianId: carlos.id,
        mileageIn: 41250,
        laborSubtotalCents: labor,
        partsSubtotalCents: parts,
        shopSuppliesCents: supplies,
        taxCents: tax,
        totalCents: labor + parts + supplies + tax,
        jobs: {
          create: [
            {
              shopId: demo.id,
              name: "Front brake pads & rotors",
              authorized: true,
              laborLines: {
                create: [
                  { shopId: demo.id, description: "Replace front brake pads and rotors", hours: 2.0, rateCents: dollars(125), totalCents: labor, technicianId: carlos.id },
                ],
              },
              partLines: {
                create: [
                  { shopId: demo.id, description: "Front brake pad set", partNumber: "BP-4821", brand: "Akebono", quantity: 1, costCents: dollars(48), retailCents: dollars(80), totalCents: dollars(80) },
                  { shopId: demo.id, description: "Front rotor", partNumber: "RT-9920", brand: "Bosch", quantity: 2, costCents: dollars(95), retailCents: dollars(160), totalCents: dollars(160) * 2 },
                ],
              },
            },
          ],
        },
      },
    });

    const davidRo = await prisma.repairOrder.findFirst({
      where: { shopId: demo.id, number: 1001 },
      select: { id: true },
    });

    if (davidRo) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.message.createMany({
        data: [
          {
            shopId: demo.id,
            customerId: david.id,
            repairOrderId: davidRo.id,
            direction: "OUTBOUND",
            body: "Hi Tabish, your Camry is checked in for brake service. We'll text when it's ready.",
            status: "delivered",
            fromNumber: "+15185550100",
            toNumber: "+15182279897",
            sentAt: weekAgo,
            createdAt: weekAgo,
          },
          {
            shopId: demo.id,
            customerId: david.id,
            repairOrderId: davidRo.id,
            direction: "INBOUND",
            body: "Thanks! Any update on timing?",
            status: "received",
            fromNumber: "+15182279897",
            toNumber: "+15185550100",
            sentAt: dayAgo,
            createdAt: dayAgo,
          },
          {
            shopId: demo.id,
            customerId: david.id,
            repairOrderId: davidRo.id,
            direction: "OUTBOUND",
            body: "Should be ready by 4 PM today. Front pads and rotors are on the lift now.",
            status: "delivered",
            fromNumber: "+15185550100",
            toNumber: "+15182279897",
            sentAt: new Date(dayAgo.getTime() + 30 * 60 * 1000),
            createdAt: new Date(dayAgo.getTime() + 30 * 60 * 1000),
          },
        ],
      });
    }

    await prisma.mileageRecord.createMany({
      data: [
        { shopId: demo.id, vehicleId: camry.id, miles: 35100, source: "RO" },
        { shopId: demo.id, vehicleId: camry.id, miles: 41250, source: "RO" },
      ],
    });
  }

  if (mark) {
    const f150 = await prisma.vehicle.create({
      data: {
        shopId: demo.id,
        customerId: mark.id,
        vin: "1FTFW1ET5DFC10312",
        year: 2015,
        make: "Ford",
        model: "F-150",
        trim: "XLT",
        engine: "3.5L EcoBoost V6",
        transmission: "6-Speed Automatic",
        drivetrain: "4WD",
        plate: "TRK-2210",
        plateState: "NY",
        color: "Black",
      },
    });

    const labor = dollars(62.5);
    const parts = dollars(12) + dollars(45);
    const supplies = dollars(5);
    const tax = Math.round(((labor + parts + supplies) * TAX_BPS) / 10000);
    const total = labor + parts + supplies + tax;

    const ro = await prisma.repairOrder.create({
      data: {
        shopId: demo.id,
        number: 1002,
        customerId: mark.id,
        vehicleId: f150.id,
        status: ROStatus.COMPLETED,
        serviceWriterId: priya.id,
        technicianId: carlos.id,
        mileageIn: 88100,
        mileageOut: 88100,
        completedAt: new Date(),
        laborSubtotalCents: labor,
        partsSubtotalCents: parts,
        shopSuppliesCents: supplies,
        taxCents: tax,
        totalCents: total,
        jobs: {
          create: [
            {
              shopId: demo.id,
              name: "Synthetic oil change",
              authorized: true,
              laborLines: {
                create: [
                  { shopId: demo.id, description: "Full synthetic oil & filter change", hours: 0.5, rateCents: dollars(125), totalCents: labor, technicianId: carlos.id },
                ],
              },
              partLines: {
                create: [
                  { shopId: demo.id, description: "Oil filter", partNumber: "OF-1240", brand: "Motorcraft", quantity: 1, costCents: dollars(7), retailCents: dollars(12), totalCents: dollars(12) },
                  { shopId: demo.id, description: "5W-30 full synthetic (6 qt)", partNumber: "OIL-530", brand: "Mobil 1", quantity: 1, costCents: dollars(28), retailCents: dollars(45), totalCents: dollars(45) },
                ],
              },
            },
          ],
        },
        inspections: {
          create: [
            {
              shopId: demo.id,
              templateName: "Courtesy Multi-Point Inspection",
              status: InspectionStatus.COMPLETED,
              performedById: carlos.id,
              performedAt: new Date(),
              shareToken: randomBytes(24).toString("base64url"),
              items: {
                create: [
                  { shopId: demo.id, name: "Front brakes", category: "Brakes", status: InspectionItemStatus.GREEN, sortOrder: 0 },
                  { shopId: demo.id, name: "Rear brakes", category: "Brakes", status: InspectionItemStatus.YELLOW, note: "~4mm pad life remaining", sortOrder: 1 },
                  { shopId: demo.id, name: "Air filter", category: "Engine", status: InspectionItemStatus.RED, note: "Heavily soiled — recommend replacement", sortOrder: 2 },
                  { shopId: demo.id, name: "Tires", category: "Tires", status: InspectionItemStatus.GREEN, sortOrder: 3 },
                  { shopId: demo.id, name: "Battery", category: "Electrical", status: InspectionItemStatus.GREEN, sortOrder: 4 },
                ],
              },
            },
          ],
        },
      },
    });

    await prisma.invoice.create({
      data: {
        shopId: demo.id,
        repairOrderId: ro.id,
        number: 5001,
        status: InvoiceStatus.PAID,
        subtotalCents: labor + parts + supplies,
        taxCents: tax,
        totalCents: total,
        balanceCents: 0,
        issuedAt: new Date(),
        shareToken: randomBytes(24).toString("base64url"),
        payments: { create: [{ shopId: demo.id, amountCents: total, method: PaymentMethod.CARD, reference: "Visa ••4242" }] },
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        shopId: demo.id,
        repairOrderId: ro.id,
        number: 1001,
        vendor: "Motorcraft",
        totalCents: dollars(7) + dollars(28),
        status: PurchaseOrderStatus.ORDERED,
      },
    });

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 20 * 60 * 60 * 1000);
    await prisma.message.createMany({
      data: [
        {
          shopId: demo.id,
          customerId: mark.id,
          repairOrderId: ro.id,
          direction: "OUTBOUND",
          body: "Hello Mark, your F-150 oil change from In & Out AutoHaus Garage is complete. Balance $0 — thank you!",
          status: "delivered",
          fromNumber: "+15185550100",
          toNumber: "+19198363766",
          sentAt: twoDaysAgo,
          createdAt: twoDaysAgo,
        },
        {
          shopId: demo.id,
          customerId: mark.id,
          repairOrderId: ro.id,
          direction: "INBOUND",
          body: "Great service, thanks! When should I come back for the air filter?",
          status: "received",
          fromNumber: "+19198363766",
          toNumber: "+15185550100",
          sentAt: yesterday,
          createdAt: yesterday,
        },
      ],
    });
  }

  // ── Third demo SMS thread (any customer with a phone) ──
  {
    const excludeThreadCustomers = [david?.id, mark?.id].filter((id): id is string => Boolean(id));
    const third = await prisma.customer.findFirst({
      where: {
        shopId: demo.id,
        phone: { not: null },
        ...(excludeThreadCustomers.length > 0 ? { id: { notIn: excludeThreadCustomers } } : {}),
      },
      orderBy: { lastName: "asc" },
    });

    if (third) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await prisma.message.createMany({
        data: [
          {
            shopId: demo.id,
            customerId: third.id,
            direction: "OUTBOUND",
            body: `Hello ${third.firstName}, your estimate from In & Out AutoHaus Garage is ready. Reply if you have questions. Reply STOP to unsubscribe.`,
            status: "delivered",
            fromNumber: "+15185550100",
            sentAt: threeDaysAgo,
            createdAt: threeDaysAgo,
          },
          {
            shopId: demo.id,
            customerId: third.id,
            direction: "INBOUND",
            body: "Could you tell me how the financing works?",
            status: "received",
            fromNumber: "+15551234567",
            toNumber: "+15185550100",
            sentAt: new Date(threeDaysAgo.getTime() + 4 * 60 * 60 * 1000),
            createdAt: new Date(threeDaysAgo.getTime() + 4 * 60 * 60 * 1000),
          },
        ],
      });
    }
  }

  // ── Bulk demo repair orders across statuses (populate the Job Board) ──
  const VEHICLE_POOL = [
    { year: 2019, make: "Nissan", model: "Sentra" },
    { year: 2017, make: "Audi", model: "Q7" },
    { year: 2005, make: "Ford", model: "F-150" },
    { year: 2014, make: "Subaru", model: "Outback" },
    { year: 2017, make: "BMW", model: "540i xDrive" },
    { year: 2020, make: "Nissan", model: "Altima" },
    { year: 2013, make: "Hyundai", model: "Accent" },
    { year: 2017, make: "Dodge", model: "Grand Caravan" },
    { year: 2023, make: "Toyota", model: "Camry" },
    { year: 2011, make: "Volkswagen", model: "Jetta" },
    { year: 2011, make: "Honda", model: "CR-V" },
    { year: 1990, make: "Porsche", model: "928" },
    { year: 2017, make: "Jeep", model: "Cherokee" },
    { year: 2022, make: "Kia", model: "Sportage" },
    { year: 2009, make: "Toyota", model: "Camry" },
    { year: 2016, make: "Volvo", model: "XC60" },
    { year: 2015, make: "Mercedes-Benz", model: "C300" },
    { year: 2018, make: "Chevrolet", model: "Equinox" },
  ];

  const JOB_NAMES = [
    "Synthetic oil & filter change",
    "Front brake pads & rotors",
    "NYS inspection",
    "Replace serpentine belt",
    "Diagnose check engine light",
    "Replace front struts",
    "Coolant flush",
    "Replace battery",
    "Wheel alignment",
    "Replace spark plugs",
    "Replace exhaust pipe",
    "Replace water pump",
  ];

  // Status plan: lots of estimates, a few WIP, several completed.
  const PLAN: ROStatus[] = [
    ...Array(8).fill(ROStatus.ESTIMATE),
    ...Array(4).fill(ROStatus.IN_PROGRESS),
    ...Array(6).fill(ROStatus.COMPLETED),
  ];

  const pool = await prisma.customer.findMany({
    where: { shopId: demo.id, phone: { not: null } },
    take: 40,
    orderBy: { lastName: "asc" },
    select: { id: true },
  });

  const HOUR = 3600 * 1000;
  let roNumber = 1003;
  let invNumber = 5002;
  let poNumber = 1002;

  for (let i = 0; i < PLAN.length && i < pool.length; i++) {
    const cust = pool[i];
    const v = VEHICLE_POOL[i % VEHICLE_POOL.length];
    const status = PLAN[i];
    const amount = dollars(120 + ((i * 487) % 3400)); // spread of plausible totals
    const createdAt = new Date(Date.now() - (i + 1) * 9 * HOUR);

    const vehicle = await prisma.vehicle.create({
      data: {
        shopId: demo.id,
        customerId: cust.id,
        year: v.year,
        make: v.make,
        model: v.model,
        plate: `RP${1000 + i}`,
        plateState: "NY",
      },
    });

    const laborCents = Math.round(amount * 0.47);
    const partsCents = Math.round(amount * 0.45);
    const jobName = JOB_NAMES[i % JOB_NAMES.length];
    const hours = Math.max(0.3, Math.round((laborCents / 15000) * 10) / 10);
    const isApprovalDemo = status === ROStatus.ESTIMATE && i === 0;
    const approvalToken = isApprovalDemo ? randomBytes(24).toString("base64url") : null;
    const secondJobName = JOB_NAMES[(i + 1) % JOB_NAMES.length];
    const secondLaborCents = Math.round(laborCents * 0.55);
    const secondPartsCents = Math.round(partsCents * 0.4);
    const secondHours = Math.max(0.3, Math.round((secondLaborCents / 15000) * 10) / 10);

    const ro = await prisma.repairOrder.create({
      data: {
        shopId: demo.id,
        number: roNumber++,
        customerId: cust.id,
        vehicleId: vehicle.id,
        status,
        totalCents: amount,
        partsSubtotalCents: partsCents,
        laborSubtotalCents: laborCents,
        taxCents: Math.round(amount * 0.074),
        createdAt,
        completedAt: status === ROStatus.COMPLETED ? createdAt : null,
        approvalToken,
        approvalSentAt: isApprovalDemo ? createdAt : null,
        jobs: {
          create: [
            {
              shopId: demo.id,
              name: jobName,
              authorized: status !== ROStatus.ESTIMATE,
              laborLines: {
                create: [
                  { shopId: demo.id, description: jobName, hours, rateCents: 15000, totalCents: laborCents },
                ],
              },
              partLines: {
                create: [
                  { shopId: demo.id, description: `${jobName} parts`, quantity: 1, costCents: Math.round(partsCents * 0.6), retailCents: partsCents, totalCents: partsCents },
                ],
              },
            },
            ...(isApprovalDemo
              ? [
                  {
                    shopId: demo.id,
                    name: secondJobName,
                    sortOrder: 1,
                    authorized: false,
                    laborLines: {
                      create: [
                        {
                          shopId: demo.id,
                          description: secondJobName,
                          hours: secondHours,
                          rateCents: 15000,
                          totalCents: secondLaborCents,
                        },
                      ],
                    },
                    partLines: {
                      create: [
                        {
                          shopId: demo.id,
                          description: `${secondJobName} parts`,
                          quantity: 1,
                          costCents: Math.round(secondPartsCents * 0.6),
                          retailCents: secondPartsCents,
                          totalCents: secondPartsCents,
                        },
                      ],
                    },
                  },
                ]
              : []),
          ],
        },
      },
    });

    if (status === ROStatus.COMPLETED) {
      const balanceDue = i % 2 === 0;
      await prisma.invoice.create({
        data: {
          shopId: demo.id,
          repairOrderId: ro.id,
          number: invNumber++,
          status: balanceDue ? InvoiceStatus.PARTIAL : InvoiceStatus.PAID,
          subtotalCents: amount,
          totalCents: amount,
          balanceCents: balanceDue ? amount : 0,
          issuedAt: createdAt,
          shareToken: randomBytes(24).toString("base64url"),
        },
      });

      await prisma.purchaseOrder.create({
        data: {
          shopId: demo.id,
          repairOrderId: ro.id,
          number: poNumber++,
          vendor: i % 3 === 0 ? "WorldPac" : "NAPA",
          totalCents: Math.round(partsCents * 0.6),
          status: i % 4 === 0 ? PurchaseOrderStatus.ARCHIVED : PurchaseOrderStatus.ORDERED,
          archivedAt: i % 4 === 0 ? createdAt : null,
        },
      });
    }
  }

  // ── Sample DVIs on open estimate ROs ───────────────────
  const estimateRos = await prisma.repairOrder.findMany({
    where: { shopId: demo.id, status: ROStatus.ESTIMATE },
    take: 3,
    orderBy: { number: "asc" },
    select: { id: true },
  });
  const dviItems = [
    { name: "Front brake pads", category: "Brakes", status: InspectionItemStatus.GREEN, sortOrder: 0 },
    { name: "Rear brake pads", category: "Brakes", status: InspectionItemStatus.YELLOW, note: "Monitor pad life", sortOrder: 1 },
    { name: "Tire tread depth", category: "Tires & Wheels", status: InspectionItemStatus.GREEN, sortOrder: 2 },
    { name: "Battery test", category: "Electrical", status: InspectionItemStatus.NA, sortOrder: 3 },
  ];
  for (let i = 0; i < estimateRos.length; i++) {
    await prisma.inspection.create({
      data: {
        shopId: demo.id,
        repairOrderId: estimateRos[i].id,
        templateName: "Courtesy Multi-Point Inspection",
        status: i === 0 ? InspectionStatus.IN_PROGRESS : InspectionStatus.NOT_STARTED,
        items: {
          create: dviItems.map((item) => ({ shopId: demo.id, ...item })),
        },
      },
    });
  }

  // ── Demo appointments (current week) ───────────────────
  const davidCust = await prisma.customer.findFirst({
    where: { shopId: demo.id, phone: "(518) 227-9897" },
  });
  const markCust = await prisma.customer.findFirst({
    where: { shopId: demo.id, phone: "(919) 836-3766" },
  });
  const davidVeh = davidCust
    ? await prisma.vehicle.findFirst({ where: { shopId: demo.id, customerId: davidCust.id } })
    : null;
  const markVeh = markCust
    ? await prisma.vehicle.findFirst({ where: { shopId: demo.id, customerId: markCust.id } })
    : null;
  const extraCust = await prisma.customer.findMany({
    where: { shopId: demo.id, phone: { not: null } },
    take: 4,
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  function apptSlot(dayOffset: number, hour: number, minute: number, durationMins: number) {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + dayOffset);
    const startAt = new Date(weekStart);
    startAt.setHours(hour, minute, 0, 0);
    const endAt = new Date(startAt.getTime() + durationMins * 60_000);
    return { startAt, endAt };
  }

  const apptRows: Prisma.AppointmentCreateManyInput[] = [];

  if (davidCust && davidVeh) {
    const s1 = apptSlot(0, 10, 25, 70);
    apptRows.push({
      shopId: demo.id,
      customerId: davidCust.id,
      vehicleId: davidVeh.id,
      title: "Tabish David — inspection",
      ...s1,
      status: AppointmentStatus.SCHEDULED,
      notes: "State inspection",
      technicianId: carlos.id,
    });
    const s2 = apptSlot(2, 14, 0, 60);
    apptRows.push({
      shopId: demo.id,
      customerId: davidCust.id,
      vehicleId: davidVeh.id,
      title: "Tabish David — follow-up",
      ...s2,
      status: AppointmentStatus.CONFIRMED,
      technicianId: carlos.id,
    });
  }

  if (markCust && markVeh) {
    const s = apptSlot(1, 9, 0, 45);
    apptRows.push({
      shopId: demo.id,
      customerId: markCust.id,
      vehicleId: markVeh.id,
      title: "Mark Johnson — oil change",
      ...s,
      status: AppointmentStatus.SCHEDULED,
      notes: "Synthetic oil change",
      technicianId: carlos.id,
    });
  }

  for (let i = 0; i < extraCust.length; i++) {
    const c = extraCust[i];
    const veh = await prisma.vehicle.findFirst({
      where: { shopId: demo.id, customerId: c.id },
      select: { id: true },
    });
    const slot = apptSlot((i % 5) + 1, 11 + i, 15, 60);
    apptRows.push({
      shopId: demo.id,
      customerId: c.id,
      vehicleId: veh?.id ?? null,
      title: `${c.lastName} ${c.firstName} appointment`,
      ...slot,
      status: AppointmentStatus.SCHEDULED,
    });
  }

  if (apptRows.length) {
    await prisma.appointment.createMany({ data: apptRows });
  }

  // ── Demo tire orders (separate from online booking) ─────
  const markCustTire = await prisma.customer.findFirst({
    where: { shopId: demo.id, phone: "(919) 836-3766" },
  });
  const markVehTire = markCustTire
    ? await prisma.vehicle.findFirst({ where: { shopId: demo.id, customerId: markCustTire.id } })
    : null;
  const davidCustTire = await prisma.customer.findFirst({
    where: { shopId: demo.id, phone: "(518) 227-9897" },
  });
  const davidVehTire = davidCustTire
    ? await prisma.vehicle.findFirst({ where: { shopId: demo.id, customerId: davidCustTire.id } })
    : null;

  let tireOrderNum = 1001;

  if (markCustTire) {
    const tireApptSlot = apptSlot(3, 13, 30, 90);
    const tireAppt = await prisma.appointment.create({
      data: {
        shopId: demo.id,
        customerId: markCustTire.id,
        vehicleId: markVehTire?.id ?? null,
        title: "Mark Johnson — Tire install (2018 Honda Accord)",
        ...tireApptSlot,
        status: AppointmentStatus.SCHEDULED,
        serviceName: "Tire install",
        source: "TIRES",
        notes: "Size: 225/65R17 · Brand: Michelin · Drop-off: drop-off",
      },
    });

    await prisma.tireOrder.create({
      data: {
        shopId: demo.id,
        number: tireOrderNum++,
        customerId: markCustTire.id,
        vehicleId: markVehTire?.id ?? null,
        appointmentId: tireAppt.id,
        status: TireOrderStatus.SCHEDULED,
        source: TireOrderSource.CRM,
        tireSizeFront: "225/65R17",
        tireBrand: "Michelin Defender",
        tireQuantity: 4,
        tireType: "all-season",
        dropOffType: "drop-off",
        estimatedTotalCents: dollars(892),
        depositCents: dollars(50),
        depositPaidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        depositMethod: PaymentMethod.CARD,
        notes: "Customer requested alignment check after install.",
      },
    });
  }

  if (davidCustTire) {
    const demoWebsiteTireDepositPaidAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const demoWebsiteTireData = {
      shopId: demo.id,
      number: 1002,
      customerId: davidCustTire.id,
      vehicleId: davidVehTire?.id ?? null,
      status: TireOrderStatus.PENDING_SUPPLIER_APPROVAL,
      source: TireOrderSource.WEBSITE,
      tireSizeFront: "245/45R18",
      tireSizeRear: "245/45R18",
      tireBrand: "Continental",
      tireQuantity: 4,
      tireType: "performance",
      dropOffType: "wait",
      estimatedTotalCents: dollars(1240),
      depositCents: dollars(75),
      depositPaidAt: demoWebsiteTireDepositPaidAt,
      depositMethod: PaymentMethod.CARD,
      depositReference: "pi_demo_website_tire_deposit",
      websiteSubmissionId: "web-demo-tire-001",
      supplierName: "Weldon Tire",
      notes: "Website intake — deposit paid, awaiting Weldon supplier approval.",
    };
    await prisma.tireOrder.upsert({
      where: { shopId_number: { shopId: demo.id, number: 1002 } },
      create: demoWebsiteTireData,
      update: {
        ...demoWebsiteTireData,
        customerId: davidCustTire.id,
        vehicleId: davidVehTire?.id ?? null,
      },
    });
    tireOrderNum = 1003;
  }

  if (extraCust[0]) {
    const c = extraCust[0];
    const veh = await prisma.vehicle.findFirst({
      where: { shopId: demo.id, customerId: c.id },
      select: { id: true },
    });
    await prisma.tireOrder.create({
      data: {
        shopId: demo.id,
        number: tireOrderNum++,
        customerId: c.id,
        vehicleId: veh?.id ?? null,
        status: TireOrderStatus.DEPOSIT_RECEIVED,
        source: TireOrderSource.CRM,
        tireSizeFront: "265/70R17",
        tireBrand: "Goodyear Wrangler",
        tireQuantity: 4,
        tireType: "all-terrain",
        dropOffType: "drop-off",
        estimatedTotalCents: dollars(980),
        depositCents: dollars(100),
        depositPaidAt: new Date(),
        depositMethod: PaymentMethod.CASH,
      },
    });
  }

  // Backfill auto-apply shop fees onto every demo RO (estimates, WIP, invoices).
  const demoRos = await prisma.repairOrder.findMany({
    where: { shopId: demo.id },
    select: { id: true },
  });
  for (const ro of demoRos) {
    await ensureAutoApplyFees(demo.id, ro.id);
  }

  // Google Reviews — demo inbox (mock mode until shop connects GBP)
  for (const r of MOCK_GOOGLE_REVIEWS) {
    await prisma.googleReview.upsert({
      where: {
        shopId_googleReviewId: { shopId: demo.id, googleReviewId: r.googleReviewId },
      },
      create: {
        shopId: demo.id,
        googleReviewId: r.googleReviewId,
        reviewerName: r.reviewerName,
        starRating: r.starRating,
        comment: r.comment,
        reviewReply: r.reviewReply,
        googleCreatedAt: r.googleCreatedAt,
      },
      update: {
        reviewerName: r.reviewerName,
        starRating: r.starRating,
        comment: r.comment,
        reviewReply: r.reviewReply,
        googleCreatedAt: r.googleCreatedAt,
      },
    });
  }

  // Global FAQ library (platform support)
  for (const faq of FAQ_SEED) {
    await prisma.faqArticle.create({
      data: {
        slug: faq.slug,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        published: true,
      },
    });
  }

  // Marketing automations (Tekmetric-style defaults + demo send stats)
  for (const tpl of AUTOMATION_TEMPLATES) {
    const automation = await prisma.marketingAutomation.create({
      data: {
        shopId: demo.id,
        key: tpl.key,
        name: tpl.name,
        triggerTiming: tpl.triggerTiming,
        triggerAmount: tpl.triggerAmount ?? null,
        triggerUnit: tpl.triggerUnit ?? null,
        smsMessage: tpl.defaultSmsMessage,
        emailSubject: tpl.defaultEmailSubject ?? null,
        emailBody: tpl.defaultEmailBody ?? null,
        emailEnabled: tpl.defaultEmailEnabled ?? false,
        smsEnabled: tpl.defaultSmsEnabled ?? false,
        includeBusinessCustomers: tpl.includeBusinessCustomers ?? true,
        limitOnePerCustomer: tpl.limitOnePerCustomer ?? false,
        includeBookingLinkCta: tpl.includeBookingLinkCta ?? true,
        configured: tpl.defaultConfigured ?? false,
      },
    });

    if (tpl.defaultConfigured && david) {
      const now = Date.now();
      await prisma.automationSend.createMany({
        data: [
          {
            automationId: automation.id,
            customerId: david.id,
            channel: "SMS",
            status: "DELIVERED",
            sentAt: new Date(now - 5 * 86_400_000),
          },
          {
            automationId: automation.id,
            customerId: mark?.id ?? david.id,
            channel: "SMS",
            status: "PENDING",
            scheduledFor: new Date(now + 3 * 86_400_000),
          },
        ],
      });
    }
  }

  // Demo marketing campaigns (Outreach)
  const winBackTpl = CAMPAIGN_TEMPLATES.find((t) => t.type === "PROMO_BLAST");
  const reviewTpl = CAMPAIGN_TEMPLATES.find((t) => t.type === "REVIEW_REQUEST");
  if (winBackTpl && david) {
    const draft = await prisma.marketingCampaign.create({
      data: {
        shopId: demo.id,
        name: "Spring service special (draft)",
        type: "PROMO_BLAST",
        status: "DRAFT",
        channel: winBackTpl.channel,
        audienceFilter: winBackTpl.defaultAudience,
        messageTemplate: winBackTpl.defaultMessage,
        emailSubject: winBackTpl.defaultEmailSubject ?? null,
      },
    });
    await prisma.marketingCampaign.create({
      data: {
        shopId: demo.id,
        name: "Win-back — 12 months (draft)",
        type: "WIN_BACK",
        status: "DRAFT",
        channel: "BOTH",
        audienceFilter: {
          marketingOptInOnly: true,
          lastVisitDaysMin: 365,
          requirePhone: true,
          requireEmail: true,
          offerText: "$20 off your next visit — code WELCOME20",
        },
        messageTemplate:
          "Hi {customer_name}, we miss you at {shop_name}! It's been a while since {last_service}. {offer_line} Book online: {booking_link}",
        emailSubject: "We miss you at {shop_name}",
      },
    });
    await prisma.marketingCampaign.create({
      data: {
        shopId: demo.id,
        name: "Summer win-back (scheduled)",
        type: "WIN_BACK",
        status: "SCHEDULED",
        channel: "SMS",
        audienceFilter: { marketingOptInOnly: true, lastVisitDaysMin: 180, requirePhone: true },
        messageTemplate:
          "Hi {customer_name}, we miss you at {shop_name}! Schedule your next service: {booking_link}",
        scheduledAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    const sent = await prisma.marketingCampaign.create({
      data: {
        shopId: demo.id,
        name: "Recent visitors — review ask",
        type: "REVIEW_REQUEST",
        status: "COMPLETED",
        channel: reviewTpl?.channel ?? "SMS",
        audienceFilter: reviewTpl?.defaultAudience ?? {},
        messageTemplate: reviewTpl?.defaultMessage ?? "Thanks for visiting {shop_name}!",
        launchedAt: new Date(Date.now() - 14 * 86_400_000),
        completedAt: new Date(Date.now() - 14 * 86_400_000),
        sentCount: 2,
        deliveredCount: 2,
        failedCount: 0,
      },
    });
    await prisma.campaignSend.createMany({
      data: [
        {
          campaignId: sent.id,
          customerId: david.id,
          channel: "SMS" as const,
          status: "DELIVERED" as const,
          sentAt: new Date(Date.now() - 14 * 86_400_000),
          openedAt: new Date(Date.now() - 14 * 86_400_000),
        },
        ...(mark
          ? [
              {
                campaignId: sent.id,
                customerId: mark.id,
                channel: "SMS" as const,
                status: "DELIVERED" as const,
                sentAt: new Date(Date.now() - 13 * 86_400_000),
                openedAt: new Date(Date.now() - 12 * 86_400_000),
              },
            ]
          : []),
      ],
    });
    void draft;
  }

  // Inventory parts — demo stock for In & Out AutoHaus
  const INVENTORY_PARTS = [
    { partNumber: "OF-1240", description: "Oil filter — standard spin-on", brand: "Motorcraft", category: "Filters", vendorName: "NAPA", quantityOnHand: 24, reorderPoint: 10, reorderQty: 20, costCents: dollars(7), retailCents: dollars(28), binLocation: "A1-01" },
    { partNumber: "OF-3517", description: "Oil filter — cartridge type", brand: "WIX", category: "Filters", vendorName: "WorldPac", quantityOnHand: 8, reorderPoint: 12, reorderQty: 24, costCents: dollars(9), retailCents: dollars(36), binLocation: "A1-02" },
    { partNumber: "AF-8832", description: "Engine air filter", brand: "Fram", category: "Filters", vendorName: "NAPA", quantityOnHand: 15, reorderPoint: 8, reorderQty: 16, costCents: dollars(12), retailCents: dollars(48), binLocation: "A1-03" },
    { partNumber: "CF-10234", description: "Cabin air filter", brand: "Bosch", category: "Filters", vendorName: "AutoZone Commercial", quantityOnHand: 6, reorderPoint: 10, reorderQty: 20, costCents: dollars(14), retailCents: dollars(56), binLocation: "A1-04" },
    { partNumber: "BP-5501-F", description: "Front brake pads — ceramic", brand: "Akebono", category: "Brakes", vendorName: "WorldPac", quantityOnHand: 4, reorderPoint: 6, reorderQty: 12, costCents: dollars(42), retailCents: dollars(168), binLocation: "B2-01" },
    { partNumber: "BP-5501-R", description: "Rear brake pads — ceramic", brand: "Akebono", category: "Brakes", vendorName: "WorldPac", quantityOnHand: 3, reorderPoint: 6, reorderQty: 12, costCents: dollars(38), retailCents: dollars(152), binLocation: "B2-02" },
    { partNumber: "BR-4410-F", description: "Front brake rotor", brand: "Raybestos", category: "Brakes", vendorName: "NAPA", quantityOnHand: 2, reorderPoint: 4, reorderQty: 8, costCents: dollars(55), retailCents: dollars(220), binLocation: "B2-03" },
    { partNumber: "BF-DOT3", description: "DOT 3 brake fluid — 32 oz", brand: "Prestone", category: "Fluids", vendorName: "NAPA", quantityOnHand: 18, reorderPoint: 6, reorderQty: 12, costCents: dollars(6), retailCents: dollars(24), binLocation: "C1-01" },
    { partNumber: "AF-PSF", description: "Power steering fluid — 12 oz", brand: "Valvoline", category: "Fluids", vendorName: "NAPA", quantityOnHand: 10, reorderPoint: 5, reorderQty: 10, costCents: dollars(5), retailCents: dollars(20), binLocation: "C1-02" },
    { partNumber: "CL-50-50", description: "Coolant — 50/50 prediluted gallon", brand: "Zerex", category: "Fluids", vendorName: "AutoZone Commercial", quantityOnHand: 12, reorderPoint: 8, reorderQty: 16, costCents: dollars(14), retailCents: dollars(56), binLocation: "C1-03" },
    { partNumber: "OIL-5W30-SYN", description: "5W-30 full synthetic — 5 qt", brand: "Mobil 1", category: "Fluids", vendorName: "NAPA", quantityOnHand: 20, reorderPoint: 10, reorderQty: 20, costCents: dollars(28), retailCents: dollars(112), binLocation: "C1-04" },
    { partNumber: "SP-5224", description: "Spark plug — iridium", brand: "NGK", category: "Ignition", vendorName: "WorldPac", quantityOnHand: 32, reorderPoint: 16, reorderQty: 32, costCents: dollars(11), retailCents: dollars(44), binLocation: "D1-01" },
    { partNumber: "WP-9317", description: "Water pump", brand: "Gates", category: "Engine", vendorName: "WorldPac", quantityOnHand: 2, reorderPoint: 2, reorderQty: 4, costCents: dollars(85), retailCents: dollars(340), binLocation: "D2-01" },
    { partNumber: "TB-KIT-001", description: "Timing belt kit w/ tensioner", brand: "Dayco", category: "Belts & Hoses", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 4, costCents: dollars(120), retailCents: dollars(480), binLocation: "D2-02" },
    { partNumber: "SER-5060840", description: "Serpentine belt", brand: "Continental", category: "Belts & Hoses", vendorName: "NAPA", quantityOnHand: 5, reorderPoint: 4, reorderQty: 8, costCents: dollars(22), retailCents: dollars(88), binLocation: "D2-03" },
    { partNumber: "RAD-HOSE-UP", description: "Upper radiator hose", brand: "Dayco", category: "Belts & Hoses", vendorName: "NAPA", quantityOnHand: 3, reorderPoint: 4, reorderQty: 6, costCents: dollars(18), retailCents: dollars(72), binLocation: "D2-04" },
    { partNumber: "ALT-11345", description: "Alternator — reman", brand: "Denso", category: "Electrical", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 3, costCents: dollars(145), retailCents: dollars(580), binLocation: "E1-01" },
    { partNumber: "STR-44901", description: "Starter — reman", brand: "Bosch", category: "Electrical", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 3, costCents: dollars(130), retailCents: dollars(520), binLocation: "E1-02" },
    { partNumber: "BAT-35-700", description: "Battery — Group 35 700 CCA", brand: "Interstate", category: "Electrical", vendorName: "NAPA", quantityOnHand: 4, reorderPoint: 3, reorderQty: 6, costCents: dollars(95), retailCents: dollars(380), binLocation: "E1-03" },
    { partNumber: "SH-3412-F", description: "Front strut assembly", brand: "Monroe", category: "Suspension", vendorName: "WorldPac", quantityOnHand: 2, reorderPoint: 2, reorderQty: 4, costCents: dollars(110), retailCents: dollars(440), binLocation: "F1-01" },
    { partNumber: "CV-AX-4501", description: "CV axle shaft — front", brand: "GSP", category: "Suspension", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 4, costCents: dollars(75), retailCents: dollars(300), binLocation: "F1-02" },
    { partNumber: "O2-234-4567", description: "O2 sensor — upstream", brand: "Denso", category: "Exhaust", vendorName: "WorldPac", quantityOnHand: 3, reorderPoint: 4, reorderQty: 8, costCents: dollars(45), retailCents: dollars(180), binLocation: "G1-01" },
    { partNumber: "CAT-GASKET", description: "Catalytic converter gasket", brand: "Fel-Pro", category: "Exhaust", vendorName: "NAPA", quantityOnHand: 6, reorderPoint: 4, reorderQty: 8, costCents: dollars(8), retailCents: dollars(32), binLocation: "G1-02" },
    { partNumber: "DRAIN-PLUG", description: "Oil drain plug gasket — universal", brand: "Dorman", category: "Engine", vendorName: "NAPA", quantityOnHand: 50, reorderPoint: 20, reorderQty: 100, costCents: dollars(1), retailCents: dollars(4), binLocation: "A2-01" },
    { partNumber: "WIP-22", description: "Wiper blade — 22 in", brand: "Bosch", category: "Other", vendorName: "AutoZone Commercial", quantityOnHand: 14, reorderPoint: 8, reorderQty: 16, costCents: dollars(10), retailCents: dollars(40), binLocation: "H1-01" },
    { partNumber: "FUEL-FILTER", description: "Inline fuel filter", brand: "WIX", category: "Filters", vendorName: "NAPA", quantityOnHand: 5, reorderPoint: 6, reorderQty: 12, costCents: dollars(15), retailCents: dollars(60), binLocation: "A1-05" },
    { partNumber: "PCV-VALVE", description: "PCV valve", brand: "Standard", category: "Engine", vendorName: "NAPA", quantityOnHand: 7, reorderPoint: 5, reorderQty: 10, costCents: dollars(6), retailCents: dollars(24), binLocation: "D1-02" },
  ] as const;

  for (const p of INVENTORY_PARTS) {
    const part = await prisma.inventoryPart.create({
      data: { shopId: demo.id, ...p },
    });
    if (p.quantityOnHand > 0) {
      await prisma.inventoryAdjustment.create({
        data: {
          shopId: demo.id,
          partId: part.id,
          delta: p.quantityOnHand,
          reason: "Initial stock (seed)",
        },
      });
    }
  }

  // ── Maintenance programs (public /plans page) ──────────
  const DEMO_PLANS_SLUG = "in-and-out-autohaus";

  await prisma.maintenanceProgramSettings.create({
    data: {
      shopId: demo.id,
      enabled: true,
      plansSlug: DEMO_PLANS_SLUG,
      heroTitle: "OilCare Club",
      heroSubtitle:
        "Three plans. One mission: your car, always ready. Less than the cost of a streaming subscription — we handle your oil changes, rotations, inspections, and emergencies so you don't have to think about it. Pay monthly or save 15% when you pay in full. Cancel anytime after 90 days.",
      termsDefault: OILCARE_TERMS_DEFAULT,
      pageTemplate: "CLASSIC",
      themeConfig: {
        primaryColor: "1A1D21",
        accentColor: "0EA5E9",
        heroStyle: "solid",
        cardStyle: "shadow",
        buttonStyle: "filled",
        showPhone: true,
        showAddress: true,
        showLogo: true,
        columnsLayout: "3",
        fontScale: "md",
      },
    },
  });

  for (let i = 0; i < PLAN_TEMPLATES.length; i++) {
    const t = PLAN_TEMPLATES[i]!;
    const p = t.plan;
    await prisma.maintenancePlan.create({
      data: {
        shopId: demo.id,
        name: p.name,
        tagline: p.tagline ?? null,
        idealFor: p.idealFor ?? null,
        archetype: p.archetype,
        scope: p.scope,
        maxVehicles: p.maxVehicles ?? null,
        termMonths: p.termMonths,
        autoRenew: p.autoRenew,
        retailCents: p.retailCents ?? null,
        payInFullCents: p.payInFullCents ?? null,
        monthlyCents: p.monthlyCents ?? null,
        monthlyTermMonths: p.monthlyTermMonths ?? null,
        annualCents: p.payInFullCents ?? p.annualCents ?? null,
        featured: p.featured ?? false,
        sortOrder: i,
        active: true,
        terms: p.terms ?? OILCARE_TERMS_DEFAULT,
        entitlements: {
          create: p.entitlements.map((e, j) => ({
            shopId: demo.id,
            kind: e.kind,
            label: e.label,
            quantity: e.quantity ?? null,
            intervalDays: e.intervalDays ?? null,
            discountBps: e.discountBps ?? null,
            creditCents: e.creditCents ?? null,
            sortOrder: j,
          })),
        },
      },
    });
  }

  const total = await prisma.customer.count({ where: { shopId: demo.id } });
  const roCount = await prisma.repairOrder.count({ where: { shopId: demo.id } });
  const apptCount = await prisma.appointment.count({ where: { shopId: demo.id } });
  const tireCount = await prisma.tireOrder.count({ where: { shopId: demo.id } });
  const reviewCount = await prisma.googleReview.count({ where: { shopId: demo.id } });
  const messageThreadCount = await prisma.customer.count({
    where: {
      shopId: demo.id,
      messages: { some: {} },
    },
  });
  const faqCount = await prisma.faqArticle.count();
  const invCount = await prisma.inventoryPart.count({ where: { shopId: demo.id } });
  const approvalRo = await prisma.repairOrder.findFirst({
    where: { shopId: demo.id, approvalToken: { not: null } },
    select: { number: true, approvalToken: true },
  });
  console.log(
    `Seed complete: shop "${demo.name}" with ${total} customers, ${roCount} repair orders, ${apptCount} appointments, ${tireCount} tire orders, ${invCount} inventory parts, ${messageThreadCount} SMS threads, ${reviewCount} Google reviews, ${faqCount} FAQ articles.`,
  );
  if (approvalRo?.approvalToken) {
    console.log(
      `Test customer approval: http://localhost:3000/approve/${approvalRo.approvalToken} (RO #${approvalRo.number}, 2 jobs for partial approval)`,
    );
  }
  console.log(
    `Public maintenance plans: http://localhost:3000/plans/${DEMO_PLANS_SLUG} (also /plans/io)`,
  );
  console.log(
    `Macuto Core estimate: http://localhost:3031/platform/enter?shop=shop_macuto&next=%2Frepair-orders%2Fro_macuto_1001%2Festimate`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
