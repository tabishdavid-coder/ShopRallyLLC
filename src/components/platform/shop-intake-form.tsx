"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { PlatformMsaConsentCheckbox } from "@/components/platform/platform-msa-consent";
import {
  emptyPlatformShopForm,
  PlatformShopFormFields,
} from "@/components/platform/platform-shop-form-fields";
import type { PlatformShopFormState } from "@/lib/platform-shop-form";
import { submitShopIntake } from "@/server/actions/shop-intake";

export function ShopIntakeForm({
  token,
  defaults,
}: {
  token: string;
  defaults: PlatformShopFormState;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(defaults);
  const [msaAcknowledged, setMsaAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitShopIntake(token, form, { msaAcknowledged });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(res.shopName);
      router.refresh();
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-4 text-xl font-bold text-brand-navy">Thank you!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We received your details for <span className="font-medium text-foreground">{submitted}</span>.
          The ShopRally team will review your submission and contact you when your shop is activated.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-xl font-bold text-brand-navy">Shop onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your shop so we can provision your ShopRally workspace.
        </p>
      </div>
      <PlatformShopFormFields
        idPrefix="intake"
        form={form}
        onChange={setForm}
        onSubmit={submit}
        pending={pending}
        error={error}
        submitLabel={pending ? "Submitting…" : "Submit for review"}
        showBillingDefaults={false}
        footer={
          <PlatformMsaConsentCheckbox
            id="intake-msa"
            checked={msaAcknowledged}
            onCheckedChange={setMsaAcknowledged}
          />
        }
        submitDisabled={!msaAcknowledged}
      />
      {pending ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving your shop details…
        </p>
      ) : null}
    </div>
  );
}
