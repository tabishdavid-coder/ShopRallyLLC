import type { LaborGuideSource } from "@/lib/labor-guide-types";

export type PrimaryLaborContext = {
  jobName: string;
  queryText?: string | null;
  laborOperations?: string[];
  motorSubGroupId?: number | null;
  position?: string | null;
};

export type LaborCompanionEdge = {
  id: string;
  jobName: string;
  description: string;
  searchQueries: string[];
  primaryPatterns: RegExp[];
  excludePrimaryPatterns?: RegExp[];
  concurrentOfStandaloneRatio: number;
  comboRuleId?: string;
  companionScopeId?: string;
};

export type ResolvedLaborCompanion = {
  edgeId: string;
  jobName: string;
  description: string;
  displayHours: number | null;
  standaloneHours: number | null;
  hoursMode: "concurrent" | "standalone" | "unresolved";
  hoursNote: string | null;
  sourceBadge: string;
  hitSource: LaborGuideSource;
  /** Provenance of the resolved hit so cart lines keep the correct tier badge. */
  dataSource?: string;
  position: string | null;
};

const brakePads = /\bbrake\b.*\bpads?\b|\bpads?\b.*\bbrake\b/i;
const brakeRotors = /\bbrake\b.*\brotors?\b|\brotors?\b.*\bbrake\b/i;

export const LABOR_COMPANION_EDGES: LaborCompanionEdge[] = [
  {
    id: "brake-pads-to-rotors",
    jobName: "Brake rotor replacement",
    description: "Replace brake rotors",
    searchQueries: ["brake rotors", "brake rotor replacement", "replace brake rotors"],
    primaryPatterns: [brakePads],
    excludePrimaryPatterns: [brakeRotors],
    concurrentOfStandaloneRatio: 0.35,
    comboRuleId: "pads_rotors",
    companionScopeId: "rotors",
  },
  {
    id: "brake-rotors-to-pads",
    jobName: "Brake pad replacement",
    description: "Replace brake pads",
    searchQueries: ["brake pads", "brake pad replacement", "replace brake pads"],
    primaryPatterns: [brakeRotors],
    excludePrimaryPatterns: [brakePads],
    concurrentOfStandaloneRatio: 0.45,
    comboRuleId: "pads_rotors",
    companionScopeId: "pads",
  },
  {
    id: "brake-pads-to-fluid-flush",
    jobName: "Brake fluid flush",
    description: "Brake fluid flush",
    searchQueries: ["brake fluid flush", "brake fluid exchange"],
    primaryPatterns: [brakePads, brakeRotors],
    excludePrimaryPatterns: [/\bfluid\b|\bflush\b|\bbleed/i],
    concurrentOfStandaloneRatio: 0.8,
  },
  {
    id: "brake-pads-to-caliper",
    jobName: "Brake caliper replacement",
    description: "Replace brake caliper",
    searchQueries: ["brake caliper replacement", "replace brake caliper"],
    primaryPatterns: [brakePads, brakeRotors],
    excludePrimaryPatterns: [/\bcalipers?\b/i],
    concurrentOfStandaloneRatio: 0.65,
  },
  {
    id: "tie-rod-to-alignment",
    jobName: "Wheel alignment",
    description: "Wheel alignment",
    searchQueries: ["wheel alignment", "four wheel alignment", "front end alignment"],
    primaryPatterns: [/\btie\s*rods?\b/i],
    excludePrimaryPatterns: [/\balignment\b/i],
    concurrentOfStandaloneRatio: 1,
  },
  {
    id: "control-arm-to-alignment",
    jobName: "Wheel alignment",
    description: "Wheel alignment",
    searchQueries: ["wheel alignment", "four wheel alignment", "front end alignment"],
    primaryPatterns: [/\bcontrol\s*arms?\b/i],
    excludePrimaryPatterns: [/\balignment\b/i],
    concurrentOfStandaloneRatio: 1,
  },
  {
    id: "strut-to-mount",
    jobName: "Strut mount replacement",
    description: "Replace strut mount",
    searchQueries: ["strut mount replacement", "replace strut mount"],
    primaryPatterns: [/\bstruts?\b|\bshock\s+absorbers?\b/i],
    excludePrimaryPatterns: [/\bmounts?\b/i],
    concurrentOfStandaloneRatio: 0.3,
  },
  {
    id: "bearing-to-hub",
    jobName: "Hub assembly replacement",
    description: "Replace hub assembly",
    searchQueries: ["hub assembly replacement", "wheel hub replacement", "replace hub assembly"],
    primaryPatterns: [/\bwheel\s+bearing\b|\bbearing\b/i],
    excludePrimaryPatterns: [/\bhub\b/i],
    concurrentOfStandaloneRatio: 0.45,
    comboRuleId: "wheel_bearing_hub",
    companionScopeId: "hub",
  },
  {
    id: "timing-belt-to-water-pump",
    jobName: "Water pump replacement",
    description: "Replace water pump",
    searchQueries: ["water pump replacement", "replace water pump"],
    primaryPatterns: [/\btiming\s+belt\b/i],
    excludePrimaryPatterns: [/\bwater\s+pump\b/i],
    concurrentOfStandaloneRatio: 0.4,
    comboRuleId: "timing_belt_water_pump",
    companionScopeId: "pump",
  },
  {
    id: "serpentine-belt-to-tensioner",
    jobName: "Drive belt tensioner replacement",
    description: "Replace drive belt tensioner",
    searchQueries: ["belt tensioner replacement", "drive belt tensioner", "serpentine belt tensioner"],
    primaryPatterns: [/\bserpentine\s+belt\b|\bdrive\s+belt\b/i],
    excludePrimaryPatterns: [/\btensioner\b/i],
    concurrentOfStandaloneRatio: 0.45,
    comboRuleId: "serpentine_belt_tensioner",
    companionScopeId: "tensioner",
  },
];

function primarySearchText(primary: PrimaryLaborContext): string {
  return [
    primary.jobName,
    primary.queryText ?? "",
    ...(primary.laborOperations ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchCompanionEdges(primary: PrimaryLaborContext): LaborCompanionEdge[] {
  const text = primarySearchText(primary);
  if (!text.trim()) return [];

  return LABOR_COMPANION_EDGES.filter((edge) => {
    if (!edge.primaryPatterns.some((pattern) => pattern.test(text))) return false;
    return !(edge.excludePrimaryPatterns ?? []).some((pattern) => pattern.test(text));
  });
}
