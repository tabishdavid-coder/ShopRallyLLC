/** Static job rows for offline visual mockup — not from labor cache. */



export type MockJobRow = {

  id: string;

  name: string;

  hours: number;

  position?: string;

  skill?: string;

  includes?: string;

  partsCount?: number;

  related?: string[];

  /** Assembly qualifier variant (heater core w/ vs w/o AC). */

  variant?: "with-ac" | "without-ac";

};



export type MockVehicle = {

  label: string;

  vin?: string;

  year: number;

  make: string;

  model: string;

  engine: string;

};



export const DEFAULT_VEHICLE: MockVehicle = {

  label: "2010 Honda Civic",

  vin: "19XFA1F51AE028415",

  year: 2010,

  make: "Honda",

  model: "Civic",

  engine: "2.0L 4-cyl",

};



export const HEATER_CORE_VEHICLE: MockVehicle = {

  label: "2009 Hyundai Sonata GLS",

  year: 2009,

  make: "Hyundai",

  model: "Sonata",

  engine: "2.4L 4-cyl",

};



export const QUICK_CHIPS = [

  { label: "Front brakes", query: "front brake pads", chipId: "front-brakes" },

  { label: "Rear brakes", query: "rear brake pads", chipId: "rear-brakes" },

  { label: "Struts", query: "front strut", chipId: "struts" },

  { label: "Rotors", query: "brake rotor", chipId: "rotors" },

  { label: "A/C recharge", query: "ac recharge", chipId: "ac-recharge" },

] as const;



export const RECENT_JOBS = [

  { name: "Brake Pads R&R — Front", hours: 1.0, query: "front brake pads" },

  { name: "Strut / Shock R&R — Front", hours: 2.0, query: "front strut" },

  { name: "Rotor R&R (each) — Rear", hours: 0.5, query: "rear brake rotor" },

] as const;



const BRAKE_PAD_JOBS: MockJobRow[] = [

  {

    id: "pads-front",

    name: "Brake Pads R&R",

    hours: 1.0,

    position: "Front",

    skill: "B",

    includes: "Pads (front axle), caliper hardware",

    partsCount: 1,

    related: ["Rotor R&R (each)", "Brake fluid flush"],

  },

  {

    id: "pads-rear",

    name: "Brake Pads R&R",

    hours: 1.0,

    position: "Rear",

    skill: "B",

    includes: "Pads (rear axle)",

    partsCount: 1,

    related: ["Rotor R&R (each)"],

  },

  {

    id: "rotor-each-rear",

    name: "Rotor R&R (each)",

    hours: 0.5,

    position: "Rear",

    skill: "B",

    partsCount: 1,

  },

  {

    id: "pads-rotors-front",

    name: "Brake Pads & Rotors R&R",

    hours: 1.3,

    position: "Front",

    skill: "B",

    includes: "Pads + rotors (front axle)",

    partsCount: 2,

  },

];



const STRUT_JOBS: MockJobRow[] = [

  {

    id: "strut-front",

    name: "Strut / Shock R&R",

    hours: 2.0,

    position: "Front",

    skill: "C",

    includes: "Strut assembly, mount inspection",

    partsCount: 2,

    related: ["Strut mount / bearing", "Wheel alignment"],

  },

  {

    id: "strut-rear",

    name: "Strut / Shock R&R",

    hours: 1.5,

    position: "Rear",

    skill: "C",

    partsCount: 2,

  },

  {

    id: "strut-mount-front",

    name: "Strut Mount / Bearing",

    hours: 0.8,

    position: "Front",

    skill: "B",

    partsCount: 1,

  },

];



const ROTOR_SEARCH: MockJobRow[] = [

  {

    id: "rotor-front",

    name: "Rotor R&R (each)",

    hours: 0.5,

    position: "Front",

    skill: "B",

    partsCount: 1,

  },

  {

    id: "rotor-rear",

    name: "Rotor R&R (each)",

    hours: 0.5,

    position: "Rear",

    skill: "B",

    partsCount: 1,

  },

  {

    id: "resurface",

    name: "Resurface / Turn Rotors",

    hours: 0.3,

    position: "Front",

    skill: "A",

  },

];



const AC_SEARCH: MockJobRow[] = [

  { id: "ac-recharge", name: "A/C Recharge", hours: 0.5, skill: "B", partsCount: 1 },

  { id: "ac-evac", name: "Evac & Recharge", hours: 1.0, skill: "B", partsCount: 2 },

  { id: "ac-leak", name: "A/C Leak Test", hours: 0.8, skill: "B" },

];



export const HEATER_CORE_JOBS: MockJobRow[] = [

  {

    id: "heater-with-ac",

    name: "Heater Core R&R w/ AC",

    hours: 5.2,

    skill: "D",

    includes: "Evacuate AC, recover refrigerant, refill coolant",

    partsCount: 1,

    variant: "with-ac",

  },

  {

    id: "heater-without-ac",

    name: "Heater Core R&R w/o AC",

    hours: 4.1,

    skill: "C",

    includes: "Drain coolant, refill, bleed system",

    partsCount: 1,

    variant: "without-ac",

  },

];



export function mockJobsForContext(ctx: {

  categoryId?: string | null;

  subcategoryId?: string | null;

  positionId?: string | null;

  operationId?: string | null;

  searchQuery?: string;

}): MockJobRow[] {

  const q = (ctx.searchQuery ?? "").trim().toLowerCase();



  if (q.includes("strut") || q.includes("shock")) {

    return STRUT_JOBS.filter((j) => !q.includes("rear") || j.position === "Rear");

  }

  if (q.includes("rotor") && !q.includes("pad")) return ROTOR_SEARCH;

  if (q.includes("ac") || q.includes("recharge") || q.includes("a/c")) return AC_SEARCH;

  if (q.includes("heater")) return HEATER_CORE_JOBS;

  if (q.includes("rear") && q.includes("brake")) {

    return BRAKE_PAD_JOBS.filter((j) => j.position === "Rear" || j.id === "rotor-each-rear");

  }

  if (q.includes("brake") || q.includes("pad")) {

    return BRAKE_PAD_JOBS.filter((j) => !q.includes("rear") || j.position === "Rear");

  }



  if (ctx.subcategoryId === "brakes-pads") {

    const pos = ctx.positionId ?? "front";

    return BRAKE_PAD_JOBS.filter(

      (j) =>

        (pos === "front" ? j.position === "Front" : j.position === "Rear") &&

        (ctx.operationId === "pads-rotors" ? j.id.includes("rotors") : !j.id.includes("rotors")),

    );

  }

  if (ctx.subcategoryId === "suspension-struts") {

    const pos = ctx.positionId ?? "front";

    return STRUT_JOBS.filter((j) =>

      pos === "front" ? j.position === "Front" : j.position === "Rear",

    );

  }

  if (ctx.subcategoryId === "hvac-heater-core") {

    return HEATER_CORE_JOBS;

  }



  return [];

}



export function qualifierForSubcategory(subcategoryId: string | null | undefined): string | null {

  if (subcategoryId === "brakes-pads") return "Disc · 4-Wheel ABS";

  if (subcategoryId === "suspension-struts") return "MacPherson strut · FWD";

  if (subcategoryId === "hvac-heater-core") return "With Air Conditioning · from VIN/trim";

  return null;

}



export function qualifierVariantLabel(variant: "with-ac" | "without-ac"): string {

  return variant === "with-ac" ? "With Air Conditioning" : "Without Air Conditioning";

}


