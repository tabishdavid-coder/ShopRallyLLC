import Link from "next/link";
import { notFound } from "next/navigation";

import { MaintenancePlanEditorShell } from "@/components/marketing/maintenance-plan-editor-shell";
import { appUrl } from "@/lib/app-url";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { listCannedJobsForPicker } from "@/server/canned-jobs";
import {
  ensureProgramSettings,
  getMaintenancePlan,
} from "@/server/maintenance-programs";
import { listProgramServices } from "@/server/maintenance-program-services";

export const metadata = { title: "Edit subscription — ShopRally" };
export const dynamic = "force-dynamic";

export default async function EditMaintenancePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const [canEdit, plan, settings, services, cannedJobs] = await Promise.all([
    canUseFeature(shopId, "maintenance_programs"),
    getMaintenancePlan(shopId, id),
    ensureProgramSettings(shopId),
    listProgramServices(shopId),
    listCannedJobsForPicker(shopId),
  ]);

  if (!plan) notFound();

  const slug = settings.plansSlug ?? "plans";
  const plansPublicUrl = await appUrl(`/plans/${slug}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        {!canEdit ? (
          <Link href="/settings/subscription" className="text-sm text-brand-navy underline">
            Upgrade to edit
          </Link>
        ) : null}
      </div>
      <MaintenancePlanEditorShell
        canEdit={canEdit}
        plan={plan}
        programServices={services ?? []}
        cannedJobs={cannedJobs ?? []}
        defaultTerms={settings.termsDefault}
        plansPublicUrl={plansPublicUrl}
      />
    </div>
  );
}
