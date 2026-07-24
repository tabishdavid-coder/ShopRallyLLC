"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import {
  ApprovalTotalsBlock,
  type ApprovalTotals,
} from "@/components/approval/approval-totals-block";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/format";
import { SignaturePad, type SignatureCapture } from "@/components/approval/signature-pad";
import { CustomerAcknowledgment } from "@/components/customer-acknowledgment";
import { submitCustomerApproval } from "@/server/actions/approval";
import { cn } from "@/lib/utils";

type ApprovalJob = {
  id: string;
  name: string;
  laborHours: number;
  partsCents: number;
  totalCents: number;
  authorized: boolean;
};

type JobDecision = "approve" | "decline";

type ExistingSignature = {
  signerName: string | null;
  signedAt: Date | string;
  imageDataUrl: string | null;
};

type EstimateTermsBlock = {
  html: string;
  version: string;
  hash: string;
};

function emptyDecisions(jobs: ApprovalJob[]): Record<string, JobDecision | null> {
  return Object.fromEntries(jobs.map((j) => [j.id, null]));
}

/** Customer-facing approve + sign controls for the public estimate page. */
export function ApproveActions({
  token,
  alreadyApproved,
  isPartialApproval,
  jobs,
  totals,
  estimateTotals = null,
  approvedTotalCents,
  signature,
  estimateTerms,
  embedded = false,
}: {
  token: string;
  alreadyApproved: boolean;
  isPartialApproval: boolean;
  jobs: ApprovalJob[];
  totals?: ApprovalTotals;
  estimateTotals?: ApprovalTotals | null;
  approvedTotalCents: number;
  signature: ExistingSignature | null;
  estimateTerms: EstimateTermsBlock;
  /** When true, renders inside the estimate card (unified job list + totals). */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(alreadyApproved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [decisions, setDecisions] = useState<Record<string, JobDecision | null>>(() =>
    emptyDecisions(jobs),
  );
  const [signerName, setSignerName] = useState("");
  const [signatureCapture, setSignatureCapture] = useState<SignatureCapture | null>(null);
  const [consent, setConsent] = useState(false);
  const [lastApprovedJobIds, setLastApprovedJobIds] = useState<string[] | null>(null);

  useEffect(() => {
    setDone(alreadyApproved);
  }, [alreadyApproved]);

  const approvedJobsLive = useMemo(
    () => jobs.filter((j) => decisions[j.id] === "approve"),
    [jobs, decisions],
  );
  const declinedJobsLive = useMemo(
    () => jobs.filter((j) => decisions[j.id] === "decline"),
    [jobs, decisions],
  );
  const undecidedCount = useMemo(
    () => jobs.filter((j) => decisions[j.id] == null).length,
    [jobs, decisions],
  );
  const allDecided = jobs.length > 0 && undecidedCount === 0;

  const approvedTotalLiveCents = useMemo(
    () => approvedJobsLive.reduce((s, j) => s + j.totalCents, 0),
    [approvedJobsLive],
  );

  const canSubmit = useMemo(
    () =>
      allDecided &&
      approvedJobsLive.length > 0 &&
      signerName.trim().length > 0 &&
      signatureCapture != null &&
      consent &&
      !pending,
    [
      allDecided,
      approvedJobsLive.length,
      signerName,
      signatureCapture,
      consent,
      pending,
    ],
  );

  function setDecision(id: string, decision: JobDecision) {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
  }

  function setAll(decision: JobDecision) {
    setDecisions(Object.fromEntries(jobs.map((j) => [j.id, decision])));
  }

  function submit() {
    if (!canSubmit || !signatureCapture) return;
    setError(null);
    const approvedJobIds = approvedJobsLive.map((j) => j.id);
    start(async () => {
      const res = await submitCustomerApproval(token, {
        approvedJobIds,
        signatureDataUrl: signatureCapture.dataUrl,
        signatureWidth: signatureCapture.width,
        signatureHeight: signatureCapture.height,
        signerName: signerName.trim(),
        consent: true,
      });
      if (res.ok) {
        setLastApprovedJobIds(approvedJobIds);
        setDone(true);
        router.refresh();
      } else setError(res.error);
    });
  }

  if (done) {
    const signer = signature?.signerName ?? (signerName.trim() || "You");
    const approvedJobs =
      lastApprovedJobIds != null
        ? jobs.filter((j) => lastApprovedJobIds.includes(j.id))
        : jobs.filter((j) => j.authorized);
    const declinedJobs =
      lastApprovedJobIds != null
        ? jobs.filter((j) => !lastApprovedJobIds.includes(j.id))
        : jobs.filter((j) => !j.authorized);
    const showPartial = isPartialApproval || declinedJobs.length > 0;

    return (
      <div className={cn("space-y-4", embedded && "px-6 pb-6 pt-2")}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-600" />
          <p className="font-semibold text-emerald-800">
            {showPartial ? "Partial estimate approved" : "Estimate approved"}
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Thank you{signer ? `, ${signer}` : ""}! Your shop has been notified
            {showPartial
              ? ` and will begin the ${approvedJobs.length} authorized job${approvedJobs.length === 1 ? "" : "s"}`
              : " and will begin the authorized work"}
            . You can close this page.
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-900">
            {approvedJobs.length} approved
            {declinedJobs.length > 0 ? ` · ${declinedJobs.length} declined` : ""}
            {" · "}
            Authorized total: {formatCents(approvedTotalCents)}
          </p>
        </div>

        {approvedJobs.length > 0 ? (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
              Approved work
            </p>
            <ul className="space-y-2 text-sm">
              {approvedJobs.map((j) => (
                <li key={j.id} className="flex justify-between gap-3">
                  <span>{j.name}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatCents(j.totalCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {declinedJobs.length > 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Declined — not authorized
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {declinedJobs.map((j) => (
                <li key={j.id} className="flex justify-between gap-3">
                  <span className="line-through">{j.name}</span>
                  <span className="shrink-0 tabular-nums line-through">{formatCents(j.totalCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(signature?.imageDataUrl ?? signatureCapture?.dataUrl) ? (
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your signature
            </p>
            <img
              src={signature?.imageDataUrl ?? signatureCapture?.dataUrl ?? ""}
              alt="Your signature"
              className="mx-auto max-h-24 rounded border bg-white p-2"
            />
          </div>
        ) : null}
      </div>
    );
  }

  const jobList = (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
          Choose for each job
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or decline every job below. Declined jobs will not be performed or charged.
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs on this estimate.</p>
      ) : (
        <div className="space-y-3">
          {jobs.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                onClick={() => setAll("approve")}
              >
                Approve all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-brand-red/35 bg-brand-red/5 text-brand-red hover:bg-brand-red/10"
                onClick={() => setAll("decline")}
              >
                Decline all
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            {jobs.map((j) => {
              const decision = decisions[j.id] ?? null;
              return (
                <div
                  key={j.id}
                  className={cn(
                    "rounded-xl border px-3 py-3.5 transition-colors sm:px-4",
                    decision === "approve" &&
                      "border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-200/80",
                    decision === "decline" &&
                      "border-brand-red/30 bg-brand-red/[0.04] ring-1 ring-brand-red/15",
                    decision == null && "border-brand-navy/15 bg-card",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-medium leading-snug text-brand-navy",
                          decision === "decline" && "text-muted-foreground line-through",
                        )}
                      >
                        {j.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {j.laborHours.toFixed(1)} hrs labor
                        {j.partsCents > 0 ? ` · parts ${formatCents(j.partsCents)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums text-brand-navy",
                          decision === "decline" && "text-muted-foreground line-through",
                        )}
                      >
                        {formatCents(j.totalCents)}
                      </span>
                      <div
                        className="inline-flex rounded-lg border border-brand-navy/20 bg-white p-0.5 shadow-sm"
                        role="group"
                        aria-label={`Decision for ${j.name}`}
                      >
                        <button
                          type="button"
                          onClick={() => setDecision(j.id, "approve")}
                          aria-pressed={decision === "approve"}
                          className={cn(
                            "inline-flex min-h-10 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors",
                            decision === "approve"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-emerald-800 hover:bg-emerald-50",
                          )}
                        >
                          <CheckCircle2 className="size-4" aria-hidden />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecision(j.id, "decline")}
                          aria-pressed={decision === "decline"}
                          className={cn(
                            "inline-flex min-h-10 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors",
                            decision === "decline"
                              ? "bg-brand-red text-white shadow-sm"
                              : "text-brand-red hover:bg-brand-red/10",
                          )}
                        >
                          <XCircle className="size-4" aria-hidden />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                  {decision == null ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Choose Approve or Decline for this job
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              allDecided
                ? "border-brand-navy/20 bg-brand-navy/[0.05] text-brand-navy"
                : "border-amber-300/80 bg-amber-50 text-amber-900",
            )}
            aria-live="polite"
          >
            {allDecided ? (
              <p className="font-semibold">
                {approvedJobsLive.length} approved
                {declinedJobsLive.length > 0 ? ` · ${declinedJobsLive.length} declined` : ""}
                {approvedJobsLive.length > 0
                  ? ` · Authorized subtotal ${formatCents(approvedTotalLiveCents)}`
                  : ""}
              </p>
            ) : (
              <p className="font-medium">
                {undecidedCount} job{undecidedCount === 1 ? "" : "s"} still need a decision
                {approvedJobsLive.length + declinedJobsLive.length > 0
                  ? ` (${approvedJobsLive.length} approved · ${declinedJobsLive.length} declined so far)`
                  : ""}
              </p>
            )}
            {allDecided && approvedJobsLive.length === 0 ? (
              <p className="mt-1 text-xs font-medium text-brand-red">
                Approve at least one job to submit. You cannot decline every job on this link.
              </p>
            ) : null}
            {allDecided && approvedJobsLive.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Tax and fees are calculated from approved jobs on submit.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );

  const authorizationSection = (
    <div className="space-y-4">
      <CustomerAcknowledgment
        html={estimateTerms.html}
        version={estimateTerms.version}
        heading="Customer acknowledgment & authorization"
      />

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-brand-navy">Sign to authorize</h2>
        <div className="rounded-lg border border-brand-navy/15 bg-brand-navy/[0.04] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Electronic signature disclosure (ESIGN Act)</p>
          <p className="mt-1">
            By signing below, you agree to use an electronic signature to authorize the approved
            repair work. Your signature, name, date, IP address, and browser information will be
            stored as part of the approval record. Declined jobs will not be performed. You may
            request a paper copy of this authorization from the shop. You may withdraw consent to
            electronic signatures by contacting the shop directly; withdrawal does not affect prior
            authorized work.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signer-name">Your full name</Label>
          <Input
            id="signer-name"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="As shown on your account"
            className="h-10"
            autoComplete="name"
          />
        </div>
        <SignaturePad onChange={setSignatureCapture} />
      </div>

      <label
        htmlFor="approval-consent"
        className={cn(
          "flex cursor-pointer items-start gap-4 rounded-xl border-2 px-4 py-4 shadow-sm transition-colors",
          "min-h-[4.5rem] border-brand-red bg-brand-red/[0.1] ring-2 ring-brand-red/25",
          "hover:bg-brand-red/[0.14] focus-within:ring-4 focus-within:ring-brand-red/35",
          consent && "border-brand-navy bg-brand-navy/[0.08] ring-brand-navy/20",
        )}
      >
        <Checkbox
          id="approval-consent"
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          aria-required
          aria-label="Authorize approved work and accept electronic signature"
          className={cn(
            "mt-0.5 size-6 shrink-0 rounded-md border-2 shadow-sm",
            "border-brand-red data-[state=checked]:border-brand-navy data-[state=checked]:bg-brand-navy",
            "[&_svg]:size-4",
          )}
        />
        <span className="text-[15px] font-medium leading-snug text-foreground">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-red">
            Required — authorization
          </span>
          I authorize the shop to perform the{" "}
          <span className="font-semibold text-brand-navy">approved</span> jobs listed above and
          agree to pay according to the authorized total. I understand{" "}
          <span className="font-semibold">declined</span> jobs will not be performed. I consent to
          the use of my electronic signature under the ESIGN Act and understand it has the same
          legal effect as a handwritten signature.
        </span>
      </label>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button
        onClick={submit}
        disabled={!canSubmit}
        className="h-12 w-full gap-2 text-base bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
        {allDecided && approvedJobsLive.length > 0
          ? `Submit · ${approvedJobsLive.length} approved${
              declinedJobsLive.length > 0 ? ` · ${declinedJobsLive.length} declined` : ""
            }`
          : "Submit authorization"}
      </Button>
      {!consent && allDecided && approvedJobsLive.length > 0 ? (
        <p className="text-center text-xs font-medium text-brand-red">
          Check the authorization box above to continue
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-0">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(280px,34%)] lg:items-start">
          <div className="px-6 py-4 lg:pr-5">{jobList}</div>

          {totals ? (
            <div className="border-t border-brand-navy/10 bg-brand-navy/[0.02] px-6 py-4 lg:border-t-0 lg:border-l lg:py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
                Estimate total
              </p>
              <ApprovalTotalsBlock totals={totals} estimateTotals={estimateTotals} />
              {approvedJobsLive.length > 0 || declinedJobsLive.length > 0 ? (
                <p className="mt-3 text-xs font-medium text-brand-navy/80">
                  Your selection: {approvedJobsLive.length} approved
                  {declinedJobsLive.length > 0 ? ` · ${declinedJobsLive.length} declined` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-5 border-t border-brand-navy/10 px-6 py-5">{authorizationSection}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      {jobList}
      <div className="space-y-4 border-t pt-4">{authorizationSection}</div>
    </div>
  );
}
