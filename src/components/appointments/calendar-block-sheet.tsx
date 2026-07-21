"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deleteCalendarBlock } from "@/server/actions/calendar-blocks";
import type { CalendarBlockRow } from "@/server/appointments";

export function CalendarBlockSheet({
  block,
  open,
  onOpenChange,
  onEdit,
}: {
  block: CalendarBlockRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (block: CalendarBlockRow) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!block) return null;

  const start = new Date(block.startAt);
  const end = new Date(block.endAt);

  function handleDelete() {
    if (!confirm("Remove this blocked time?")) return;
    startTransition(async () => {
      const result = await deleteCalendarBlock(block!.id);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-border sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-slate-700">
            <Ban className="size-4" />
            {block.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Blocked time
            </div>
            <div className="mt-1 font-medium text-slate-800">
              {start.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" – "}
              {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
            {block.notes ? (
              <p className="mt-2 text-slate-600">{block.notes}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
              onClick={() => {
                onOpenChange(false);
                onEdit(block);
              }}
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-brand-red/30 text-brand-red hover:bg-brand-red/5"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Delete block
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
