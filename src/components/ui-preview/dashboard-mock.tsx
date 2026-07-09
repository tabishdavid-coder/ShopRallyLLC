"use client";

import {
  ArrowUpRight,
  Car,
  CircleDollarSign,
  Clock,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Send,
  User,
  Wrench,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIPELINE = [
  {
    stage: "Estimate",
    count: 4,
    dollars: 3200,
    bar: "bg-brand-light",
    text: "text-brand-navy",
  },
  {
    stage: "Awaiting auth",
    count: 3,
    dollars: 4800,
    bar: "bg-amber-400",
    text: "text-amber-800",
  },
  {
    stage: "In progress",
    count: 6,
    dollars: 11200,
    bar: "bg-brand-navy",
    text: "text-brand-navy",
  },
  {
    stage: "Ready",
    count: 2,
    dollars: 1900,
    bar: "bg-emerald-500",
    text: "text-emerald-800",
  },
  {
    stage: "Payment",
    count: 5,
    dollars: 6400,
    bar: "bg-brand-red",
    text: "text-brand-red",
  },
];

const ACTIVE_JOBS = [
  {
    ro: "1042",
    vehicle: "2019 Ford F-150 XLT",
    plate: "TX · 7KM4821",
    customer: "Mike Johnson",
    phone: "(512) 555-0142",
    concern: "Brake noise and steering wheel vibration above 55 mph",
    tech: "JR",
    techName: "Jordan Reed",
    status: "Awaiting authorization",
    statusClass: "bg-amber-100 text-amber-900 ring-amber-200",
    amount: 1840,
    age: "2h waiting",
    urgent: true,
  },
  {
    ro: "1038",
    vehicle: "2021 Toyota Camry SE",
    plate: "TX · 4PL9012",
    customer: "Elena Martinez",
    phone: "(512) 555-0198",
    concern: "Multi-point inspection + rear brake measurement",
    tech: "AL",
    techName: "Alex Rivera",
    status: "Inspection in progress",
    statusClass: "bg-brand-light/50 text-brand-navy ring-brand-light",
    amount: 0,
    age: "45m in bay",
    urgent: false,
  },
  {
    ro: "1035",
    vehicle: "2017 Chevy Silverado 1500",
    plate: "TX · 2WX7734",
    customer: "Chris Reed",
    phone: "(512) 555-0167",
    concern: "Oil change + tire rotation — customer waiting",
    tech: "SO",
    techName: "Sam Ortiz",
    status: "Ready for pickup",
    statusClass: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    amount: 920,
    age: "Pickup 9:00 AM",
    urgent: false,
  },
  {
    ro: "1031",
    vehicle: "2020 Honda Civic Sport",
    plate: "TX · 9HT2210",
    customer: "Lan Nguyen",
    phone: "(512) 555-0133",
    concern: "A/C not cooling — compressor diagnosed",
    tech: "JR",
    techName: "Jordan Reed",
    status: "Payment overdue",
    statusClass: "bg-brand-red/10 text-brand-red ring-brand-red/20",
    amount: 640,
    age: "3 days AR",
    urgent: true,
  },
];

const APPOINTMENTS = [
  { time: "9:00", label: "AM", service: "Oil change", who: "Williams · 2022 Accord" },
  { time: "10:30", label: "AM", service: "Brake inspection", who: "Chen · 2019 Tacoma" },
  { time: "1:00", label: "PM", service: "Check engine diag", who: "Brooks · 2015 Jetta" },
  { time: "3:30", label: "PM", service: "Tire rotation", who: "Garcia · 2020 Explorer" },
];

const TECH_LOAD = [
  { initials: "JR", name: "Jordan", hours: "6.2 / 8h", load: 78 },
  { initials: "AL", name: "Alex", hours: "4.5 / 8h", load: 56 },
  { initials: "SO", name: "Sam", hours: "7.1 / 8h", load: 89 },
];

function formatMoney(dollars: number) {
  if (dollars <= 0) return "—";
  return `$${dollars.toLocaleString()}`;
}

export function DashboardMock() {
  const totalPipeline = PIPELINE.reduce((s, p) => s + p.dollars, 0);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Inline briefing — not a gradient hero */}
      <div className="flex flex-col gap-4 rounded-xl border border-brand-light/40 bg-white p-4 md:flex-row md:items-end md:justify-between md:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/70">
            Good morning
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">
            Westside Auto
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            6 vehicles in shop · 4 appointments today · 3 jobs need your
            attention before noon.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 md:gap-8">
          {[
            { label: "Cars in shop", value: "6", icon: Car },
            { label: "Gross volume", value: "$27.5k", icon: CircleDollarSign },
            { label: "Open ROs", value: "15", icon: Wrench },
            { label: "ARO", value: "$412", icon: ArrowUpRight },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-[88px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-brand-navy">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline strip — brand color accents */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-navy">Shop pipeline</h2>
          <span className="text-xs text-muted-foreground">
            ${totalPipeline.toLocaleString()} on the board
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((col) => (
            <button
              key={col.stage}
              type="button"
              className="group rounded-xl border border-brand-light/35 bg-white p-3 text-left transition-colors hover:border-brand-light hover:bg-brand-light/5"
            >
              <div className={cn("mb-3 h-1 w-full rounded-full", col.bar)} />
              <p className={cn("text-xs font-semibold uppercase tracking-wide", col.text)}>
                {col.stage}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-brand-navy">
                {col.count}
              </p>
              <p className="text-xs text-muted-foreground">
                ${col.dollars.toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* Active jobs — card grid, not plain table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-navy">
              Needs attention
            </h2>
            <Badge
              variant="outline"
              className="border-brand-red/30 bg-brand-red/5 text-brand-red"
            >
              3 urgent
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {ACTIVE_JOBS.map((job) => (
              <article
                key={job.ro}
                className={cn(
                  "rounded-xl border bg-white p-4 transition-colors hover:border-brand-light",
                  job.urgent
                    ? "border-brand-red/25 ring-1 ring-brand-red/10"
                    : "border-brand-light/35",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-navy">
                        RO-{job.ro}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          job.statusClass,
                        )}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-brand-navy">
                      {job.vehicle}
                    </p>
                    <p className="text-xs text-muted-foreground">{job.plate}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {job.concern}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="size-3.5 shrink-0" />
                  <span>{job.customer}</span>
                  <span className="text-brand-light">·</span>
                  <Phone className="size-3.5 shrink-0" />
                  <span>{job.phone}</span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-brand-light/30 pt-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7 border border-brand-light/50">
                      <AvatarFallback className="bg-brand-light/30 text-[10px] font-bold text-brand-navy">
                        {job.tech}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium text-brand-navy">
                        {job.techName}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        {job.age}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-brand-navy">
                    {formatMoney(job.amount)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {job.status.includes("authorization") ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 bg-brand-navy text-xs hover:bg-brand-navy/90"
                    >
                      <Send className="size-3" />
                      Send auth
                    </Button>
                  ) : null}
                  {job.status.includes("Payment") ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 bg-brand-red text-xs hover:bg-brand-red/90"
                    >
                      Collect payment
                    </Button>
                  ) : null}
                  {job.status.includes("Ready") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-brand-navy/30 text-xs text-brand-navy"
                    >
                      <MessageSquare className="size-3" />
                      Notify customer
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Open workflow
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-brand-light/35 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-brand-navy">
                Today&apos;s schedule
              </h3>
              <Badge variant="secondary" className="bg-brand-light/30 text-brand-navy">
                4
              </Badge>
            </div>
            <ol className="mt-4 space-y-0">
              {APPOINTMENTS.map((appt, i) => (
                <li key={appt.time + appt.service} className="relative flex gap-3 pb-4">
                  {i < APPOINTMENTS.length - 1 ? (
                    <span
                      className="absolute left-[18px] top-8 h-[calc(100%-12px)] w-px bg-brand-light/50"
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-light/25 text-brand-navy">
                    <span className="text-[10px] font-bold leading-none">{appt.time}</span>
                    <span className="text-[8px] font-medium uppercase opacity-70">
                      {appt.label}
                    </span>
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-brand-navy">{appt.service}</p>
                    <p className="text-xs text-muted-foreground">{appt.who}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-brand-light/35 bg-white p-4">
            <h3 className="text-sm font-semibold text-brand-navy">Team load</h3>
            <ul className="mt-3 space-y-3">
              {TECH_LOAD.map((tech) => (
                <li key={tech.initials}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-brand-navy text-[9px] text-white">
                          {tech.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-brand-navy">{tech.name}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">{tech.hours}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-light/25">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        tech.load >= 85 ? "bg-brand-red" : "bg-brand-navy",
                      )}
                      style={{ width: `${tech.load}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-brand-red/25 bg-brand-red/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
              Accounts receivable
            </p>
            <p className="mt-1 text-lg font-bold text-brand-navy">$2,840</p>
            <p className="mt-1 text-xs text-muted-foreground">
              4 open invoices · 2 overdue 3+ days
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 h-7 w-full border-brand-red/30 text-xs text-brand-red hover:bg-brand-red/10"
            >
              Review AR queue
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
