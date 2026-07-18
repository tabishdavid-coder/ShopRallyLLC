"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Tag,
  User,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MockCard = {
  id: string;
  ro: number;
  status: string;
  statusClass: string;
  customer: string;
  vehicle: string;
  amount: number;
  age: string;
  tech?: string;
  flags?: ("auth-sent" | "customer-approved" | "balance-due" | "inspection" | "waiting")[];
  urgent?: boolean;
};

/** Matches repairpilot job-board columns: Estimates · WIP · Completed */
const BOARD: {
  id: "estimates" | "wip" | "completed";
  title: string;
  bar: string;
  cards: MockCard[];
}[] = [
  {
    id: "estimates",
    title: "Estimates",
    bar: "bg-brand-light",
    cards: [
      {
        id: "e1",
        ro: 1044,
        status: "Estimate",
        statusClass: "bg-brand-light/40 text-brand-navy",
        customer: "Dana Brooks · 2015 VW Jetta",
        vehicle: "TX · 3KL9012",
        amount: 0,
        age: "20m ago",
        flags: ["inspection"],
      },
      {
        id: "a1",
        ro: 1042,
        status: "Pending approval",
        statusClass: "bg-amber-100 text-amber-900",
        customer: "Mike Johnson · 2019 Ford F-150",
        vehicle: "TX · 7KM4821",
        amount: 1840,
        age: "2h waiting",
        tech: "JR",
        flags: ["auth-sent"],
        urgent: true,
      },
      {
        id: "a2",
        ro: 1040,
        status: "Pending approval",
        statusClass: "bg-amber-100 text-amber-900",
        customer: "Priya Patel · 2018 Toyota RAV4",
        vehicle: "TX · 5MN2201",
        amount: 2960,
        age: "Yesterday",
        flags: ["auth-sent"],
      },
    ],
  },
  {
    id: "wip",
    title: "WIP",
    bar: "bg-brand-navy",
    cards: [
      {
        id: "w1",
        ro: 1038,
        status: "In progress",
        statusClass: "bg-brand-navy/10 text-brand-navy",
        customer: "Elena Martinez · 2021 Camry",
        vehicle: "TX · 4PL9012",
        amount: 0,
        age: "45m in bay",
        tech: "AL",
        flags: ["inspection", "waiting"],
      },
      {
        id: "w2",
        ro: 1036,
        status: "In progress",
        statusClass: "bg-brand-navy/10 text-brand-navy",
        customer: "Chris Reed · 2017 Silverado",
        vehicle: "TX · 2WX7734",
        amount: 920,
        age: "3h in bay",
        tech: "SO",
        flags: ["customer-approved"],
      },
      {
        id: "w3",
        ro: 1034,
        status: "In progress",
        statusClass: "bg-brand-navy/10 text-brand-navy",
        customer: "Lan Nguyen · 2020 Civic",
        vehicle: "TX · 9HT2210",
        amount: 640,
        age: "5h in bay",
        tech: "JR",
      },
    ],
  },
  {
    id: "completed",
    title: "Completed",
    bar: "bg-emerald-500",
    cards: [
      {
        id: "r1",
        ro: 1035,
        status: "Ready for pickup",
        statusClass: "bg-emerald-100 text-emerald-900",
        customer: "Chris Reed · 2017 Silverado",
        vehicle: "TX · 2WX7734",
        amount: 920,
        age: "Pickup 9:00 AM",
        tech: "SO",
        flags: ["customer-approved"],
      },
      {
        id: "p1",
        ro: 1031,
        status: "Invoiced",
        statusClass: "bg-brand-red/10 text-brand-red",
        customer: "Lan Nguyen · 2020 Civic",
        vehicle: "TX · 9HT2210",
        amount: 640,
        age: "3d AR",
        flags: ["balance-due"],
        urgent: true,
      },
    ],
  },
];

