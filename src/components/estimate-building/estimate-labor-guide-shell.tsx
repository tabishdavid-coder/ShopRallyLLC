"use client";

import type { ReactNode } from "react";

import { EstimateLabLaborProvider } from "@/components/estimate-building/estimate-lab-labor-provider";
import type { QuickLaborVehicle } from "@/lib/quick-labor";

/** Wraps estimate job lists so Tekmetric + inline layouts can open Tabish Friday Labor. */
export function EstimateLaborGuideShell({
  children,
  roId,
  vehicleId,
  initialVehicle,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
}: {
  children: ReactNode;
  roId: string;
  vehicleId: string;
  initialVehicle?: QuickLaborVehicle | null;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
}) {
  return (
    <EstimateLabLaborProvider
      roId={roId}
      vehicleId={vehicleId}
      initialVehicle={initialVehicle}
      customerName={customerName}
      vehicleLabel={vehicleLabel}
      specLine={specLine}
      mileageIn={mileageIn}
      odometerNotWorking={odometerNotWorking}
    >
      {children}
    </EstimateLabLaborProvider>
  );
}
