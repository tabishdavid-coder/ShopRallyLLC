"use client";

import { useCallback, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const LAB_NAME_DESC_RATIO_KEY = "shoprally-lab-name-desc-ratio";
export const LAB_NAME_DESC_RATIO_MIN = 0.4;
export const LAB_NAME_DESC_RATIO_MAX = 0.78;
export const LAB_NAME_DESC_RATIO_DEFAULT = 0.62;

function clampRatio(value: number): number {
  return Math.min(LAB_NAME_DESC_RATIO_MAX, Math.max(LAB_NAME_DESC_RATIO_MIN, value));
}

function readStoredRatio(): number {
  if (typeof window === "undefined") return LAB_NAME_DESC_RATIO_DEFAULT;
  try {
    const raw = window.localStorage.getItem(LAB_NAME_DESC_RATIO_KEY);
    if (!raw) return LAB_NAME_DESC_RATIO_DEFAULT;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? clampRatio(n) : LAB_NAME_DESC_RATIO_DEFAULT;
  } catch {
    return LAB_NAME_DESC_RATIO_DEFAULT;
  }
}

/** Build full service-items grid template — nameShare controls Name vs Description flex split. */
export function labLineGridTemplate(nameShare = LAB_NAME_DESC_RATIO_DEFAULT): string {
  const name = clampRatio(nameShare);
  const desc = 1 - name;
  return `24px 128px minmax(120px,${name}fr) minmax(100px,${desc}fr) 72px 84px 84px 96px 80px 96px 52px 28px`;
}

export function useLabNameDescSplit() {
  const [ratio, setRatioState] = useState(readStoredRatio);

  const setLive = useCallback((next: number) => {
    setRatioState(clampRatio(next));
  }, []);

  const persist = useCallback((next: number) => {
    const clamped = clampRatio(next);
    setRatioState(clamped);
    try {
      window.localStorage.setItem(LAB_NAME_DESC_RATIO_KEY, String(clamped));
    } catch {
      /* private mode / quota */
    }
  }, []);

  const gridTemplateColumns = useMemo(() => labLineGridTemplate(ratio), [ratio]);

  return { ratio, setLive, persist, gridTemplateColumns } as const;
}

export function LabNameDescResizeHandle({
  ratio,
  onRatioChange,
  onRatioCommit,
}: {
  ratio: number;
  onRatioChange: (ratio: number) => void;
  onRatioCommit: (ratio: number) => void;
}) {
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startRatio = ratio;
    const header = e.currentTarget.closest<HTMLElement>("[data-lab-name-desc-header]");
    const pairWidth =
      (header?.offsetWidth ?? 900) -
      (24 + 128 + 72 + 84 + 84 + 96 + 80 + 96 + 52 + 28);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const next = startRatio + delta / Math.max(pairWidth, 200);
      onRatioChange(next);
    };
    const onUp = (ev: PointerEvent) => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const delta = ev.clientX - startX;
      onRatioCommit(startRatio + delta / Math.max(pairWidth, 200));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Name and Description columns"
      aria-valuemin={Math.round(LAB_NAME_DESC_RATIO_MIN * 100)}
      aria-valuemax={Math.round(LAB_NAME_DESC_RATIO_MAX * 100)}
      aria-valuenow={Math.round(ratio * 100)}
      title="Drag to resize Name / Description"
      onPointerDown={onPointerDown}
      className={cn(
        "absolute inset-y-0 right-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none",
        "hover:bg-brand-light/40 active:bg-brand-light/60",
      )}
    />
  );
}

/** Always two cells — Name and Description stay separate typing areas. */
export function LabNameDescCells({
  name,
  description,
}: {
  name: ReactNode;
  description: ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-7 min-w-0 items-stretch overflow-hidden border-r border-border/70 bg-background px-1 py-0.5">
        <div className="min-w-0 w-full self-center">{name}</div>
      </div>
      <div className="flex min-h-7 min-w-0 items-stretch overflow-hidden border-r border-border/70 bg-muted/10 px-1 py-0.5">
        <div className="min-w-0 w-full self-center">{description}</div>
      </div>
    </>
  );
}
