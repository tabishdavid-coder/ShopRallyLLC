"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { startDepositCheckout } from "@/server/actions/deposit-request";

export function PayDepositButton({
  shareToken,
  amountCents,
  disabled,
}: {
  shareToken: string;
  amountCents: number;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pay() {
    setError(null);
    start(async () => {
      const res = await startDepositCheckout(shareToken);
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
        className="w-full gap-2 bg-brand-navy text-white hover:bg-brand-navy/90"
        disabled={disabled || pending}
        onClick={pay}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        Pay {formatCents(amountCents)}
      </Button>
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
