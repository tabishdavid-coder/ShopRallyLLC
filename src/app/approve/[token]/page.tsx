import { notFound } from "next/navigation";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { getApprovalView, type ApprovalJobView, type ApprovalTotalsView } from "@/server/approval";
import { CustomerFeeRows } from "@/components/customer/customer-fee-rows";
import { formatCents } from "@/lib/format";
import { ServiceAdvisorCard } from "@/components/service-advisor-card";
import { ApproveActions } from "./approve-actions";
import { ApproveViewTracker } from "./approve-view-tracker";

export const metadata = { title: "Approve your estimate — ShopRally" };

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getApprovalView(token);
  if (!view) notFound();

  const approvedJobs = view.jobs.filter((j) => j.authorized);
  const declinedJobs = view.jobs.filter((j) => !j.authorized);
  const displayJobs = view.alreadyApproved ? approvedJobs : view.jobs;

  return (
    <div className="min-h-screen bg-brand-navy/[0.04] px-4 py-8">
      <ApproveViewTracker token={token} />
      <div className="mx-auto max-w-xl space-y-5">
        <ShopRallyLogo href="https://getshoprally.com" size="sm" />

        <div className="overflow-hidden rounded-2xl border border-brand-navy/15 bg-card shadow-sm">
          <div className="border-b border-brand-navy/10 bg-gradient-to-r from-brand-navy/[0.07] via-white to-brand-light/[0.12] p-6 pb-4">
            <p className="text-sm font-medium text-brand-navy/80">{view.shopName}</p>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              {view.alreadyApproved ? "Authorized estimate" : "Estimate"} for RO #{view.number}
            </h1>
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

          <JobSection
            title={view.alreadyApproved ? "Authorized work" : "Estimate jobs"}
            jobs={displayJobs}
            emptyMessage={
              view.alreadyApproved
                ? "No jobs were authorized on this estimate."
                : "No jobs on this estimate."
            }
          />

          {view.alreadyApproved && declinedJobs.length > 0 ? (
            <JobSection
              title="Declined — not authorized"
              jobs={declinedJobs}
              emptyMessage="No declined jobs."
              declined
              className="border-t border-dashed border-muted-foreground/25 bg-muted/20"
            />
          ) : null}

          <TotalsBlock
            totals={view.totals}
            estimateTotals={view.estimateTotals}
            alreadyApproved={view.alreadyApproved}
            isPartialApproval={view.isPartialApproval}
          />
        </div>

        <ApproveActions
          token={token}
          alreadyApproved={view.alreadyApproved}
          isPartialApproval={view.isPartialApproval}
          jobs={view.jobs}
          approvedTotalCents={view.totals.totalCents}
          signature={view.signature}
          estimateTerms={view.estimateTerms}
        />

        <PoweredByShopRally className="text-center" />
      </div>
    </div>
  );
}

function JobSection({
  title,
  jobs,
  emptyMessage,
  declined = false,
  className = "",
}: {
  title: string;
  jobs: ApprovalJobView[];
  emptyMessage: string;
  declined?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className={`px-6 pt-3 text-xs font-semibold uppercase tracking-wide ${
          declined ? "text-muted-foreground" : "text-brand-navy/70"
        }`}
      >
        {title}
      </p>
      <div className="divide-y px-6 py-2">
        {jobs.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          jobs.map((j) => <JobRow key={j.id} job={j} declined={declined} />)
        )}
      </div>
    </div>
  );
}

function JobRow({ job, declined }: { job: ApprovalJobView; declined?: boolean }) {
  return (
    <div
      className={`flex items-start justify-between gap-3 py-3 ${declined ? "opacity-70" : ""}`}
    >
      <div>
        <p className={`font-medium ${declined ? "text-muted-foreground line-through" : ""}`}>
          {job.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {job.laborHours.toFixed(1)} hrs labor
          {job.partsCents > 0 ? ` · parts ${formatCents(job.partsCents)}` : ""}
        </p>
      </div>
      <div
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          declined ? "text-muted-foreground line-through" : ""
        }`}
      >
        {formatCents(job.totalCents)}
      </div>
    </div>
  );
}

function TotalsBlock({
  totals,
  estimateTotals,
  alreadyApproved,
  isPartialApproval,
}: {
  totals: ApprovalTotalsView;
  estimateTotals: ApprovalTotalsView | null;
  alreadyApproved: boolean;
  isPartialApproval: boolean;
}) {
  return (
    <div className="space-y-1.5 border-t border-brand-navy/10 px-6 py-4 text-sm">
      <Row label="Labor" value={formatCents(totals.laborSubtotalCents)} />
      <Row label="Parts" value={formatCents(totals.partsSubtotalCents)} />
      {totals.shopSuppliesCents > 0 ? (
        <Row label="Shop supplies" value={formatCents(totals.shopSuppliesCents)} />
      ) : null}
      <CustomerFeeRows fees={totals.feeLines} Row={Row} />
      {totals.discountCents > 0 ? (
        <Row label="Discounts" value={formatCents(-totals.discountCents)} />
      ) : null}
      <Row label="Tax" value={formatCents(totals.taxCents)} />
      <div className="flex justify-between border-t border-brand-navy/10 pt-2 text-base font-bold text-brand-navy">
        <span>{alreadyApproved ? "Authorized total" : "Total"}</span>
        <span className="tabular-nums">{formatCents(totals.totalCents)}</span>
      </div>
      {isPartialApproval && estimateTotals ? (
        <p className="pt-1 text-xs text-muted-foreground">
          Full estimate was {formatCents(estimateTotals.totalCents)} — declined jobs are excluded
          from your authorized total.
        </p>
      ) : null}
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
