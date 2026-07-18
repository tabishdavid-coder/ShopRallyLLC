"use client";



import { Badge } from "@/components/ui/badge";

import { EstimateLabContextStack } from "@/components/estimate-building/estimate-lab-context-inline-fields";

import { EstimateLabOdometerBar } from "@/components/estimate-building/estimate-lab-odometer-bar";

import { EstimateLabServiceAdvisorSelect } from "@/components/estimate-building/estimate-lab-service-advisor-select";

import type { EstimateWorkspaceVariant } from "@/components/estimate-building/estimate-building-lab-panel";

import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";

import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";

import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";

import { RO_STATUS_PILL } from "@/lib/ro-status";

import { cn } from "@/lib/utils";

import type { ROStatus } from "@/generated/prisma";



function formatRoCreated(iso: string) {

  const d = new Date(iso);

  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

}



/** Customer/vehicle context card — title row lives in layout hero for production. */

export function EstimateLabContextHeader({

  variant,

  roId,

  roNumber,

  roStatus,

  customerId,

  customerName,

  createdAt,

  createdByName,

  serviceWriterId,

  serviceWriters,

  canEdit,

  customer,

  vehicle,

  mileageIn,

  mileageOut,

  odometerNotWorking,

  reqOdometer,

  drawerData,

  vehicleSpecs,

}: {

  variant: EstimateWorkspaceVariant;

  roId: string;

  roNumber: number;

  roStatus: ROStatus;

  customerId: string;

  customerName: string;

  createdAt: string;

  createdByName?: string | null;

  serviceWriterId: string | null;

  serviceWriters: { id: string; name: string }[];

  canEdit: boolean;

  customer: EditableCustomerRecord;

  vehicle: EditableVehicle | null;

  mileageIn: number | null;

  mileageOut: number | null;

  odometerNotWorking: boolean;

  reqOdometer?: boolean;

  drawerData: EstimateContextDrawerData | null;

  vehicleSpecs: EstimateLabVehicleSpecsBundle | null;

}) {

  const isLab = variant === "lab";

  const isProduction = variant === "production";

  const pill = RO_STATUS_PILL[roStatus];

  const createdMeta = `Created ${formatRoCreated(createdAt)}${createdByName ? ` by ${createdByName}` : ""}`;



  return (

    <div

      className={cn(

        "shrink-0 border-b border-border bg-white",

        isProduction ? "px-3 py-2 md:px-4" : "px-3 py-1.5 md:px-4",

      )}

    >

      {isLab ? (

        <div className="mb-1 flex items-center justify-between gap-2">

          <h2

            className="min-w-0 truncate text-sm font-semibold text-foreground"

            title={`${createdMeta} · ${customerName}`}

          >

            RO #{roNumber}

            <span className="mx-1.5 font-normal text-muted-foreground/45" aria-hidden>

              ·

            </span>

            <span>{customerName}</span>

            <Badge className={cn("ml-1.5 align-middle text-[10px]", pill.className)}>{pill.label}</Badge>

            <Badge

              variant="outline"

              className="ml-1 align-middle border-brand-navy/30 text-[10px] text-brand-navy"

            >

              Lab

            </Badge>

          </h2>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">

            <EstimateLabOdometerBar

              roId={roId}

              mileageIn={mileageIn}

              mileageOut={mileageOut}

              odometerNotWorking={odometerNotWorking}

              canEdit={canEdit}

              reqOdometer={reqOdometer}

              compact

            />

            <EstimateLabServiceAdvisorSelect

              roId={roId}

              serviceWriterId={serviceWriterId}

              serviceWriters={serviceWriters}

              canEdit={canEdit}

              compact

              className="shrink-0"

            />

          </div>

        </div>

      ) : null}



      <EstimateLabContextStack

        variant={variant}

        customer={customer}

        customerId={customerId}

        vehicle={vehicle}

        mileageIn={mileageIn}

        odometerNotWorking={odometerNotWorking}

        canEdit={canEdit}

        drawerData={drawerData}

        vehicleSpecs={vehicleSpecs}

      />

    </div>

  );

}


