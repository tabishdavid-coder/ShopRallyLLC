import { EasyStartPath } from "@/components/marketing-site/easy-start-path";
import { OutcomeMetricsStrip } from "@/components/marketing-site/outcome-metrics-strip";
import {
  foundingSpotsRemaining,
  MARKETING_LAUNCH,
  STATUS_QUO_COST,
} from "@/lib/marketing-launch";

type LaunchPageContentProps = {
  /** Middleware redirected from CRM/platform while marketing-only production is live. */
  fromApp?: boolean;
  /** From /launch?need=website — pre-check Website & SEO companion interest. */
  wantWebsiteSeo?: boolean;
};

export function LaunchPageContent({
  fromApp = false,
  wantWebsiteSeo = false,
}: LaunchPageContentProps) {
  const remaining = foundingSpotsRemaining();
  const total = MARKETING_LAUNCH.foundingSpotsTotal;

  return (
    <>
      {fromApp ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
          Shop access opens {MARKETING_LAUNCH.launchQuarter} — reserve a founding seat below.
        </div>
      ) : null}
      {wantWebsiteSeo ? (
        <div className="border-b border-brand-navy/15 bg-brand-light/15 px-4 py-3 text-center text-sm text-brand-navy">
          Website &amp; SEO interest noted — separate from Ignition CRM. You can also{" "}
          <a href="/demo?need=website" className="font-semibold underline-offset-2 hover:underline">
            request a website &amp; SEO setup
          </a>{" "}
          directly.
        </div>
      ) : null}
      <section className="relative overflow-hidden border-b border-brand-navy/10 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/90 text-white">
        <div className="pointer-events-none absolute -right-20 top-10 size-80 rounded-full bg-brand-light/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-light">
            {MARKETING_LAUNCH.foundingProgramLabel} · {MARKETING_LAUNCH.launchWindowLabel}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Reserve a founding seat — launch {MARKETING_LAUNCH.launchQuarter}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            ShopRally Ignition is <span className="font-semibold text-white">not available yet</span>.
            We&apos;re taking {total} founding shops for the {MARKETING_LAUNCH.launchQuarter} launch.
            Reserve a seat now; we&apos;ll invite you when software opens — no card, no instant access.
          </p>
          <p className="mt-4 max-w-xl text-sm text-white/70">{STATUS_QUO_COST}</p>
          <p className="mt-4 text-sm font-semibold text-brand-light">
            {remaining} of {total} founding seats still open · {MARKETING_LAUNCH.launchWindowLabel}
          </p>
        </div>
      </section>

      <OutcomeMetricsStrip />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <EasyStartPath wantWebsiteSeo={wantWebsiteSeo} />
      </section>
    </>
  );
}
