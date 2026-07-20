import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";

/**
 * Pre-launch strip for sticky chrome (above MarketingHeader).
 * Not mounted from MarketingShell for now — seat-count urgency felt premature;
 * re-enable when closer to launch. Founding CTAs/copy remain on page bodies.
 */
export function LaunchAnnouncementBar() {
  if (!MARKETING_LAUNCH.preLaunch) return null;

  return (
    <div className="border-b border-brand-red/20 bg-gradient-to-r from-brand-navy via-brand-navy to-brand-navy/95 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2.5 text-center text-sm sm:justify-between sm:text-left">
        <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <Sparkles className="size-4 shrink-0 text-brand-light" aria-hidden />
          <span className="font-semibold text-brand-light">{MARKETING_LAUNCH.launchWindowLabel}</span>
          <span className="hidden text-white/50 sm:inline">·</span>
          <span className="text-white/75">Reserve a founding seat — we&apos;ll invite you at launch</span>
        </p>
        <Link
          href={marketingPrimaryHref(true)}
          className="inline-flex items-center gap-1 font-semibold text-brand-light transition-colors hover:text-white"
        >
          {marketingPrimaryCta({ preLaunch: true })}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
