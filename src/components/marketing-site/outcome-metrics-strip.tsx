import { OUTCOME_METRICS } from "@/lib/marketing-launch";

export function OutcomeMetricsStrip() {
  return (
    <section className="border-b border-brand-navy/10 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-brand-navy/10 md:grid-cols-4">
        {OUTCOME_METRICS.map((m) => (
          <div key={m.label} className="bg-white px-4 py-8 text-center sm:px-6">
            <p className="text-3xl font-bold tabular-nums text-brand-navy sm:text-4xl">
              {m.value}
              {m.unit ? (
                <span className="ml-0.5 text-lg font-semibold text-brand-red sm:text-xl">{m.unit}</span>
              ) : null}
            </p>
            <p className="mt-2 text-xs font-medium leading-snug text-slate-600 sm:text-sm">{m.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
