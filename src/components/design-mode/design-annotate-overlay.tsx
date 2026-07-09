"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { highlightElement, type PickedElement } from "@/lib/design-annotate";

export type AnnotateTool = "circle" | "click";

type Region = { x: number; y: number; w: number; h: number };

function describeElement(el: Element): PickedElement {
  const tag = el.tagName.toLowerCase();
  const id = el.id || undefined;
  const classes =
    typeof el.className === "string" && el.className.trim()
      ? el.className.trim().split(/\s+/).slice(0, 6).join(" ")
      : undefined;
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || undefined;
  return { tag, id, classes, text };
}

/** Full-screen overlay for circle / click UI annotation in dev design mode. */
export function DesignAnnotateOverlay({
  active,
  tool,
  onPick,
  onDone,
}: {
  active: boolean;
  tool: AnnotateTool;
  onPick: (picks: PickedElement[], region?: Region) => void;
  onDone: () => void;
}) {
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const finishCircle = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const left = Math.min(x0, x1);
      const top = Math.min(y0, y1);
      const w = Math.abs(x1 - x0);
      const h = Math.abs(y1 - y0);
      if (w < 8 || h < 8) return;

      const cx = left + w / 2;
      const cy = top + h / 2;
      const target = document.elementFromPoint(cx, cy);
      const picks = target && !overlayRef.current?.contains(target) ? [describeElement(target)] : [];
      onPick(picks, { x: left, y: top, w, h });
    },
    [onPick],
  );

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onDone]);

  if (!active) return null;

  const rect =
    drag != null
      ? {
          left: Math.min(drag.x0, drag.x1),
          top: Math.min(drag.y0, drag.y1),
          width: Math.abs(drag.x1 - drag.x0),
          height: Math.abs(drag.y1 - drag.y0),
        }
      : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[68] cursor-crosshair bg-black/10"
      onMouseDown={(e) => {
        if (tool !== "circle") return;
        e.preventDefault();
        setDrag({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
      }}
      onMouseMove={(e) => {
        if (tool !== "circle" || !drag) return;
        setDrag({ ...drag, x1: e.clientX, y1: e.clientY });
      }}
      onMouseUp={(e) => {
        if (tool !== "circle" || !drag) return;
        finishCircle(drag.x0, drag.y0, e.clientX, e.clientY);
        setDrag(null);
      }}
      onClick={(e) => {
        if (tool !== "click") return;
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as Element;
        if (overlayRef.current?.contains(target) && target === overlayRef.current) {
          const picked = document.elementFromPoint(e.clientX, e.clientY);
          if (!picked || overlayRef.current.contains(picked)) return;
          highlightElement(picked);
          onPick([describeElement(picked)]);
          return;
        }
        if (overlayRef.current?.contains(target)) return;
        highlightElement(target);
        onPick([describeElement(target)]);
      }}
    >
      {rect && rect.width > 0 && rect.height > 0 ? (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-brand-light bg-brand-light/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.12)]"
          style={rect}
        />
      ) : null}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-brand-navy px-4 py-2 text-xs font-medium text-white shadow-lg">
        {tool === "circle" ? "Drag to circle an area" : "Click a UI element"} · Esc to finish
      </div>
    </div>
  );
}
