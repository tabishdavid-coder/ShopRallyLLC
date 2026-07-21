"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";

import { CreateInspectionTemplateSheet } from "@/components/inspections/create-inspection-template-sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InspectionTemplatePickerRow } from "@/lib/inspection-template-schemas";
import { cn } from "@/lib/utils";
import { fetchInspectionTemplatePicker } from "@/server/actions/inspection-templates";
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
  const [loadingTemplates, startLoadTemplates] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<InspectionTemplatePickerRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    startLoadTemplates(async () => {
      const res = await fetchInspectionTemplatePicker();
      if (res.ok) {
        setTemplates(res.templates);
      } else {
        setError(res.error);
      }
    });
  }, [open]);

  const available = templates.filter((t) => !existingTemplateNames.includes(t.name));

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

  function handleTemplateCreated() {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Inspection</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose an inspection template. Each template can only be added once per repair order.
          </p>

          <Button
            type="button"
            variant="outline"
            className="h-auto w-full justify-start gap-3 border-brand-light/60 bg-brand-light/10 px-4 py-3 text-left hover:border-brand-navy hover:bg-brand-light/20"
            onClick={() => setCreateOpen(true)}
            disabled={pending}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white">
              <Sparkles className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-brand-navy">Create custom inspection</span>
              <span className="block text-xs text-muted-foreground">
                Build a new checklist template for your shop
              </span>
            </span>
            <Plus className="ml-auto size-4 text-brand-navy" />
          </Button>

          <div className="space-y-2">
            {loadingTemplates ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading templates…
              </p>
            ) : available.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {templates.length === 0
                  ? "No inspection templates are available."
                  : "All available templates are already on this repair order."}
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
                  <span className="min-w-0">
                    <span className="block font-medium">{t.name}</span>
                    {t.description ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {t.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="ml-3 shrink-0 text-right">
                    <span className="block text-xs text-muted-foreground">{t.itemCount} items</span>
                    {t.source === "shop" ? (
                      <span
                        className={cn(
                          "mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-brand-navy",
                        )}
                      >
                        Custom
                      </span>
                    ) : null}
                  </span>
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

      <CreateInspectionTemplateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        roId={roId}
        onCreated={handleTemplateCreated}
      />
    </>
  );
}
