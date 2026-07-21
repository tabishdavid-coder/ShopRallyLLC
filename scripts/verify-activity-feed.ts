/**
 * Verify getActivityFeed merges sources for shop_macuto.
 * Inserts temporary RoActivity + Appointment (+ optional estimateViewedAt touch),
 * then calls the real getActivityFeed (via tsconfig.scripts.json server-only stub).
 * Cleans up inserted rows afterward.
 *
 * Run: npx tsx --tsconfig ./tsconfig.scripts.json scripts/verify-activity-feed.ts
 */
import { prisma } from "../src/db/client";
import { AppointmentStatus, RoActivityType } from "../src/generated/prisma";
import { getActivityFeed } from "../src/server/activity-feed";

const SHOP_ID = process.argv[2] || "shop_macuto";
const MARKER = `[activity-feed-verify ${new Date().toISOString()}]`;

async function main() {
  const shop = await prisma.shop.findUnique({
    where: { id: SHOP_ID },
    select: { id: true, name: true },
  });
  if (!shop) {
    console.error("FAIL: shop not found", SHOP_ID);
    process.exit(1);
  }
  console.log(`Shop: ${shop.name} (${shop.id})`);
  console.log(`Marker: ${MARKER}`);

  const ro = await prisma.repairOrder.findFirst({
    where: { shopId: SHOP_ID },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      estimateViewedAt: true,
      customerId: true,
      vehicleId: true,
    },
  });
  if (!ro) {
    console.error("FAIL: no repair order on shop — cannot insert RoActivity");
    process.exit(1);
  }
  console.log(`Using RO #${ro.number} (${ro.id})`);

  const createdIds: {
    activityId?: string;
    appointmentId?: string;
    restoredEstimateViewedAt?: Date | null;
    touchedEstimateViewed?: boolean;
  } = {};

  try {
    const activity = await prisma.roActivity.create({
      data: {
        shopId: SHOP_ID,
        repairOrderId: ro.id,
        type: RoActivityType.NOTE,
        description: `${MARKER} manual note for feed verify`,
      },
      select: { id: true, createdAt: true },
    });
    createdIds.activityId = activity.id;
    console.log(`Inserted RoActivity ${activity.id}`);

    const startAt = new Date();
    startAt.setHours(startAt.getHours() + 2);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    const appt = await prisma.appointment.create({
      data: {
        shopId: SHOP_ID,
        customerId: ro.customerId,
        vehicleId: ro.vehicleId,
        title: `${MARKER} verify booking`,
        startAt,
        endAt,
        status: AppointmentStatus.SCHEDULED,
        source: "STAFF",
        notes: MARKER,
        repairOrderId: ro.id,
      },
      select: { id: true, createdAt: true, repairOrderId: true },
    });
    createdIds.appointmentId = appt.id;
    console.log(`Inserted Appointment ${appt.id} (repairOrderId=${appt.repairOrderId})`);

    // Simulate a status update the way cancelAppointment does — no audit row expected.
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: AppointmentStatus.CONFIRMED },
    });
    const auditAfterStatus = await prisma.shopAuditEvent.count({
      where: {
        shopId: SHOP_ID,
        summary: { contains: MARKER },
      },
    });
    console.log(
      `After status→CONFIRMED, ShopAuditEvent with marker in summary: ${auditAfterStatus} (expected 0)`,
    );

    // Touch estimateViewedAt if null so customer_viewed source is exercised.
    if (!ro.estimateViewedAt) {
      createdIds.touchedEstimateViewed = true;
      createdIds.restoredEstimateViewedAt = null;
      await prisma.repairOrder.update({
        where: { id: ro.id },
        data: { estimateViewedAt: new Date() },
      });
      console.log(`Set estimateViewedAt on RO #${ro.number} for verify`);
    } else {
      console.log(`RO already has estimateViewedAt=${ro.estimateViewedAt.toISOString()} (left unchanged)`);
    }

    // Server actions need Clerk shop context — call getActivityFeed directly instead.
    const feed = await getActivityFeed(SHOP_ID, { range: "7d", page: "1" });
    console.log("\n=== getActivityFeed({ range: '7d' }) ===");
    console.log(
      JSON.stringify(
        {
          range: feed.range,
          rangeLabel: feed.rangeLabel,
          periodStart: feed.periodStart,
          periodEnd: feed.periodEnd,
          total: feed.total,
          page: feed.page,
          pageSize: feed.pageSize,
          totalPages: feed.totalPages,
        },
        null,
        2,
      ),
    );

    const markerItems = feed.items.filter((i) => i.summary.includes(MARKER));
    // Marker may be on later pages — search full merge via q
    const feedQ = await getActivityFeed(SHOP_ID, { range: "7d", q: "activity-feed-verify", page: "1" });
    console.log(`\nSearch q=activity-feed-verify → total=${feedQ.total}`);
    for (const item of feedQ.items) {
      console.log(
        `  [${item.category}] ro#=${item.roNumber ?? "null"} href=${item.href ?? "null"}\n    ${item.summary}`,
      );
    }

    const apptItem = feedQ.items.find((i) => i.id.startsWith("appt:") && i.summary.includes(MARKER));
    const noteItem = feedQ.items.find((i) => i.id.startsWith("manual:") && i.summary.includes(MARKER));
    const gaps: string[] = [];
    if (!noteItem) gaps.push("RoActivity marker not found in feed search");
    if (!apptItem) gaps.push("Appointment create marker not found in feed search");
    if (apptItem && apptItem.roNumber == null && appt.repairOrderId) {
      gaps.push(
        "Appointment has repairOrderId but feed item roNumber is null (known gap in activity-feed.ts)",
      );
    }
    if (apptItem && !/booked/i.test(apptItem.summary)) {
      gaps.push("Appointment item summary does not say booked (unexpected)");
    }
    // Confirmed status should NOT create a second feed row
    const apptItems = feedQ.items.filter((i) => i.id.startsWith("appt:") && i.summary.includes(MARKER));
    if (apptItems.length > 1) {
      gaps.push(`Expected 1 appointment feed item for create, got ${apptItems.length}`);
    }
    gaps.push(
      "Appointment status update (SCHEDULED→CONFIRMED) leaves no audit/feed trail (confirmed by code + auditAfterStatus)",
    );

    console.log("\n=== Verification gaps / notes ===");
    for (const g of gaps) console.log(`  - ${g}`);
    if (markerItems.length) {
      console.log(`(page1 unmarked filter also had ${markerItems.length} marker items)`);
    }

    const byCat = new Map<string, number>();
    for (const i of feed.items) {
      byCat.set(i.category, (byCat.get(i.category) ?? 0) + 1);
    }
    console.log("\n=== Page-1 category mix ===");
    for (const [k, v] of [...byCat.entries()].sort()) console.log(`  ${k}: ${v}`);
  } finally {
    if (createdIds.activityId) {
      await prisma.roActivity.delete({ where: { id: createdIds.activityId } }).catch(() => {});
      console.log(`Cleaned RoActivity ${createdIds.activityId}`);
    }
    if (createdIds.appointmentId) {
      await prisma.appointment.delete({ where: { id: createdIds.appointmentId } }).catch(() => {});
      console.log(`Cleaned Appointment ${createdIds.appointmentId}`);
    }
    if (createdIds.touchedEstimateViewed) {
      await prisma.repairOrder
        .update({
          where: { id: ro!.id },
          data: { estimateViewedAt: createdIds.restoredEstimateViewedAt ?? null },
        })
        .catch(() => {});
      console.log(`Restored estimateViewedAt on RO #${ro!.number}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
