/**
 * Audit Shop Activity data sources for a shop (default: shop_macuto).
 * Counts last-7-days rows that feed getActivityFeed, samples recent events,
 * and checks whether appointment status changes leave a ShopAuditEvent trail.
 *
 * Run: npx tsx --tsconfig ./tsconfig.scripts.json scripts/audit-shop-activity-sources.ts
 */
import { prisma } from "../src/db/client";
import { ShopAuditEventType } from "../src/generated/prisma";
import { categoryForAuditEvent } from "../src/lib/activity-feed";

const SHOP_ID = process.argv[2] || "shop_macuto";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const since = daysAgo(6); // align with activity feed "7d" (today + prior 6)
  const now = new Date();
  console.log(JSON.stringify({ shopId: SHOP_ID, since: since.toISOString(), until: now.toISOString() }, null, 2));

  const shop = await prisma.shop.findUnique({
    where: { id: SHOP_ID },
    select: { id: true, name: true },
  });
  if (!shop) {
    console.error("FAIL: shop not found:", SHOP_ID);
    process.exit(1);
  }
  console.log(`Shop: ${shop.name} (${shop.id})\n`);

  const createdInRange = { gte: since, lte: now };

  const auditGrouped = await prisma.shopAuditEvent.groupBy({
    by: ["eventType"],
    where: { shopId: SHOP_ID, createdAt: createdInRange },
    _count: { _all: true },
    orderBy: { _count: { eventType: "desc" } },
  });

  const auditTotal = auditGrouped.reduce((n, r) => n + r._count._all, 0);
  const auditExcludingRoActivity = await prisma.shopAuditEvent.count({
    where: {
      shopId: SHOP_ID,
      createdAt: createdInRange,
      eventType: { not: ShopAuditEventType.RO_ACTIVITY_ADDED },
    },
  });

  console.log("=== ShopAuditEvent by eventType (last 7d) ===");
  if (auditGrouped.length === 0) console.log("(none)");
  for (const row of auditGrouped) {
    const cat = categoryForAuditEvent(row.eventType, "");
    console.log(`  ${row.eventType.padEnd(36)} ${String(row._count._all).padStart(5)}  → feed category: ${cat}`);
  }
  console.log(`  TOTAL: ${auditTotal} (feed uses ${auditExcludingRoActivity} excluding RO_ACTIVITY_ADDED)\n`);

  const roActivityCount = await prisma.roActivity.count({
    where: { shopId: SHOP_ID, createdAt: createdInRange },
  });
  const roActivityByType = await prisma.roActivity.groupBy({
    by: ["type"],
    where: { shopId: SHOP_ID, createdAt: createdInRange },
    _count: { _all: true },
  });
  console.log("=== RoActivity (last 7d) ===");
  console.log(`  TOTAL: ${roActivityCount}`);
  for (const row of roActivityByType) {
    console.log(`  ${row.type.padEnd(20)} ${row._count._all}`);
  }
  console.log("");

  const viewedCount = await prisma.repairOrder.count({
    where: {
      shopId: SHOP_ID,
      estimateViewedAt: { not: null, gte: since, lte: now },
    },
  });
  console.log("=== ROs with estimateViewedAt (last 7d) ===");
  console.log(`  TOTAL: ${viewedCount}\n`);

  const apptCreatedCount = await prisma.appointment.count({
    where: { shopId: SHOP_ID, createdAt: createdInRange },
  });
  const apptUpdatedInRange = await prisma.appointment.count({
    where: {
      shopId: SHOP_ID,
      updatedAt: createdInRange,
      NOT: { createdAt: createdInRange },
    },
  });
  const apptStatusChangedLikely = await prisma.appointment.findMany({
    where: {
      shopId: SHOP_ID,
      updatedAt: { gte: since },
      status: { not: "SCHEDULED" },
    },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      repairOrderId: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });
  console.log("=== Appointments created (last 7d) ===");
  console.log(`  TOTAL created: ${apptCreatedCount}`);
  console.log(`  updatedAt in range but created earlier: ${apptUpdatedInRange}`);
  console.log(`  sample non-SCHEDULED with updatedAt>=since: ${apptStatusChangedLikely.length}`);

  const apptAuditTypes = Object.values(ShopAuditEventType).filter((t) =>
    String(t).includes("APPOINT"),
  );
  const appointmentAuditCount = await prisma.shopAuditEvent.count({
    where: {
      shopId: SHOP_ID,
      createdAt: createdInRange,
      OR: [
        { summary: { contains: "appointment", mode: "insensitive" } },
        { summary: { contains: "Appointment" } },
      ],
    },
  });
  console.log(`  ShopAuditEventType values containing APPOINT: ${apptAuditTypes.length === 0 ? "NONE" : apptAuditTypes.join(", ")}`);
  console.log(`  ShopAuditEvent rows with 'appointment' in summary (7d): ${appointmentAuditCount}`);
  console.log("  GAP CHECK: updateAppointment / updateAppointmentStatus / cancelAppointment");
  console.log("            write Appointment rows + automation events only — no ShopAuditEvent.");
  console.log("            getActivityFeed only lists appointments by createdAt as 'booked'.");
  console.log("            Status updates (CONFIRMED/CANCELED/etc.) do NOT appear in the feed.\n");

  if (apptStatusChangedLikely.length) {
    console.log("  Sample appointments with status != SCHEDULED (recent updates):");
    for (const a of apptStatusChangedLikely.slice(0, 8)) {
      console.log(
        `    ${a.status.padEnd(12)} updated=${a.updatedAt.toISOString()} created=${a.createdAt.toISOString()} roId=${a.repairOrderId ?? "null"} | ${a.title}`,
      );
    }
    console.log("");
  }

  const samples = await prisma.shopAuditEvent.findMany({
    where: { shopId: SHOP_ID, createdAt: createdInRange },
    select: {
      eventType: true,
      summary: true,
      createdAt: true,
      repairOrderId: true,
      repairOrder: { select: { number: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  console.log("=== Sample recent ShopAuditEvent (up to 25) ===");
  for (const s of samples) {
    const cat = categoryForAuditEvent(s.eventType, s.summary);
    const ro = s.repairOrder?.number != null ? `#${s.repairOrder.number}` : s.repairOrderId ? "(ro id, no number?)" : "—";
    console.log(
      `  ${s.createdAt.toISOString()}  [${cat}]  ${s.eventType}  ro=${ro}\n    ${s.summary.slice(0, 160)}`,
    );
  }

  const archiveLike = await prisma.shopAuditEvent.findMany({
    where: {
      shopId: SHOP_ID,
      createdAt: createdInRange,
      OR: [
        { summary: { contains: "archiv", mode: "insensitive" } },
        { summary: { contains: "job board", mode: "insensitive" } },
      ],
    },
    select: { eventType: true, summary: true, createdAt: true },
    take: 20,
  });
  console.log("\n=== Archive / job-board related audit summaries (7d) ===");
  if (!archiveLike.length) console.log("(none found)");
  for (const a of archiveLike) {
    console.log(
      `  ${a.createdAt.toISOString()}  ${a.eventType} → ${categoryForAuditEvent(a.eventType, a.summary)}\n    ${a.summary.slice(0, 160)}`,
    );
  }

  const missingRoNumber = await prisma.shopAuditEvent.count({
    where: {
      shopId: SHOP_ID,
      createdAt: createdInRange,
      repairOrderId: { not: null },
      repairOrder: { is: null },
    },
  });
  // orphaned repairOrderId shouldn't happen with FK; check feed gap: appointments with RO but feed sets roNumber null
  const apptsWithRo = await prisma.appointment.count({
    where: {
      shopId: SHOP_ID,
      createdAt: createdInRange,
      repairOrderId: { not: null },
    },
  });
  console.log("\n=== Obvious feed gaps (structural) ===");
  console.log(`  Appointments created with repairOrderId set (feed still sets roNumber=null): ${apptsWithRo}`);
  console.log(`  No APPOINTMENT_* ShopAuditEventType in schema.`);
  console.log(`  No RO_ARCHIVED ShopAuditEventType — archive may only show via ESTIMATE_AUTHORIZATION_CHANGED / summary heuristics.`);
  console.log(`  orphaned audit.repairOrderId count: ${missingRoNumber}`);

  console.log("\n=== Source totals (feed inputs, last 7d) ===");
  console.log(
    JSON.stringify(
      {
        shopAuditEvent: auditExcludingRoActivity,
        shopAuditEventAll: auditTotal,
        roActivity: roActivityCount,
        estimateViewedRos: viewedCount,
        appointmentsCreated: apptCreatedCount,
        approximateMergedCap:
          Math.min(auditExcludingRoActivity, 800) +
          Math.min(roActivityCount, 400) +
          Math.min(viewedCount, 200) +
          Math.min(apptCreatedCount, 200),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
