"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INSPECTION_TEMPLATES } from "@/lib/inspection-template";
import { createInspection } from "@/server/actions/inspections";

export function AddInspectionDialog({
  open,
  onOpenChange,
  roId,
  existingTemplateNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  existingTemplateNames: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const available = INSPECTION_TEMPLATES.filter(
    (t) => !existingTemplateNames.includes(t.name),
  );

  function pick(templateId: string) {
    setError(null);
    startTransition(async () => {
      const res = await createInspection(roId, templateId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inspection</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose an inspection template. Each template can only be added once per repair order.
        </p>
        <div className="space-y-2">
          {available.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All available templates are already on this repair order.
            </p>
          ) : (
            available.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={pending}
                onClick={() => pick(t.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-brand-navy hover:bg-brand-light/15 disabled:opacity-50"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.items.length} items</span>
              </button>
            ))
          )}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {pending ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Creating inspection…
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
