import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";

import { ProprietaryTaxonomyMockup } from "@/components/design-review/proprietary-taxonomy-mockup";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Proprietary taxonomy mockup — Design review",
};

export default function ProprietaryTaxonomyDesignReviewPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 pb-16">
      <header className="space-y-2">
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
        <div>
          <h1 className="text-xl font-bold tracking-tight text-brand-navy">
            Self-generating taxonomy & fitment
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Interactive mock of intent parse → labor fallback (L0–L2) → parts placeholder →
            shop-rate billing. Desktop horizontal layout for review — not wired to live RO writes.
          </p>
        </div>
      </header>

      <ProprietaryTaxonomyMockup />
    </div>
  );
}
