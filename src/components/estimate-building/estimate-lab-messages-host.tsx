"use client";

import { useEffect, useState } from "react";

import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { RoMessages } from "@/components/repair-order/ro-messages";

export function EstimateLabMessagesHost({
  customerId,
  customerName,
  customerPhone,
  marketingOptIn,
  roId,
}: {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
  roId: string;
}) {
  const ctx = useEstimateLabContextDrawerOptional();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerOpenMessages(() => setOpen(true));
    return () => ctx.registerOpenMessages(null);
  }, [ctx]);

  return (
    <RoMessages
      customerId={customerId}
      customerName={customerName}
      customerPhone={customerPhone}
      marketingOptIn={marketingOptIn}
      roId={roId}
      open={open}
      onOpenChange={setOpen}
      hideTrigger
    />
  );
}
