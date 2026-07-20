import { cn } from "@/lib/utils";

/**
 * Still product-screenshot hero — AutoLeap-style composite (board + estimate rail),
 * Shopmonkey-level visual weight. Flat frame only: no tilt, float, or motion.
 */
export function HomeHeroVisual({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full",
        className,
      )}
      aria-label="ShopRally product preview — job board and estimate"
    >
      {/* Soft depth plate behind the frame (static atmosphere, not a card stack) */}
      <div
        className="pointer-events-none absolute -inset-x-2 -bottom-3 top-6 rounded-[1.25rem] bg-brand-navy/[0.06] sm:-inset-x-3 sm:-bottom-4"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-xl border border-brand-navy/15 bg-white shadow-[0_32px_64px_-28px_rgb(22_88_142/0.5)]">
        {/* Window chrome — static */}
        <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-brand-navy px-3 py-2.5 sm:px-4">
          <span className="size-2 rounded-full bg-brand-red" aria-hidden />
          <span className="size-2 rounded-full bg-brand-light" aria-hidden />
          <span className="size-2 rounded-full bg-white/35" aria-hidden />
          <span className="ml-2 truncate text-[11px] font-medium text-white/90 sm:text-xs">
            ShopRally · Job board
          </span>
        </div>

        <div className="flex min-h-[18.5rem] bg-slate-50 sm:min-h-[21.5rem] lg:min-h-[24rem]">
          {/* Slim nav rail — density cue */}
          <aside
            className="hidden w-11 shrink-0 flex-col gap-2 border-r border-brand-navy/10 bg-brand-navy px-2 py-3 sm:flex"
            aria-hidden
          >
            {["JB", "RO", "CU", "AP"].map((label, i) => (
              <div
                key={label}
                className={cn(
                  "flex h-7 items-center justify-center rounded-md text-[9px] font-bold tracking-wide",
                  i === 0
                    ? "bg-brand-red text-white"
                    : "bg-white/10 text-white/70",
                )}
              >
                {label}
              </div>
            ))}
          </aside>

          {/* Main: kanban — AutoLeap work-board weight */}
          <div className="min-w-0 flex-[1.35] border-r border-brand-navy/10 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Today
                </p>
                <p className="text-sm font-bold text-brand-navy sm:text-base">
                  Job board
                </p>
              </div>
              <span className="rounded-md bg-brand-navy px-2.5 py-1 text-[10px] font-semibold text-white">
                + Estimate
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              <BoardColumn
                title="Estimates"
                count={8}
                accent="navy"
                cards={[
                  {
                    ro: "RO#1042",
                    vehicle: "2019 F-150",
                    job: "Brake job",
                    amount: "$1,840",
                    tag: "PartsTech",
                    tagTone: "navy",
                  },
                  {
                    ro: "RO#1040",
                    vehicle: "2014 Accord",
                    job: "Oil + multi-point",
                    amount: "$289",
                    tag: "Pending",
                    tagTone: "amber",
                  },
                ]}
              />
              <BoardColumn
                title="In progress"
                count={5}
                accent="light"
                cards={[
                  {
                    ro: "RO#1038",
                    vehicle: "2021 Camry",
                    job: "Canned brakes",
                    amount: "$1,120",
                    tag: "Bay 2",
                    tagTone: "light",
                  },
                  {
                    ro: "RO#1036",
                    vehicle: "2018 Civic",
                    job: "Battery + alt",
                    amount: "$640",
                    tag: "Advisor",
                    tagTone: "navy",
                  },
                ]}
              />
              <BoardColumn
                title="Completed"
                count={7}
                accent="red"
                cards={[
                  {
                    ro: "RO#1031",
                    vehicle: "2020 RAV4",
                    job: "Inspection done",
                    amount: "$0 bal",
                    tag: "Paid",
                    tagTone: "green",
                  },
                  {
                    ro: "RO#1029",
                    vehicle: "2016 Silverado",
                    job: "Estimate approved",
                    amount: "$2,410",
                    tag: "Emailed",
                    tagTone: "navy",
                  },
                ]}
              />
            </div>
          </div>

          {/* Right rail peek — AutoLeap “estimates + messages” composite cue */}
          <aside
            className="hidden w-[9.5rem] shrink-0 flex-col bg-white p-2.5 md:flex lg:w-[10.5rem]"
            aria-hidden
          >
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Open RO
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-brand-navy">
              RO#1042 · F-150
            </p>
            <div className="mt-2 space-y-1.5 rounded-lg border border-brand-navy/10 bg-slate-50/80 p-2">
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-500">Labor</span>
                <span className="font-semibold text-brand-navy">$720</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-500">Parts</span>
                <span className="font-semibold text-brand-navy">$1,120</span>
              </div>
              <div className="border-t border-brand-navy/10 pt-1.5 flex justify-between text-[10px]">
                <span className="font-semibold text-slate-600">Total</span>
                <span className="font-bold text-brand-navy">$1,840</span>
              </div>
            </div>
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Customer
            </p>
            <div className="mt-1.5 space-y-1.5">
              <div className="rounded-md border border-brand-light/40 bg-brand-light/15 px-2 py-1.5">
                <p className="text-[9px] font-medium text-brand-navy">
                  Estimate emailed
                </p>
                <p className="text-[8px] text-slate-500">Awaiting approval</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <p className="text-[9px] font-medium text-slate-700">
                  DVI photos ready
                </p>
                <p className="text-[8px] text-slate-500">Sent with estimate</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

