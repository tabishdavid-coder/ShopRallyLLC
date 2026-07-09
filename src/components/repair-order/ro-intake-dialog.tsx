"use client";

import { RoIntakeForm } from "@/components/repair-order/ro-intake-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { RoIntakeConfig } from "@/lib/ro-intake-types";

export function RoIntakeDialog({
  open,
  onOpenChange,
  config,
  initialCustomerId,
  initialVehicleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: RoIntakeConfig;
  initialCustomerId?: string;
  initialVehicleId?: string;
}) {
  const formKey = `${initialCustomerId ?? ""}:${initialVehicleId ?? ""}:${open ? "open" : "closed"}`;

  function close() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-planned-change="INTAKE-02"
        className="flex h-[min(92vh,900px)] max-h-[92vh] w-full max-w-6xl flex-col gap-0 overflow-hidden rounded-none p-0 ring-1 ring-black/10 sm:max-w-6xl"
      >
        <RoIntakeForm
          key={formKey}
          mode="dialog"
          config={config}
          initialCustomerId={initialCustomerId}
          initialVehicleId={initialVehicleId}
          onCreated={() => close()}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
