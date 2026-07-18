"use client";

import { cn } from "@/lib/utils";

type ConceptId =
  | "current"
  | "inbox"
  | "bento"
  | "timeline"
  | "crm"
  | "hybrid";

export type ConceptMeta = {
  id: ConceptId;
  name: string;
  tagline: string;
  reference: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
};

export const CONCEPTS: ConceptMeta[] = [
  {
    id: "current",
    name: "Current preview",
    tagline: "What you have today — classic shop SMS layout",
    reference: "Legacy grouped sidebar · shop SMS",
    pros: ["Familiar to shop staff", "Full KPIs on landing", "Proven 3-column board"],
    cons: [
      "Gradient hero feels generic",
      "Dark sidebar + red active reads dated",
      "Too much reporting on the work screen",
    ],
  },
  {
    id: "inbox",
    name: "Operations inbox",
    tagline: "Action queue first, board second",
    reference: "HubSpot · Intercom · Freshdesk",
    pros: [
      "Surfaces what needs action today",
      "Less chart clutter on landing",
      "Natural fit for Messages module",
    ],
    cons: ["Queue can get long on busy days", "Metrics less visible at a glance"],
  },
  {
    id: "bento",
    name: "Bento command center",
    tagline: "Calm SaaS metrics, board dominates",
    reference: "Stripe · Linear · Attio",
    pros: [
      "Modern, distinct identity",
      "No gradient banner",
      "Board gets maximum space",
    ],
    cons: ["Less familiar to legacy SMS users", "Charts pushed to full dashboard"],
  },
  {
    id: "timeline",
    name: "Day timeline",
    tagline: "Time-based shop day, not status reports",
    reference: "Monday.com · Calendly",
    pros: [
      "Matches how bays run hour-by-hour",
      "Appointments + pickups visible",
      "Strong multi-bay differentiation",
    ],
    cons: ["Harder on slow days", "Needs good appointment data"],
  },
  {
    id: "crm",
    name: "Customer-centric CRM",
    tagline: "People and conversations, not RO numbers",
    reference: "HubSpot deals · Pipedrive · Attio",
    pros: [
      "Highlights customer relationships",
      "SMS / follow-up front and center",
      "Feels like a CRM, not just a RO tool",
    ],
    cons: ["RO# less prominent", "Activity feed adds complexity"],
  },
  {
    id: "hybrid",
    name: "Hybrid (recommended)",
    tagline: "Inbox queue + bento stats + full job board",
    reference: "Stripe + HubSpot blend",
    pros: [
      "Keeps your approved flow",
      "Distinct ShopRally visual identity",
      "Action + metrics + work in balance",
    ],
    cons: ["Slightly denser top section", "Needs careful spacing on mobile"],
    recommended: true,
  },
];

function MiniSidebar({
  variant,
  active = "board",
}: {
  variant: "dark" | "light" | "rail";
  active?: "board" | "dash";
}) {
  if (variant === "rail") {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-3">
        {["D", "B", "M", "T"].map((l, i) => (
          <div
            key={l}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-[10px] font-bold",
              i === 1 ? "bg-brand-navy text-white" : "text-muted-foreground",
            )}
          >
            {l}
          </div>
        ))}
      </div>
    );
  }

  const dark = variant === "dark";
  return (
    <div
      className={cn(
        "flex w-[108px] shrink-0 flex-col gap-1 border-r py-2 pl-1.5 pr-1 text-[9px]",
        dark ? "border-sidebar-border bg-brand-navy text-white" : "border-border bg-card text-foreground",
      )}
    >
      <div className={cn("px-1.5 pb-2 font-bold", dark ? "text-white" : "text-brand-navy")}>
        Kar<span className="text-brand-light">vio</span>
      </div>
      {[
        { label: "Dashboard", key: "dash" as const },
        { label: "Job Board", key: "board" as const },
        { label: "Messages", key: "board" as const },
        { label: "Customers", key: "board" as const },
      ].map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded px-1.5 py-1",
            item.key === active &&
              (dark
                ? "bg-brand-red font-semibold text-white"
                : "border-l-2 border-brand-red bg-brand-light/20 font-semibold text-brand-navy"),
            item.key !== active && dark && "text-white/70",
          )}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

