import { customerDisplayName } from "@/lib/format";
import type { JobBoard, JobCard } from "@/lib/job-board";
import { flattenJobBoard } from "@/lib/job-board-list-utils";
import { RO_STATUS_LABEL } from "@/lib/ro-status";

export type RoLabelOption = {
  id: string;
  number: number;
  customerName: string;
  vehicleLabel: string;
  statusLabel: string;
};

function vehicleLabelFromCard(vehicle: JobCard["vehicle"]): string {
  if (!vehicle) return "No vehicle";
  const ymm = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const plate = vehicle.plate
    ? `${vehicle.plate}${vehicle.plateState ? ` ${vehicle.plateState}` : ""}`
    : "";
  if (ymm && plate) return `${ymm} · ${plate}`;
  return ymm || plate || "No vehicle";
}

export function toRoLabelOption(card: JobCard): RoLabelOption {
  return {
    id: card.id,
    number: card.number,
    customerName: customerDisplayName(card.customer, { nameOrder: "firstLast" }),
    vehicleLabel: vehicleLabelFromCard(card.vehicle),
    statusLabel: RO_STATUS_LABEL[card.status] ?? card.status,
  };
}

/** Flatten the visible job board into RO Label picker options (newest RO # first). */
export function buildRoLabelOptions(board: JobBoard): RoLabelOption[] {
  return flattenJobBoard(board)
    .map((row) => toRoLabelOption(row.card))
    .sort((a, b) => b.number - a.number);
}

/** Open the print-friendly hang-tag label in a new tab. */
export function openRoLabelPrint(roId: string) {
  window.open(`/print/${roId}/label`, "_blank", "noopener,noreferrer");
}
