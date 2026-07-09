"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { updateJob } from "@/server/actions/estimate";
import { cn } from "@/lib/utils";

/** Inline internal job notes — single row, blends into the job card. */
export function EstimateLabJobNotes({
  jobId,
  initialNote,
  canEdit,
  className,
}: {
  jobId: string;
  initialNote: string | null;
  canEdit: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    setNote(initialNote ?? "");
    setDirty(false);
  }, [initialNote, jobId]);

  function save(next?: string) {
    const value = (next ?? note).trim();
    start(async () => {
      const res = await updateJob(jobId, { description: value || null });
      if (res.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border/40 bg-white px-2 py-0.5",
        className,
      )}
    >
      <span
        className="w-11 shrink-0 text-[9px] font-semibold uppercase leading-none tracking-wide text-muted-foreground/75"
        title="Internal service notes — not on customer estimate"
      >
        Notes
      </span>
      <div className="relative min-w-0 flex-1">
        <input
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setDirty(true);
          }}
          onBlur={() => {
            if (dirty && canEdit) save();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          disabled={!canEdit || pending}
          placeholder="Internal note for this job…"
          className="h-7 w-full min-w-0 border-0 bg-transparent px-0 text-xs text-foreground shadow-none outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0 disabled:opacity-60"
          aria-label="Internal service notes"
        />
        {pending ? (
          <Loader2
            className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
