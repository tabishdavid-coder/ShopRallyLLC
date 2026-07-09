"use client";

import { useRouter } from "next/navigation";

import { RoIntakeForm } from "@/components/repair-order/ro-intake-form";
import { CRM_HOME_HREF } from "@/lib/crm-nav";
import type { RoIntakeConfig } from "@/lib/ro-intake-types";

export function NewRepairOrderPageClient({
  config,
  initialCustomerId,
  initialVehicleId,
  fromQuickLabor,
}: {
  config: RoIntakeConfig;
  initialCustomerId?: string;
  initialVehicleId?: string;
  fromQuickLabor?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:p-6">
      <div className="flex max-h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white shadow-2xl ring-1 ring-black/10">
        <RoIntakeForm
          config={config}
          mode="dialog"
          initialCustomerId={initialCustomerId}
          initialVehicleId={initialVehicleId}
          fromQuickLabor={fromQuickLabor}
          onCancel={() => router.push(CRM_HOME_HREF)}
        />
      </div>
    </div>
  );
}
