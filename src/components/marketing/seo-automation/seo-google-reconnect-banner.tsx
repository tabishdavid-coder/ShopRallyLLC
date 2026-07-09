"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { connectGoogleSearchConsole } from "@/server/actions/google-search-console";

export function SeoGoogleReconnectBanner({
  onError,
  compact = false,
}: {
  onError?: (message: string) => void;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();

  function reconnect() {
    start(async () => {
      const res = await connectGoogleSearchConsole();
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      onError?.(res.ok ? "Could not start Google sign-in." : res.error);
    });
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-950"
          : "rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950"
      }
    >
      <div className={compact ? "min-w-0 flex-1" : undefined}>
        <p className="font-medium">Reconnect Google for Analytics charts</p>
        <p className={compact ? "text-xs text-amber-900/85" : "mt-1 text-amber-900/85"}>
          Your Google account was connected before Analytics read access was added. Disconnect and
          reconnect on the Sites tab, or use the button below — no data is lost.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-300 bg-white hover:bg-amber-50"
        disabled={pending}
        onClick={reconnect}
      >
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 size-4" />
        )}
        Reconnect Google
      </Button>
    </div>
  );
}
