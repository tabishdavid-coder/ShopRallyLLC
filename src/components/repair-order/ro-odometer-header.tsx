"use client";

import { useState } from "react";

import {
  MileageInDialog,
  MileageOutDialog,
  useRoMileageSave,
} from "@/components/repair-order/ro-sidebar-field-dialogs";
import { cn } from "@/lib/utils";

function fmtMiles(n: number) {
  return `${n.toLocaleString()} mi`;
}

export function RoOdometerHeader({
  roId,
  mileageIn,
  mileageOut,
  odometerNotWorking,
  reqOdometer = false,
}: {
  roId: string;
  mileageIn: number | null;
  mileageOut: number | null;
  odometerNotWorking: boolean;
  reqOdometer?: boolean;
}) {
  const save = useRoMileageSave(roId);
  const [dialog, setDialog] = useState<"in" | "out" | null>(null);

  const inLabel = odometerNotWorking
    ? "Not working"
    : mileageIn != null
      ? fmtMiles(mileageIn)
      : "Add odometer";
  const outLabel = mileageOut != null ? fmtMiles(mileageOut) : "Add odometer";
  const inEmpty = !odometerNotWorking && mileageIn == null;

  const btnClass = (empty: boolean) =>
    cn(
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/60",
      empty
        ? "text-muted-foreground underline-offset-2 hover:text-brand-navy hover:underline"
        : "font-medium text-foreground hover:text-brand-navy hover:underline",
    );

  return (
    <>
      <span className="ro-workspace-hero-odometer">
        In:{" "}
        <button type="button" onClick={() => setDialog("in")} className={btnClass(inEmpty)}>
          {inLabel}
        </button>
      </span>
      <span className="text-border">|</span>
      <span>
        Out:{" "}
        <button
          type="button"
          onClick={() => setDialog("out")}
          className={btnClass(mileageOut == null)}
        >
          {outLabel}
        </button>
      </span>

      <MileageInDialog
        open={dialog === "in"}
        onOpenChange={(o) => !o && setDialog(null)}
        mileageIn={mileageIn}
        odometerNotWorking={odometerNotWorking}
        reqOdometer={reqOdometer}
        onSave={async (patch) => save(patch)}
      />
      <MileageOutDialog
        open={dialog === "out"}
        onOpenChange={(o) => !o && setDialog(null)}
        mileageOut={mileageOut}
        onSave={async (val) => save({ mileageOut: val })}
      />
    </>
  );
}
