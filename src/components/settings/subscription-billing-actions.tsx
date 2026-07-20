"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  createBillingPortalSession,
  startAiPlusCheckout,
  startIgnitionCheckout,
} from "@/server/actions/billing";

type Props = {
  showIgnitionCheckout: boolean;
  showAiPlusCheckout: boolean;
  aiPlusEnabled: boolean;
  showBillingPortal: boolean;
};

export function SubscriptionBillingActions({
  showIgnitionCheckout,
  showAiPlusCheckout,
  aiPlusEnabled,
  showBillingPortal,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function run(
    action: () => Promise<{ ok: true; url?: string; message?: string } | { ok: false; error: string }>,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      if (res.message) setMessage(res.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-brand-navy/20 bg-brand-navy/5 px-3 py-2 text-sm text-brand-navy">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {showIgnitionCheckout ? (
          <>
            <Button
              size="sm"
              className="bg-brand-navy"
              disabled={pending}
              onClick={() => run(() => startIgnitionCheckout("monthly"))}
            >
              Subscribe monthly
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => startIgnitionCheckout("annual"))}
            >
              Subscribe annual
            </Button>
          </>
        ) : null}

        {showAiPlusCheckout && !aiPlusEnabled ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => startAiPlusCheckout())}
          >
            Add AI Plus — $49.99/mo
          </Button>
        ) : null}

        {aiPlusEnabled ? (
          <p className="self-center text-xs font-medium text-emerald-700">AI Plus active</p>
        ) : null}

        {showBillingPortal ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => createBillingPortalSession())}
          >
            Manage billing
          </Button>
        ) : null}
      </div>
    </div>
  );
}
