/** Shared shop labor catalog rows for prisma seed + idempotent scripts. */

export type ShopLaborItemSeed = {
  name: string;
  description?: string;
  rateCents: number;
  defaultHours: number;
  costCents?: number;
  taxable?: boolean;
  isActive?: boolean;
};

export const SHOP_LABOR_ITEM_SEED: ShopLaborItemSeed[] = [
  {
    name: "Maintenance Labor",
    description: "General maintenance and fluid services",
    rateCents: 15000,
    defaultHours: 1,
    costCents: 4500,
    taxable: true,
  },
  {
    name: "Inspection Labor",
    description: "Multi-point and pre-purchase inspections",
    rateCents: 15000,
    defaultHours: 0.5,
    costCents: 3500,
    taxable: true,
  },
  {
    name: "Diagnostic Labor",
    description: "Scan, test, and root-cause diagnosis",
    rateCents: 16500,
    defaultHours: 1,
    costCents: 5000,
    taxable: true,
  },
  {
    name: "Brake Labor",
    description: "Pad, rotor, and hydraulic brake work",
    rateCents: 15000,
    defaultHours: 1.5,
    costCents: 4800,
    taxable: true,
  },
  {
    name: "Electrical Labor",
    description: "Wiring, modules, and electrical diagnosis",
    rateCents: 16500,
    defaultHours: 1,
    costCents: 5200,
    taxable: true,
  },
  {
    name: "Alignment Labor",
    description: "Four-wheel alignment and suspension adjustment",
    rateCents: 14000,
    defaultHours: 1,
    costCents: 4000,
    taxable: true,
  },
  {
    name: "Sublet Labor",
    description: "Pass-through sublet markup labor line",
    rateCents: 0,
    defaultHours: 0,
    costCents: 0,
    taxable: false,
    isActive: true,
  },
];
