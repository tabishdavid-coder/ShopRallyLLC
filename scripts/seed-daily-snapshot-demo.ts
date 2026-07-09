/**
 * Seed a realistic "today" timeline for the Dashboard → Snapshot page.
 *
 * Run: npx tsx scripts/seed-daily-snapshot-demo.ts
 *      npx tsx scripts/seed-daily-snapshot-demo.ts --date=2026-07-07
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
const DEMO_TAG = "Snapshot Demo";
const DEMO_MARKER = "SNAPSHOT_DEMO_2026-07-07";

function parseArgs() {
  let shopId = DEFAULT_SHOP_ID;
  let date = "2026-07-07";
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--shop=")) shopId = arg.slice(7) || DEFAULT_SHOP_ID;
    if (arg.startsWith("--date=")) date = arg.slice(7) || date;
  }
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid --date=${date} (use YYYY-MM-DD)`);
  return { shopId, y, m, d, date };
}

function atLocal(y: number, m: number, d: number, hour: number, minute = 0) {
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

const dollars = (n: number) => Math.round(n * 100);

async function ensureDemoCustomers(shopId: string) {
  const specs = [
    { firstName: "Mark", lastName: "Johnson", phone: "(518) 555-0142" },
    { firstName: "Tabish", lastName: "David", phone: "(518) 555-0199" },
    { firstName: "David", lastName: "Paulene", phone: "(518) 555-0177" },
    { firstName: "Sarah", lastName: "Chen", phone: "(518) 555-0163" },
    { firstName: "Robert", lastName: "Martinez", phone: "(518) 555-0188" },
  ];

  const out: { id: string; firstName: string; lastName: string; phone: string | null }[] = [];
  for (const spec of specs) {
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
  spec: { year: number; make: string; model: string; plate: string },
) {
  const existing = await prisma.vehicle.findFirst({
    where: { shopId, customerId, make: spec.make, model: spec.model },
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

  const [msgs, appts, ros] = await Promise.all([
    prisma.message.deleteMany({
      where: { shopId, body: { startsWith: "[snapshot-demo]" } },
    }),
    prisma.appointment.deleteMany({
      where: { shopId, title: { contains: "[Snapshot Demo]" } },
    }),
    roIds.length
      ? prisma.repairOrder.deleteMany({ where: { id: { in: roIds } } })
      : Promise.resolve({ count: 0 }),
  ]);

  console.log(
    `Cleaned prior snapshot demo: ${ros.count} ROs, ${appts.count} appointments, ${msgs.count} messages.`,
  );
}

export async function seedDailySnapshotDemo(opts?: {
  shopId?: string;
  y?: number;
  m?: number;
  d?: number;
}) {
  const parsed = parseArgs();
  const shopId = opts?.shopId ?? parsed.shopId;
  const y = opts?.y ?? parsed.y;
  const m = opts?.m ?? parsed.m;
  const d = opts?.d ?? parsed.d;

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, name: true } });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  await cleanupPriorDemo(shopId);

  const customers = await ensureDemoCustomers(shopId);
  const [mark, tabish, paulene, chen, martinez] = customers;

  const staff = await prisma.membership.findFirst({
    where: { shopId, active: true },
    select: { userId: true },
  });
  const serviceWriterId = staff?.userId ?? null;

  const vehicles = await Promise.all([
    ensureVehicle(shopId, mark!.id, { year: 2018, make: "Honda", model: "Accord", plate: "SNAP01" }),
    ensureVehicle(shopId, tabish!.id, { year: 2020, make: "Toyota", model: "Camry", plate: "SNAP02" }),
    ensureVehicle(shopId, paulene!.id, { year: 2014, make: "Honda", model: "Accord", plate: "SNAP03" }),
    ensureVehicle(shopId, chen!.id, { year: 2019, make: "Subaru", model: "Outback", plate: "SNAP04" }),
    ensureVehicle(shopId, martinez!.id, { year: 2016, make: "Ford", model: "F-150", plate: "SNAP05" }),
  ]);

  const [maxRo, maxInv] = await Promise.all([
    prisma.repairOrder.aggregate({ where: { shopId }, _max: { number: true } }),
    prisma.invoice.aggregate({ where: { shopId }, _max: { number: true } }),
  ]);
  let roNumber = (maxRo._max.number ?? 1000) + 1;
  let invNumber = (maxInv._max.number ?? 5000) + 1;

  type RoSpec = {
    customerIdx: number;
    vehicleIdx: number;
    status: ROStatus;
    createdAt: Date;
    completedAt?: Date;
    jobName: string;
    total: number;
    withPayment?: PaymentMethod;
  };

  const roSpecs: RoSpec[] = [
    {
      customerIdx: 0,
      vehicleIdx: 0,
      status: ROStatus.ESTIMATE,
      createdAt: atLocal(y, m, d, 8, 12),
      jobName: "Synthetic oil & filter change",
      total: 189.95,
    },
    {
      customerIdx: 3,
      vehicleIdx: 3,
      status: ROStatus.IN_PROGRESS,
      createdAt: atLocal(y, m, d, 9, 48),
      jobName: "Front brake pads & rotors",
      total: 742.5,
    },
    {
      customerIdx: 1,
      vehicleIdx: 1,
      status: ROStatus.COMPLETED,
      createdAt: atLocal(y, m, d, 7, 30),
      completedAt: atLocal(y, m, d, 11, 22),
      jobName: "NYS safety inspection",
      total: 847.0,
      withPayment: PaymentMethod.CARD,
    },
    {
      customerIdx: 4,
      vehicleIdx: 4,
      status: ROStatus.ESTIMATE,
      createdAt: atLocal(y, m, d, 14, 5),
      jobName: "Diagnose check engine light",
      total: 165.0,
    },
    {
      customerIdx: 2,
      vehicleIdx: 2,
      status: ROStatus.COMPLETED,
      createdAt: atLocal(y, m, d, 8, 0),
      completedAt: atLocal(y, m, d, 16, 10),
      jobName: "Coolant flush & hose replacement",
      total: 512.35,
      withPayment: PaymentMethod.CASH,
    },
  ];

  const createdRos: { id: string; number: number; customerIdx: number }[] = [];

  for (const spec of roSpecs) {
    const customer = customers[spec.customerIdx]!;
    const laborCents = dollars(spec.total * 0.52);
    const partsCents = dollars(spec.total * 0.38);
    const taxCents = dollars(spec.total * 0.1);
    const totalCents = laborCents + partsCents + taxCents;
    const hours = Math.max(0.5, Math.round((laborCents / 15000) * 10) / 10);
    const authorized = spec.status !== ROStatus.ESTIMATE;

    const ro = await prisma.repairOrder.create({
      data: {
        shopId,
        number: roNumber++,
        customerId: customer.id,
        vehicleId: vehicles[spec.vehicleIdx]!,
        status: spec.status,
        serviceWriterId,
        mileageIn: 62000 + roNumber,
        laborSubtotalCents: laborCents,
        partsSubtotalCents: partsCents,
        taxCents,
        totalCents,
        notes: `${DEMO_MARKER} — snapshot review data`,
        createdAt: spec.createdAt,
        completedAt: spec.completedAt ?? null,
        authorizedAt: authorized ? spec.createdAt : null,
        authorizedBy: authorized ? "Shop" : null,
        approvedVia: authorized ? "SHOP" : null,
        jobs: {
          create: [
            {
              shopId,
              name: spec.jobName,
              authorized,
              approvedAt: authorized ? spec.createdAt : null,
              laborLines: {
                create: [
                  {
                    shopId,
                    description: spec.jobName,
                    hours,
                    rateCents: 15000,
                    totalCents: laborCents,
                  },
                ],
              },
              partLines: {
                create: [
                  {
                    shopId,
                    description: `${spec.jobName} parts`,
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

    createdRos.push({ id: ro.id, number: ro.number, customerIdx: spec.customerIdx });

    if (spec.withPayment && spec.completedAt) {
      await prisma.invoice.create({
        data: {
          shopId,
          repairOrderId: ro.id,
          number: invNumber++,
          status: InvoiceStatus.PAID,
          subtotalCents: laborCents + partsCents,
          taxCents,
          totalCents,
          balanceCents: 0,
          issuedAt: spec.completedAt,
          shareToken: randomBytes(18).toString("base64url"),
          payments: {
            create: [
              {
                shopId,
                amountCents: totalCents,
                method: spec.withPayment,
                reference: spec.withPayment === PaymentMethod.CASH ? "Cash" : "Visa ••4242",
                paidAt: spec.completedAt,
              },
            ],
          },
        },
      });
    }
  }

  const roForTabish = createdRos.find((r) => r.customerIdx === 1)!;
  const roForMark = createdRos.find((r) => r.customerIdx === 0)!;

  await prisma.roActivity.createMany({
    data: [
      {
        shopId,
        repairOrderId: roForMark.id,
        type: RoActivityType.PHONE_CALL,
        description: "Customer asked about wait time — advised 45 min for oil change.",
        createdAt: atLocal(y, m, d, 8, 28),
      },
      {
        shopId,
        repairOrderId: roForTabish.id,
        type: RoActivityType.NOTE,
        description: "Inspection photos uploaded; customer approved additional brake work via phone.",
        createdAt: atLocal(y, m, d, 10, 45),
      },
      {
        shopId,
        repairOrderId: roForTabish.id,
        type: RoActivityType.EMAIL,
        description: "Sent digital inspection link — opened within 5 minutes.",
        createdAt: atLocal(y, m, d, 13, 5),
      },
    ],
  });

  await prisma.appointment.createMany({
    data: [
      {
        shopId,
        customerId: paulene!.id,
        vehicleId: vehicles[2]!,
        title: "[Snapshot Demo] David Paulene — state inspection",
        startAt: atLocal(y, m, d, 9, 0),
        endAt: atLocal(y, m, d, 9, 45),
        status: AppointmentStatus.SCHEDULED,
        source: "STAFF",
      },
      {
        shopId,
        customerId: chen!.id,
        vehicleId: vehicles[3]!,
        title: "[Snapshot Demo] Sarah Chen — brake concern follow-up",
        startAt: atLocal(y, m, d, 11, 30),
        endAt: atLocal(y, m, d, 12, 0),
        status: AppointmentStatus.SCHEDULED,
        source: "WEBSITE",
      },
      {
        shopId,
        customerId: martinez!.id,
        vehicleId: vehicles[4]!,
        title: "[Snapshot Demo] Robert Martinez — check engine light",
        startAt: atLocal(y, m, d, 15, 0),
        endAt: atLocal(y, m, d, 15, 30),
        status: AppointmentStatus.SCHEDULED,
        source: "STAFF",
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        shopId,
        customerId: mark!.id,
        repairOrderId: roForMark.id,
        direction: MessageDirection.INBOUND,
        body: "[snapshot-demo] Hi — can I drop off at 8:30 for the oil change?",
        status: "received",
        createdAt: atLocal(y, m, d, 7, 55),
      },
      {
        shopId,
        customerId: mark!.id,
        repairOrderId: roForMark.id,
        direction: MessageDirection.OUTBOUND,
        body: "[snapshot-demo] Yes, we can take your Accord anytime after 8 AM. See you soon!",
        status: "sent",
        createdAt: atLocal(y, m, d, 8, 2),
      },
      {
        shopId,
        customerId: tabish!.id,
        repairOrderId: roForTabish.id,
        direction: MessageDirection.OUTBOUND,
        body: "[snapshot-demo] Your Camry inspection is complete. Invoice link is ready when you are.",
        status: "sent",
        createdAt: atLocal(y, m, d, 11, 35),
      },
      {
        shopId,
        customerId: chen!.id,
        repairOrderId: createdRos.find((r) => r.customerIdx === 3)!.id,
        direction: MessageDirection.INBOUND,
        body: "[snapshot-demo] Any update on the brakes? Still hearing a squeak.",
        status: "received",
        createdAt: atLocal(y, m, d, 14, 18),
      },
    ],
  });

  console.log(`\nSnapshot demo seeded for ${shop.name} on ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  console.log(`  ROs opened today: ${roSpecs.length}`);
  console.log(`  ROs completed today: ${roSpecs.filter((s) => s.completedAt).length}`);
  console.log(`  Payments: ${roSpecs.filter((s) => s.withPayment).length}`);
  console.log(`  Activities: 3 · Appointments: 3 · Messages: 4`);
  console.log(`\nOpen http://localhost:3031/dashboard/snapshot to review.`);
}

async function seedTomorrowPreview(
  shopId: string,
  customers: Awaited<ReturnType<typeof ensureDemoCustomers>>,
  vehicles: string[],
  y: number,
  m: number,
  d: number,
) {
  const [mark, , paulene, chen] = customers;
  await prisma.appointment.createMany({
    data: [
      {
        shopId,
        customerId: mark!.id,
        vehicleId: vehicles[0]!,
        title: "[Snapshot Demo] Mark Johnson — oil change drop-off",
        startAt: atLocal(y, m, d, 8, 30),
        endAt: atLocal(y, m, d, 9, 15),
        status: AppointmentStatus.SCHEDULED,
        source: "STAFF",
      },
      {
        shopId,
        customerId: paulene!.id,
        vehicleId: vehicles[2]!,
        title: "[Snapshot Demo] David Paulene — pickup after inspection",
        startAt: atLocal(y, m, d, 10, 0),
        endAt: atLocal(y, m, d, 10, 30),
        status: AppointmentStatus.SCHEDULED,
        source: "STAFF",
      },
      {
        shopId,
        customerId: chen!.id,
        vehicleId: vehicles[3]!,
        title: "[Snapshot Demo] Sarah Chen — brake inspection follow-up",
        startAt: atLocal(y, m, d, 14, 0),
        endAt: atLocal(y, m, d, 14, 45),
        status: AppointmentStatus.SCHEDULED,
        source: "WEBSITE",
      },
    ],
  });
  console.log(`  Tomorrow preview: 3 appointments on ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

async function main() {
  const { shopId, y, m, d } = parseArgs();
  await seedDailySnapshotDemo({ shopId, y, m, d });

  const tomorrow = new Date(y, m - 1, d + 1);
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
  if (shop) {
    const customers = await ensureDemoCustomers(shopId);
    const vehicles = await Promise.all([
      ensureVehicle(shopId, customers[0]!.id, { year: 2018, make: "Honda", model: "Accord", plate: "SNAP01" }),
      ensureVehicle(shopId, customers[1]!.id, { year: 2020, make: "Toyota", model: "Camry", plate: "SNAP02" }),
      ensureVehicle(shopId, customers[2]!.id, { year: 2014, make: "Honda", model: "Accord", plate: "SNAP03" }),
      ensureVehicle(shopId, customers[3]!.id, { year: 2019, make: "Subaru", model: "Outback", plate: "SNAP04" }),
    ]);
    await seedTomorrowPreview(
      shopId,
      customers,
      vehicles,
      tomorrow.getFullYear(),
      tomorrow.getMonth() + 1,
      tomorrow.getDate(),
    );
  }

  console.log(`\nTomorrow tab: http://localhost:3031/dashboard/snapshot?day=tomorrow`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
