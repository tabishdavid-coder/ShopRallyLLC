import { notFound } from "next/navigation";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { getApprovalView, recordEstimateViewed } from "@/server/approval";
import { formatCents } from "@/lib/format";
import { ServiceAdvisorCard } from "@/components/service-advisor-card";
import { ApproveActions } from "./approve-actions";

export const metadata = { title: "Approve your estimate — ShopRally" };

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getApprovalView(token);
  if (!view) notFound();

  await recordEstimateViewed(token);

  const selectedTotal = view.jobs
    .filter((j) => !view.alreadyApproved || j.authorized)
    .reduce((s, j) => s + j.totalCents, 0);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-5">
        <ShopRallyLogo href="https://getshoprally.com" size="sm" />

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="border-b pb-4">
            <p className="text-sm text-muted-foreground">{view.shopName}</p>
            <h1 className="mt-1 text-xl font-bold">Estimate for RO #{view.number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {view.customerName} · {view.vehicleLabel}
              {view.odometerNotWorking
                ? " · Odometer not working"
                : view.mileageIn != null
                  ? ` · ${view.mileageIn.toLocaleString("en-US")} mi`
                  : ""}
            </p>
            <ServiceAdvisorCard advisor={view.serviceAdvisor} compact className="mt-2" />
          </div>

          {/* Jobs (read-only summary) */}
          <div className="divide-y py-2">
            {view.jobs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No jobs on this estimate.</p>
            ) : (
              view.jobs.map((j) => (
                <div key={j.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{j.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.laborHours.toFixed(1)} hrs labor
                      {j.partsCents > 0 ? ` · parts ${formatCents(j.partsCents)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCents(j.totalCents)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-t pt-4 text-sm">
            <Row label="Labor" value={formatCents(view.laborSubtotalCents)} />
            <Row label="Parts" value={formatCents(view.partsSubtotalCents)} />
            {view.shopSuppliesCents > 0 ? (
              <Row label="Shop supplies" value={formatCents(view.shopSuppliesCents)} />
            ) : null}
            {view.feesSubtotalCents > 0 ? (
              <Row label="Fees" value={formatCents(view.feesSubtotalCents)} />
            ) : null}
            {view.discountCents > 0 ? (
              <Row label="Discounts" value={formatCents(-view.discountCents)} />
            ) : null}
            <Row label="Tax" value={formatCents(view.taxCents)} />
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(view.totalCents)}</span>
            </div>
            {!view.alreadyApproved && view.jobs.length > 1 ? (
              <p className="pt-1 text-xs text-muted-foreground">
                You may approve some or all jobs below. Selected jobs total:{" "}
                {formatCents(selectedTotal)} (full RO total shown above).
              </p>
            ) : null}
          </div>
        </div>

        <ApproveActions
          token={token}
          alreadyApproved={view.alreadyApproved}
          jobs={view.jobs}
          signature={view.signature}
          estimateTerms={view.estimateTerms}
        />

        <PoweredByShopRally className="text-center" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
