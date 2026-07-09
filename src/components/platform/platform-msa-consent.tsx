"use client";

import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** Shared MSA / platform agreement acknowledgment for intake and add-shop flows. */
export function PlatformMsaConsentCheckbox({
  checked,
  onCheckedChange,
  id = "msa-consent",
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  id?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-brand-navy/15 bg-muted/30 p-4">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm leading-relaxed">
        I am authorized to bind this shop. I have reviewed the{" "}
        <Link href="/legal/terms" target="_blank" className="font-medium text-brand-navy hover:underline">
          Terms of Service (MSA)
        </Link>
        ,{" "}
        <Link href="/legal/privacy" target="_blank" className="font-medium text-brand-navy hover:underline">
          Privacy Policy
        </Link>
        , and{" "}
        <Link href="/legal/aup" target="_blank" className="font-medium text-brand-navy hover:underline">
          Acceptable Use Policy
        </Link>
        . The shop will complete full legal acceptance at{" "}
        <Link href="/onboarding/legal" target="_blank" className="font-medium text-brand-navy hover:underline">
          onboarding/legal
        </Link>{" "}
        before go-live.
      </Label>
    </div>
  );
}
