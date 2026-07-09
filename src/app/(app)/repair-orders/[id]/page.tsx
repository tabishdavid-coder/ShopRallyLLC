import { notFound, redirect } from "next/navigation";

import { getRepairOrder } from "@/server/repair-order";
import { getPurchaseOrdersForRo } from "@/server/purchase-orders";
import { getShopId } from "@/lib/shop";
import { prisma } from "@/db/client";
import { ROStatus } from "@/generated/prisma";
import { RoSummaryDetails } from "@/components/repair-order/ro-summary-details";
import { ServiceHistoryPanel } from "@/components/repair-order/service-history-panel";
import { formatCents, customerDisplayName } from "@/lib/format";
import { getDefaultAppointmentDuration } from "@/server/actions/appointments";
import { getShopTechnicians } from "@/server/staff";
import { defaultRoOpenHref } from "@/lib/ro-workspace";

export default async function RoSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  if (!sp.section) {
    redirect(defaultRoOpenHref(id));
  }

  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  const postedCount = await prisma.repairOrder.count({
    where: { shopId, customerId: ro.customerId, status: { in: ["COMPLETED", "INVOICED"] } },
  });

  const purchaseOrders = await getPurchaseOrdersForRo(shopId, ro.id);
  const roDone = ro.status === ROStatus.COMPLETED || ro.status === ROStatus.INVOICED;

  const [defaultApptDuration, employees, roAppointments] = await Promise.all([
    getDefaultAppointmentDuration(),
    getShopTechnicians(shopId),
    prisma.appointment.findMany({
      where: { shopId, repairOrderId: ro.id },
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        startAt: true,
        title: true,
        status: true,
        notes: true,
        technicianId: true,
      },
    }),
  ]);

  const techNameById = new Map(employees.map((e) => [e.id, e.name]));
  const appointments = roAppointments.map((a) => ({
    id: a.id,
    startAt: a.startAt,
    title: a.title,
    status: a.status,
    notes: a.notes,
    technicianName: a.technicianId ? techNameById.get(a.technicianId) ?? null : null,
  }));

  const vehicleJobHistory = ro.vehicleId
    ? await prisma.repairOrder.findMany({
        where: {
          shopId,
          vehicleId: ro.vehicleId,
          id: { not: ro.id },
          status: { in: ["COMPLETED", "INVOICED"] },
        },
        orderBy: { completedAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          completedAt: true,
          totalCents: true,
          jobs: { select: { name: true }, take: 3 },
        },
      })
    : [];

  const activity: { text: string; at: Date }[] = [
    { text: `Repair Order #${ro.number} created`, at: ro.createdAt },
    ...ro.activities.map((a) => ({
      text: a.description,
      at: a.createdAt,
    })),
    ...ro.jobs.map((j) => ({ text: `Job added: ${j.name}`, at: ro.createdAt })),
    ...(ro.approvalSentAt
      ? [{ text: "Estimate approval link sent to customer", at: ro.approvalSentAt }]
      : []),
    ...(ro.estimateViewedAt
      ? [{ text: "Customer opened the estimate approval link", at: ro.estimateViewedAt }]
      : []),
    ...(ro.authorizedAt
      ? [
          {
            text: ro.approvalSignedAt
              ? `${ro.approvalSignerName ?? ro.authorizedBy ?? "Customer"} signed and authorized${ro.approvedVia === "CUSTOMER" ? " via link" : ""} — ${formatCents(ro.totalCents)}`
              : `Customer authorized${ro.approvedVia === "CUSTOMER" ? " via link" : ""} — ${formatCents(ro.totalCents)}`,
            at: ro.approvalSignedAt ?? ro.authorizedAt,
          },
        ]
      : []),
    ...(ro.completedAt ? [{ text: "Work completed", at: ro.completedAt }] : []),
    ...(ro.invoice
      ? [
          {
            text: `Invoice #${ro.invoice.number} issued — ${formatCents(ro.invoice.totalCents)}`,
            at: ro.invoice.issuedAt ?? ro.createdAt,
          },
        ]
      : []),
    ...ro.invoice?.payments.map((p) => ({
      text: `Payment received — ${formatCents(p.amountCents)} (${p.method})`,
      at: p.paidAt,
    })) ?? [],
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const inspectionHistory = ro.inspections.map((ins) => ({
    id: ins.id,
    name: ins.templateName,
    status: ins.status,
    completedAt: ins.performedAt,
    itemCount: ins.items.length,
  }));

  const authHistory =
    ro.authorizedAt
      ? [
          {
            method:
              ro.approvedVia === "CUSTOMER"
                ? ro.approvalSignedAt
                  ? "Customer link (signed)"
                  : "Customer link"
                : "Shop approval",
            authorizer: ro.approvalSignerName ?? ro.authorizedBy ?? ro.serviceWriterName ?? "—",
            totalCents: ro.totalCents,
            at: ro.approvalSignedAt ?? ro.authorizedAt,
          },
        ]
      : [];

  const summarySections = [
    "activity",
    "appointments",
    "job-history",
    "inspection-history",
    "purchase-orders",
    "auth-history",
  ] as const;
  const initialSection = summarySections.includes(sp.section as (typeof summarySections)[number])
    ? (sp.section as (typeof summarySections)[number])
    : undefined;
  const canDelete = ro.status === ROStatus.ESTIMATE && !ro.invoice?.payments.length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Customer Lifetime Stats</h3>
        <p className="text-sm text-muted-foreground">
          {postedCount > 0
            ? `${postedCount} posted repair order${postedCount === 1 ? "" : "s"} for this customer.`
            : "There are no posted ROs associated with this customer."}
        </p>
      </div>

      <RoSummaryDetails
        activity={activity}
        roNumber={ro.number}
        roId={ro.id}
        roDone={roDone}
        purchaseOrders={purchaseOrders}
        vehicleJobHistory={vehicleJobHistory.map((h) => ({
          roId: h.id,
          roNumber: h.number,
          completedAt: h.completedAt,
          totalCents: h.totalCents,
          jobNames: h.jobs.map((j) => j.name),
        }))}
        inspectionHistory={inspectionHistory}
        authHistory={authHistory}
        appointments={appointments}
        defaultAppointmentDurationMins={defaultApptDuration}
        employees={employees}
        appointmentPrefill={{
          customerId: ro.customerId,
          customerName: customerDisplayName(ro.customer),
          vehicleId: ro.vehicleId,
          repairOrderId: ro.id,
        }}
        initialSection={initialSection}
        canDelete={canDelete}
      />

      {ro.vehicleId ? (
        <ServiceHistoryPanel vehicleId={ro.vehicleId} hasVin={Boolean(ro.vehicle?.vin)} />
      ) : null}
    </div>
  );
}
