import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { designModeHref } from "@/lib/design-mode-merged-crm";
import { DESIGN_MODE_QUERY } from "@/lib/design-mode-tokens";

export const metadata = { title: "Estimate-first intake — Design mode" };

export default async function EstimateFirstIntakeDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const sp = await searchParams;

  if (sp.design !== "open") {
    redirect(`/design-review/estimate-first-intake?${DESIGN_MODE_QUERY}=open`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
      <header className="shrink-0 space-y-1 px-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={designModeHref("/design-review")}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Design review
          </Link>
          <Badge variant="outline" className="border-brand-navy/30 bg-brand-navy/5 font-mono text-brand-navy">
            Design mode
          </Badge>
          <Badge variant="outline" className="border-brand-light/60 text-brand-navy">
            <FlaskConical className="mr-1 size-3" />
            Order Process Lab v2
          </Badge>
        </div>
        <div>
          <h1 className="text-lg font-bold text-brand-navy">Estimate-first intake mockup</h1>
          <p className="text-xs text-muted-foreground">
            Isolated lab prototype — required customer, vehicle, concern, odometer. Use the design dock to annotate.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-brand-light/40 bg-muted/20 shadow-sm">
        <iframe
          title="Estimate-first intake mockup"
          src="/lab/estimate-first-intake.html?embedded=1"
          className="size-full min-h-[640px] border-0 bg-white"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
