/**
 * Additive demo data for Dashboard → Snapshot (KPIs, timeline, appointments,
 * overdue follow-ups, top services). Targets the demo shop only — does not wipe DB.
 *
 * Run:  npm run db:seed-dashboard-demo
 *       npx tsx scripts/seed-dashboard-demo.ts
 *       npx tsx scripts/seed-dashboard-demo.ts --shop=shop_demo --days=10
 *
 * Re-runnable: cleans prior rows tagged with DASHBOARD_DEMO_MARKER first.
 */
import { randomBytes } from "node:crypto";
import {
  AppointmentStatus,
  InvoiceStatus,
  MessageDirection,
  PaymentMethod,
  PrismaClient,
  ROStatus,
  RoActivityType,
} from "../src/generated/prisma";

const prisma = new PrismaClient();

const DEFAULT_SHOP_ID = "shop_demo";
const DEFAULT_DAYS = 10;
const DEMO_TAG = "Dashboard Demo";
const DEMO_MARKER = "DASHBOARD_DEMO_v1";
const APPT_TITLE_PREFIX = "[Dashboard Demo]";
const MSG_PREFIX = "[dashboard-demo]";

const dollars = (n: number) => Math.round(n * 100);

function parseArgs() {
  let shopId = DEFAULT_SHOP_ID;
  let days = DEFAULT_DAYS;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--shop=")) shopId = arg.slice(7) || DEFAULT_SHOP_ID;
    if (arg.startsWith("--days=")) {
      const n = Number(arg.slice(7));
      if (Number.isFinite(n) && n >= 1 && n <= 30) days = Math.floor(n);
    }
  }
  return { shopId, days };
}

/** Local calendar date at hour:minute (month is 1-based in callers via Date). */
function atDay(base: Date, dayOffset: number, hour: number, minute = 0) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0);
  return d;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

const SERVICE_CATALOG = [
  { name: "Oil Change", total: 89.95 },
  { name: "Synthetic Oil Change", total: 129.95 },
  { name: "Front Brake Pads & Rotors", total: 685.0 },
  { name: "Rear Brake Pads", total: 420.0 },
  { name: "Tire Rotation & Balance", total: 79.0 },
  { name: "New Tire Mount & Balance", total: 640.0 },
  { name: "NYS Safety Inspection", total: 37.0 },
  { name: "Coolant Flush", total: 189.0 },
  { name: "Battery Replacement", total: 245.0 },
  { name: "Diagnose Check Engine Light", total: 165.0 },
  { name: "Wheel Alignment", total: 129.0 },
  { name: "AC Recharge", total: 210.0 },
] as const;

const CUSTOMER_SPECS = [
  { firstName: "Mark", lastName: "Johnson", phone: "(518) 555-0142" },
  { firstName: "Tabish", lastName: "David", phone: "(518) 555-0199" },
  { firstName: "David", lastName: "Paulene", phone: "(518) 555-0177" },
  { firstName: "Sarah", lastName: "Chen", phone: "(518) 555-0163" },
  { firstName: "Robert", lastName: "Martinez", phone: "(518) 555-0188" },
  { firstName: "Lisa", lastName: "Nguyen", phone: "(518) 555-0155" },
  { firstName: "James", lastName: "Walker", phone: "(518) 555-0131" },
  { firstName: "Emily", lastName: "Brooks", phone: "(518) 555-0124" },
] as const;

const VEHICLE_SPECS = [
  { year: 2018, make: "Honda", model: "Accord", plate: "DASH01" },
  { year: 2020, make: "Toyota", model: "Camry", plate: "DASH02" },
  { year: 2014, make: "Honda", model: "Accord", plate: "DASH03" },
  { year: 2019, make: "Subaru", model: "Outback", plate: "DASH04" },
  { year: 2016, make: "Ford", model: "F-150", plate: "DASH05" },
  { year: 2021, make: "Hyundai", model: "Tucson", plate: "DASH06" },
  { year: 2017, make: "Chevrolet", model: "Equinox", plate: "DASH07" },
  { year: 2015, make: "Nissan", model: "Altima", plate: "DASH08" },
] as const;

const APPT_SLOTS = [
  { hour: 8, minute: 0 },
  { hour: 9, minute: 30 },
  { hour: 11, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 30 },
] as const;

