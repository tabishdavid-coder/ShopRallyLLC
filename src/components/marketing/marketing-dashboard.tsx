import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Globe,
  Megaphone,
  Radar,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GROWTH_BUNDLES, GROWTH_ENGINE, GROWTH_ENGINE_HUB_CARDS } from "@/lib/growth-engine-brand";
import { cn } from "@/lib/utils";
import type { MarketingDashboardStats } from "@/server/marketing";

const HUB_ICONS: Record<(typeof GROWTH_ENGINE_HUB_CARDS)[number]["id"], LucideIcon> = {
  outreach: Megaphone,
  automations: Zap,
  booking: CalendarCheck,
  bayCare: Shield,
  shopSite: Globe,
  seoAutopilot: Radar,
  leadSources: Target,
};

export function MarketingDashboard({ stats }: { stats: MarketingDashboardStats }) {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Growth bundles: </span>
        {Object.values(GROWTH_BUNDLES)
          .map((b) => b.name)
          .join(" · ")}
        <span className="text-muted-foreground/80">
          {" "}
          — {GROWTH_ENGINE.upgradeHint} {GROWTH_ENGINE.overdriveHint}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GROWTH_ENGINE_HUB_CARDS.map((card) => (
          <ModuleCard
            key={card.href}
            title={card.label}
            description={card.shortDescription}
            href={card.href}
            icon={HUB_ICONS[card.id]}
            prominent={card.id === "outreach"}
            premium={card.premium}
            cta={`Open ${card.label}`}
          />
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Appointment &amp; booking performance</h2>
        <p className="text-sm text-muted-foreground">Last 14 days</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Globe}
          label="Online booking appointments"
          value={String(stats.onlineBookings14d)}
          accent="text-brand-navy"
        />
        <StatCard
          icon={Users}
          label="Manual appointments"
          value={String(stats.manualBookings14d)}
          accent="text-muted-foreground"
        />
        <StatCard
          icon={CalendarCheck}
          label="Book Online"
          value={stats.onlineBookingEnabled ? "Enabled" : "Disabled"}
          accent={stats.onlineBookingEnabled ? "text-emerald-600" : "text-amber-600"}
        />
      </div>

      {!stats.onlineBookingEnabled ? (
        <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-4">
          <p className="text-sm">
            Book Online is off. Enable it to let customers schedule from your ShopSite.
          </p>
          <Button asChild size="sm" className="mt-3 bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/marketing/online-booking">Set up Book Online</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ModuleCard({
  title,
  description,
  href,
  icon: Icon,
  prominent,
  premium,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  prominent?: boolean;
  premium?: boolean;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary/40",
        prominent && "border-brand-navy/30 bg-gradient-to-br from-brand-navy/5 to-brand-light/10 sm:col-span-2",
        premium && "border-brand-navy/20",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            prominent || premium ? "bg-brand-navy text-white" : "bg-muted text-brand-navy",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            {premium ? (
              <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                Premium
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-navy group-hover:underline">
            {cta}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", accent)} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
