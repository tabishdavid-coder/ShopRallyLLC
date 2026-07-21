/**
 * Seed realistic appointments + calendar blocks for Macuto Auto Repair (Core QA shop).
 * Additive only — does not wipe unrelated Macuto data.
 *
 * Run:
 *   npx tsx scripts/seed-macuto-appointments.ts
 *   npm run db:seed-macuto-appointments
 *   npx tsx scripts/seed-macuto-appointments.ts --days=14
 *
 * Re-runnable: deletes prior rows tagged with MACUTO_APPT_SEED_v1 first.
 */
import { AppointmentStatus, PrismaClient } from "../src/generated/prisma";
import { phoneDigitsKey } from "../src/lib/phone";
import { MACUTO_SHOP_ID } from "../src/lib/shop-constants";

const prisma = new PrismaClient();

const SHOP_ID = MACUTO_SHOP_ID;
const DEFAULT_DAYS = 14;
const SEED_MARKER = "MACUTO_APPT_SEED_v1";
const CUSTOMER_TAG = "Macuto Appt Demo";

type CustomerBundle = {
  id: string;
  firstName: string;
  lastName: string;
  vehicleId: string;
  vehicleLabel: string;
  repairOrderId?: string;
};

const SERVICE_CATALOG = [
  {
    name: "Oil Change",
    notes: "Conventional oil; customer will wait in lobby.",
    duration: 30,
  },
  {
    name: "Synthetic Oil Change",
    notes: "0W-20 full synthetic — drop-off before 9 AM.",
    duration: 45,
  },
  {
    name: "Front Brake Pads & Rotors",
    notes: "Grinding noise on stop — inspect calipers while in.",
    duration: 120,
  },
  {
    name: "Rear Brake Pads",
    notes: "Rear pads only; rotors look OK per phone consult.",
    duration: 90,
  },
  {
    name: "NYS Safety Inspection",
    notes: "Sticker expires end of month.",
    duration: 30,
  },
  {
    name: "Multi-Point Inspection",
    notes: "Pre-purchase inspection for buyer — report by EOD.",
    duration: 60,
  },
  {
    name: "Check Engine Light Diagnosis",
    notes: "CEL steady; no drivability issues reported.",
    duration: 60,
  },
  {
    name: "Tire Rotation & Balance",
    notes: "Rotate and balance all four; check TPMS.",
    duration: 45,
  },
  {
    name: "Wheel Alignment",
    notes: "Pulls slightly left on Grand Concourse.",
    duration: 60,
  },
  {
    name: "Battery Replacement",
    notes: "Slow crank mornings — test charging system too.",
    duration: 45,
  },
  {
    name: "AC Recharge & Leak Check",
    notes: "Blows warm after 20 min highway driving.",
    duration: 90,
  },
  {
    name: "Coolant Flush",
    notes: "Overdue per maintenance sticker.",
    duration: 60,
  },
  {
    name: "Vehicle Pickup",
    notes: "Keys at front desk — paid invoice on file.",
    duration: 15,
  },
  {
    name: "Drop-off — Brakes",
    notes: "Customer dropping keys in lockbox overnight.",
    duration: 30,
  },
] as const;

