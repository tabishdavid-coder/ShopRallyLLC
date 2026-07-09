"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function partItemLabel(part: {
  vendor: string | null;
  brand: string | null;
  description: string;
  partNumber?: string | null;
}): string {
  const description =
    part.description.trim() || part.partNumber?.trim() || part.brand?.trim() || "Part line";
  return [part.vendor, part.brand, description].filter(Boolean).join(" ");
}

/** Confirm removal of a part from the parts ordering pipeline (also deletes from the service job). */
export function EstimateLabRemovePartDialog({
  open,
  onOpenChange,
  itemLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-brand-navy">
            <AlertTriangle className="size-5 text-brand-red" aria-hidden />
            Remove item
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirm removal of a part line from the parts ordering pipeline and its linked service job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm font-medium text-foreground">{itemLabel}</p>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this item? It will be deleted from the cart and{" "}
            <span className="font-semibold text-foreground">
              will be removed from the service it is associated with.
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2 border-t px-5 py-3 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
