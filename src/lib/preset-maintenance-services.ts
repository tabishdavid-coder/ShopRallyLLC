import type { ProgramServiceType } from "@/lib/maintenance-programs";

/** Built-in preventative maintenance presets for the plan builder library. */
export type PresetMaintenanceService = {
  id: string;
  name: string;
  description: string;
  category: string;
  serviceType: ProgramServiceType;
  defaultQuantity: number;
  defaultIntervalDays: number;
  /** Display-only miles hint for advisors (not stored on entitlement). */
  intervalMiles: number;
};

export const PRESET_MAINTENANCE_SERVICES: PresetMaintenanceService[] = [
  {
    id: "preset-oil-change",
    name: "Oil Change",
    description: "Full synthetic or conventional oil & filter service",
    category: "Maintenance",
    serviceType: "VISITS",
    defaultQuantity: 2,
    defaultIntervalDays: 180,
    intervalMiles: 5000,
  },
  {
    id: "preset-tire-rotation",
    name: "Tire Rotation",
    description: "Rotate tires and check tread depth & pressure",
    category: "Maintenance",
    serviceType: "VISITS",
    defaultQuantity: 2,
    defaultIntervalDays: 180,
    intervalMiles: 6000,
  },
  {
    id: "preset-brake-inspection",
    name: "Brake Inspection",
    description: "Visual brake pad, rotor, and fluid check",
    category: "Brakes",
    serviceType: "VISITS",
    defaultQuantity: 1,
    defaultIntervalDays: 365,
    intervalMiles: 12000,
  },
  {
    id: "preset-fluid-flush",
    name: "Fluid Flush",
    description: "Coolant, brake, or transmission fluid exchange",
    category: "Fluids",
    serviceType: "VISITS",
    defaultQuantity: 1,
    defaultIntervalDays: 730,
    intervalMiles: 30000,
  },
  {
    id: "preset-multi-point",
    name: "Multi-Point Inspection",
    description: "21-point vehicle health inspection every visit",
    category: "Inspection",
    serviceType: "EVERY_VISIT",
    defaultQuantity: 1,
    defaultIntervalDays: 90,
    intervalMiles: 0,
  },
  {
    id: "preset-battery-test",
    name: "Battery Test",
    description: "Load test battery and clean terminals",
    category: "Maintenance",
    serviceType: "VISITS",
    defaultQuantity: 1,
    defaultIntervalDays: 365,
    intervalMiles: 12000,
  },
  {
    id: "preset-cabin-filter",
    name: "Cabin Air Filter",
    description: "Replace cabin air filter",
    category: "Maintenance",
    serviceType: "VISITS",
    defaultQuantity: 1,
    defaultIntervalDays: 365,
    intervalMiles: 15000,
  },
  {
    id: "preset-alignment-check",
    name: "Alignment Check",
    description: "Four-wheel alignment measurement and report",
    category: "Maintenance",
    serviceType: "VISITS",
    defaultQuantity: 1,
    defaultIntervalDays: 365,
    intervalMiles: 12000,
  },
  {
    id: "preset-wiper-blades",
    name: "Wiper Blade Replacement",
    description: "Front wiper blade set installation",
    category: "Maintenance",
    serviceType: "VISITS",
    defaultQuantity: 1,
    defaultIntervalDays: 365,
    intervalMiles: 0,
  },
  {
    id: "preset-labor-discount",
    name: "10% Labor Discount",
    description: "Member discount on additional repair labor",
    category: "Perks",
    serviceType: "DISCOUNT",
    defaultQuantity: 1,
    defaultIntervalDays: 365,
    intervalMiles: 0,
  },
];
