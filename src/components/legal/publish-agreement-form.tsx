"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { publishAgreementVersion } from "@/server/actions/legal";
import type { AgreementType } from "@/generated/prisma";

const AGREEMENT_TYPES: { value: AgreementType; label: string }[] = [
  { value: "PLATFORM_TOS" as AgreementType, label: "Terms of Service" },
  { value: "PRIVACY_POLICY" as AgreementType, label: "Privacy Policy" },
  { value: "ACCEPTABLE_USE" as AgreementType, label: "Acceptable Use Policy" },
  { value: "DPA" as AgreementType, label: "Data Processing Agreement" },
  { value: "PAYMENT_ADDENDUM" as AgreementType, label: "Payment Addendum" },
  { value: "SMS_ADDENDUM" as AgreementType, label: "SMS Addendum" },
];

const inputCls =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function PublishAgreementForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usePlaceholder, setUsePlaceholder] = useState(true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);

    start(async () => {
      const res = await publishAgreementVersion({
        type: String(fd.get("type")) as AgreementType,
        versionBump: String(fd.get("versionBump")) as "patch" | "minor",
        contentHtml: String(fd.get("contentHtml") ?? "") || undefined,
        usePlaceholder,
      });
      if (res.ok) {
        setSuccess("New version published. Shops with outdated acceptances will see the re-acceptance modal.");
        e.currentTarget.reset();
        setUsePlaceholder(true);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-semibold">Publish new version</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Marks the previous version as archived and sets a new current document. Shops must
        re-accept when <code className="rounded bg-muted px-1 text-xs">requiresReaccept</code> is
        enabled.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">Agreement type</span>
            <select name="type" required className={inputCls} defaultValue="PLATFORM_TOS">
              {AGREEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Version bump</span>
            <select name="versionBump" required className={inputCls} defaultValue="patch">
              <option value="patch">Patch (1.0.0 → 1.0.1)</option>
              <option value="minor">Minor (1.0.0 → 1.1.0)</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={usePlaceholder}
            onCheckedChange={(v) => setUsePlaceholder(v === true)}
          />
          Use placeholder content generator
        </label>

        {!usePlaceholder ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Content HTML</span>
            <textarea
              name="contentHtml"
              rows={8}
              className={inputCls}
              placeholder="<h2>1. Section</h2><p>...</p>"
            />
          </label>
        ) : null}

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} className="bg-brand-navy hover:bg-brand-navy/90">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Publish version
          </Button>
          <Link href="/legal/terms" target="_blank" className="text-sm text-brand-navy hover:underline">
            Preview public pages
          </Link>
        </div>
      </form>
    </section>
  );
}
