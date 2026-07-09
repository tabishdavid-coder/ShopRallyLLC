"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { acceptPaymentAddendum } from "@/server/actions/legal";

export function PaymentAddendumGate({
  version,
  onAccepted,
}: {
  version: string;
  onAccepted?: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await acceptPaymentAddendum({ accepted });
      if (res.ok) onAccepted?.();
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 p-4 text-left">
      <div className="flex gap-2">
        <Shield className="mt-0.5 size-4 shrink-0 text-brand-navy" />
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-brand-navy">
              Payment Processing Addendum required
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Before connecting Stripe, your shop must accept the ShopRally Payment Processing
              Addendum (v{version}).
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-md border bg-background p-3">
            <Checkbox
              id="payment-addendum"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <Label htmlFor="payment-addendum" className="cursor-pointer text-sm leading-relaxed">
              I have read and agree to the{" "}
              <Link
                href="/legal/payment-addendum"
                target="_blank"
                className="font-medium text-brand-navy hover:underline"
              >
                Payment Processing Addendum
              </Link>{" "}
              on behalf of my shop.
            </Label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            size="sm"
            className="bg-brand-navy hover:bg-brand-navy/90"
            disabled={!accepted || pending}
            onClick={submit}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Accept addendum
          </Button>
        </div>
      </div>
    </div>
  );
}
