/**
 * Attach vehicles + repair orders to "CRM Load Test" customers — mixed statuses
 * and timelines (estimates, waiting approval, WIP, completed paid/unpaid).
 *
 * Run: npx tsx scripts/seed-dummy-repair-scenario.ts
 *      npx tsx scripts/seed-dummy-repair-scenario.ts --shop=shop_demo --ros=350
 */
import { randomBytes } from "node:crypto";
import {
  AppointmentStatus,
  InvoiceStatus,
  PaymentMethod,
  PrismaClient,
  ROStatus,
} from "../src/generated/prisma";

const prisma = new PrismaClient();

export const DUMMY_TAG = "CRM Load Test";
const DEFAULT_SHOP_ID = "shop_demo";
const DEFAULT_RO_COUNT = 350;
const TAX_BPS = 800;
const dollars = (d: number) => Math.round(d * 100);

const VEHICLE_POOL = [
  { year: 2019, make: "Nissan", model: "Sentra", color: "Silver" },
  { year: 2017, make: "Audi", model: "Q7", color: "Black" },
  { year: 2015, make: "Ford", model: "F-150", color: "Blue" },
  { year: 2014, make: "Subaru", model: "Outback", color: "Green" },
  { year: 2017, make: "BMW", model: "540i", color: "Gray" },
  { year: 2020, make: "Nissan", model: "Altima", color: "White" },
  { year: 2013, make: "Hyundai", model: "Accent", color: "Red" },
  { year: 2017, make: "Dodge", model: "Grand Caravan", color: "Silver" },
  { year: 2023, make: "Toyota", model: "Camry", color: "Pearl" },
  { year: 2011, make: "Volkswagen", model: "Jetta", color: "Black" },
  { year: 2011, make: "Honda", model: "CR-V", color: "Blue" },
  { year: 2018, make: "Chevrolet", model: "Equinox", color: "White" },
  { year: 2016, make: "Volvo", model: "XC60", color: "Gray" },
  { year: 2015, make: "Mercedes-Benz", model: "C300", color: "Black" },
  { year: 2022, make: "Kia", model: "Sportage", color: "Red" },
  { year: 2009, make: "Toyota", model: "Camry", color: "Gold" },
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
  "AC recharge & leak check",
  "Replace water pump",
  "Transmission fluid service",
  "Tire rotation & balance",
];

const CONCERNS = [
  "Customer hears squealing when braking",
  "Check engine light on — intermittent",
  "AC not blowing cold",
  "Vibration at highway speed",
  "Oil change due — coupon in glove box",
  "Annual inspection",
  "Battery died twice this week",
  "Fluid leak under front of vehicle",
  "Scheduled maintenance visit",
  "Noise from front suspension",
];

/** Scenario mix for a realistic shop floor + timelines. */
type ScenarioKind =
  | "estimate_fresh"
  | "estimate_waiting"
  | "approved_queue"
  | "wip_early"
  | "wip_late"
  | "completed_paid"
  | "completed_balance"
  | "completed_invoice_sent";

function buildScenarioPlan(count: number): ScenarioKind[] {
  const weights: ScenarioKind[] = [
    ...Array(Math.round(count * 0.12)).fill("estimate_fresh"),
    ...Array(Math.round(count * 0.13)).fill("estimate_waiting"),
    ...Array(Math.round(count * 0.12)).fill("approved_queue"),
    ...Array(Math.round(count * 0.18)).fill("wip_early"),
    ...Array(Math.round(count * 0.1)).fill("wip_late"),
    ...Array(Math.round(count * 0.2)).fill("completed_paid"),
    ...Array(Math.round(count * 0.1)).fill("completed_balance"),
    ...Array(Math.round(count * 0.05)).fill("completed_invoice_sent"),
  ];
  while (weights.length < count) weights.push("estimate_fresh");
  return weights.slice(0, count);
}

function parseArgs() {
  let shopId = DEFAULT_SHOP_ID;
  let roCount = DEFAULT_RO_COUNT;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--shop=")) shopId = arg.slice(7) || DEFAULT_SHOP_ID;
    if (arg.startsWith("--ros=")) roCount = Number(arg.slice(6)) || DEFAULT_RO_COUNT;
  }
  return { shopId, roCount };
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600 * 1000);
}

