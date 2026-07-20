import { Check } from "lucide-react";

import {
  CORE_OFFERING_MOCK,
  type CoreOfferingGroup,
} from "@/lib/core-plan-offering-proposal";
import { cn } from "@/lib/utils";

function IncludedGroup({ group }: { group: CoreOfferingGroup }) {
  return (
    <div className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-brand-navy">{group.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{group.blurb}</p>
      <ul className="mt-4 space-y-2">
        {group.items.map((item) => (
          <li key={item.name} className="flex gap-2 text-sm text-slate-700">
            <Check
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                item.highlight ? "text-brand-red" : "text-brand-navy",
              )}
              aria-hidden
            />
            <span>
              <span className="font-medium text-brand-navy">{item.name}</span>
              {item.detail ? (
                <span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Deep Ignition / Core feature groups for /pricing (below the plan card). */
export function CorePlanWhatsIncluded() {
  const m = CORE_OFFERING_MOCK;
  const total = m.groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section
      id="core-whats-included"
      className="scroll-mt-24 border-y border-brand-navy/10 bg-[#F7FAFD] px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">
            What&apos;s included
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            Ignition founding checklist — by area
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Launch scope for founding shops ({total}+ line items). Red checks are the biggest everyday
            wins. Pro+ roadmap items stay in the dashed box below — not mixed in here.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {m.groups.map((g) => (
            <IncludedGroup key={g.id} group={g} />
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-dashed border-slate-300 bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Coming later · Pro / Elite (not Ignition)
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
            {m.notIncluded.map((item) => (
              <li key={item.name}>
                {item.name}
                <span className="ml-1 text-xs text-slate-400">({item.note})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
