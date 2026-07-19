"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";

import { ConcernMediaUpload } from "@/components/repair-order/concern-media-upload";
import type { ConcernRow } from "@/components/repair-order/concern-types";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { InspectionItemStatus } from "@/generated/prisma";
import {
  INSPECTION_ITEM_STATUS,
  INSPECTION_ITEM_STATUS_LABELS,
  INSPECTION_STATUS_PILL,
} from "@/lib/inspection";
import { cn } from "@/lib/utils";
import { addConcern, deleteConcern, updateConcern } from "@/server/actions/concerns";

const MAX_CHARS = 2000;

const RATING_OPTIONS: InspectionItemStatus[] = [
  INSPECTION_ITEM_STATUS.GREEN,
  INSPECTION_ITEM_STATUS.YELLOW,
  INSPECTION_ITEM_STATUS.RED,
];

function CharCounter({ value }: { value: string }) {
  const remaining = MAX_CHARS - value.length;
  return (
    <p className="text-right text-[11px] text-muted-foreground">
      {remaining} character{remaining === 1 ? "" : "s"} remaining
    </p>
  );
}

function RatingBadge({ status }: { status: InspectionItemStatus }) {
  if (status === "NA") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        INSPECTION_STATUS_PILL[status],
      )}
    >
      {INSPECTION_ITEM_STATUS_LABELS[status]}
    </span>
  );
}

type Kind = "CUSTOMER" | "TECHNICIAN";

type EditorProps = {
  roId: string;
  kind: Kind;
  concern?: ConcernRow | null;
  compact?: boolean;
  onClose: () => void;
  /** Called after a successful create so the parent can clear the draft slot. */
  onCreated?: () => void;
};

