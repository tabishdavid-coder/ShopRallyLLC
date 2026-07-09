import { notFound } from "next/navigation";
import { Wrench } from "lucide-react";

import { getRepairOrder } from "@/server/repair-order";
import { getShopTechnicians } from "@/server/staff";
import { getShopId } from "@/lib/shop";
import { ROStatus } from "@/generated/prisma";
import { filterActiveRoFees } from "@/server/ro-fees";
import { prisma } from "@/db/client";
import { RoTabEmptyState, RoTabPageHeader } from "@/components/repair-order/ro-workspace-chrome";
import { RoAuditTrailPanel } from "@/components/repair-order/ro-audit-trail-panel";
import { ServiceConcernsPanel } from "@/components/repair-order/service-concerns-panel";
import { WipJobsSection } from "@/components/repair-order/wip-jobs-section";
import { EstimateTotalsBar } from "@/components/repair-order/estimate-totals-bar";
import { formatCents } from "@/lib/format";
import { getRepairOrderAuditTrail } from "@/server/shop-audit";

function hasAuthorizedWork(job: {
  authorized: boolean;
  laborLines: { authorized: boolean }[];
  partLines: { authorized: boolean }[];
}) {
  return (
    job.authorized ||
    job.laborLines.some((l) => l.authorized) ||
    job.partLines.some((p) => p.authorized)
  );
}

export default async function RoWorkInProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  const technicians = await getShopTechnicians(shopId);
  const customerConcerns = ro.vehicleConcerns.filter((c) => c.kind === "CUSTOMER");
  const technicianConcerns = ro.vehicleConcerns.filter((c) => c.kind === "TECHNICIAN");
  const roDone = ro.status === ROStatus.COMPLETED || ro.status === ROStatus.INVOICED;
  const baseRate = ro.laborRateCents ?? ro.shop.laborRateCents;

  const wipJobs = ro.jobs.filter(hasAuthorizedWork);

  const partsCost = ro.jobs.reduce(
    (s, j) =>
      s +
      j.partLines
        .filter((p) => p.authorized)
        .reduce((x, p) => x + p.costCents * p.quantity, 0),
    0,
  );
  const subtotal = ro.laborSubtotalCents + ro.partsSubtotalCents;
  const gpCents = ro.laborSubtotalCents + (ro.partsSubtotalCents - partsCost);
  const gpPct = subtotal > 0 ? (gpCents / subtotal) * 100 : 0;
  const partsCount = ro.jobs.reduce(
    (s, j) => s + j.partLines.filter((p) => p.authorized).length,
    0,
  );
  const approvable = ro.status === ROStatus.ESTIMATE || ro.status === ROStatus.APPROVED;
  const customerName =
    ro.customer.company?.trim() ||
    `${ro.customer.firstName ?? ""} ${ro.customer.lastName ?? ""}`.trim();
  const auditEvents = await getRepairOrderAuditTrail(shopId, ro.id, "all");

  if (wipJobs.length === 0) {
    return (
      <RoTabEmptyState
        icon={Wrench}
        title="No work authorized yet"
        description="Authorize jobs on the Estimate tab to track labor hours, parts, and technician assignments here."
        action={{ label: "Go to estimate", href: `/repair-orders/${ro.id}/estimate` }}
      />
    );
  }

  const roFees = filterActiveRoFees(
    ro.fees.filter((f) => !f.jobId),
    await prisma.shopFeeTemplate.findMany({
      where: { shopId },
      select: { name: true, autoApply: true },
    }),
  );

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col">
      <RoTabPageHeader
        title="Shop floor"
        description={`${wipJobs.length} authorized job${wipJobs.length === 1 ? "" : "s"} · track hours and job status`}
      />
      <div className="flex-1 space-y-4">
        <ServiceConcernsPanel
          roId={ro.id}
          customerConcerns={customerConcerns}
          technicianConcerns={technicianConcerns}
          history={[]}
          declined={[]}
          approval={{ sentAt: ro.approvalSentAt, viewedAt: ro.estimateViewedAt, authorizedAt: ro.authorizedAt, approvedVia: ro.approvedVia }}
          layout="stacked"
        />

        <WipJobsSection
          roId={ro.id}
          jobs={wipJobs}
          taxBps={ro.shop.taxRateBps}
          technicians={technicians}
          baseRateCents={baseRate}
          roDone={roDone}
        />

        {roFees.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground">
              Fees
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
                  <th className="px-3 py-2 text-left">Fee</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {roFees.map((f) => (
                  <tr key={f.id} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2 text-foreground">{f.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {f.method === "PERCENT"
                        ? `${(f.amount / 100).toFixed(2)}%`
                        : formatCents(f.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <RoAuditTrailPanel
          className="mt-6"
          title="Activity log"
          description="Estimate changes, job board moves, shares, and payments for this repair order."
          events={auditEvents}
        />
      </div>

      <EstimateTotalsBar
        roId={ro.id}
        roNumber={ro.number}
        customerName={customerName}
        phone={ro.customer.phone}
        approvable={approvable}
        gpPct={gpPct}
        gpCents={gpCents}
        laborCents={ro.laborSubtotalCents}
        partsCents={ro.partsSubtotalCents}
        partsCount={partsCount}
        subletCents={0}
        feesCents={ro.feesSubtotalCents}
        discountsCents={ro.discountCents}
        subtotalCents={subtotal}
        taxesCents={ro.taxCents}
        totalCents={ro.totalCents}
      />
    </div>
  );
}
