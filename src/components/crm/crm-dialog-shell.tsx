"use client";

import type { ReactNode } from "react";

import { CrmDialogHeaderBar } from "@/components/crm/crm-form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Branded dialog shell — navy header, scroll body, muted footer (matches intake / add-customer). */
export function CrmDialogShell({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  children,
  footer,
  maxWidth = "sm:max-w-md",
  className,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 overflow-hidden p-0", maxWidth, className)}>
        {eyebrow ? (
          <p className="border-b border-brand-light/20 bg-brand-navy px-5 pb-0 pt-3 text-[11px] font-semibold uppercase tracking-wider text-brand-light">
            {eyebrow}
          </p>
        ) : null}
        <CrmDialogHeaderBar title={title} description={description} />
        <div className={cn("max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-brand-light/30 bg-muted/20 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function CrmDialogFooterButtons({
  onCancel,
  onSave,
  cancelLabel = "Cancel",
  saveLabel = "Save",
  pending = false,
  saveDisabled = false,
  saveType = "button",
}: {
  onCancel: () => void;
  onSave?: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  pending?: boolean;
  saveDisabled?: boolean;
  saveType?: "button" | "submit";
}) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
        {cancelLabel}
      </Button>
      <Button
        type={saveType}
        onClick={onSave}
        disabled={pending || saveDisabled}
        className="bg-brand-navy hover:bg-brand-navy/90"
      >
        {pending ? "Saving…" : saveLabel}
      </Button>
    </>
  );
}
