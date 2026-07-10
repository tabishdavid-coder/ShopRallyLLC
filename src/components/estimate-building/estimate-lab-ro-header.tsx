"use client";

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState, useTransition } from "react";
import { Eye, Loader2, Lock } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { updateRepairOrderSidebar } from "@/server/actions/repair-orders";
import { cn } from "@/lib/utils";

type Props = {
  roId: string;
  canEdit: boolean;
  shopNotes: string | null;
  customerRecommendations: string | null;
};

const MIN_NOTES_HEIGHT = 36;
const MAX_NOTES_HEIGHT = 112;
/** Focused editing height — roomy enough to read/write long notes comfortably. */
const EXPANDED_NOTES_HEIGHT = 240;

const NOTES_PALETTE = {
  ["--jb-ink"]: "#0b1f3b",
  ["--jb-azure"]: "#1e7fe0",
  ["--jb-slate"]: "#5b7295",
  ["--jb-faint"]: "#8ca2c0",
  ["--jb-line"]: "#dde5ef",
  ["--jb-surface"]: "#f0f3f8",
} as CSSProperties;

const NOTES_TEXTAREA =
  "min-h-9 resize-none rounded-none border border-dashed border-[color:var(--jb-azure,#1e7fe0)]/45 bg-white py-1.5 text-sm leading-snug placeholder:text-[color:var(--jb-faint,#8ca2c0)] focus-visible:border-[color:var(--jb-azure,#1e7fe0)] focus-visible:ring-[color:var(--jb-azure,#1e7fe0)]/25";

export function EstimateLabRoHeader({
  roId,
  canEdit,
  shopNotes,
  customerRecommendations,
}: Props) {
  const [internalNotes, setInternalNotes] = useState(shopNotes ?? "");
  const [recommendations, setRecommendations] = useState(customerRecommendations ?? "");
  const [notesHeight, setNotesHeight] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<"notes" | "recommendations" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startSave] = useTransition();
  const internalNotesRef = useRef<HTMLTextAreaElement>(null);
  const recommendationsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInternalNotes(shopNotes ?? "");
    setRecommendations(customerRecommendations ?? "");
    setDirty(false);
  }, [shopNotes, customerRecommendations]);

  function applyNotesHeight(nextHeight: number) {
    const height = Math.min(MAX_NOTES_HEIGHT, Math.max(MIN_NOTES_HEIGHT, Math.round(nextHeight)));
    const heightPx = `${height}px`;

    internalNotesRef.current?.style.setProperty("height", heightPx);
    recommendationsRef.current?.style.setProperty("height", heightPx);
    setNotesHeight((currentHeight) => (currentHeight === height ? currentHeight : height));
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    if (!canEdit || pending) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);

    const startY = event.clientY;
    const startHeight =
      notesHeight ??
      Math.max(
        internalNotesRef.current?.getBoundingClientRect().height ?? MIN_NOTES_HEIGHT,
        recommendationsRef.current?.getBoundingClientRect().height ?? MIN_NOTES_HEIGHT,
      );

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      applyNotesHeight(startHeight + moveEvent.clientY - startY);
    }

    function handlePointerUp() {
      setDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function save() {
    if (!canEdit || !dirty) return;
    startSave(async () => {
      const res = await updateRepairOrderSidebar({
        roId,
        notes: internalNotes.trim() || null,
        customerRecommendations: recommendations.trim() || null,
      });
      if (res.ok) {
        setDirty(false);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  const baseHeight = notesHeight ?? MIN_NOTES_HEIGHT;

  /** Focused field grows in place for comfortable long-form editing; collapses on blur. */
  function textareaClass(field: "notes" | "recommendations") {
    return cn(
      NOTES_TEXTAREA,
      !dragging && "transition-[height] duration-200 ease-out",
      focusedField === field ? "max-h-none" : "max-h-28",
    );
  }

  function textareaStyle(field: "notes" | "recommendations"): CSSProperties {
    return {
      height:
        focusedField === field
          ? `${Math.max(EXPANDED_NOTES_HEIGHT, baseHeight)}px`
          : `${baseHeight}px`,
    };
  }

  const resizeHandle = canEdit && !pending ? (
    <div
      aria-hidden="true"
      className="absolute inset-x-2 bottom-0 h-2 cursor-ns-resize"
      onPointerDown={startResize}
    />
  ) : null;

  return (
    <div className="shrink-0 border-b border-[color:var(--jb-line,#dde5ef)] bg-white px-3 py-2" style={NOTES_PALETTE}>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--jb-faint,#8ca2c0)]">
              Shop notes
            </span>
            <span
              className="inline-flex max-w-full items-center gap-1 truncate rounded-none bg-[color:var(--jb-surface,#f0f3f8)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--jb-slate,#5b7295)]"
              title="Internal — not shown on customer estimate"
            >
              <Lock className="size-2.5 shrink-0" aria-hidden />
              Internal only
            </span>
          </span>
          <div className="relative">
            <Textarea
              ref={internalNotesRef}
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value);
                setDirty(true);
                setError(null);
              }}
              onFocus={() => setFocusedField("notes")}
              onBlur={() => {
                setFocusedField(null);
                save();
              }}
              disabled={!canEdit || pending}
              placeholder="+ Technician or advisor notes…"
              rows={1}
              className={textareaClass("notes")}
              style={textareaStyle("notes")}
            />
            {resizeHandle}
            {pending ? (
              <Loader2 className="absolute right-2 top-1.5 size-3 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </div>
        </label>
        <label className="block min-w-0">
          <span className="mb-1 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--jb-faint,#8ca2c0)]">
              Recommendations
            </span>
            <span
              className="inline-flex max-w-full items-center gap-1 truncate rounded-none bg-[color:var(--jb-azure,#1e7fe0)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--jb-azure,#1e7fe0)]"
              title="Printed and shared with the estimate"
            >
              <Eye className="size-2.5 shrink-0" aria-hidden />
              Visible to customer
            </span>
          </span>
          <div className="relative">
            <Textarea
              ref={recommendationsRef}
              value={recommendations}
              onChange={(e) => {
                setRecommendations(e.target.value);
                setDirty(true);
                setError(null);
              }}
              onFocus={() => setFocusedField("recommendations")}
              onBlur={() => {
                setFocusedField(null);
                save();
              }}
              disabled={!canEdit || pending}
              placeholder="+ Suggested maintenance or next steps…"
              rows={1}
              className={textareaClass("recommendations")}
              style={textareaStyle("recommendations")}
            />
            {resizeHandle}
          </div>
        </label>
      </div>
      {error ? <p className={cn("mt-1 text-[10px] text-destructive")}>{error}</p> : null}
    </div>
  );
}