const EXTRA_CUSTOMERS = [
  {
    id: "cust_macuto_appt_james",
    firstName: "James",
    lastName: "Rivera",
    phone: "(718) 555-0211",
    email: "james.rivera@example.com",
    vehicle: {
      id: "veh_macuto_appt_camry",
      year: 2019,
      make: "Toyota",
      model: "Camry",
      trim: "SE",
      plate: "MAC-2209",
    },
  },
  {
    id: "cust_macuto_appt_sofia",
    firstName: "Sofia",
    lastName: "Nguyen",
    phone: "(718) 555-0233",
    email: "sofia.nguyen@example.com",
    vehicle: {
      id: "veh_macuto_appt_crv",
      year: 2021,
      make: "Honda",
      model: "CR-V",
      trim: "EX",
      plate: "MAC-3318",
    },
  },
  {
    id: "cust_macuto_appt_derek",
    firstName: "Derek",
    lastName: "Washington",
    phone: "(718) 555-0244",
    email: "derek.w@example.com",
    vehicle: {
      id: "veh_macuto_appt_f150",
      year: 2017,
      make: "Ford",
      model: "F-150",
      trim: "XLT",
      plate: "MAC-4412",
    },
  },
  {
    id: "cust_macuto_appt_lisa",
    firstName: "Lisa",
    lastName: "Patel",
    phone: "(718) 555-0255",
    email: "lisa.patel@example.com",
    vehicle: {
      id: "veh_macuto_appt_outback",
      year: 2018,
      make: "Subaru",
      model: "Outback",
      trim: "Premium",
      plate: "MAC-5521",
    },
  },
  {
    id: "cust_macuto_appt_antonio",
    firstName: "Antonio",
    lastName: "Morales",
    phone: "(718) 555-0266",
    email: "antonio.m@example.com",
    vehicle: {
      id: "veh_macuto_appt_altima",
      year: 2016,
      make: "Nissan",
      model: "Altima",
      trim: "SV",
      plate: "MAC-6630",
    },
  },
  {
    id: "cust_macuto_appt_karen",
    firstName: "Karen",
    lastName: "Brooks",
    phone: "(718) 555-0277",
    email: "karen.brooks@example.com",
    vehicle: {
      id: "veh_macuto_appt_equinox",
      year: 2020,
      make: "Chevrolet",
      model: "Equinox",
      trim: "LT",
      plate: "MAC-7744",
    },
  },
] as const;

const SLOT_TEMPLATES = [
  { hour: 8, minute: 0 },
  { hour: 8, minute: 30 },
  { hour: 9, minute: 15 },
  { hour: 10, minute: 0 },
  { hour: 10, minute: 45 },
  { hour: 11, minute: 30 },
  { hour: 13, minute: 0 },
  { hour: 13, minute: 45 },
  { hour: 14, minute: 30 },
  { hour: 15, minute: 15 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 0 },
] as const;

const BAYS = ["Bay 1", "Bay 2", "Bay 3", "Alignment"] as const;

function parseArgs() {
  let days = DEFAULT_DAYS;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--days=")) {
      const n = Number(arg.slice(7));
      if (Number.isFinite(n) && n >= 1 && n <= 30) days = Math.floor(n);
    }
  }
  return { days };
}

function atDay(base: Date, dayOffset: number, hour: number, minute = 0) {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    hour,
    minute,
    0,
    0,
  );
}

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60 * 1000);
}

function formatSampleDate(d: Date) {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function cleanupPriorSeed(shopId: string) {
  const [appts, blocks, demoCustomers] = await Promise.all([
    prisma.appointment.deleteMany({ where: { shopId, source: SEED_MARKER } }),
    prisma.calendarBlock.deleteMany({
      where: { shopId, notes: { contains: SEED_MARKER } },
    }),
    prisma.customer.findMany({
      where: { shopId, tags: { has: CUSTOMER_TAG } },
      select: { id: true },
    }),
  ]);

  if (demoCustomers.length) {
    const ids = demoCustomers.map((c) => c.id);
    await prisma.vehicle.deleteMany({ where: { shopId, customerId: { in: ids } } });
    await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  }

  console.log(
    `Cleaned prior Macuto appt seed: ${appts.count} appointments, ${blocks.count} blocks, ${demoCustomers.length} demo customers.`,
  );
}

async function ensureShop() {
  const shop = await prisma.shop.findUnique({
    where: { id: SHOP_ID },
    select: { id: true, name: true, apptDayStart: true, apptDayEnd: true },
  });
  if (!shop) {
    throw new Error(`Shop ${SHOP_ID} not found — run npm run db:seed first.`);
  }
  return shop;
}

async function loadStaff(shopId: string) {
  const memberships = await prisma.membership.findMany({
    where: { shopId, active: true },
    select: {
      canPerformWork: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  const technicians = memberships
    .filter((m) => m.canPerformWork)
    .map((m) => m.user);
  const advisors = memberships
    .filter((m) => !m.canPerformWork && m.user.email.includes("macuto"))
    .map((m) => m.user);

  if (technicians.length === 0) {
    throw new Error("No Macuto technicians found — run npm run db:seed first.");
  }

  return { technicians, advisors };
}

async function ensureExtraCustomers(shopId: string): Promise<CustomerBundle[]> {
  const created: CustomerBundle[] = [];

  for (const spec of EXTRA_CUSTOMERS) {
    let customer = await prisma.customer.findUnique({
      where: { id: spec.id },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          id: spec.id,
          shopId,
          firstName: spec.firstName,
          lastName: spec.lastName,
          phone: spec.phone,
          phoneDigits: phoneDigitsKey(spec.phone),
          email: spec.email,
          tags: [CUSTOMER_TAG],
          leadSource: "Website",
          marketingOptIn: true,
        },
        select: { id: true, firstName: true, lastName: true },
      });
    }

    let vehicle = await prisma.vehicle.findUnique({
      where: { id: spec.vehicle.id },
      select: { id: true, year: true, make: true, model: true },
    });

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          id: spec.vehicle.id,
          shopId,
          customerId: customer.id,
          year: spec.vehicle.year,
          make: spec.vehicle.make,
          model: spec.vehicle.model,
          trim: spec.vehicle.trim,
          plate: spec.vehicle.plate,
          plateState: "NY",
          color: "Silver",
        },
        select: { id: true, year: true, make: true, model: true },
      });
    }

    created.push({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      vehicleId: vehicle.id,
      vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    });
  }

  return created;
}

