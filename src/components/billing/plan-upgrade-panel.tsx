import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export type PlanUpgradePanelProps = {
  /** Short product name shown in the headline (e.g. "Growth Engine"). */
  featureLabel: string;
  /** One or two sentences explaining what the shop gets after upgrading. */
  description?: string;
  /** When the module is plan-entitled but release-flagged off. */
  notAvailableYet?: boolean;
  /** Optional secondary CTA (e.g. back to dashboard). */
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Soft-land / settings-wall upgrade surface for plan-gated modules.
 * Pattern matches Stripe Connect wall in PaymentsAccountSettings.
 */
export function PlanUpgradePanel({
  featureLabel,
  description,
  notAvailableYet = false,
  secondaryHref = "/dashboard/snapshot",
  secondaryLabel = "Back to dashboard",
}: PlanUpgradePanelProps) {
  if (notAvailableYet) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6 text-sm shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{featureLabel} is not available yet</p>
            <p className="mt-2 text-muted-foreground">
              {description ??
                "This module is not released for your shop. Ask a platform admin if you need early access."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{featureLabel} is on {PLANS.PROFESSIONAL.name}+</p>
          <p className="mt-2 text-amber-900/90">
            {description ??
              `${featureLabel} is included on ${PLANS.PROFESSIONAL.name} and ${PLANS.ENTERPRISE.name}. Upgrade to unlock this area.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="bg-brand-navy" size="sm">
              <Link href="/settings/subscription">View plans</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-amber-300 bg-white/80">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
