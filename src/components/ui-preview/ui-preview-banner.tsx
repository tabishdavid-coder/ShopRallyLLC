import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shown on the legacy dashboard — links to the isolated UI preview route. */
export function UiPreviewBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-brand-red/30 bg-brand-red/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-red text-white">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-brand-navy">
            UI redesign preview — job board landing
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The updated mock uses ShopRally&apos;s grouped sidebar (
            <code className="rounded bg-white px-1 font-mono text-[11px]">NAV_GROUPS</code>
            ) with job board as landing at{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-brand-navy">
              /preview
            </code>
            — not this page. Port{" "}
            <strong className="font-semibold text-brand-navy">3001</strong>, not
            3000.
          </p>
        </div>
      </div>
      <Button
        asChild
        className="shrink-0 gap-2 bg-brand-red hover:bg-brand-red/90"
      >
        <Link href="/preview" target="_blank" rel="noopener noreferrer">
          Open live preview
          <ExternalLink className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
