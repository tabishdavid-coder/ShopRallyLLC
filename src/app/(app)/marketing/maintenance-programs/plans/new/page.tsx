import Link from "next/link";

import { MaintenancePlanEditorShell } from "@/components/marketing/maintenance-plan-editor-shell";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { listCannedJobsForPicker } from "@/server/canned-jobs";
import { ensureProgramSettings } from "@/server/maintenance-programs";
import { listProgramServices } from "@/server/maintenance-program-services";

export const metadata = { title: "New subscription — ShopRally" };

export default async function NewMaintenancePlanPage() {
  const shopId = await getShopId();
  const [canEdit, settings, services, cannedJobs] = await Promise.all([
    canUseReleasedFeature(shopId, "maintenance_programs"),
    ensureProgramSettings(shopId),
    listProgramServices(shopId),
    listCannedJobsForPicker(shopId),
  ]);

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upgrade to Professional to create maintenance subscriptions.{" "}
          <Link href="/settings/subscription" className="text-brand-navy underline">
            View plans
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">New maintenance plan</h2>
        <p className="text-sm text-muted-foreground">
          Configure basics, services, pricing, and publish — all on one page.
        </p>
      </div>
      <MaintenancePlanEditorShell
        canEdit={canEdit}
        programServices={services ?? []}
        cannedJobs={cannedJobs ?? []}
        defaultTerms={settings.termsDefault}
      />
    </div>
  );
}
