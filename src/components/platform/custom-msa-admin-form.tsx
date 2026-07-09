"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertShopCustomMsa } from "@/server/actions/shop-legal";
import type { ShopCustomAgreementView } from "@/server/custom-msa";

type CustomMsaAdminFormProps = {
  shopId: string;
  shopName: string;
  existing: ShopCustomAgreementView | null;
  defaultSignerEmail?: string;
};

export function CustomMsaAdminForm({
  shopId,
  shopName,
  existing,
  defaultSignerEmail = "",
}: CustomMsaAdminFormProps) {
  const [legalEntityName, setLegalEntityName] = useState(
    existing?.legalEntityName ?? shopName,
  );
  const [version, setVersion] = useState(existing?.version ?? "1.0");
  const [effectiveDate, setEffectiveDate] = useState(
    existing
      ? existing.effectiveDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [contentHtml, setContentHtml] = useState(
    existing?.contentHtml ??
      `<h2>Master Services Agreement</h2>
<p>This Master Services Agreement ("MSA") is between ShopRally LLC and ${shopName} ("Customer").</p>
<p>Paste counsel-reviewed MSA HTML here. Offline signature attestation required below.</p>`,
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [attestation, setAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await upsertShopCustomMsa({
        shopId,
        legalEntityName,
        version,
        effectiveDate,
        contentHtml,
        notes: notes.trim() ? notes : null,
        adminAttestation: attestation,
        signerName,
        signerEmail,
      });
      if (res.ok) {
        setSaved(true);
        setAttestation(false);
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-5 rounded-lg border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Enterprise Custom MSA</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Attach a shop-specific MSA (HTML paste). Record offline owner signature via admin
          attestation — no DocuSign in this MVP.
        </p>
        {existing ? (
          <p className="mt-2 text-xs text-muted-foreground">
            On file: v{existing.version} · effective{" "}
            {existing.effectiveDate.toLocaleDateString("en-US")} · uploaded by{" "}
            {existing.uploadedByName}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="msa-entity">Legal entity name</Label>
          <Input
            id="msa-entity"
            value={legalEntityName}
            onChange={(e) => setLegalEntityName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="msa-version">MSA version</Label>
          <Input
            id="msa-version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="msa-effective">Effective date</Label>
          <Input
            id="msa-effective"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="msa-content">MSA content (HTML)</Label>
        <Textarea
          id="msa-content"
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
          rows={12}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="msa-notes">Internal notes (optional)</Label>
        <Textarea
          id="msa-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="msa-signer">Shop signer name (offline)</Label>
          <Input
            id="msa-signer"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Owner name on signed MSA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="msa-signer-email">Shop signer email</Label>
          <Input
            id="msa-signer-email"
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-red/20 bg-brand-red/5 px-3 py-3">
        <Checkbox
          checked={attestation}
          onCheckedChange={(v) => setAttestation(v === true)}
          className="mt-0.5"
        />
        <span className="text-sm leading-snug">
          I attest that the shop owner or authorized representative signed this MSA offline.
          A LegalAcceptance audit row will be recorded with method{" "}
          <span className="font-mono text-xs">admin_attestation</span>.
        </span>
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? (
        <p className="flex items-center gap-1 text-sm text-emerald-600">
          <Check className="size-4" /> Custom MSA saved and attestation recorded.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/platform/shops">← All shops</Link>
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save custom MSA
        </Button>
      </div>
    </div>
  );
}
