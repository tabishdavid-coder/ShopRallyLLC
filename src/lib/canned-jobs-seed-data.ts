/** Shared canned job templates for prisma seed + db:seed-canned-jobs script. */

export type CannedJobSeedTemplate = {
  name: string;
  category: string;
  description?: string;
  usageCount?: number;
  lastUsedDaysAgo?: number;
  labor: { description: string; hours: number; flatAmountCents?: number | null }[];
  parts: {
    description: string;
    brand?: string;
    partNumber?: string;
    costCents: number;
    quantity: number;
  }[];
};

export const CANNED_JOB_SEED_TEMPLATES: CannedJobSeedTemplate[] = [
  {
    name: "Synthetic oil & filter change",
    category: "Maintenance",
    description: "Drain and refill full synthetic oil, replace filter, reset service reminder.",
    usageCount: 12,
    lastUsedDaysAgo: 2,
    labor: [{ description: "Full synthetic oil & filter change", hours: 0.5 }],
    parts: [
      { description: "Oil filter", brand: "Motorcraft", partNumber: "OF-1240", costCents: 700, quantity: 1 },
      { description: "5W-30 full synthetic (6 qt)", brand: "Mobil 1", partNumber: "OIL-530", costCents: 2800, quantity: 1 },
    ],
  },
  {
    name: "Front brake pads & rotors",
    category: "Brakes",
    description: "Replace front brake pads and rotors, bed-in procedure, road test.",
    usageCount: 5,
    lastUsedDaysAgo: 7,
    labor: [
      { description: "R&R front brake pads and rotors", hours: 1.8 },
      { description: "Brake system bleed & road test", hours: 0.4 },
    ],
    parts: [
      { description: "Front brake pad set", brand: "Akebono", partNumber: "BP-4821", costCents: 4800, quantity: 1 },
      { description: "Front rotor", brand: "Bosch", partNumber: "RT-9920", costCents: 9500, quantity: 2 },
      { description: "Brake cleaner", brand: "CRC", partNumber: "BC-050", costCents: 450, quantity: 1 },
    ],
  },
  {
    name: "Rear brake pad replacement",
    category: "Brakes",
    description: "Replace rear brake pads, inspect rotors and hardware.",
    usageCount: 3,
    lastUsedDaysAgo: 14,
    labor: [{ description: "R&R rear brake pads", hours: 1.2 }],
    parts: [
      { description: "Rear brake pad set", brand: "Wagner", partNumber: "BP-R421", costCents: 4200, quantity: 1 },
    ],
  },
  {
    name: "NYS safety & emissions inspection",
    category: "Inspection",
    description: "New York State safety and emissions inspection with certificate.",
    usageCount: 8,
    lastUsedDaysAgo: 1,
    labor: [{ description: "NYS safety & emissions inspection", hours: 0.5 }],
    parts: [],
  },
  {
    name: "Coolant flush & fill",
    category: "Fluids",
    description: "Drain cooling system, flush, refill with OEM-spec coolant.",
    usageCount: 2,
    lastUsedDaysAgo: 21,
    labor: [{ description: "Cooling system flush & refill", hours: 1.2 }],
    parts: [
      { description: "Coolant concentrate (1 gal)", brand: "Prestone", partNumber: "AF-550", costCents: 1800, quantity: 1 },
      { description: "Distilled water (1 gal)", brand: "", partNumber: "DW-1G", costCents: 200, quantity: 1 },
    ],
  },
  {
    name: "Tire rotation & balance",
    category: "Maintenance",
    description: "Rotate tires per pattern, balance as needed, set pressures.",
    usageCount: 6,
    lastUsedDaysAgo: 5,
    labor: [{ description: "Rotate tires, check pressure & tread", hours: 0.4 }],
    parts: [],
  },
  {
    name: "Multi-point vehicle inspection",
    category: "Inspection",
    description: "21-point inspection with written report for customer.",
    usageCount: 10,
    lastUsedDaysAgo: 3,
    labor: [{ description: "21-point inspection checklist", hours: 0.35 }],
    parts: [],
  },
  {
    name: "Battery test & terminal service",
    category: "Electrical",
    description: "Load test battery, clean terminals, apply protectant.",
    usageCount: 3,
    lastUsedDaysAgo: 10,
    labor: [{ description: "Battery load test & terminal clean", hours: 0.25 }],
    parts: [
      { description: "Terminal protectant spray", brand: "Permatex", partNumber: "TP-800", costCents: 650, quantity: 1 },
    ],
  },
  {
    name: "Spark plug replacement (4-cyl)",
    category: "Engine",
    description: "Replace spark plugs, inspect coils and boots.",
    usageCount: 4,
    lastUsedDaysAgo: 18,
    labor: [{ description: "Replace spark plugs (4-cyl)", hours: 0.8 }],
    parts: [
      { description: "Iridium spark plug", brand: "NGK", partNumber: "LKAR7B-11", costCents: 1200, quantity: 4 },
    ],
  },
  {
    name: "Transmission fluid service",
    category: "Fluids",
    description: "Drain and refill automatic transmission fluid, replace filter if applicable.",
    usageCount: 2,
    lastUsedDaysAgo: 30,
    labor: [{ description: "ATF drain & fill service", hours: 0.9 }],
    parts: [
      { description: "ATF (1 qt)", brand: "Valvoline", partNumber: "ATF-MAX", costCents: 950, quantity: 5 },
      { description: "Transmission filter kit", brand: "Wix", partNumber: "TF-58821", costCents: 2200, quantity: 1 },
    ],
  },
  {
    name: "Four-wheel alignment",
    category: "Suspension",
    description: "Measure and adjust toe, camber, caster to factory spec.",
    usageCount: 5,
    lastUsedDaysAgo: 8,
    labor: [{ description: "Four-wheel alignment", hours: 1.0 }],
    parts: [],
  },
  {
    name: "A/C recharge & leak check",
    category: "Climate Control",
    description: "Evacuate and recharge A/C system, dye leak check, performance test.",
    usageCount: 1,
    lastUsedDaysAgo: 45,
    labor: [
      { description: "A/C evacuate, recharge & leak check", hours: 1.0 },
    ],
    parts: [
      { description: "R-134a refrigerant (1 lb)", brand: "Interdynamics", partNumber: "AC-134", costCents: 1800, quantity: 2 },
      { description: "UV leak detection dye", brand: "Interdynamics", partNumber: "UV-LEAK", costCents: 1200, quantity: 1 },
    ],
  },
];