type CardTone = "navy" | "light" | "amber" | "green";

function BoardColumn({
  title,
  count,
  accent,
  cards,
}: {
  title: string;
  count: number;
  accent: "navy" | "light" | "red";
  cards: Array<{
    ro: string;
    vehicle: string;
    job: string;
    amount: string;
    tag: string;
    tagTone: CardTone;
  }>;
}) {
  const head =
    accent === "navy"
      ? "border-brand-navy/20 bg-brand-navy/[0.06] text-brand-navy"
      : accent === "light"
        ? "border-brand-light/50 bg-brand-light/20 text-brand-navy"
        : "border-brand-red/25 bg-brand-red/[0.06] text-brand-navy";

  return (
    <div className="min-w-0 rounded-lg border border-brand-navy/10 bg-white/90 p-1.5 sm:p-2">
      <div
        className={cn(
          "mb-2 flex items-center justify-between rounded-md border px-1.5 py-1.5 sm:px-2",
          head,
        )}
      >
        <span className="truncate text-[9px] font-bold uppercase tracking-wide sm:text-[11px]">
          {title}
        </span>
        <span className="text-[10px] font-bold tabular-nums">{count}</span>
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        {cards.map((card) => (
          <article
            key={card.ro}
            className="rounded-md border border-slate-200/90 bg-white p-1.5 shadow-sm sm:p-2"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[9px] font-bold tabular-nums text-brand-navy sm:text-[10px]">
                {card.ro}
              </span>
              <Tag tone={card.tagTone}>{card.tag}</Tag>
            </div>
            <p className="mt-1 truncate text-[10px] font-semibold text-slate-800 sm:text-[11px]">
              {card.vehicle}
            </p>
            <p className="truncate text-[9px] text-slate-500 sm:text-[10px]">
              {card.job}
            </p>
            <p className="mt-1 text-[11px] font-bold tabular-nums text-brand-navy sm:text-xs">
              {card.amount}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Tag({ tone, children }: { tone: CardTone; children: string }) {
  const styles: Record<CardTone, string> = {
    navy: "bg-brand-navy/10 text-brand-navy",
    light: "bg-brand-light/35 text-brand-navy",
    amber: "bg-amber-100 text-amber-900",
    green: "bg-emerald-50 text-emerald-800",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold sm:text-[9px]",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}
