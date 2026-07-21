"use client";

import type { CSSProperties } from "react";

import {
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  MessageSquare,
  Package,
  Receipt,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export const HERO_RO = {
  number: "#1046",
  customer: "Luis Hernandez",
  vehicle: "2020 Chevy Silverado",
  total: "$1,240.00",
} as const;

export type HeroLifecycleTone = "dark" | "light";

const STAGES: ReadonlyArray<{
  key: string;
  label: string;
  time: string;
  detail: string;
  Icon: LucideIcon;
  highlight?: boolean;
  complete?: boolean;
}> = [
  { key: "intake", label: "Intake", time: "9:02 AM", detail: "Walk-in + VIN", Icon: ClipboardList },
  { key: "estimate", label: "Estimate", time: "9:18 AM", detail: "Matrix pricing", Icon: FileSpreadsheet },
  { key: "approval", label: "Approval", time: "9:41 AM", detail: "Text link", Icon: MessageSquare },
  { key: "parts", label: "Parts", time: "10:06 AM", detail: "PartsTech", Icon: Package, highlight: true },
  { key: "bay", label: "Bay", time: "2:15 PM", detail: "Brakes + fluid", Icon: Wrench },
  { key: "invoice", label: "Invoice", time: "4:30 PM", detail: "Paid in full", Icon: Receipt, complete: true },
];

/** Sized for hero right rail — dial reads as the visual anchor on navy. */
const RING = {
  size: 480,
  cx: 240,
  cy: 240,
  outerR: 198,
  trackR: 152,
  nodeR: 152,
} as const;

const TONE_RING = {
  dark: {
    washStops: [
      { offset: "0%", color: "#81C4FF", opacity: 0.16 },
      { offset: "55%", color: "#16588E", opacity: 0.1 },
      { offset: "100%", color: "#ffffff", opacity: 0 },
    ] as const,
    outerRing: "rgba(129,196,255,0.28)",
    track: "rgba(255,255,255,0.16)",
    hubFill: "rgba(255,255,255,0.06)",
    hubStroke: "rgba(129,196,255,0.22)",
    spokeDefault: "rgba(255,255,255,0.16)",
    spokeHighlight: "rgba(129,196,255,0.5)",
    spokeComplete: "rgba(129,196,255,0.45)",
    tickDefault: "rgba(129,196,255,0.7)",
    tickComplete: "#81C4FF",
    arcGlowOpacity: 0.55,
  },
  light: {
    washStops: [
      { offset: "0%", color: "#81C4FF", opacity: 0.22 },
      { offset: "55%", color: "#16588E", opacity: 0.08 },
      { offset: "100%", color: "#ffffff", opacity: 0 },
    ] as const,
    outerRing: "rgba(22,88,142,0.2)",
    track: "rgba(22,88,142,0.14)",
    hubFill: "rgba(255,255,255,0.92)",
    hubStroke: "rgba(22,88,142,0.18)",
    spokeDefault: "rgba(22,88,142,0.14)",
    spokeHighlight: "rgba(22,88,142,0.35)",
    spokeComplete: "rgba(22,88,142,0.4)",
    tickDefault: "rgba(22,88,142,0.45)",
    tickComplete: "#16588E",
    arcGlowOpacity: 0.35,
  },
} as const;

function nodePosition(index: number, total: number, radius: number) {
  const angleDeg = (index / total) * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: RING.cx + radius * Math.cos(angleRad),
    y: RING.cy + radius * Math.sin(angleRad),
    angleDeg,
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngleDeg - startAngleDeg <= 180 ? 0 : 1;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

type HeroLifecycleRingProps = {
  className?: string;
  /** dark = on navy hero; light = on slate/white marketing sections */
  tone?: HeroLifecycleTone;
};

export function HeroLifecycleRing({ className, tone = "dark" }: HeroLifecycleRingProps) {
  const ring = TONE_RING[tone];
  const gradId = `sr-progress-grad-${tone}`;
  const washId = `sr-wash-${tone}`;
  const glowId = `sr-arc-glow-${tone}`;

  const stageCount = STAGES.length;
  const startAngle = -90;
  const endAngle = startAngle + 360 - 360 / stageCount / 2;
  const progressArc = describeArc(RING.cx, RING.cy, RING.trackR, startAngle, endAngle);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[min(100%,480px)] lg:max-w-[min(100%,520px)]",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        className="h-full w-full"
        aria-hidden
        role="presentation"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#81C4FF" />
            <stop offset="55%" stopColor="#81C4FF" />
            <stop
              offset="100%"
              stopColor={tone === "dark" ? "#ffffff" : "#16588E"}
              stopOpacity={tone === "dark" ? 0.92 : 0.85}
            />
          </linearGradient>
          <radialGradient id={washId} cx="50%" cy="42%" r="55%">
            {ring.washStops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </radialGradient>
          <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={RING.cx} cy={RING.cy} r={RING.outerR + 10} fill={`url(#${washId})`} />

        <circle
          cx={RING.cx}
          cy={RING.cy}
          r={RING.outerR}
          fill="none"
          stroke={ring.outerRing}
          strokeWidth="1.5"
          strokeDasharray="7 8"
        />

        <circle
          cx={RING.cx}
          cy={RING.cy}
          r={RING.trackR}
          fill="none"
          stroke={ring.track}
          strokeWidth="7"
        />

        <path
          d={progressArc}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
          opacity={ring.arcGlowOpacity}
        />
        <path
          d={progressArc}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
        />

        {STAGES.map((_, i) => {
          const { angleDeg } = nodePosition(i, stageCount, RING.trackR);
          const rad = (angleDeg * Math.PI) / 180;
          const inner = RING.trackR - 9;
          const outer = RING.trackR + 9;
          const isLast = i === stageCount - 1;
          return (
            <line
              key={`tick-${i}`}
              x1={RING.cx + inner * Math.cos(rad)}
              y1={RING.cy + inner * Math.sin(rad)}
              x2={RING.cx + outer * Math.cos(rad)}
              y2={RING.cy + outer * Math.sin(rad)}
              stroke={isLast ? ring.tickComplete : ring.tickDefault}
              strokeWidth="2"
              strokeLinecap="round"
              opacity={isLast ? 1 : 0.75}
            />
          );
        })}

        <circle cx={RING.cx} cy={RING.cy} r={74} fill={ring.hubFill} />
        <circle
          cx={RING.cx}
          cy={RING.cy}
          r={74}
          fill="none"
          stroke={ring.hubStroke}
          strokeWidth="1.25"
        />

        {STAGES.map((stage, i) => {
          const inner = nodePosition(i, stageCount, RING.trackR + 14);
          const outer = nodePosition(i, stageCount, RING.nodeR - 20);
          return (
            <line
              key={`spoke-${stage.key}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={
                stage.complete
                  ? ring.spokeComplete
                  : stage.highlight
                    ? ring.spokeHighlight
                    : ring.spokeDefault
              }
              strokeWidth="1.25"
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "flex w-[44%] min-w-[128px] max-w-[176px] flex-col items-center rounded-2xl border px-3 py-2.5 text-center sm:py-3",
            tone === "dark"
              ? "border-brand-light/25 bg-white/[0.1] shadow-lg shadow-black/25 backdrop-blur-md"
              : "border-brand-navy/15 bg-white shadow-md shadow-brand-navy/12",
          )}
        >
          <p
            className={cn(
              "text-[9px] font-bold uppercase tracking-[0.16em]",
              tone === "dark" ? "text-brand-light/90" : "text-brand-navy/70",
            )}
          >
            Same RO
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-bold leading-none tracking-tight sm:text-xl",
              tone === "dark" ? "text-white" : "text-brand-navy",
            )}
          >
            One afternoon
          </p>
          <div
            className={cn(
              "mt-2.5 w-full border-t pt-2.5",
              tone === "dark" ? "border-white/15" : "border-brand-navy/10",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-bold tabular-nums",
                tone === "dark" ? "text-brand-light" : "text-brand-navy",
              )}
            >
              {HERO_RO.number}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-[9px] font-semibold",
                tone === "dark" ? "text-white/85" : "text-brand-navy",
              )}
            >
              {HERO_RO.customer}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-[8px]",
                tone === "dark" ? "text-white/60" : "text-slate-600",
              )}
            >
              {HERO_RO.vehicle}
            </p>
          </div>
          <span
            className={cn(
              "mt-2.5 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide",
              tone === "dark"
                ? "border-brand-light/40 bg-brand-light/15 text-brand-light"
                : "border-brand-navy/25 bg-brand-navy/[0.07] text-brand-navy",
            )}
          >
            <CheckCircle2 className="size-2.5" aria-hidden />
            Paid
          </span>
        </div>
      </div>

      {STAGES.map((stage, i) => {
        const { x, y, angleDeg } = nodePosition(i, stageCount, RING.nodeR);
        const pctX = (x / RING.size) * 100;
        const pctY = (y / RING.size) * 100;
        const flipLabel =
          (angleDeg > -125 && angleDeg < -55) || (angleDeg > 55 && angleDeg < 125);

        return (
          <StageNode
            key={stage.key}
            stage={stage}
            tone={tone}
            style={{ left: `${pctX}%`, top: `${pctY}%` }}
            flipLabel={flipLabel}
          />
        );
      })}
    </div>
  );
}

type Stage = (typeof STAGES)[number];

function StageNode({
  stage,
  style,
  flipLabel,
  tone,
}: {
  stage: Stage;
  style: CSSProperties;
  flipLabel: boolean;
  tone: HeroLifecycleTone;
}) {
  const Icon = stage.Icon as LucideIcon;

  return (
    <div
      className="absolute z-[1] -translate-x-1/2 -translate-y-1/2"
      style={style}
    >
      <div
        className={cn(
          "flex flex-col items-center",
          flipLabel && "flex-col-reverse",
        )}
      >
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl sm:size-11",
            tone === "dark"
              ? stage.complete
                ? "border border-brand-light/55 bg-brand-light/25 text-white shadow-[0_0_20px_rgba(129,196,255,0.35)] backdrop-blur-sm"
                : stage.highlight
                  ? "border border-brand-light/60 bg-brand-light/25 text-white shadow-[0_0_24px_rgba(129,196,255,0.4)] backdrop-blur-sm"
                  : "border border-white/30 bg-white/[0.14] text-white shadow-md shadow-black/25 backdrop-blur-sm"
              : stage.complete
                ? "border border-brand-navy/30 bg-brand-navy text-white shadow-md shadow-brand-navy/20"
                : stage.highlight
                  ? "border border-brand-navy/35 bg-brand-light/35 text-brand-navy shadow-md shadow-brand-navy/15"
                  : "border border-brand-navy/20 bg-white text-brand-navy shadow-sm shadow-brand-navy/10",
          )}
        >
          {stage.complete ? (
            <CheckCircle2 className="size-4 sm:size-[18px]" aria-hidden />
          ) : (
            <Icon className="size-4 sm:size-[18px]" strokeWidth={2.25} aria-hidden />
          )}
        </div>
        <div
          className={cn(
            "w-[66px] rounded-lg border px-1.5 py-1 text-center shadow-sm sm:w-[72px]",
            flipLabel ? "mb-1.5" : "mt-1.5",
            tone === "dark"
              ? "border-white/20 bg-brand-navy/90 shadow-black/30 backdrop-blur-md"
              : "border-brand-navy/15 bg-brand-navy shadow-brand-navy/15",
          )}
        >
          <p className="truncate text-[8px] font-bold uppercase leading-none tracking-wide text-white sm:text-[9px]">
            {stage.label}
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-[8px] font-semibold tabular-nums leading-none sm:text-[9px]",
              tone === "dark" ? "text-brand-light" : "text-brand-light/95",
            )}
          >
            {stage.time}
          </p>
        </div>
      </div>
    </div>
  );
}
