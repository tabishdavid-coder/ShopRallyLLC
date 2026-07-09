"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { acceptPlatformAgreements } from "@/server/actions/legal";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY",
];

const SIGNER_TITLES = ["Owner", "GM", "Authorized Representative"] as const;

const inputCls =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

type LegalOnboardingFormProps = {
  defaultLegalEntityName: string;
  defaultLegalEntityState: string;
  defaultSignerName: string;
  defaultSignerEmail: string;
};

export function LegalOnboardingForm({
  defaultLegalEntityName,
  defaultLegalEntityState,
  defaultSignerName,
  defaultSignerEmail,
}: LegalOnboardingFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await acceptPlatformAgreements({
        legalEntityName: String(fd.get("legalEntityName") ?? ""),
        legalEntityState: String(fd.get("legalEntityState") ?? ""),
        signerName: String(fd.get("signerName") ?? ""),
        signerTitle: String(fd.get("signerTitle") ?? "") as (typeof SIGNER_TITLES)[number],
        signerEmail: String(fd.get("signerEmail") ?? ""),
        acceptedAgreements: accepted,
      });
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 text-sm text-foreground">
        Before using ShopRally, your shop must accept our platform agreements and provide
        contracting entity details for your audit trail.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="legalEntityName">Legal business name</Label>
          <input
            id="legalEntityName"
            name="legalEntityName"
            required
            defaultValue={defaultLegalEntityName}
            className={inputCls}
            placeholder="Acme Auto Repair LLC"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="legalEntityState">State of formation / registration</Label>
          <select
            id="legalEntityState"
            name="legalEntityState"
            required
            defaultValue={defaultLegalEntityState || undefined}
            className={inputCls}
          >
            <option value="" disabled>
              Select state
            </option>
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signerTitle">Your title</Label>
          <select id="signerTitle" name="signerTitle" required className={inputCls} defaultValue="Owner">
            {SIGNER_TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signerName">Signer full name</Label>
          <input
            id="signerName"
            name="signerName"
            required
            defaultValue={defaultSignerName}
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signerEmail">Signer email</Label>
          <input
            id="signerEmail"
            name="signerEmail"
            type="email"
            required
            defaultValue={defaultSignerEmail}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
        <Checkbox
          id="acceptedAgreements"
          checked={accepted}
          onCheckedChange={(value) => setAccepted(value === true)}
        />
        <Label htmlFor="acceptedAgreements" className="cursor-pointer text-sm leading-relaxed">
          I am authorized to bind the legal entity named above. I have read and agree to the{" "}
          <Link href="/legal/terms" target="_blank" className="font-medium text-brand-navy hover:underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/legal/privacy" target="_blank" className="font-medium text-brand-navy hover:underline">
            Privacy Policy
          </Link>
          , and{" "}
          <Link href="/legal/aup" target="_blank" className="font-medium text-brand-navy hover:underline">
            Acceptable Use Policy
          </Link>
          .
        </Label>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !accepted}
        className="w-full bg-brand-navy sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Accept agreements & continue"
        )}
      </Button>
    </form>
  );
}
