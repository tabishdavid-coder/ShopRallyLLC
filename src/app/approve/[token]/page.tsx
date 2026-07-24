import { notFound } from "next/navigation";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { ApprovalTotalsBlock } from "@/components/approval/approval-totals-block";
import { getApprovalView, type ApprovalJobView } from "@/server/approval";
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
      <div className="mx-auto max-w-xl space-y-5 lg:max-w-4xl">
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

          {view.alreadyApproved ? (
            <>
              <JobSection
                title="Approved work"
                jobs={displayJobs}
                emptyMessage="No jobs were approved on this estimate."
              />

              {declinedJobs.length > 0 ? (
                <JobSection
                  title="Declined — not authorized"
                  jobs={declinedJobs}
                  emptyMessage="No declined jobs."
                  declined
                  className="border-t border-dashed border-muted-foreground/25 bg-muted/20"
                />
              ) : null}

              <ApprovalTotalsBlock
                totals={view.totals}
                estimateTotals={view.estimateTotals}
                alreadyApproved
                isPartialApproval={view.isPartialApproval}
                className="border-t border-brand-navy/10 px-6 py-4"
              />
            </>
          ) : (
            <ApproveActions
              embedded
              token={token}
              alreadyApproved={false}
              isPartialApproval={view.isPartialApproval}
              jobs={view.jobs}
              totals={view.totals}
              estimateTotals={view.estimateTotals}
              approvedTotalCents={view.totals.totalCents}
              signature={view.signature}
              estimateTerms={view.estimateTerms}
            />
          )}
        </div>

        {view.alreadyApproved ? (
          <ApproveActions
            token={token}
            alreadyApproved
            isPartialApproval={view.isPartialApproval}
            jobs={view.jobs}
            approvedTotalCents={view.totals.totalCents}
            signature={view.signature}
            estimateTerms={view.estimateTerms}
          />
        ) : null}

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
