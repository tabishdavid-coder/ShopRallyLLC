import { Calculator } from "lucide-react";

import { SettingsSubnav, MARKUPS_SUBNAV } from "@/components/settings/settings-subnav";
import { SettingsHero } from "@/components/settings/settings-hero";

export default function MarkupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <SettingsHero
        icon={Calculator}
        title="Markups"
        description="Parts and labor matrices that auto-price every estimate — retail = cost × the multiplier for the matching range."
      />
      <SettingsSubnav items={MARKUPS_SUBNAV} ariaLabel="Markup settings">
        {children}
      </SettingsSubnav>
    </div>
  );
}