function daysAgo(d: number, hour = 10) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, 0, 0, 0);
  return dt;
}

function scenarioTiming(kind: ScenarioKind, index: number) {
  switch (kind) {
    case "estimate_fresh":
      return {
        createdAt: hoursAgo(1 + (index % 4)),
        authorizedAt: null,
        approvalSentAt: null,
        completedAt: null,
        promiseTime: hoursAgo(-3 + (index % 6)),
      };
    case "estimate_waiting":
      return {
        createdAt: hoursAgo(8 + (index % 36)),
        authorizedAt: null,
        approvalSentAt: hoursAgo(4 + (index % 12)),
        completedAt: null,
        promiseTime: hoursAgo(-2 + (index % 8)),
      };
    case "approved_queue":
      return {
        createdAt: hoursAgo(6 + (index % 18)),
        authorizedAt: hoursAgo(2 + (index % 4)),
        approvalSentAt: hoursAgo(5 + (index % 8)),
        completedAt: null,
        promiseTime: hoursAgo(-1 + (index % 5)),
      };
    case "wip_early":
      return {
        createdAt: hoursAgo(10 + (index % 8)),
        authorizedAt: hoursAgo(8 + (index % 6)),
        approvalSentAt: hoursAgo(9 + (index % 6)),
        completedAt: null,
        promiseTime: hoursAgo(-4 + (index % 6)),
      };
    case "wip_late":
      return {
        createdAt: daysAgo(1, 8),
        authorizedAt: daysAgo(1, 9),
        approvalSentAt: daysAgo(1, 8),
        completedAt: null,
        promiseTime: hoursAgo(2 + (index % 3)),
      };
    case "completed_paid":
      return {
        createdAt: daysAgo(2 + (index % 12), 9),
        authorizedAt: daysAgo(2 + (index % 12), 10),
        approvalSentAt: daysAgo(2 + (index % 12), 9),
        completedAt: daysAgo(1 + (index % 10), 16),
        promiseTime: null,
      };
    case "completed_balance":
      return {
        createdAt: daysAgo(1 + (index % 3), 8),
        authorizedAt: daysAgo(1 + (index % 3), 9),
        approvalSentAt: daysAgo(1 + (index % 3), 8),
        completedAt: hoursAgo(6 + (index % 12)),
        promiseTime: null,
      };
    case "completed_invoice_sent":
      return {
        createdAt: daysAgo(3 + (index % 5), 9),
        authorizedAt: daysAgo(3 + (index % 5), 10),
        approvalSentAt: daysAgo(3 + (index % 5), 9),
        completedAt: daysAgo(2 + (index % 4), 15),
        promiseTime: null,
      };
  }
}

function statusForKind(kind: ScenarioKind): ROStatus {
  switch (kind) {
    case "estimate_fresh":
    case "estimate_waiting":
      return ROStatus.ESTIMATE;
    case "approved_queue":
      return ROStatus.APPROVED;
    case "wip_early":
    case "wip_late":
      return ROStatus.IN_PROGRESS;
    case "completed_paid":
    case "completed_balance":
      return ROStatus.COMPLETED;
    case "completed_invoice_sent":
      return ROStatus.INVOICED;
  }
}

