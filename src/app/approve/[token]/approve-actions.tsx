"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/format";
import { SignaturePad, type SignatureCapture } from "@/components/approval/signature-pad";
import { submitCustomerApproval } from "@/server/actions/approval";

type ApprovalJob = {
  id: string;
  name: string;
  laborHours: number;
  partsCents: number;
  totalCents: number;
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
  jobs,
  signature,
  estimateTerms,
}: {
  token: string;
  alreadyApproved: boolean;
  jobs: ApprovalJob[];
  signature: ExistingSignature | null;
  estimateTerms: EstimateTermsBlock;
}) {
  const [done, setDone] = useState(alreadyApproved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(() => new Set(jobs.map((j) => j.id)));
  const [signerName, setSignerName] = useState("");
  const [signatureCapture, setSignatureCapture] = useState<SignatureCapture | null>(null);
  const [consent, setConsent] = useState(false);

  const allSelected = jobs.length > 0 && selected.size === jobs.length;
  const someSelected = selected.size > 0 && selected.size < jobs.length;

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
    start(async () => {
      const res = await submitCustomerApproval(token, {
        approvedJobIds: [...selected],
        signatureDataUrl: signatureCapture.dataUrl,
        signatureWidth: signatureCapture.width,
        signatureHeight: signatureCapture.height,
        signerName: signerName.trim(),
        consent: true,
      });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    const signer = signature?.signerName ?? (signerName.trim() || "You");
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-600" />
          <p className="font-semibold text-emerald-800">Estimate approved</p>
          <p className="mt-1 text-sm text-emerald-700">
            Thank you{signer ? `, ${signer}` : ""}! Your shop has been notified and will begin
            the authorized work. You can close this page.
          </p>
        </div>
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

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">Select jobs to approve</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check each job you authorize, or approve all at once.
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs on this estimate.</p>
      ) : (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-navy/15 bg-brand-navy/5 px-3 py-2.5">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(v) => toggleAll(v === true)}
              aria-label="Approve all jobs"
            />
            <span className="text-sm font-medium">Approve all jobs</span>
          </label>

          <div className="divide-y rounded-lg border">
            {jobs.map((j) => (
              <label
                key={j.id}
                className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/40"
              >
                <Checkbox
                  checked={selected.has(j.id)}
                  onCheckedChange={() => toggleJob(j.id)}
                  aria-label={`Approve ${j.name}`}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{j.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.laborHours.toFixed(1)} hrs labor
                    {j.partsCents > 0 ? ` · parts ${formatCents(j.partsCents)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCents(j.totalCents)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <h2 className="text-base font-semibold">Terms &amp; authorization</h2>
        <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <div
            className="prose prose-sm max-w-none prose-headings:text-sm prose-headings:font-semibold prose-p:my-2"
            dangerouslySetInnerHTML={{ __html: estimateTerms.html }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Terms version {estimateTerms.version}
        </p>
        <h2 className="text-base font-semibold">Sign to authorize</h2>
        <div className="rounded-md border border-brand-navy/15 bg-brand-navy/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
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

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-red/20 bg-brand-red/5 px-3 py-3">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          aria-label="Authorize selected work"
          className="mt-0.5"
        />
        <span className="text-sm leading-snug">
          I authorize the shop to perform the selected work listed above and agree to pay according
          to the estimate total. I consent to the use of my electronic signature under the ESIGN Act
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
}
