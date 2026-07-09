import { getLeadSourceNames } from "@/server/actions/marketing";
import { MarketingSettings } from "@/components/settings/marketing-settings";

export default async function MarketingSettingsPage() {
  const leadSources = await getLeadSourceNames();
  return <MarketingSettings initial={leadSources} />;
}
