"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthorizeEstimateDialog } from "@/components/repair-order/authorize-estimate-dialog";

/** Shop-side authorize control for the RO header — opens customer vs shop choice. */
export function RoApproveActions({
  roId,
  roNumber,
  customerName,
  phone,
}: {
  roId: string;
  roNumber: number;
  customerName: string;
  phone: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 bg-brand-light text-brand-navy hover:bg-brand-light/90"
      >
        <CheckCircle2 className="size-4" />
        Get approval
      </Button>

      <AuthorizeEstimateDialog
        open={open}
        onOpenChange={setOpen}
        roId={roId}
        roNumber={roNumber}
        customerName={customerName}
        phone={phone}
      />
    </>
  );
}
