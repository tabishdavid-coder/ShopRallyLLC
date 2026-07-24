/** Shared canned-job types (safe for client + server imports). */

export type CannedJobSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  updatedAt: Date;
  sortOrder: number;
  laborLineCount: number;
  partLineCount: number;
  feeLineCount: number;
  discountLineCount: number;
  inspectionLineCount: number;
  laborHours: number;
  partsCostCents: number;
};

export type CannedJobDetail = CannedJobSummary & {
  laborLines: {
    id: string;
    description: string;
    hours: number;
    flatAmountCents: number | null;
    sortOrder: number;
  }[];
  partLines: {
    id: string;
    lineType: "PART" | "TIRE" | "SUBLET" | "OTHER";
    brand: string | null;
    description: string;
    partNumber: string | null;
    costCents: number;
    quantity: number;
    inventoryPartId: string | null;
    tireStockId: string | null;
    sortOrder: number;
  }[];
  feeLines: {
    id: string;
    name: string;
    method: "PERCENT" | "FIXED";
    base: "LABOR" | "PARTS" | "LABOR_PARTS";
    amount: number;
    capCents: number | null;
    taxable: boolean;
    sortOrder: number;
  }[];
  discountLines: {
    id: string;
    name: string;
    method: "PERCENT" | "FIXED";
    base: "LABOR" | "PARTS" | "LABOR_PARTS";
    amount: number;
    sortOrder: number;
  }[];
  inspectionLines: {
    id: string;
    name: string;
    description: string | null;
    inspectionTemplateId: string | null;
    hours: number;
    flatAmountCents: number | null;
    sortOrder: number;
  }[];
};
