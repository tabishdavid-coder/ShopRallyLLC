"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, ListChecks, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  clearChecklistState,
  LABOR_MOCKUP_CHECKLIST,
  loadChecklistState,
  saveChecklistState,
  type ChecklistItemId,
} from "@/components/dev/labor-mockup/test-checklist";

type Props = {
  done: Set<ChecklistItemId>;
  onReset?: () => void;
};

export function TestChecklistPanel({ done, onReset }: Props) {
  const [open, setOpen] = useState(true);
  const total = LABOR_MOCKUP_CHECKLIST.length;
  const completed = LABOR_MOCKUP_CHECKLIST.filter((item) => done.has(item.id)).length;
  const allDone = completed === total;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-lg border px-3 py-2",
          allDone
            ? "border-emerald-300/60 bg-emerald-50/50"
            : "border-brand-navy/15 bg-brand-navy/[0.02]",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
            <ListChecks className="size-4 shrink-0 text-brand-navy" />
            <span className="text-sm font-medium text-brand-navy">
              Test checklist
              <span className="ml-2 font-normal text-muted-foreground">
                {completed}/{total}
                {allDone ? " — all features tested!" : ""}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "ml-auto size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => {
              clearChecklistState();
              onReset?.();
            }}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>

        <CollapsibleContent className="mt-2">
          <ul className="grid gap-1 sm:grid-cols-2">
            {LABOR_MOCKUP_CHECKLIST.map((item) => {
              const checked = done.has(item.id);
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 rounded-md px-2 py-1 text-xs",
                    checked ? "text-brand-navy" : "text-muted-foreground",
                  )}
                >
                  {checked ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 size-3.5 shrink-0 text-brand-navy/25" />
                  )}
                  <span>
                    <span className={cn("font-medium", checked && "line-through opacity-70")}>
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{item.hint}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** Hydrate checklist from localStorage on mount. */
export function useChecklistHydration(
  setDone: React.Dispatch<React.SetStateAction<Set<ChecklistItemId>>>,
) {
  useEffect(() => {
    setDone(loadChecklistState());
  }, [setDone]);
}

/** Persist checklist whenever it changes. */
export function useChecklistPersistence(done: Set<ChecklistItemId>) {
  useEffect(() => {
    saveChecklistState(done);
  }, [done]);
}
