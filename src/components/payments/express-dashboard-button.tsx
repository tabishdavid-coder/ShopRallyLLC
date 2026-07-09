"use client";

import { useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openStripeExpressDashboard } from "@/server/actions/stripe-connect";

export function ExpressDashboardButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-brand-navy"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await openStripeExpressDashboard();
          if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      See payout details
      <ExternalLink className="size-3.5" />
    </Button>
  );
}
