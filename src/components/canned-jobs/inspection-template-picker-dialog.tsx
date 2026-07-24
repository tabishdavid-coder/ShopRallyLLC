"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { InspectionTemplatePickerRow } from "@/lib/inspection-template-schemas";
import { fetchInspectionTemplatePicker } from "@/server/actions/inspection-templates";
import { cn } from "@/lib/utils";

export function InspectionTemplatePickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (template: InspectionTemplatePickerRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<InspectionTemplatePickerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    startTransition(async () => {
      const res = await fetchInspectionTemplatePicker();
      if (res.ok) {
        setTemplates(res.templates);
      } else {
        setError(res.error);
        setTemplates([]);
      }
    });
  }, [open]);

  const filtered = templates.filter((t) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return t.name.toLowerCase().includes(needle);
  });

  function handlePick(template: InspectionTemplatePickerRow) {
    onPick(template);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,560px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <ShieldCheck className="size-4" aria-hidden />
            Choose inspection template
          </DialogTitle>
          <DialogDescription>
            Links the canned job to a checklist template. Labor hours and name can be edited after adding.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="h-9 pl-8"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {error ? (
            <p className="px-3 py-6 text-center text-sm text-brand-red">{error}</p>
          ) : pending && templates.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand-navy" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matching inspection templates. You can still add a blank inspection line manually.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(template)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left",
                      "hover:border-brand-navy/15 hover:bg-brand-light/10",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
                      <ShieldCheck className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {template.name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {template.itemCount} item{template.itemCount === 1 ? "" : "s"}
                        {template.source === "shop" ? " · Shop template" : " · Built-in"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border bg-slate-50/80 px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
