/** Default multi-point inspection checklist (shop template v1). */
export type InspectionTemplateItem = {
  name: string;
  category: string;
};

export type InspectionTemplate = {
  id: string;
  name: string;
  items: InspectionTemplateItem[];
};

export const DEFAULT_INSPECTION_TEMPLATE_NAME = "Courtesy Multi-Point Inspection";

export const DEFAULT_INSPECTION_TEMPLATE: InspectionTemplateItem[] = [
  { category: "Brakes", name: "Front brake pads" },
  { category: "Brakes", name: "Rear brake pads" },
  { category: "Brakes", name: "Brake lines & hoses" },
  { category: "Brakes", name: "Parking brake" },
  { category: "Tires & Wheels", name: "Tire tread depth" },
  { category: "Tires & Wheels", name: "Tire wear pattern" },
  { category: "Tires & Wheels", name: "Tire pressure" },
  { category: "Tires & Wheels", name: "Wheel alignment" },
  { category: "Under Hood", name: "Engine oil level & condition" },
  { category: "Under Hood", name: "Coolant level" },
  { category: "Under Hood", name: "Brake fluid" },
  { category: "Under Hood", name: "Power steering fluid" },
  { category: "Under Hood", name: "Drive belts" },
  { category: "Under Hood", name: "Hoses" },
  { category: "Under Hood", name: "Air filter" },
  { category: "Electrical", name: "Battery test" },
  { category: "Electrical", name: "Headlights" },
  { category: "Electrical", name: "Brake lights" },
  { category: "Electrical", name: "Turn signals" },
  { category: "Electrical", name: "Windshield wipers" },
  { category: "Steering & Suspension", name: "Shocks / struts" },
  { category: "Steering & Suspension", name: "Ball joints" },
  { category: "Steering & Suspension", name: "Tie rod ends" },
  { category: "Steering & Suspension", name: "Steering linkage" },
  { category: "Exhaust", name: "Exhaust system" },
  { category: "Exhaust", name: "Catalytic converter" },
  { category: "Interior", name: "Cabin air filter" },
  { category: "Interior", name: "Horn" },
  { category: "Interior", name: "Seat belts" },
  { category: "Under Vehicle", name: "Fluid leaks" },
  { category: "Under Vehicle", name: "CV boots" },
  { category: "Under Vehicle", name: "Transmission fluid" },
];

/** Shorter pre-purchase checklist (AutoLeap-style alternate template). */
export const PRE_PURCHASE_INSPECTION_TEMPLATE: InspectionTemplateItem[] = [
  { category: "Brakes", name: "Front brake pads" },
  { category: "Brakes", name: "Rear brake pads" },
  { category: "Tires & Wheels", name: "Tire tread depth" },
  { category: "Tires & Wheels", name: "Tire wear pattern" },
  { category: "Under Hood", name: "Engine oil level & condition" },
  { category: "Under Hood", name: "Coolant level" },
  { category: "Electrical", name: "Battery test" },
  { category: "Steering & Suspension", name: "Shocks / struts" },
  { category: "Exhaust", name: "Exhaust system" },
  { category: "Under Vehicle", name: "Fluid leaks" },
];

export const INSPECTION_TEMPLATES: InspectionTemplate[] = [
  { id: "courtesy", name: DEFAULT_INSPECTION_TEMPLATE_NAME, items: DEFAULT_INSPECTION_TEMPLATE },
  { id: "pre-purchase", name: "Pre-Purchase Inspection", items: PRE_PURCHASE_INSPECTION_TEMPLATE },
];

export function getInspectionTemplate(id: string): InspectionTemplate | undefined {
  return INSPECTION_TEMPLATES.find((t) => t.id === id);
}

export function getInspectionTemplateByName(name: string): InspectionTemplate | undefined {
  return INSPECTION_TEMPLATES.find((t) => t.name === name);
}
