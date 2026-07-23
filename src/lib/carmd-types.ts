/** Client-safe CarMD result shapes (service maps API → these). */

export type CarMdRepairPart = {
  description: string;
  priceCents: number | null;
  qty: string | null;
};

export type CarMdRepairHint = {
  description: string;
  urgency: number | null;
  urgencyDescription: string | null;
  difficulty: number | null;
  laborHours: number | null;
  laborCostCents: number | null;
  partsCostCents: number | null;
  totalCostCents: number | null;
  parts: CarMdRepairPart[];
};

export type CarMdDtcLookupResult = {
  code: string;
  title: string | null;
  definition: string | null;
  repairs: CarMdRepairHint[];
  mode: "live" | "mock";
};

export type CarMdMaintenanceItem = {
  description: string;
  dueMileage: number | null;
  isOem: boolean;
  totalCostCents: number | null;
};
