"use client";

import { MaintenancePlanEditorShell } from "@/components/marketing/maintenance-plan-editor-shell";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { getMaintenancePlan } from "@/server/maintenance-programs";
import type { MaintenanceProgramService } from "@/generated/prisma";

type Plan = NonNullable<Awaited<ReturnType<typeof getMaintenancePlan>>>;

type ProgramService = MaintenanceProgramService & {
  cannedJob?: { id: string; name: string } | null;
};

type Props = {
  canEdit: boolean;
  plan: Plan;
  programServices?: ProgramService[] | null;
  cannedJobs?: CannedJobSummary[] | null;
  defaultTerms?: string | null;
  plansPublicUrl?: string;
};

export function MaintenancePlanEditor({
  canEdit,
  plan,
  programServices,
  cannedJobs,
  defaultTerms,
  plansPublicUrl,
}: Props) {
  return (
    <MaintenancePlanEditorShell
      canEdit={canEdit}
      plan={plan}
      programServices={programServices}
      cannedJobs={cannedJobs}
      defaultTerms={defaultTerms}
      plansPublicUrl={plansPublicUrl}
    />
  );
}