export async function seedDummyRepairScenario(opts: {
  shopId: string;
  roCount?: number;
  cleanFirst?: boolean;
}) {
  const shopId = opts.shopId;
  const roCount = opts.roCount ?? DEFAULT_RO_COUNT;
  const cleanFirst = opts.cleanFirst ?? true;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true },
  });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  const customers = await prisma.customer.findMany({
    where: { shopId, tags: { has: DUMMY_TAG } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: roCount,
    select: { id: true, firstName: true, lastName: true, leadSource: true },
  });

  if (customers.length === 0) {
    throw new Error(`No "${DUMMY_TAG}" customers found. Run db:seed-dummy-customers first.`);
  }

  const actualCount = Math.min(roCount, customers.length);

  if (cleanFirst) {
    const ids = customers.map((c) => c.id);
    const [ros, vehs, appts] = await Promise.all([
      prisma.repairOrder.deleteMany({ where: { shopId, customerId: { in: ids } } }),
      prisma.vehicle.deleteMany({ where: { shopId, customerId: { in: ids } } }),
      prisma.appointment.deleteMany({ where: { shopId, customerId: { in: ids } } }),
    ]);
    console.log(
      `Cleaned prior load-test data: ${ros.count} ROs, ${vehs.count} vehicles, ${appts.count} appointments.`,
    );
  }

  const staff = await prisma.membership.findMany({
    where: { shopId, active: true },
    select: { userId: true, role: true, canPerformWork: true },
  });
  const serviceWriterId =
    staff.find((m) => m.role === "SERVICE_WRITER" || m.role === "OWNER")?.userId ?? staff[0]?.userId;
  const technicianId =
    staff.find((m) => m.canPerformWork && m.role === "TECHNICIAN")?.userId ??
    staff.find((m) => m.canPerformWork)?.userId ??
    serviceWriterId;

  const [maxRo, maxInv] = await Promise.all([
    prisma.repairOrder.aggregate({ where: { shopId }, _max: { number: true } }),
    prisma.invoice.aggregate({ where: { shopId }, _max: { number: true } }),
  ]);
  let roNumber = (maxRo._max.number ?? 1000) + 1;
  let invNumber = (maxInv._max.number ?? 5000) + 1;

  const plan = buildScenarioPlan(actualCount);
  const started = Date.now();
  const counts: Record<ScenarioKind, number> = {
    estimate_fresh: 0,
    estimate_waiting: 0,
    approved_queue: 0,
    wip_early: 0,
    wip_late: 0,
    completed_paid: 0,
    completed_balance: 0,
    completed_invoice_sent: 0,
  };

  for (let i = 0; i < actualCount; i++) {
    const customer = customers[i]!;
    const kind = plan[i]!;
    const status = statusForKind(kind);
    const timing = scenarioTiming(kind, i);
    const v = VEHICLE_POOL[i % VEHICLE_POOL.length]!;
    const jobName = JOB_NAMES[i % JOB_NAMES.length]!;
    const amount = dollars(95 + ((i * 413) % 2800));
    const laborCents = Math.round(amount * 0.48);
    const partsCents = Math.round(amount * 0.42);
    const suppliesCents = dollars(4 + (i % 6));
    const taxCents = Math.round(((laborCents + partsCents + suppliesCents) * TAX_BPS) / 10000);
    const totalCents = laborCents + partsCents + suppliesCents + taxCents;
    const hours = Math.max(0.3, Math.round((laborCents / 15000) * 10) / 10);
    const authorized = status !== ROStatus.ESTIMATE;
    const needsApprovalToken = kind === "estimate_waiting";

    const vehicle = await prisma.vehicle.create({
      data: {
        shopId,
        customerId: customer.id,
        year: v.year,
        make: v.make,
        model: v.model,
        color: v.color,
        plate: `LT${String(1000 + i)}`,
        plateState: "NY",
        mileageRecords: {
          create: {
            shopId,
            miles: 42000 + i * 137,
            source: "RO",
            recordedAt: timing.createdAt,
          },
        },
      },
    });

    const ro = await prisma.repairOrder.create({
      data: {
        shopId,
        number: roNumber++,
        customerId: customer.id,
        vehicleId: vehicle.id,
        status,
        serviceWriterId,
        technicianId: status === ROStatus.ESTIMATE ? null : technicianId,
        mileageIn: 42000 + i * 137,
        appointmentOption: i % 4 === 0 ? "Drop-off Vehicle" : "Wait in Lobby",
        marketingSource: customer.leadSource,
        concerns: [CONCERNS[i % CONCERNS.length]!],
        laborSubtotalCents: laborCents,
        partsSubtotalCents: partsCents,
        shopSuppliesCents: suppliesCents,
        taxCents,
        totalCents,
        boardOrder: i,
        keyTag: `LT-${String(i + 1).padStart(3, "0")}`,
        notes: "Load-test RO — safe to delete with CRM Load Test customers.",
        createdAt: timing.createdAt,
        authorizedAt: timing.authorizedAt,
        authorizedBy: timing.authorizedAt ? customer.firstName : null,
        approvedVia: timing.authorizedAt ? "SHOP" : null,
        approvalSentAt: timing.approvalSentAt,
        approvalToken: needsApprovalToken ? randomBytes(24).toString("base64url") : null,
        completedAt: timing.completedAt,
        promiseTime: timing.promiseTime,
        jobs: {
          create: [
            {
              shopId,
              name: jobName,
              authorized,
              approvedAt: timing.authorizedAt,
              technicianId: status === ROStatus.IN_PROGRESS ? technicianId : null,
              laborLines: {
                create: [
                  {
                    shopId,
                    description: jobName,
                    hours,
                    rateCents: 15000,
                    totalCents: laborCents,
                    technicianId: status === ROStatus.IN_PROGRESS ? technicianId : null,
                  },
                ],
              },
              partLines: {
                create: [
                  {
                    shopId,
                    description: `${jobName} parts`,
                    quantity: 1,
                    costCents: Math.round(partsCents * 0.58),
                    retailCents: partsCents,
                    totalCents: partsCents,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    if (
      kind === "completed_paid" ||
      kind === "completed_balance" ||
      kind === "completed_invoice_sent"
    ) {
      const balanceDue = kind === "completed_balance";
      const invoiceSent = kind === "completed_invoice_sent";
      const paid = kind === "completed_paid";

      await prisma.invoice.create({
        data: {
          shopId,
          repairOrderId: ro.id,
          number: invNumber++,
          status: paid ? InvoiceStatus.PAID : balanceDue ? InvoiceStatus.PARTIAL : InvoiceStatus.SENT,
          subtotalCents: laborCents + partsCents + suppliesCents,
          taxCents,
          totalCents,
          balanceCents: paid ? 0 : balanceDue ? totalCents : totalCents,
          issuedAt: timing.completedAt ?? timing.createdAt,
          shareSentAt: invoiceSent ? timing.completedAt : null,
          shareToken: randomBytes(24).toString("base64url"),
          payments: paid
            ? {
                create: [
                  {
                    shopId,
                    amountCents: totalCents,
                    method: i % 3 === 0 ? PaymentMethod.CASH : PaymentMethod.CARD,
                    reference: i % 3 === 0 ? "Cash" : "Visa ••4242",
                    paidAt: timing.completedAt ?? new Date(),
                  },
                ],
              }
            : undefined,
        },
      });
    }

    counts[kind]++;

    if ((i + 1) % 25 === 0 || i + 1 === actualCount) {
      process.stdout.write(`\rRepair orders ${i + 1}/${actualCount}…`);
    }
  }

  // Today's + tomorrow's appointments for arriving customers
  const apptCustomers = customers.slice(0, Math.min(40, actualCount));
  const apptRows = apptCustomers.map((c, i) => {
    const startAt = new Date();
    startAt.setMinutes(0, 0, 0);
    if (i < 20) {
      startAt.setHours(8 + (i % 8), (i % 2) * 30, 0, 0);
    } else {
      startAt.setDate(startAt.getDate() + 1);
      startAt.setHours(8 + ((i - 20) % 7), 0, 0, 0);
    }
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    return {
      shopId,
      customerId: c.id,
      startAt,
      endAt,
      status: AppointmentStatus.CONFIRMED,
      title: i % 3 === 0 ? "Drop-off — diagnosis" : "Wait — oil change / inspection",
      notes: "Load-test appointment",
    };
  });
  await prisma.appointment.createMany({ data: apptRows });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s — ${actualCount} repair scenarios for ${shop.name}.`);
  console.log("Mix:", counts);
  console.log(`Appointments: ${apptRows.length} (today + tomorrow)`);
  console.log("Open: http://localhost:3001/job-board · http://localhost:3001/home");

  return { actualCount, counts };
}

async function runCli() {
  const { shopId, roCount } = parseArgs();
  await seedDummyRepairScenario({ shopId, roCount, cleanFirst: true });
}

const entryScript = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entryScript.endsWith("seed-dummy-repair-scenario.ts")) {
  runCli()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