type CustomerRow = { id: string; firstName: string; lastName: string; phone: string | null };

async function ensureDemoCustomers(shopId: string): Promise<CustomerRow[]> {
  const out: CustomerRow[] = [];
  for (const spec of CUSTOMER_SPECS) {
    const existing = await prisma.customer.findFirst({
      where: { shopId, firstName: spec.firstName, lastName: spec.lastName },
      select: { id: true, firstName: true, lastName: true, phone: true, tags: true },
    });
    if (existing) {
      if (!existing.tags.includes(DEMO_TAG)) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { tags: { push: DEMO_TAG } },
        });
      }
      out.push(existing);
      continue;
    }
    const created = await prisma.customer.create({
      data: {
        shopId,
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: spec.phone,
        phoneDigits: spec.phone.replace(/\D/g, ""),
        tags: [DEMO_TAG],
        leadSource: "Website",
        marketingOptIn: true,
        transactionalSmsConsent: true,
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    out.push(created);
  }
  return out;
}

async function ensureVehicle(
  shopId: string,
  customerId: string,
  spec: (typeof VEHICLE_SPECS)[number],
) {
  const existing = await prisma.vehicle.findFirst({
    where: { shopId, customerId, make: spec.make, model: spec.model, year: spec.year },
    select: { id: true },
  });
  if (existing) return existing.id;

  const vehicle = await prisma.vehicle.create({
    data: {
      shopId,
      customerId,
      year: spec.year,
      make: spec.make,
      model: spec.model,
      plate: spec.plate,
      plateState: "NY",
      color: "Silver",
    },
    select: { id: true },
  });
  return vehicle.id;
}

async function cleanupPriorDemo(shopId: string) {
  const demoRos = await prisma.repairOrder.findMany({
    where: { shopId, notes: { contains: DEMO_MARKER } },
    select: { id: true },
  });
  const roIds = demoRos.map((r) => r.id);

  // Messages / activities / invoices cascade or setNull — delete messages by marker first.
  const [msgs, appts, activities, ros] = await Promise.all([
    prisma.message.deleteMany({
      where: { shopId, body: { startsWith: MSG_PREFIX } },
    }),
    prisma.appointment.deleteMany({
      where: { shopId, title: { startsWith: APPT_TITLE_PREFIX } },
    }),
    roIds.length
      ? prisma.roActivity.deleteMany({ where: { shopId, repairOrderId: { in: roIds } } })
      : Promise.resolve({ count: 0 }),
    roIds.length
      ? prisma.repairOrder.deleteMany({ where: { id: { in: roIds } } })
      : Promise.resolve({ count: 0 }),
  ]);

  console.log(
    `Cleaned prior dashboard demo: ${ros.count} ROs, ${appts.count} appointments, ${msgs.count} messages, ${activities.count} activities.`,
  );
}

type CreatedRo = {
  id: string;
  number: number;
  customerIdx: number;
  status: ROStatus;
  jobName: string;
};

async function createRoWithJob(opts: {
  shopId: string;
  number: number;
  customerId: string;
  vehicleId: string;
  serviceWriterId: string | null;
  status: ROStatus;
  createdAt: Date;
  completedAt?: Date | null;
  authorizedAt?: Date | null;
  jobName: string;
  totalDollars: number;
  customerIdx: number;
  withPayment?: PaymentMethod;
  invNumber?: number;
}): Promise<{ ro: CreatedRo; nextInv: number }> {
  const laborCents = dollars(opts.totalDollars * 0.52);
  const partsCents = dollars(opts.totalDollars * 0.38);
  const taxCents = dollars(opts.totalDollars * 0.1);
  const totalCents = laborCents + partsCents + taxCents;
  const hours = Math.max(0.5, Math.round((laborCents / 15000) * 10) / 10);
  const authorized =
    opts.status !== ROStatus.ESTIMATE || Boolean(opts.authorizedAt);

  const ro = await prisma.repairOrder.create({
    data: {
      shopId: opts.shopId,
      number: opts.number,
      customerId: opts.customerId,
      vehicleId: opts.vehicleId,
      status: opts.status,
      serviceWriterId: opts.serviceWriterId,
      mileageIn: 45000 + opts.number,
      laborRateCents: 15000,
      laborSubtotalCents: laborCents,
      partsSubtotalCents: partsCents,
      taxCents,
      totalCents,
      notes: `${DEMO_MARKER} — dashboard demo data`,
      createdAt: opts.createdAt,
      completedAt: opts.completedAt ?? null,
      authorizedAt: authorized ? (opts.authorizedAt ?? opts.createdAt) : null,
      authorizedBy: authorized ? "Shop" : null,
      approvedVia: authorized ? "SHOP" : null,
      jobs: {
        create: [
          {
            shopId: opts.shopId,
            name: opts.jobName,
            authorized,
            approvedAt: authorized ? opts.createdAt : null,
            createdAt: opts.createdAt,
            laborLines: {
              create: [
                {
                  shopId: opts.shopId,
                  description: opts.jobName,
                  hours,
                  rateCents: 15000,
                  totalCents: laborCents,
                },
              ],
            },
            partLines: {
              create: [
                {
                  shopId: opts.shopId,
                  description: `${opts.jobName} parts`,
                  quantity: 1,
                  costCents: Math.round(partsCents * 0.55),
                  retailCents: partsCents,
                  totalCents: partsCents,
                },
              ],
            },
          },
        ],
      },
    },
    select: { id: true, number: true },
  });

  let nextInv = opts.invNumber ?? 0;
  if (opts.withPayment && opts.completedAt && nextInv > 0) {
    await prisma.invoice.create({
      data: {
        shopId: opts.shopId,
        repairOrderId: ro.id,
        number: nextInv++,
        status: InvoiceStatus.PAID,
        subtotalCents: laborCents + partsCents,
        taxCents,
        totalCents,
        balanceCents: 0,
        issuedAt: opts.completedAt,
        shareToken: randomBytes(18).toString("base64url"),
        payments: {
          create: [
            {
              shopId: opts.shopId,
              amountCents: totalCents,
              method: opts.withPayment,
              reference:
                opts.withPayment === PaymentMethod.CASH
                  ? "Cash drawer"
                  : opts.withPayment === PaymentMethod.CHECK
                    ? "Check #4481"
                    : "Visa ••4242",
              paidAt: opts.completedAt,
            },
          ],
        },
      },
    });
  }

  return {
    ro: {
      id: ro.id,
      number: ro.number,
      customerIdx: opts.customerIdx,
      status: opts.status,
      jobName: opts.jobName,
    },
    nextInv,
  };
}

async function verifyDashboard(shopId: string, today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const fourteenDaysAgo = new Date(start);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const monthStart = startOfMonth(today);

  const [
    rosOpened,
    rosCompleted,
    payments,
    appointments,
    messages,
    activities,
    overdueCustomers,
    pendingEstimates,
    approvedOpen,
    monthJobs,
  ] = await Promise.all([
    prisma.repairOrder.count({ where: { shopId, createdAt: { gte: start, lte: end } } }),
    prisma.repairOrder.count({ where: { shopId, completedAt: { gte: start, lte: end } } }),
    prisma.payment.aggregate({
      where: { invoice: { shopId }, paidAt: { gte: start, lte: end } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.appointment.count({ where: { shopId, startAt: { gte: start, lte: end } } }),
    prisma.message.count({ where: { shopId, createdAt: { gte: start, lte: end } } }),
    prisma.roActivity.count({ where: { shopId, createdAt: { gte: start, lte: end } } }),
    prisma.customer.count({
      where: {
        shopId,
        repairOrders: {
          some: {
            archivedAt: null,
            status: ROStatus.ESTIMATE,
            createdAt: { lte: fourteenDaysAgo },
          },
        },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        status: ROStatus.ESTIMATE,
        authorizedAt: null,
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        status: { in: [ROStatus.ESTIMATE, ROStatus.APPROVED] },
        authorizedAt: { not: null },
      },
    }),
    prisma.job.findMany({
      where: {
        shopId,
        createdAt: { gte: monthStart },
        repairOrder: {
          shopId,
          archivedAt: null,
          status: {
            in: [ROStatus.COMPLETED, ROStatus.INVOICED, ROStatus.IN_PROGRESS, ROStatus.APPROVED],
          },
        },
      },
      select: {
        name: true,
        laborLines: { select: { totalCents: true } },
        partLines: { select: { totalCents: true } },
      },
      take: 500,
    }),
  ]);

  const byName = new Map<string, number>();
  for (const job of monthJobs) {
    const labor = job.laborLines.reduce((s, l) => s + l.totalCents, 0);
    const parts = job.partLines.reduce((s, l) => s + l.totalCents, 0);
    const total = labor + parts;
    if (total <= 0) continue;
    const key = job.name.trim() || "Service";
    byName.set(key, (byName.get(key) ?? 0) + total);
  }
  const topServices = Array.from(byName.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const collected = payments._sum.amountCents ?? 0;
  console.log("\n── Dashboard verification (today) ──");
  console.log(`  ROs Opened:      ${rosOpened}`);
  console.log(`  ROs Completed:   ${rosCompleted}`);
  console.log(`  Collected:       $${(collected / 100).toFixed(2)} (${payments._count} payments)`);
  console.log(`  Appointments:    ${appointments}`);
  console.log(`  Messages:        ${messages}`);
  console.log(`  Activity notes:  ${activities}`);
  console.log(`  Overdue follow-ups (customers): ${overdueCustomers}`);
  console.log(`  Estimate pending / approved: ${pendingEstimates} / ${approvedOpen}`);
  console.log(`  Top services this month:`);
  for (const [name, cents] of topServices) {
    console.log(`    · ${name}: $${(cents / 100).toFixed(2)}`);
  }
  if (topServices.length === 0) {
    console.log("    (none — check job totals / RO statuses)");
  }

  const empty: string[] = [];
  if (rosOpened === 0) empty.push("ROs Opened");
  if (rosCompleted === 0) empty.push("ROs Completed");
  if (collected === 0) empty.push("Collected");
  if (appointments === 0) empty.push("Appointments");
  if (messages === 0) empty.push("Messages");
  if (activities === 0) empty.push("Activity");
  if (overdueCustomers === 0) empty.push("Overdue follow-ups");
  if (topServices.length === 0) empty.push("Top services");
  // Declined is always 0 in schema — not seeded.
  empty.push("Estimate declined (schema has no declined status — always 0)");

  console.log("\n  Still empty / always-zero:");
  for (const e of empty) console.log(`    · ${e}`);
}

export async function seedDashboardDemo(opts?: { shopId?: string; days?: number }) {
  const parsed = parseArgs();
  const shopId = opts?.shopId ?? parsed.shopId;
  const days = opts?.days ?? parsed.days;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true },
  });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  console.log(`\nSeeding dashboard demo for "${shop.name}" (${shop.id})`);
  console.log(`Horizon: today → +${days} days (local calendar)\n`);

  await cleanupPriorDemo(shopId);

  const customers = await ensureDemoCustomers(shopId);
  const vehicles = await Promise.all(
    customers.map((c, i) => ensureVehicle(shopId, c.id, VEHICLE_SPECS[i]!)),
  );

  const staff = await prisma.membership.findFirst({
    where: { shopId, active: true },
    select: { userId: true },
  });
  const serviceWriterId = staff?.userId ?? null;

  const [maxRo, maxInv] = await Promise.all([
    prisma.repairOrder.aggregate({ where: { shopId }, _max: { number: true } }),
    prisma.invoice.aggregate({ where: { shopId }, _max: { number: true } }),
  ]);
  let roNumber = (maxRo._max.number ?? 1000) + 1;
  let invNumber = (maxInv._max.number ?? 5000) + 1;

  const createdRos: CreatedRo[] = [];
  let appointmentCount = 0;
  let messageCount = 0;
  let activityCount = 0;
  let paymentCount = 0;
  let overdueCount = 0;

  // ── Overdue ESTIMATE ROs (>14 days) for overdue follow-ups card ──
  const overdueOffsets = [18, 21, 25, 30];
  for (let i = 0; i < overdueOffsets.length; i++) {
    const idx = i % customers.length;
    const svc = SERVICE_CATALOG[i % SERVICE_CATALOG.length]!;
    const createdAt = atDay(today, -overdueOffsets[i]!, 10, 15);
    const { ro, nextInv } = await createRoWithJob({
      shopId,
      number: roNumber++,
      customerId: customers[idx]!.id,
      vehicleId: vehicles[idx]!,
      serviceWriterId,
      status: ROStatus.ESTIMATE,
      createdAt,
      jobName: svc.name,
      totalDollars: svc.total,
      customerIdx: idx,
      invNumber,
    });
    invNumber = nextInv || invNumber;
    createdRos.push(ro);
    overdueCount++;
  }

  // ── Recent past (this month) completed ROs for top services + some payments ──
  const pastCompleted: { dayOffset: number; customerIdx: number; svcIdx: number; pay?: PaymentMethod }[] = [
    { dayOffset: -6, customerIdx: 0, svcIdx: 0, pay: PaymentMethod.CARD },
    { dayOffset: -5, customerIdx: 1, svcIdx: 2, pay: PaymentMethod.CASH },
    { dayOffset: -4, customerIdx: 2, svcIdx: 4, pay: PaymentMethod.CARD },
    { dayOffset: -3, customerIdx: 3, svcIdx: 5, pay: PaymentMethod.CHECK },
    { dayOffset: -2, customerIdx: 4, svcIdx: 1, pay: PaymentMethod.CARD },
    { dayOffset: -1, customerIdx: 5, svcIdx: 3 },
  ];
  for (const spec of pastCompleted) {
    const svc = SERVICE_CATALOG[spec.svcIdx]!;
    const createdAt = atDay(today, spec.dayOffset, 8, 0);
    const completedAt = atDay(today, spec.dayOffset, 15, 30);
    const { ro, nextInv } = await createRoWithJob({
      shopId,
      number: roNumber++,
      customerId: customers[spec.customerIdx]!.id,
      vehicleId: vehicles[spec.customerIdx]!,
      serviceWriterId,
      status: ROStatus.COMPLETED,
      createdAt,
      completedAt,
      jobName: svc.name,
      totalDollars: svc.total,
      customerIdx: spec.customerIdx,
      withPayment: spec.pay,
      invNumber,
    });
    invNumber = nextInv || invNumber;
    if (spec.pay) paymentCount++;
    createdRos.push(ro);
  }

  // ── Today: mix of opened / WIP / completed + payments ──
  const todaySpecs: {
    customerIdx: number;
    status: ROStatus;
    hour: number;
    minute: number;
    svcIdx: number;
    completeHour?: number;
    pay?: PaymentMethod;
    authorized?: boolean;
  }[] = [
    { customerIdx: 0, status: ROStatus.ESTIMATE, hour: 7, minute: 45, svcIdx: 0 },
    { customerIdx: 1, status: ROStatus.IN_PROGRESS, hour: 8, minute: 20, svcIdx: 2 },
    {
      customerIdx: 2,
      status: ROStatus.COMPLETED,
      hour: 7,
      minute: 10,
      svcIdx: 6,
      completeHour: 11,
      pay: PaymentMethod.CARD,
    },
    { customerIdx: 3, status: ROStatus.ESTIMATE, hour: 10, minute: 5, svcIdx: 9, authorized: true },
    {
      customerIdx: 4,
      status: ROStatus.COMPLETED,
      hour: 8,
      minute: 0,
      svcIdx: 7,
      completeHour: 14,
      pay: PaymentMethod.CASH,
    },
    { customerIdx: 5, status: ROStatus.IN_PROGRESS, hour: 12, minute: 15, svcIdx: 10 },
    { customerIdx: 6, status: ROStatus.ESTIMATE, hour: 13, minute: 40, svcIdx: 11 },
    {
      customerIdx: 7,
      status: ROStatus.COMPLETED,
      hour: 9,
      minute: 0,
      svcIdx: 1,
      completeHour: 16,
      pay: PaymentMethod.CARD,
    },
  ];

  for (const spec of todaySpecs) {
    const svc = SERVICE_CATALOG[spec.svcIdx]!;
    const createdAt = atDay(today, 0, spec.hour, spec.minute);
    const completedAt =
      spec.completeHour != null ? atDay(today, 0, spec.completeHour, 20) : null;
    const { ro, nextInv } = await createRoWithJob({
      shopId,
      number: roNumber++,
      customerId: customers[spec.customerIdx]!.id,
      vehicleId: vehicles[spec.customerIdx]!,
      serviceWriterId,
      status: spec.status,
      createdAt,
      completedAt,
      authorizedAt: spec.authorized ? createdAt : undefined,
      jobName: svc.name,
      totalDollars: svc.total,
      customerIdx: spec.customerIdx,
      withPayment: spec.pay,
      invNumber,
    });
    invNumber = nextInv || invNumber;
    if (spec.pay) paymentCount++;
    createdRos.push(ro);
  }

  // ── Near-future ROs (estimates scheduled as drop-offs over next few days) ──
  for (let day = 1; day <= Math.min(3, days); day++) {
    const idx = day % customers.length;
    const svc = SERVICE_CATALOG[(day + 3) % SERVICE_CATALOG.length]!;
    const { ro, nextInv } = await createRoWithJob({
      shopId,
      number: roNumber++,
      customerId: customers[idx]!.id,
      vehicleId: vehicles[idx]!,
      serviceWriterId,
      status: day === 2 ? ROStatus.APPROVED : ROStatus.ESTIMATE,
      createdAt: atDay(today, day, 9, 0),
      authorizedAt: day === 2 ? atDay(today, day, 9, 0) : undefined,
      jobName: svc.name,
      totalDollars: svc.total,
      customerIdx: idx,
      invNumber,
    });
    invNumber = nextInv || invNumber;
    createdRos.push(ro);
  }

  // ── Appointments: several per day for today → +days ──
  const apptRows: {
    shopId: string;
    customerId: string;
    vehicleId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    status: AppointmentStatus;
    source: string;
    serviceName: string;
  }[] = [];

  for (let day = 0; day <= days; day++) {
    // 3–5 appointments per day, staggered slots
    const slotsPerDay = day === 0 ? 5 : 3 + (day % 3);
    for (let s = 0; s < slotsPerDay; s++) {
      const slot = APPT_SLOTS[s % APPT_SLOTS.length]!;
      const idx = (day * 3 + s) % customers.length;
      const cust = customers[idx]!;
      const svc = SERVICE_CATALOG[(day + s) % SERVICE_CATALOG.length]!;
      const startAt = atDay(today, day, slot.hour, slot.minute);
      const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);
      apptRows.push({
        shopId,
        customerId: cust.id,
        vehicleId: vehicles[idx]!,
        title: `${APPT_TITLE_PREFIX} ${cust.firstName} ${cust.lastName} — ${svc.name}`,
        startAt,
        endAt,
        status: AppointmentStatus.SCHEDULED,
        source: s % 2 === 0 ? "STAFF" : "WEBSITE",
        serviceName: svc.name,
      });
    }
  }
  await prisma.appointment.createMany({ data: apptRows });
  appointmentCount = apptRows.length;

  // ── Activities (today + a couple recent) ──
  const activityRos = createdRos.filter((r) =>
    todaySpecs.some((t) => t.customerIdx === r.customerIdx),
  );
  const activityData = [
    {
      shopId,
      repairOrderId: activityRos[0]?.id ?? createdRos[0]!.id,
      type: RoActivityType.PHONE_CALL,
      description: "Customer confirmed drop-off time for oil change.",
      createdAt: atDay(today, 0, 8, 5),
    },
    {
      shopId,
      repairOrderId: activityRos[1]?.id ?? createdRos[1]!.id,
      type: RoActivityType.NOTE,
      description: "Tech noted uneven pad wear — recommended rotors with pads.",
      createdAt: atDay(today, 0, 9, 40),
    },
    {
      shopId,
      repairOrderId: activityRos[2]?.id ?? createdRos[2]!.id,
      type: RoActivityType.EMAIL,
      description: "Sent digital inspection summary; customer opened link.",
      createdAt: atDay(today, 0, 11, 15),
    },
    {
      shopId,
      repairOrderId: activityRos[3]?.id ?? createdRos[3]!.id,
      type: RoActivityType.NOTE,
      description: "Waiting on parts ETA from supplier — expected tomorrow AM.",
      createdAt: atDay(today, 0, 13, 50),
    },
    {
      shopId,
      repairOrderId: activityRos[4]?.id ?? createdRos[4]!.id,
      type: RoActivityType.PHONE_CALL,
      description: "Left voicemail about estimate approval for check-engine diag.",
      createdAt: atDay(today, 0, 15, 10),
    },
    {
      shopId,
      repairOrderId: createdRos.find((r) => r.status === ROStatus.COMPLETED)?.id ?? createdRos[0]!.id,
      type: RoActivityType.OTHER,
      description: "Keys returned to customer; thank-you SMS queued.",
      createdAt: atDay(today, -1, 16, 45),
    },
  ];
  await prisma.roActivity.createMany({ data: activityData });
  activityCount = activityData.length;

  // ── Messages (today inbound/outbound) ──
  const msgRoMark = createdRos.find((r) => r.customerIdx === 0);
  const msgRoTabish = createdRos.find((r) => r.customerIdx === 1);
  const msgRoChen = createdRos.find((r) => r.customerIdx === 3);
  const messageData = [
    {
      shopId,
      customerId: customers[0]!.id,
      repairOrderId: msgRoMark?.id,
      direction: MessageDirection.INBOUND,
      body: `${MSG_PREFIX} Hi — can I drop the Accord off around 8 for the oil change?`,
      status: "received",
      createdAt: atDay(today, 0, 7, 40),
    },
    {
      shopId,
      customerId: customers[0]!.id,
      repairOrderId: msgRoMark?.id,
      direction: MessageDirection.OUTBOUND,
      body: `${MSG_PREFIX} Yes, we have a bay open after 8. See you then!`,
      status: "sent",
      createdAt: atDay(today, 0, 7, 48),
    },
    {
      shopId,
      customerId: customers[1]!.id,
      repairOrderId: msgRoTabish?.id,
      direction: MessageDirection.OUTBOUND,
      body: `${MSG_PREFIX} Your Camry is in progress — brakes look good, rotors recommended.`,
      status: "sent",
      createdAt: atDay(today, 0, 10, 22),
    },
    {
      shopId,
      customerId: customers[3]!.id,
      repairOrderId: msgRoChen?.id,
      direction: MessageDirection.INBOUND,
      body: `${MSG_PREFIX} Got the estimate — can you hold the car until I approve tonight?`,
      status: "received",
      createdAt: atDay(today, 0, 14, 5),
    },
    {
      shopId,
      customerId: customers[4]!.id,
      repairOrderId: createdRos.find((r) => r.customerIdx === 4)?.id,
      direction: MessageDirection.OUTBOUND,
      body: `${MSG_PREFIX} Coolant flush is done. Ready for pickup anytime after 2 PM.`,
      status: "sent",
      createdAt: atDay(today, 0, 14, 35),
    },
    {
      shopId,
      customerId: customers[2]!.id,
      repairOrderId: createdRos.find((r) => r.customerIdx === 2)?.id,
      direction: MessageDirection.INBOUND,
      body: `${MSG_PREFIX} Thanks — payment went through. See you next oil change!`,
      status: "received",
      createdAt: atDay(today, 0, 12, 10),
    },
  ];
  await prisma.message.createMany({ data: messageData });
  messageCount = messageData.length;

  const todayOpened = todaySpecs.length;
  const todayCompleted = todaySpecs.filter((s) => s.status === ROStatus.COMPLETED).length;

  console.log(`Created:`);
  console.log(`  Repair orders:     ${createdRos.length} (overdue estimates: ${overdueCount})`);
  console.log(`  · Opened today:    ${todayOpened}`);
  console.log(`  · Completed today: ${todayCompleted}`);
  console.log(`  Payments:          ${paymentCount}`);
  console.log(`  Appointments:      ${appointmentCount} (days 0…${days})`);
  console.log(`  Messages:          ${messageCount}`);
  console.log(`  Activities:        ${activityCount}`);
  console.log(`  Customers reused/created: ${customers.length}`);

  await verifyDashboard(shopId, today);

  console.log(`\nOpen http://localhost:3031/dashboard/snapshot`);
  console.log(`Tomorrow tab: http://localhost:3031/dashboard/snapshot?day=tomorrow\n`);
}

async function main() {
  const { shopId, days } = parseArgs();
  await seedDashboardDemo({ shopId, days });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
