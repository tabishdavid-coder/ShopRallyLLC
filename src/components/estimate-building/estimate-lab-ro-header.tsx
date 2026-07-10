"use client";

import { type PointerEvent, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { updateRepairOrderSidebar } from "@/server/actions/repair-orders";

type Props = {
  roId: string;
  canEdit: boolean;
  shopNotes: string | null;
  customerRecommendations: string | null;
};

const MIN_NOTES_HEIGHT = 36;
const MAX_NOTES_HEIGHT = 112;

export function EstimateLabRoHeader({
  roId,
  canEdit,
  shopNotes,
  customerRecommendations,
}: Props) {
  const [internalNotes, setInternalNotes] = useState(shopNotes ?? "");
  const [recommendations, setRecommendations] = useState(customerRecommendations ?? "");
  const [notesHeight, setNotesHeight] = useState<number | null>(null);
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

  const sharedTextareaStyle = notesHeight ? { height: `${notesHeight}px` } : undefined;
  const resizeHandle = canEdit && !pending ? (
    <div
      aria-hidden="true"
      className="absolute inset-x-2 bottom-0 h-2 cursor-ns-resize rounded-b-lg"
      onPointerDown={startResize}
    />
  ) : null;

  return (
    <div className="shrink-0 border-b border-border bg-white px-3 py-2">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-0.5 flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-crm-label">
              Shop notes
            </span>
            <span className="truncate text-[10px] text-muted-foreground" title="Internal — not shown on customer estimate">
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
              onBlur={save}
              disabled={!canEdit || pending}
              placeholder="Technician or advisor notes…"
              rows={1}
              className="min-h-9 max-h-28 resize-none py-1.5 text-sm leading-snug"
              style={sharedTextareaStyle}
            />
            {resizeHandle}
            {pending ? (
              <Loader2 className="absolute right-2 top-1.5 size-3 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </div>
        </label>
        <label className="block min-w-0">
          <span className="mb-0.5 flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-crm-label">
              Recommendations
            </span>
            <span className="truncate text-[10px] text-muted-foreground" title="Printed and shared with the estimate">
              On customer estimate
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
              onBlur={save}
              disabled={!canEdit || pending}
              placeholder="Suggested maintenance or next steps…"
              rows={1}
              className="min-h-9 max-h-28 resize-none py-1.5 text-sm leading-snug"
              style={sharedTextareaStyle}
            />
            {resizeHandle}
          </div>
        </label>
      </div>
      {error ? <p className="mt-1 text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
