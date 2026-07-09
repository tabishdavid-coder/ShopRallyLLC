"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ListTree,
  DollarSign,
  Loader2,
  Percent,
  Plus,
  Star,
  Truck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CannedJobPickerSheet } from "@/components/repair-order/canned-job-picker-sheet";
import { SmartLaborGuide } from "@/components/repair-order/smart-labor-guide";
import { RoAdjustmentToolbarButton } from "@/components/repair-order/ro-adjustment-toolbar-button";
import { addJob } from "@/server/actions/estimate";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { cn } from "@/lib/utils";

type LauncherItem = {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  disabled?: boolean;
  stubMessage?: string;
};

export function EstimateJobLauncher({
  roId,
  cannedJobs,
  cannedJobCategories,
  baseRateCents,
  partTiers,
  laborTiers,
  vehicleId,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
  triggerLabel = "Add to estimate",
  triggerClassName,
}: {
  roId: string;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  vehicleId: string;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [laborGuideOpen, setLaborGuideOpen] = useState(false);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [pending, start] = useTransition();

  const items: LauncherItem[] = [
    {
      id: "labor-guide",
      label: "Search Labor Book",
      description: "Find flat-rate operations and build a job with labor lines.",
      icon: <ListTree className="size-5 text-brand-navy" />,
    },
    {
      id: "canned",
      label: "Add Canned Job",
      description: "Browse shop canned services with preset labor and parts.",
      icon: <Star className="size-5 text-brand-navy" />,
    },
    {
      id: "new-job",
      label: "Add New Job",
      description: "Start a blank service card and add labor/parts manually.",
      icon: <Plus className="size-5 text-brand-navy" />,
    },
    {
      id: "maintenance",
      label: "Maintenance Schedule",
      description: "Vehicle maintenance intervals — coming soon.",
      icon: <CalendarClock className="size-5 text-muted-foreground" />,
      disabled: true,
      stubMessage: "Maintenance schedule picker is not wired yet.",
    },
    {
      id: "sublet",
      label: "Add Sublet",
      description: "Outsourced work line — coming soon.",
      icon: <Truck className="size-5 text-muted-foreground" />,
      disabled: true,
      stubMessage: "Sublet lines are not wired yet.",
    },
    {
      id: "fee",
      label: "Add RO Fee",
      description: "Card fee, shop supplies, or other RO-level charge.",
      icon: <DollarSign className="size-5 text-brand-navy" />,
    },
    {
      id: "discount",
      label: "Add RO Discount",
      description: "Apply a repair-order-level discount.",
      icon: <Percent className="size-5 text-brand-navy" />,
    },
  ];

  function closeLauncher() {
    setLauncherOpen(false);
  }

  function addBlankJob() {
    closeLauncher();
    start(async () => {
      const res = await addJob(roId);
      if (res.ok) {
        toast("success", "Blank job added");
        router.refresh();
      } else {
        toast("error", res.error);
      }
    });
  }

  function handleItem(item: LauncherItem) {
    if (item.disabled) {
      toast("error", item.stubMessage ?? "Coming soon.");
      return;
    }
    switch (item.id) {
      case "labor-guide":
        closeLauncher();
        setLaborGuideOpen(true);
        break;
      case "canned":
        closeLauncher();
        setCannedOpen(true);
        break;
      case "new-job":
        addBlankJob();
        break;
      case "fee":
        closeLauncher();
        setFeeOpen(true);
        break;
      case "discount":
        closeLauncher();
        setDiscountOpen(true);
        break;
      default:
        toast("error", item.stubMessage ?? "Coming soon.");
    }
  }

  return (
    <>
      <Button
        type="button"
        className={cn(
          "gap-1.5 bg-brand-navy font-semibold hover:bg-brand-navy/90",
          triggerClassName,
        )}
        onClick={() => setLauncherOpen(true)}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}
        {triggerLabel}
      </Button>

      <Dialog open={launcherOpen} onOpenChange={setLauncherOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-brand-navy">Add to estimate</DialogTitle>
            <DialogDescription>
              {vehicleLabel}
              {specLine ? ` · ${specLine}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={pending || item.disabled}
                onClick={() => handleItem(item)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-light/10",
                  item.disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <span className="mt-0.5 shrink-0">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-navy">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SmartLaborGuide
        vehicleId={vehicleId}
        roId={roId}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
        specLine={specLine}
        mileageIn={mileageIn}
        odometerNotWorking={odometerNotWorking}
        presentation="floating"
        open={laborGuideOpen}
        onOpenChange={setLaborGuideOpen}
        hideTrigger
      />

      <CannedJobPickerSheet
        open={cannedOpen}
        onOpenChange={setCannedOpen}
        roId={roId}
        jobs={cannedJobs}
        categories={cannedJobCategories}
        baseRateCents={baseRateCents}
        partTiers={partTiers}
        laborTiers={laborTiers}
      />

      <RoAdjustmentToolbarButton kind="fee" roId={roId} open={feeOpen} onOpenChange={setFeeOpen} hideTrigger />
      <RoAdjustmentToolbarButton
        kind="discount"
        roId={roId}
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        hideTrigger
      />
    </>
  );
}
