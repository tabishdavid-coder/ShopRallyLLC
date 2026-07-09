import { getLeadSourceNames } from "@/server/actions/marketing";
import { MarketingSettings } from "@/components/settings/marketing-settings";

export default async function MarketingLeadSourcesPage() {
  const leadSources = await getLeadSourceNames();
  return <MarketingSettings initial={leadSources} />;
}
