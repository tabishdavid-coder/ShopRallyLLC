"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeJobBoardPipelineColumn } from "@/server/actions/job-board";
import { cn } from "@/lib/utils";

type Props = {
  columnId: string;
  title: string;
  cardCount: number;
  /** True while a board move/archive is still persisting. */
  disabled?: boolean;
  className?: string;
};

/**
 * Delete control for custom (user-added) pipeline sections only.
 * Empty → confirm + remove. Non-empty → explain that cards must be moved first.
 * Uses the live in-memory column card count (not a stale snapshot).
 */
export function JobBoardDeleteColumnButton({
  columnId,
  title,
  cardCount,
  disabled = false,
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Re-evaluate emptiness from current props whenever the dialog is open so a
  // move/archive that empties the column while closed (or just before open)
  // is reflected immediately.
  const isEmpty = cardCount === 0;

  function openDialog(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setError(null);
    setOpen(true);
  }

  function confirmDelete() {
    if (cardCount > 0 || disabled) return;
    setError(null);
    startTransition(async () => {
      const res = await removeJobBoardPipelineColumn(columnId);
      if (!res.ok) {
        setError(res.error);
        // Occupancy can lag optimistic UI; refresh so the board matches the DB.
        router.refresh();
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={disabled}
        className={cn(
          "absolute top-1.5 right-1.5 flex size-6 shrink-0 items-center justify-center rounded-none border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
          className,
        )}
        title={disabled ? "Saving board changes…" : `Delete ${title}`}
        aria-label={`Delete section ${title}`}
      >
        <X className="size-3.5" strokeWidth={2.25} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none sm:max-w-md sm:rounded-none">
          <DialogHeader>
            <DialogTitle>
              {isEmpty ? "Delete section?" : "Clear section first"}
            </DialogTitle>
          </DialogHeader>
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">
              Remove <span className="font-medium text-foreground">{title}</span> from
              the job board? This cannot be undone.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{title}</span> still has{" "}
              {cardCount} repair order{cardCount === 1 ? "" : "s"}. Move or clear
              all cards out of this section, then delete it.
            </p>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {isEmpty ? "Cancel" : "OK"}
            </Button>
            {isEmpty ? (
              <Button
                variant="destructive"
                className="rounded-none"
                onClick={confirmDelete}
                disabled={pending}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Delete section
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
