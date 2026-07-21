"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

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

  const [selected, setSelected] = useState<Set<string>>(() => new Set(jobs.map((j) => j.id)));
  const [signerName, setSignerName] = useState("");
  const [signatureCapture, setSignatureCapture] = useState<SignatureCapture | null>(null);
  const [consent, setConsent] = useState(false);
  const [lastApprovedJobIds, setLastApprovedJobIds] = useState<string[] | null>(null);

  useEffect(() => {
    setDone(alreadyApproved);
  }, [alreadyApproved]);

  const allSelected = jobs.length > 0 && selected.size === jobs.length;
  const someSelected = selected.size > 0 && selected.size < jobs.length;

  const selectedTotalCents = useMemo(
    () => jobs.filter((j) => selected.has(j.id)).reduce((s, j) => s + j.totalCents, 0),
    [jobs, selected],
  );

  const canSubmit = useMemo(
    () =>
      selected.size > 0 &&
      signerName.trim().length > 0 &&
      signatureCapture != null &&
      consent &&
      !pending,
    [selected.size, signerName, signatureCapture, consent, pending],
  );

  function toggleJob(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(jobs.map((j) => j.id)) : new Set());
  }

  function submit() {
    if (!canSubmit || !signatureCapture) return;
    setError(null);
    const approvedJobIds = [...selected];
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
            Authorized total: {formatCents(approvedTotalCents)}
          </p>
        </div>

        {approvedJobs.length > 0 ? (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
              Authorized work
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
          Estimate jobs
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check each job you authorize, or approve all at once.
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs on this estimate.</p>
      ) : (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-navy/15 bg-brand-navy/[0.06] px-3 py-2.5 transition-colors hover:bg-brand-navy/[0.09]">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(v) => toggleAll(v === true)}
              aria-label="Approve all jobs"
            />
            <span className="text-sm font-semibold text-brand-navy">Approve all jobs</span>
          </label>

          <div className="overflow-hidden rounded-xl border border-brand-navy/10 divide-y divide-brand-navy/10">
            {jobs.map((j) => {
              const isSelected = selected.has(j.id);
              return (
                <label
                  key={j.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 px-3 py-3.5 transition-colors",
                    isSelected ? "bg-brand-light/15 hover:bg-brand-light/20" : "hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleJob(j.id)}
                    aria-label={`Approve ${j.name}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-brand-navy">{j.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {j.laborHours.toFixed(1)} hrs labor
                      {j.partsCents > 0 ? ` · parts ${formatCents(j.partsCents)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-navy">
                    {formatCents(j.totalCents)}
                  </span>
                </label>
              );
            })}
          </div>

          {someSelected ? (
            <p className="text-xs text-muted-foreground">
              Selected jobs subtotal: {formatCents(selectedTotalCents)} (tax and fees calculated on
              submit).
            </p>
          ) : null}
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
            By signing below, you agree to use an electronic signature to authorize the selected
            repair work. Your signature, name, date, IP address, and browser information will be
            stored as part of the approval record. You may request a paper copy of this authorization
            from the shop. You may withdraw consent to electronic signatures by contacting the shop
            directly; withdrawal does not affect prior authorized work.
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

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-red/20 bg-brand-red/[0.06] px-3 py-3">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          aria-label="Authorize selected work"
          className="mt-0.5"
        />
        <span className="text-sm leading-snug">
          I authorize the shop to perform the selected work listed above and agree to pay according
          to the authorized total. I consent to the use of my electronic signature under the ESIGN Act
          and understand it has the same legal effect as a handwritten signature.
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
        Submit approval
      </Button>
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