function MiniTopBar({ title, variant }: { title: string; variant: "default" | "minimal" }) {
  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center justify-between border-b px-2 text-[9px]",
        variant === "minimal" ? "border-border bg-background" : "border-border bg-card",
      )}
    >
      <span className="font-semibold text-brand-navy">{title}</span>
      <div className="flex gap-1.5 text-muted-foreground">
        <span>Support</span>
        <span className="relative">
          Msg
          <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-brand-red" />
        </span>
      </div>
    </div>
  );
}

function MiniRoCard({
  customer,
  vehicle,
  status,
  amount,
  accent,
}: {
  customer: string;
  vehicle: string;
  status: string;
  amount: string;
  accent?: "customer" | "balance";
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-1.5 text-[8px] leading-tight shadow-sm",
        accent === "customer" && "border-l-2 border-l-brand-navy",
        accent === "balance" && "border-brand-red/40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="rounded bg-muted px-1 py-0.5 text-[7px] font-medium">{status}</span>
        <span className="font-mono text-[7px] text-muted-foreground">{amount}</span>
      </div>
      <p className="mt-1 font-semibold text-foreground">{customer}</p>
      <p className="text-muted-foreground">{vehicle}</p>
    </div>
  );
}

function MiniKanban({ customerFirst = false }: { customerFirst?: boolean }) {
  const cols = [
    {
      title: "Estimates (12)",
      total: "$12,435",
      cards: [
        { c: "Maria Lopez", v: "2019 Nissan Sentra", s: "Not started", a: "$1,240" },
        { c: "James Chen", v: "2014 Honda Accord", s: "Approval sent", a: "$890" },
      ],
    },
    {
      title: "WIP (5)",
      total: "$6,855",
      cards: [
        { c: "Mike Torres", v: "2019 Toyota Camry", s: "In progress", a: "$2,100" },
        { c: "Sarah Kim", v: "2023 Toyota Camry", s: "In progress", a: "$1,450" },
      ],
    },
    {
      title: "Completed (7)",
      total: "$9,461",
      cards: [
        { c: "Dan Walsh", v: "2015 Ford F-150", s: "Completed", a: "$980" },
        { c: "Lisa Park", v: "2017 Jeep Cherokee", s: "Balance due", a: "$420" },
      ],
    },
  ];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 overflow-hidden p-1.5">
      {cols.map((col) => (
        <div key={col.title} className="flex min-h-0 flex-col rounded-md bg-muted/40 p-1">
          <div className="mb-1 flex items-baseline justify-between px-0.5">
            <span className="text-[8px] font-bold uppercase tracking-wide text-brand-navy">
              {col.title}
            </span>
            <span className="text-[7px] text-muted-foreground">{col.total}</span>
          </div>
          <div className="space-y-1 overflow-hidden">
            {col.cards.map((card) => (
              <MiniRoCard
                key={card.c + card.v}
                customer={customerFirst ? card.c : `RO · ${card.c.split(" ")[0]}`}
                vehicle={customerFirst ? card.v : card.v}
                status={card.s}
                amount={card.a}
                accent={card.s === "Balance due" ? "balance" : customerFirst ? "customer" : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockFrame({
  label,
  recommended,
  children,
}: {
  label: string;
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-md">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="size-2 rounded-full bg-brand-red/80" />
            <span className="size-2 rounded-full bg-amber-400" />
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        {recommended ? (
          <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-semibold text-white">
            Recommended
          </span>
        ) : null}
      </div>
      <div className="aspect-[16/10] min-h-[320px] overflow-hidden">{children}</div>
    </div>
  );
}

function CurrentMock() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <MiniSidebar variant="dark" active="board" />
        <div className="flex min-w-0 flex-1 flex-col">
          <MiniTopBar title="Job Board" variant="default" />
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-1.5">
            <div className="rounded-lg bg-gradient-to-r from-brand-navy to-brand-red p-2 text-[8px] text-white">
              <p className="font-bold">In & Out AutoHaus Garage</p>
              <p className="opacity-80">30 days · 5 in shop · 17 open ROs</p>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {["5 cars", "$134 vol", "17 ROs", "2 appts"].map((k) => (
                <div key={k} className="rounded border bg-card p-1 text-[7px] font-semibold">
                  {k}
                </div>
              ))}
            </div>
            <div className="min-h-0 flex-1 rounded-lg border bg-[oklch(0.965_0.014_247)] p-1">
              <MiniKanban />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxMock() {
  return (
    <div className="flex h-full">
      <MiniSidebar variant="light" active="board" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MiniTopBar title="Job Board" variant="minimal" />
        <div className="grid min-h-0 flex-1 grid-cols-[140px_1fr] gap-1.5 p-1.5">
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="rounded-md border border-brand-red/30 bg-brand-red/5 p-1.5">
              <p className="text-[8px] font-bold text-brand-red">Needs you · 4</p>
              {["Approval pending · RO#1024", "Balance due · Walsh", "Unread SMS · Kim", "Appt 2pm · Chen"].map(
                (item) => (
                  <p key={item} className="mt-1 truncate rounded bg-card px-1 py-0.5 text-[7px]">
                    {item}
                  </p>
                ),
              )}
            </div>
            <div className="rounded-md border bg-card p-1.5 text-[7px]">
              <p className="font-semibold">Today</p>
              <p className="text-muted-foreground">$134 collected</p>
              <p className="text-muted-foreground">5 in shop</p>
            </div>
          </div>
          <div className="min-h-0 rounded-lg border bg-muted/30 p-1">
            <MiniKanban />
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoMock() {
  return (
    <div className="flex h-full">
      <MiniSidebar variant="rail" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MiniTopBar title="Job Board" variant="minimal" />
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5">
          <div className="grid grid-cols-4 gap-1">
            <div className="col-span-1 rounded-lg border bg-card p-2">
              <p className="text-[7px] text-muted-foreground">In shop</p>
              <p className="text-lg font-bold text-brand-navy">5</p>
            </div>
            <div className="col-span-1 rounded-lg border bg-card p-2">
              <p className="text-[7px] text-muted-foreground">Today $</p>
              <p className="text-lg font-bold text-emerald-600">$134</p>
            </div>
            <div className="col-span-1 rounded-lg border bg-card p-2">
              <p className="text-[7px] text-muted-foreground">Open ROs</p>
              <p className="text-lg font-bold text-brand-navy">17</p>
            </div>
            <div className="col-span-1 rounded-lg border border-dashed border-brand-light bg-brand-light/10 p-2">
              <p className="text-[7px] text-muted-foreground">Full dashboard</p>
              <p className="text-[8px] font-medium text-brand-navy">View charts →</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 rounded-lg border-0 bg-background p-0">
            <MiniKanban />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineMock() {
  const blocks = [
    { time: "9:00", label: "Drop-off · Camry", tone: "bg-brand-light/30" },
    { time: "11:30", label: "Estimate · Sentra", tone: "bg-amber-100" },
    { time: "2:00", label: "Pickup · F-150", tone: "bg-emerald-100" },
    { time: "4:30", label: "Appt · Cherokee", tone: "bg-brand-light/30" },
  ];
  return (
    <div className="flex h-full">
      <MiniSidebar variant="light" active="board" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MiniTopBar title="Today · Wed Jul 1" variant="minimal" />
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5">
          <div className="grid grid-cols-4 gap-1">
            {blocks.map((b) => (
              <div key={b.time} className={cn("rounded-md border p-1.5 text-[7px]", b.tone)}>
                <p className="font-bold text-brand-navy">{b.time}</p>
                <p className="truncate">{b.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[7px] text-muted-foreground">
            <span className="rounded-full bg-brand-navy px-1.5 py-0.5 text-white">Today filter</span>
            <span>Tech: All</span>
          </div>
          <div className="min-h-0 flex-1 rounded-lg border bg-muted/20 p-1">
            <MiniKanban />
          </div>
        </div>
      </div>
    </div>
  );
}

function CrmMock() {
  return (
    <div className="flex h-full">
      <MiniSidebar variant="light" active="board" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MiniTopBar title="Job Board" variant="minimal" />
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_120px] gap-1.5 p-1.5">
          <div className="flex min-h-0 flex-col gap-1">
            <div className="rounded-md border bg-card p-1 text-[7px]">
              <span className="font-semibold">Recent touchpoints</span>
              <span className="ml-1 text-muted-foreground">· 2 unread SMS</span>
            </div>
            <div className="min-h-0 flex-1 rounded-lg border bg-muted/20 p-1">
              <MiniKanban customerFirst />
            </div>
          </div>
          <div className="space-y-1 overflow-hidden rounded-md border bg-card p-1 text-[7px]">
            <p className="font-bold text-brand-navy">Activity</p>
            {["SMS sent · Lopez", "Approval · Chen", "Payment · Walsh", "Appt booked · Park"].map(
              (a) => (
                <p key={a} className="border-l-2 border-brand-light pl-1 text-muted-foreground">
                  {a}
                </p>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HybridMock() {
  return (
    <div className="flex h-full">
      <MiniSidebar variant="light" active="board" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MiniTopBar title="Job Board" variant="minimal" />
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5">
          <div className="flex items-center justify-between rounded-md border bg-card px-2 py-1 text-[8px]">
            <span className="font-semibold text-brand-navy">In & Out AutoHaus · Wed Jul 1</span>
            <span className="text-muted-foreground">New Repair Order</span>
          </div>
          <div className="grid grid-cols-[1fr_1.2fr] gap-1.5">
            <div className="rounded-md border border-brand-red/20 bg-brand-red/5 p-1.5">
              <p className="text-[8px] font-bold text-brand-red">Needs attention · 3</p>
              {["Approval · RO#1024", "Balance due · Walsh", "SMS reply · Kim"].map((x) => (
                <p key={x} className="mt-0.5 truncate text-[7px]">
                  {x}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { l: "In shop", v: "5" },
                { l: "Today", v: "$134" },
                { l: "Open", v: "17" },
              ].map((s) => (
                <div key={s.l} className="rounded-md border bg-card p-1 text-center">
                  <p className="text-[7px] text-muted-foreground">{s.l}</p>
                  <p className="text-sm font-bold text-brand-navy">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 rounded-lg border bg-[oklch(0.97_0.008_247)] p-1">
            <MiniKanban customerFirst />
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCK_MAP: Record<ConceptId, () => React.ReactNode> = {
  current: CurrentMock,
  inbox: InboxMock,
  bento: BentoMock,
  timeline: TimelineMock,
  crm: CrmMock,
  hybrid: HybridMock,
};

export function ConceptVisual({ id }: { id: ConceptId }) {
  const Mock = MOCK_MAP[id];
  const meta = CONCEPTS.find((c) => c.id === id)!;
  return (
    <MockFrame label={meta.name} recommended={meta.recommended}>
      <Mock />
    </MockFrame>
  );
}

export function ConceptGalleryGrid({
  selected,
  onSelect,
}: {
  selected: ConceptId;
  onSelect: (id: ConceptId) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {CONCEPTS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            "text-left transition-all",
            selected === c.id ? "ring-2 ring-brand-navy ring-offset-2 rounded-xl" : "opacity-90 hover:opacity-100",
          )}
        >
          <ConceptVisual id={c.id} />
        </button>
      ))}
    </div>
  );
}
