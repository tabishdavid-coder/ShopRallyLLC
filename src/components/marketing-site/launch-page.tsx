import { FoundingWaitlistForm } from "@/components/marketing-site/founding-waitlist-form";
import { OutcomeMetricsStrip } from "@/components/marketing-site/outcome-metrics-strip";
import { foundingSpotsRemaining, MARKETING_LAUNCH } from "@/lib/marketing-launch";

export function LaunchPageContent() {
  const remaining = foundingSpotsRemaining();

  return (
    <>
      <section className="relative overflow-hidden border-b border-brand-navy/10 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/90 text-white">
        <div className="pointer-events-none absolute -right-20 top-10 size-80 rounded-full bg-brand-light/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-light">
            {MARKETING_LAUNCH.foundingProgramLabel}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Get on the list before ShopRally launches
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            We&apos;re onboarding a small cohort of founding shops — early access, white-glove setup, and
            pricing locked before public launch. No credit card. No commitment until you&apos;re ready.
          </p>
          <p className="mt-4 text-sm font-semibold text-brand-light">
            {remaining} founding spots remaining · {MARKETING_LAUNCH.launchWindowLabel}
          </p>
        </div>
      </section>

      <OutcomeMetricsStrip />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <FoundingWaitlistForm />
      </section>
    </>
  );
}