async function loadExistingMacutoBundles(shopId: string): Promise<CustomerBundle[]> {
  const maria = await prisma.customer.findUnique({
    where: { id: "cust_macuto_maria" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      vehicles: {
        where: { id: "veh_macuto_accord" },
        select: { id: true, year: true, make: true, model: true },
      },
    },
  });

  const bundles: CustomerBundle[] = [];
  if (maria?.vehicles[0]) {
    const v = maria.vehicles[0];
    bundles.push({
      id: maria.id,
      firstName: maria.firstName,
      lastName: maria.lastName,
      vehicleId: v.id,
      vehicleLabel: `${v.year} ${v.make} ${v.model}`,
      repairOrderId: "ro_macuto_1001",
    });
  }

  const otherCustomers = await prisma.customer.findMany({
    where: {
      shopId,
      id: { notIn: ["cust_macuto_maria", ...EXTRA_CUSTOMERS.map((c) => c.id)] },
    },
    take: 4,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      vehicles: { take: 1, select: { id: true, year: true, make: true, model: true } },
    },
  });

  for (const c of otherCustomers) {
    const v = c.vehicles[0];
    if (!v) continue;
    bundles.push({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      vehicleId: v.id,
      vehicleLabel: `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim(),
    });
  }

  return bundles;
}

function pickStatus(day: number, slotIdx: number, totalDays: number): AppointmentStatus {
  if (day === 0 && slotIdx === 0) return AppointmentStatus.IN_PROGRESS;
  if (day === 0 && slotIdx === 1) return AppointmentStatus.CONFIRMED;
  if (day === 1 && slotIdx === 0) return AppointmentStatus.NO_SHOW;
  if (day === 2 && slotIdx === 2) return AppointmentStatus.CANCELED;
  if (day <= 2 && slotIdx % 3 === 0) return AppointmentStatus.CONFIRMED;
  if (day === totalDays && slotIdx % 4 === 0) return AppointmentStatus.CONFIRMED;
  return slotIdx % 5 === 0 ? AppointmentStatus.CONFIRMED : AppointmentStatus.SCHEDULED;
}

function appointmentsPerDay(day: number) {
  const dow = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() + day,
  ).getDay();
  if (dow === 0) return 2;
  if (dow === 6) return 3;
  return 3 + (day % 3);
}

async function main() {
  const { days } = parseArgs();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shop = await ensureShop();
  console.log(`Seeding appointments for ${shop.name} (${shop.id}) — next ${days} days`);
  console.log(`Shop hours: ${shop.apptDayStart} – ${shop.apptDayEnd}\n`);

  await cleanupPriorSeed(SHOP_ID);
  const { technicians } = await loadStaff(SHOP_ID);

  const existing = await loadExistingMacutoBundles(SHOP_ID);
  const extra = await ensureExtraCustomers(SHOP_ID);
  const customers = [...existing, ...extra];
  if (customers.length < 3) {
    throw new Error("Need at least 3 Macuto customer/vehicle pairs — check seed data.");
  }

  const apptRows: {
    shopId: string;
    customerId: string;
    vehicleId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    bay: string | null;
    technicianId: string | null;
    status: AppointmentStatus;
    source: string;
    serviceName: string;
    notes: string;
    repairOrderId: string | null;
  }[] = [];

  let globalIdx = 0;
  for (let day = 0; day < days; day++) {
    const count = appointmentsPerDay(day);
    for (let s = 0; s < count; s++) {
      const slot = SLOT_TEMPLATES[(day + s) % SLOT_TEMPLATES.length]!;
      const cust = customers[(day + s) % customers.length]!;
      const svc = SERVICE_CATALOG[(day + s + globalIdx) % SERVICE_CATALOG.length]!;
      const duration = svc.duration;
      const startAt = atDay(today, day, slot.hour, slot.minute);
      const endAt = addMinutes(startAt, duration);
      const tech = technicians[(day + s) % technicians.length]!;

      apptRows.push({
        shopId: SHOP_ID,
        customerId: cust.id,
        vehicleId: cust.vehicleId,
        title: `${cust.firstName} ${cust.lastName} — ${svc.name}`,
        startAt,
        endAt,
        bay: BAYS[(day + s) % BAYS.length] ?? null,
        technicianId: s % 4 === 3 ? null : tech.id,
        status: pickStatus(day, s, days - 1),
        source: SEED_MARKER,
        serviceName: svc.name,
        notes: svc.notes,
        repairOrderId: day === 0 && s === 0 && cust.repairOrderId ? cust.repairOrderId : null,
      });
      globalIdx++;
    }
  }

  await prisma.appointment.createMany({ data: apptRows });

  const blockRows: {
    shopId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    notes: string;
  }[] = [];

  for (let day = 0; day < days; day++) {
    const dow = atDay(today, day, 12).getDay();
    if (dow >= 1 && dow <= 5) {
      blockRows.push({
        shopId: SHOP_ID,
        title: "Lunch",
        startAt: atDay(today, day, 12, 0),
        endAt: atDay(today, day, 13, 0),
        notes: `Team lunch break. ${SEED_MARKER}`,
      });
    }
  }

  blockRows.push(
    {
      shopId: SHOP_ID,
      title: "Training — new lift safety",
      startAt: atDay(today, 3, 14, 0),
      endAt: atDay(today, 3, 16, 0),
      notes: `All techs off floor. ${SEED_MARKER}`,
    },
    {
      shopId: SHOP_ID,
      title: "Closed bay — equipment install",
      startAt: atDay(today, 5, 8, 0),
      endAt: atDay(today, 5, 12, 0),
      notes: `Bay 2 out of service. ${SEED_MARKER}`,
    },
    {
      shopId: SHOP_ID,
      title: "Shop closed — staff meeting",
      startAt: atDay(today, 7, 8, 0),
      endAt: atDay(today, 7, 10, 0),
      notes: `No customer drop-offs first 2 hours. ${SEED_MARKER}`,
    },
    {
      shopId: SHOP_ID,
      title: "Personal — advisor out",
      startAt: atDay(today, 10, 13, 30),
      endAt: atDay(today, 10, 15, 0),
      notes: `Elena at supplier pickup. ${SEED_MARKER}`,
    },
  );

  await prisma.calendarBlock.createMany({ data: blockRows });

  const rangeStart = atDay(today, 0, 8);
  const rangeEnd = atDay(today, days - 1, 18);

  const statusCounts = apptRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("Created:");
  console.log(`  Appointments:   ${apptRows.length}`);
  console.log(`  Calendar blocks: ${blockRows.length}`);
  console.log(`  Date range:     ${formatSampleDate(rangeStart)} → ${formatSampleDate(rangeEnd)}`);
  console.log(`  Status mix:     ${JSON.stringify(statusCounts)}`);
  console.log(`  Customers used: ${customers.length} (${existing.length} existing + ${extra.length} demo)`);
  console.log(`  Technicians:    ${technicians.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}`);

  console.log("\nSample calendar (next few days):");
  const sample = apptRows
    .slice(0, 8)
    .map(
      (a) =>
        `  ${formatSampleDate(a.startAt)} · ${a.status} · ${a.serviceName} · ${a.bay ?? "—"}`,
    );
  console.log(sample.join("\n"));

  console.log("\nSample blocks:");
  for (const b of blockRows.slice(0, 4)) {
    console.log(`  ${formatSampleDate(b.startAt)} · ${b.title}`);
  }

  console.log(`\nOpen: http://localhost:3031/appointments`);
  console.log(`Re-run: npx tsx scripts/seed-macuto-appointments.ts\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
