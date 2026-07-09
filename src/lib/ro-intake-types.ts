import type { AdvancedSettings } from "@/lib/ro-settings";

export type RoIntakeLaborRate = {
  name: string;
  rateCents: number;
  isDefault: boolean;
};

/** Shop-scoped config for the create-RO intake form (page + sheet). */
export type RoIntakeConfig = {
  laborRates: RoIntakeLaborRate[];
  leadSources: string[];
  customerTags: string[];
  defaultMarketingOptIn: boolean;
  advanced: AdvancedSettings;
};

export type RoIntakeOpenOptions = {
  customerId?: string;
  vehicleId?: string;
};
