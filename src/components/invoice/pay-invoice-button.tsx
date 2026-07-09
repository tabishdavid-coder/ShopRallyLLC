"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { startInvoiceCheckout } from "@/server/actions/payments";

export function PayInvoiceButton({
  shareToken,
  balanceCents,
  disabled,
}: {
  shareToken: string;
  balanceCents: number;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pay() {
    setError(null);
    start(async () => {
      const res = await startInvoiceCheckout(shareToken);
      if (res.ok) {
        window.location.href = res.url;
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="w-full gap-2 bg-brand-navy text-base font-semibold hover:bg-brand-navy/90"
        onClick={pay}
        disabled={pending || disabled || balanceCents <= 0}
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
        Pay invoice · {formatCents(balanceCents)}
      </Button>
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      <p className="text-center text-xs text-muted-foreground">
        Secure card payment powered by Stripe
      </p>
    </div>
  );
}