export function InlineConcernEditor({
  roId,
  kind,
  concern,
  compact = false,
  onClose,
  onCreated,
}: EditorProps) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = Boolean(concern);

  const [text, setText] = useState(concern?.text ?? "");
  const [finding, setFinding] = useState(concern?.finding ?? "");
  const [rating, setRating] = useState<InspectionItemStatus>(
    concern?.inspectionRating && concern.inspectionRating !== "NA"
      ? concern.inspectionRating
      : INSPECTION_ITEM_STATUS.YELLOW,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    textRef.current?.focus();
    const el = textRef.current;
    if (el) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, []);

  const baseline = {
    text: concern?.text ?? "",
    finding: concern?.finding ?? "",
    rating:
      concern?.inspectionRating && concern.inspectionRating !== "NA"
        ? concern.inspectionRating
        : INSPECTION_ITEM_STATUS.YELLOW,
  };
  const dirty =
    text.trim() !== baseline.text.trim() ||
    (finding.trim() || "") !== (baseline.finding.trim() || "") ||
    (kind === "TECHNICIAN" && rating !== baseline.rating);

  function persist(opts?: { closeOnSuccess?: boolean }) {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError(kind === "TECHNICIAN" ? "Inspection task is required." : "Concern text is required.");
      return;
    }
    if (kind === "TECHNICIAN" && (!rating || rating === "NA")) {
      setError("Inspection rating is required.");
      return;
    }

    startTransition(async () => {
      const payload = {
        text: trimmed,
        finding: finding.trim() || null,
        ...(kind === "TECHNICIAN"
          ? { inspectionRating: rating as "GREEN" | "YELLOW" | "RED" }
          : {}),
      };

      const res =
        isEdit && concern
          ? await updateConcern(concern.id, payload)
          : await addConcern({ roId, kind, ...payload });

      if (!res.ok) {
        setError(res.error);
        setSaveHint("error");
        return;
      }

      if (files.length > 0) {
        toast("success", "Concern saved. Media upload will be available when cloud storage is enabled.");
      }

      setSaveHint("saved");
      router.refresh();

      if (!isEdit) {
        onCreated?.();
        onClose();
        return;
      }
      if (opts?.closeOnSuccess) onClose();
    });
  }

  function handleBlurSave() {
    // Existing concerns auto-save on blur; new drafts require explicit Save
    // so Cancel / clicking away does not accidentally create a row.
    if (!isEdit || !dirty || pending) return;
    if (!text.trim()) return;
    persist();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      persist({ closeOnSuccess: true });
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  function handleDelete() {
    if (!concern) return;
    startTransition(async () => {
      const res = await deleteConcern(concern.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function handleRatingChange(next: InspectionItemStatus) {
    setRating(next);
    if (!isEdit || !concern) return;
    // Persist rating immediately for existing tech concerns
    startTransition(async () => {
      const trimmed = text.trim() || concern.text;
      const res = await updateConcern(concern.id, {
        text: trimmed,
        finding: finding.trim() || null,
        inspectionRating: next as "GREEN" | "YELLOW" | "RED",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaveHint("saved");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border border-brand-navy/30 bg-background shadow-sm",
        compact ? "space-y-2 p-2" : "space-y-3 p-3",
      )}
    >
      {kind === "TECHNICIAN" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rating
          </span>
          {RATING_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() => handleRatingChange(status)}
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                rating === status
                  ? INSPECTION_STATUS_PILL[status]
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
              )}
            >
              {INSPECTION_ITEM_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          {kind === "TECHNICIAN" ? "Inspection task" : "Concern"}
          <span className="text-brand-red"> *</span>
        </label>
        <Textarea
          ref={textRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, MAX_CHARS));
            setSaveHint("idle");
          }}
          onBlur={handleBlurSave}
          onKeyDown={handleKeyDown}
          placeholder={
            kind === "TECHNICIAN"
              ? "Describe the inspection task or tech finding."
              : "Describe the customer's concern."
          }
          rows={compact ? 2 : 3}
          disabled={pending}
          className="min-h-[64px] resize-y border-brand-light/40 text-sm"
        />
        <CharCounter value={text} />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Finding</label>
        <Textarea
          value={finding}
          onChange={(e) => {
            setFinding(e.target.value.slice(0, MAX_CHARS));
            setSaveHint("idle");
          }}
          onBlur={handleBlurSave}
          onKeyDown={handleKeyDown}
          placeholder={kind === "TECHNICIAN" ? "Enter finding…" : "Describe the cause (optional)."}
          rows={compact ? 2 : 2}
          disabled={pending}
          className="min-h-[52px] resize-y border-brand-light/40 text-sm"
        />
        <CharCounter value={finding} />
      </div>

      <ConcernMediaUpload
        files={files}
        onFilesChange={setFiles}
        disabled={pending}
        compact={compact}
      />

      {error ? <p className="text-xs text-brand-red">{error}</p> : null}
      {saveHint === "saved" && !dirty && isEdit ? (
        <p className="text-[11px] text-emerald-700">Saved</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {isEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-brand-red hover:bg-brand-red/10 hover:text-brand-red"
              disabled={pending}
              onClick={handleDelete}
            >
              <Trash2 className="size-3" />
              Delete
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {pending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={pending}
            onClick={onClose}
          >
            <X className="size-3" />
            {isEdit ? "Close" : "Cancel"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={pending || (!dirty && isEdit) || !text.trim()}
            onClick={() => persist({ closeOnSuccess: !isEdit })}
          >
            {isEdit ? "Save" : "Add concern"}
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {isEdit ? "Saves on blur · Ctrl/⌘+Enter to save & close" : "Ctrl/⌘+Enter to add"}
      </p>
    </div>
  );
}

type CollapsedProps = {
  concern: ConcernRow;
  compact?: boolean;
  onExpand: () => void;
};

export function CollapsedConcernRow({ concern, compact = false, onExpand }: CollapsedProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "w-full cursor-pointer rounded-md border bg-background text-left transition-colors hover:border-brand-navy/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium text-foreground">{concern.text}</p>
        {concern.kind === "TECHNICIAN" && concern.inspectionRating ? (
          <RatingBadge status={concern.inspectionRating} />
        ) : null}
      </div>
      {concern.finding ? (
        <p className={cn("mt-0.5 text-muted-foreground", compact && "text-[11px]")}>{concern.finding}</p>
      ) : null}
    </button>
  );
}

type SectionProps = {
  roId: string;
  kind: Kind;
  label: string;
  items: ConcernRow[];
  emptyHint: string;
  compact?: boolean;
  /** Increment to open the inline add form (e.g. from a toolbar button). */
  addSignal?: number;
};

export function InlineConcernSection({
  roId,
  kind,
  label,
  items,
  emptyHint,
  compact = false,
  addSignal = 0,
}: SectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (addSignal > 0) {
      setExpandedId(null);
      setAdding(true);
    }
  }, [addSignal]);

  function startAdd() {
    setExpandedId(null);
    setAdding(true);
  }

  function expand(id: string) {
    setAdding(false);
    setExpandedId(id);
  }

  const boxClass = cn(
    "min-w-0 rounded-md border border-border/60 bg-background/80",
    compact ? "px-2.5 py-2" : "px-3 py-2.5",
  );

  return (
    <div className={boxClass}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      {!items.length && !adding ? (
        <button
          type="button"
          onClick={startAdd}
          className={cn(
            "w-full cursor-pointer rounded-md border border-dashed border-border/80 text-left transition-colors hover:border-brand-navy/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
          )}
        >
          <span className="text-muted-foreground">{emptyHint}</span>
        </button>
      ) : (
        <ul className={cn(compact ? "space-y-1" : "space-y-1.5")}>
          {items.map((c) => (
            <li key={c.id}>
              {expandedId === c.id ? (
                <InlineConcernEditor
                  roId={roId}
                  kind={kind}
                  concern={c}
                  compact={compact}
                  onClose={() => setExpandedId(null)}
                />
              ) : (
                <CollapsedConcernRow
                  concern={c}
                  compact={compact}
                  onExpand={() => expand(c.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className={cn(items.length ? (compact ? "mt-1" : "mt-1.5") : undefined)}>
          <InlineConcernEditor
            roId={roId}
            kind={kind}
            compact={compact}
            onClose={() => setAdding(false)}
            onCreated={() => setAdding(false)}
          />
        </div>
      ) : items.length ? (
        <button
          type="button"
          onClick={startAdd}
          className={cn(
            "mt-1.5 w-full cursor-pointer rounded-md border border-dashed border-border/80 text-left transition-colors hover:border-brand-navy/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
          )}
        >
          <span className="text-muted-foreground">{emptyHint}</span>
        </button>
      ) : null}
    </div>
  );
}
