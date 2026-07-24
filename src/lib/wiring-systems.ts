import type { WiringSystem } from "@/generated/prisma";

/** OEM wiring diagram categories keyed by vehicle + system. */
export const WIRING_SYSTEMS: WiringSystem[] = [
  "ENGINE_MANAGEMENT",
  "ABS",
  "BODY_CONTROL",
  "HVAC",
  "OTHER",
];

export const WIRING_SYSTEM_LABELS: Record<WiringSystem, string> = {
  ENGINE_MANAGEMENT: "Engine Management",
  ABS: "ABS",
  BODY_CONTROL: "Body Control",
  HVAC: "HVAC",
  OTHER: "Other",
};

/** Map vehicle make to OEM portal brand slug (lowercase). */
export function oemBrandFromMake(make: string | null | undefined): string | null {
  if (!make?.trim()) return null;
  const normalized = make.trim().toLowerCase();
  const aliases: Record<string, string> = {
    acura: "honda",
    lexus: "toyota",
    scion: "toyota",
    infiniti: "nissan",
    genesis: "hyundai",
  };
  return aliases[normalized] ?? normalized;
}

export function isWiringSystem(value: string): value is WiringSystem {
  return (WIRING_SYSTEMS as readonly string[]).includes(value);
}
