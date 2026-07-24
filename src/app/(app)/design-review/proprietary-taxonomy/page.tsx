import Link from "next/link";
import { ArrowLeft, ExternalLink, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Proprietary taxonomy mockup — Design review",
};

/**
 * Prefer the standalone lab HTML when CRM auth / marketing gate blocks this shell.
 * Open directly: /lab/proprietary-taxonomy.html
 */
export default function ProprietaryTaxonomyDesignReviewPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-4 pb-8">
      <header className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/design-review"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Design review
          </Link>
          <Badge variant="outline" className="border-brand-navy/30 bg-brand-navy/5 text-brand-navy">
            Review
          </Badge>
          <Badge variant="outline" className="border-brand-light/60 text-brand-navy">
            <FlaskConical className="mr-1 size-3" />
            Proprietary taxonomy
          </Badge>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-brand-navy">
              Self-generating taxonomy &amp; fitment
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              If this CRM page won&apos;t load (Clerk / marketing gate), use the standalone lab link —
              no login required.
            </p>
          </div>
          <a
            href="/lab/proprietary-taxonomy.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90"
          >
            Open standalone lab
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-brand-light/40 bg-muted/20 shadow-sm">
        <iframe
          title="Proprietary taxonomy mockup"
          src="/lab/proprietary-taxonomy.html"
          className="size-full min-h-[720px] border-0 bg-white"
        />
      </div>
    </div>
  );
}
