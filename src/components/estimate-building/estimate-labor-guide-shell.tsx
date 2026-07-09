"use client";

import type { ReactNode } from "react";

import { EstimateLabLaborProvider } from "@/components/estimate-building/estimate-lab-labor-provider";

/** Wraps estimate job lists so Tekmetric + inline layouts can open SmartLaborGuide. */
export function EstimateLaborGuideShell({
  children,
  roId,
  vehicleId,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
}: {
  children: ReactNode;
  roId: string;
  vehicleId: string;
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
