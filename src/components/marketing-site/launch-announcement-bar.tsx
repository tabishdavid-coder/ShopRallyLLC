import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Zap } from "lucide-react";

import {
  getFoundingSpotMessaging,
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import { cn } from "@/lib/utils";

const URGENCY_ICON = {
  open: Sparkles,
  warm: Sparkles,
  hot: Zap,
  critical: Flame,
} as const;

/**
 * Pre-launch urgency strip for sticky chrome (above MarketingHeader).
 * Not mounted from MarketingShell for now — spots-left countdown felt premature;
 * re-enable when closer to launch. Founding CTAs/copy remain on page bodies.
 */
export function LaunchAnnouncementBar({ foundingSpotsClaimed = 0 }: { foundingSpotsClaimed?: number }) {
  if (!MARKETING_LAUNCH.preLaunch) return null;

  const messaging = getFoundingSpotMessaging(foundingSpotsClaimed);
  const UrgencyIcon = URGENCY_ICON[messaging.urgency];
  const critical = messaging.urgency === "critical";

  return (
    <div className="border-b border-brand-red/20 bg-gradient-to-r from-brand-navy via-brand-navy to-brand-navy/95 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2.5 text-center text-sm sm:justify-between sm:text-left">
        <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <UrgencyIcon
            className={cn(
              "size-4 shrink-0",
              critical
                ? "text-brand-red"
                : messaging.urgency === "hot"
                  ? "animate-pulse text-amber-300"
                  : "text-brand-light",
            )}
            aria-hidden
          />
          <span className="font-semibold text-brand-light">{MARKETING_LAUNCH.launchWindowLabel}</span>
          <span className="hidden text-white/50 sm:inline">·</span>
          <span
            className={cn(
              "font-semibold",
              critical ? "text-brand-red" : "text-white",
            )}
          >
            {messaging.primary}
          </span>
          <span className="hidden text-white/50 md:inline">—</span>
          <span className="text-white/75">{messaging.secondary}</span>
        </p>
        <Link
          href={marketingPrimaryHref(true)}
          className={cn(
            "inline-flex items-center gap-1 font-semibold transition-colors",
            critical
              ? "text-brand-red hover:text-brand-red/80"
              : "text-brand-light hover:text-white",
          )}
        >
          {marketingPrimaryCta({ preLaunch: true, critical })}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