function MockJobCard({
  card,
  selected,
  onSelect,
}: {
  card: MockCard;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card.id)}
      className={cn(
        "w-full rounded-lg border bg-white p-3 text-left transition-all hover:border-brand-navy/35",
        selected && "ring-2 ring-brand-navy ring-offset-1",
        card.urgent && !selected && "border-brand-red/30",
        !selected && !card.urgent && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            card.statusClass,
          )}
        >
          {card.status}
        </span>
        <div className="text-right text-[10px]">
          <p className="font-bold text-brand-navy">RO#{card.ro}</p>
          <p className="text-muted-foreground">{card.age}</p>
        </div>
      </div>
      {card.flags?.includes("auth-sent") ? (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
          <Send className="size-3" /> Approval sent
        </p>
      ) : null}
      {card.flags?.includes("customer-approved") ? (
        <p className="mt-1.5 text-[10px] font-medium text-emerald-700">
          Customer approved
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <User className="size-3.5 shrink-0 text-brand-navy/60" />
        <span className="truncate font-medium">{card.customer}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.vehicle}</p>
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1.5">
          {card.tech ? (
            <Avatar className="size-5">
              <AvatarFallback className="bg-brand-light/30 text-[8px] font-bold text-brand-navy">
                {card.tech}
              </AvatarFallback>
            </Avatar>
          ) : null}
          {card.flags?.includes("inspection") ? (
            <ClipboardCheck className="size-3.5 text-emerald-600" />
          ) : null}
          {card.flags?.includes("balance-due") ? (
            <Badge
              variant="outline"
              className="h-4 border-brand-red/30 px-1 text-[9px] text-brand-red"
            >
              Balance due
            </Badge>
          ) : null}
        </div>
        <span className="text-xs font-bold tabular-nums text-brand-navy">
          {card.amount > 0 ? `$${card.amount.toLocaleString()}` : "—"}
        </span>
      </div>
    </button>
  );
}

function SelectedRoPanel({ card }: { card: MockCard | null }) {
  if (!card) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-brand-light/50 bg-white/60 p-6 text-center text-sm text-muted-foreground">
        Select a repair order to preview estimate detail below the board.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-light/40 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-light/30 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">RO#{card.ro}</p>
          <p className="text-sm font-semibold text-brand-navy">{card.customer}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" className="h-7 bg-brand-navy text-xs">
            Open RO
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
            Send auth
          </Button>
        </div>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-brand-navy">Estimate lines</p>
          {["Brake pads — front", "Rotor resurface", "Brake fluid flush"].map((line) => (
            <div key={line} className="flex justify-between text-muted-foreground">
              <span>{line}</span>
              <span>—</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <Wrench className="mr-1 inline size-3.5" />
            Tech: {card.tech ?? "Unassigned"}
          </p>
          <p>
            <FileText className="mr-1 inline size-3.5" />
            Matches repairpilot JobCard + estimate workflow
          </p>
        </div>
      </div>
    </div>
  );
}

/** Job board landing — same module/columns as repairpilot /job-board. */
export function JobBoardLandingMock() {
  const [selectedId, setSelectedId] = useState("a1");
  const [split, setSplit] = useState(true);

  const allCards = BOARD.flatMap((col) => col.cards);
  const selected = allCards.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 workspace-surface">
      {/* Toolbar — mirrors job-board-toolbar.tsx */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56 sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search job board…" className="border-brand-light/40 bg-white pl-8" />
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" title="Print RO hang-tag label">
          <Tag className="size-4" /> RO Label
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <User className="size-4" /> Employee
          <ChevronDown className="size-4 opacity-60" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <CalendarClock className="size-4" /> Appt Type
          <ChevronDown className="size-4 opacity-60" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
            Active <ChevronDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSplit((s) => !s)}
          >
            <SlidersHorizontal className="size-4" />
            {split ? "Hide detail" : "Show detail"}
          </Button>
          <Button asChild size="sm" className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/repair-orders/new">
              <Plus className="size-4" /> New Repair Order
            </Link>
          </Button>
        </div>
      </div>

      {/* 3-column kanban — repairpilot JobBoardDnd */}
      <div className={cn("grid min-h-0 flex-1 gap-4", split ? "grid-rows-[1fr_auto]" : "grid-rows-1")}>
        <div className="grid min-h-[420px] gap-4 lg:grid-cols-3">
          {BOARD.map((col) => {
            const total = col.cards.reduce((s, c) => s + c.amount, 0);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-lg border border-brand-light/35 bg-white/80"
              >
                <div className="border-b border-brand-light/30 px-3 py-2.5">
                  <div className={cn("mb-2 h-1 w-full rounded-full", col.bar)} />
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-brand-navy">{col.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {col.cards.length}
                      {total > 0 ? ` · $${total.toLocaleString()}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {col.cards.map((card) => (
                    <MockJobCard
                      key={card.id}
                      card={card}
                      selected={card.id === selectedId}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {split ? <SelectedRoPanel card={selected} /> : null}
      </div>
    </div>
  );
}
