/**
 * E2E-ish verify for Shop Activity on Macuto after gap fixes.
 * Inserts temporary rows, calls getActivityFeed, asserts categories, cleans up.
 *
 * Run: npx tsx --tsconfig ./tsconfig.scripts.json scripts/e2e-shop-activity-macuto.ts
 */
import { prisma } from "../src/db/client";
import {
  AppointmentStatus,
  RoActivityType,
  ShopAuditEventType,
} from "../src/generated/prisma";
import { getActivityFeed } from "../src/server/activity-feed";
import { categoryForAuditEvent } from "../src/lib/activity-feed";

const SHOP_ID = process.argv[2] || "shop_macuto";
const MARKER = `[shop-activity-e2e ${Date.now()}]`;

type Check = { name: string; ok: boolean; detail?: string };

async function main() {
  const checks: Check[] = [];
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

  // Static categorization checks (no DB)
  checks.push({
    name: "category: archive → ro_status",
    ok:
      categoryForAuditEvent(
        ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
        "Archived from job board after payment posted",
      ) === "ro_status",
  });
  checks.push({
    name: "category: started work → ro_status",
    ok:
      categoryForAuditEvent(
        ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
        "Shop approved estimate and started work",
      ) === "ro_status",
  });
  checks.push({
    name: "category: job auth → estimate",
    ok:
      categoryForAuditEvent(
        ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
        "Job authorization set to approved",
      ) === "estimate",
  });
  checks.push({
    name: "category: APPOINTMENT_UPDATED → appointment",
    ok:
      categoryForAuditEvent(
        ShopAuditEventType.APPOINTMENT_UPDATED,
        "Appointment confirmed: Oil change",
      ) === "appointment",
  });

  const ro = await prisma.repairOrder.findFirst({
    where: { shopId: SHOP_ID },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      customerId: true,
      vehicleId: true,
      estimateViewedAt: true,
    },
  });
  if (!ro) {
    console.error("FAIL: no RO");
    process.exit(1);
  }

  const cleanup: {
    activityId?: string;
    appointmentId?: string;
    auditIds: string[];
    restoreViewedAt?: Date | null;
    touchedViewed?: boolean;
  } = { auditIds: [] };

  try {
    const activity = await prisma.roActivity.create({
      data: {
        shopId: SHOP_ID,
        repairOrderId: ro.id,
        type: RoActivityType.NOTE,
        description: `${MARKER} advisor note`,
      },
      select: { id: true },
    });
    cleanup.activityId = activity.id;

    const startAt = new Date(Date.now() + 3 * 3600_000);
    const appt = await prisma.appointment.create({
      data: {
        shopId: SHOP_ID,
        customerId: ro.customerId,
        vehicleId: ro.vehicleId,
        repairOrderId: ro.id,
        title: `${MARKER} booking`,
        startAt,
        endAt: new Date(startAt.getTime() + 3600_000),
        status: AppointmentStatus.SCHEDULED,
        source: "STAFF",
      },
      select: { id: true },
    });
    cleanup.appointmentId = appt.id;

    // Simulate updateAppointment audit write
    const apptAudit = await prisma.shopAuditEvent.create({
      data: {
        shopId: SHOP_ID,
        repairOrderId: ro.id,
        eventType: ShopAuditEventType.APPOINTMENT_UPDATED,
        summary: `Appointment confirmed: ${MARKER} booking`,
        metadata: { appointmentId: appt.id, status: "CONFIRMED", via: "e2e" },
      },
      select: { id: true },
    });
    cleanup.auditIds.push(apptAudit.id);

    const smsAudit = await prisma.shopAuditEvent.create({
      data: {
        shopId: SHOP_ID,
        repairOrderId: ro.id,
        eventType: ShopAuditEventType.SMS_SENT,
        summary: `${MARKER} Outbound SMS sent`,
        metadata: { via: "e2e" },
      },
      select: { id: true },
    });
    cleanup.auditIds.push(smsAudit.id);

    const custAudit = await prisma.shopAuditEvent.create({
      data: {
        shopId: SHOP_ID,
        eventType: ShopAuditEventType.CUSTOMER_CREATED,
        summary: `${MARKER} Created customer E2E Test`,
        metadata: { via: "e2e" },
      },
      select: { id: true },
    });
    cleanup.auditIds.push(custAudit.id);

    if (!ro.estimateViewedAt) {
      cleanup.touchedViewed = true;
      cleanup.restoreViewedAt = null;
      await prisma.repairOrder.update({
        where: { id: ro.id },
        data: { estimateViewedAt: new Date() },
      });
    }

    const feed = await getActivityFeed(SHOP_ID, {
      range: "today",
      q: "shop-activity-e2e",
      page: "1",
    });

    const byId = (prefix: string) => feed.items.filter((i) => i.id.startsWith(prefix));
    const note = byId("manual:").find((i) => i.summary.includes(MARKER));
    const booked = byId("appt:").find((i) => i.summary.includes(MARKER));
    const statusUpd = feed.items.find(
      (i) => i.category === "appointment" && /confirmed/i.test(i.summary) && i.summary.includes(MARKER),
    );
    const sms = feed.items.find((i) => i.category === "sms" && i.summary.includes(MARKER));
    const customer = feed.items.find(
      (i) => i.category === "customer" && i.summary.includes(MARKER),
    );

    checks.push({
      name: "Activity: RoActivity appears",
      ok: !!note && note.category === "activity" && note.roNumber === ro.number,
      detail: note ? `ro#=${note.roNumber}` : "missing",
    });
    checks.push({
      name: "Appointment booked + RO#",
      ok: !!booked && booked.roNumber === ro.number,
      detail: booked ? `ro#=${booked.roNumber}` : "missing",
    });
    checks.push({
      name: "Appointment status update in feed",
      ok: !!statusUpd && statusUpd.category === "appointment",
      detail: statusUpd?.summary,
    });
    checks.push({
      name: "SMS category displays",
      ok: !!sms,
      detail: sms?.summary,
    });
    checks.push({
      name: "Customer category displays",
      ok: !!customer,
      detail: customer?.summary,
    });

    // Existing Macuto sources (no marker) — Today / 7d presence
    const today = await getActivityFeed(SHOP_ID, { range: "today" });
    const week = await getActivityFeed(SHOP_ID, { range: "7d" });
    const cats7 = new Set(
      (
        await Promise.all(
          ["customer_viewed", "estimate", "ro_status", "payment", "appointment", "customer"].map(
            async (category) => {
              const r = await getActivityFeed(SHOP_ID, { range: "7d", category, page: "1" });
              return r.total > 0 ? category : null;
            },
          ),
        )
      ).filter(Boolean),
    );

    checks.push({
      name: "Today filter returns items (or empty is ok)",
      ok: today.range === "today" && today.total >= 0,
      detail: `total=${today.total}`,
    });
    checks.push({
      name: "7d has estimate events",
      ok: cats7.has("estimate"),
    });
    checks.push({
      name: "7d has appointment bookings",
      ok: cats7.has("appointment"),
    });
    checks.push({
      name: "7d has payment events",
      ok: cats7.has("payment"),
      detail: week.total > 0 ? `week total=${week.total}` : "empty week",
    });

    // Archive categorization against live summaries if present
    const archive = await prisma.shopAuditEvent.findFirst({
      where: {
        shopId: SHOP_ID,
        summary: { contains: "Archived from job board" },
      },
      select: { summary: true, eventType: true },
    });
    if (archive) {
      const cat = categoryForAuditEvent(archive.eventType, archive.summary);
      checks.push({
        name: "Live archive event → ro_status",
        ok: cat === "ro_status",
        detail: archive.summary,
      });
    }

    console.log("\n=== Checks ===");
    let failed = 0;
    for (const c of checks) {
      const mark = c.ok ? "PASS" : "FAIL";
      if (!c.ok) failed += 1;
      console.log(`${mark}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    }
    console.log(`\n${checks.length - failed}/${checks.length} passed`);
    if (failed) process.exitCode = 1;
  } finally {
    if (cleanup.activityId) {
      await prisma.roActivity.delete({ where: { id: cleanup.activityId } }).catch(() => {});
    }
    if (cleanup.appointmentId) {
      await prisma.appointment.delete({ where: { id: cleanup.appointmentId } }).catch(() => {});
    }
    for (const id of cleanup.auditIds) {
      await prisma.shopAuditEvent.delete({ where: { id } }).catch(() => {});
    }
    if (cleanup.touchedViewed) {
      await prisma.repairOrder
        .update({
          where: { id: ro.id },
          data: { estimateViewedAt: cleanup.restoreViewedAt ?? null },
        })
        .catch(() => {});
    }
    console.log("Cleanup done");
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
