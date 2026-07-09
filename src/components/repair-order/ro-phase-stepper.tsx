"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { apStepperStepClass } from "@/lib/autopilot3030/nav-active";
import { resolveRoPhases, roPhaseSegmentForStepper } from "@/lib/ro-phases";
import { cn } from "@/lib/utils";

import type { RoTabBadges } from "@/lib/ro-phases";

function PhaseBadge({ value }: { value: string | number }) {
  return (
    <span className="ro-phase-badge ml-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums">
      {value}
    </span>
  );
}

/** Clickable RO phase stepper — ShopRally on 3004, Autopilot labels on 3030. */
export function RoPhaseStepper({
  basePath,
  badges = {},
  allowedSegments,
  embedded = false,
  className,
  trailing,
}: {
  basePath: string;
  badges?: RoTabBadges;
  /** When set, only these tab segments render (server-computed from permissions). */
  allowedSegments?: readonly string[];
  embedded?: boolean;
  className?: string;
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const apShell = isAutopilot3030Shell();
  const phases = resolveRoPhases();

  const rawSegment =
    pathname === basePath
      ? ""
      : pathname.startsWith(`${basePath}/`)
        ? (pathname.slice(basePath.length + 1).split("/")[0] ?? "")
        : "";
  const currentSegment = roPhaseSegmentForStepper(rawSegment);

  const phaseIndex = phases.findIndex((p) => p.href === currentSegment);

  function phaseVisible(href: string): boolean {
    if (!allowedSegments) return true;
    return allowedSegments.includes(href);
  }

  const visiblePhases = phases.filter((p) => phaseVisible(p.href));
  if (visiblePhases.length === 0) return null;

  return (
    <nav
      className={cn(
        "ro-phase-stepper",
        embedded && "ro-phase-stepper--embedded",
        apShell && "ro-phase-stepper--ap",
        className,
      )}
      aria-label="Repair order phases"
    >
      {visiblePhases.map((phase) => {
        const index = phases.indexOf(phase);
        const href = phase.href ? `${basePath}/${phase.href}` : basePath;
        const active = phase.href === currentSegment;
        const complete = phaseIndex > index;
        const state = active ? "active" : complete ? "complete" : "upcoming";
        const badge = phase.badgeKey ? badges[phase.badgeKey] : undefined;
        const Icon = phase.icon;

        if (apShell) {
          return (
            <Link
              key={phase.href || "overview"}
              href={href}
              aria-current={active ? "step" : undefined}
              className={apStepperStepClass(state)}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  state === "active" && "ap-bg-accent text-white",
                  state === "complete" &&
                    "ap-accent-secondary-soft",
                  state === "upcoming" && "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <Icon className="size-3.5 shrink-0 md:hidden" aria-hidden />
              <span className="hidden sm:inline">{phase.title}</span>
            </Link>
          );
        }

        return (
          <Link
            key={phase.href || "overview"}
            href={href}
            aria-current={active ? "step" : undefined}
            className={cn("ro-phase-step", `ro-phase-step--${state}`)}
          >
            <span className={cn("ro-phase-number", `ro-phase-number--${state}`)}>{index + 1}</span>
            <Icon className="ro-phase-icon size-3.5 shrink-0 sm:hidden" aria-hidden />
            <span className="hidden truncate sm:inline">{phase.title}</span>
            <span className="truncate sm:hidden">{phase.shortTitle}</span>
            {badge != null && badge !== "" ? <PhaseBadge value={badge} /> : null}
          </Link>
        );
      })}
      {trailing ? <div className="ro-phase-stepper-trailing ml-auto shrink-0">{trailing}</div> : null}
    </nav>
  );
}

/** Shell-level stepper for `/repair-orders/[id]/*` (3030 module subnav). */
export function RoPhaseStepperFromPath({ pathname }: { pathname: string }) {
  const match = pathname.match(/^\/repair-orders\/([^/]+)(?:\/([^/]+))?/);
  if (!match || match[1] === "new") return null;
  return <RoPhaseStepper basePath={`/repair-orders/${match[1]}`} />;
}
