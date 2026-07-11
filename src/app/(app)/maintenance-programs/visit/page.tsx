import Link from "next/link";

import { ExpressVisitClient } from "@/components/maintenance/express-visit-client";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";

export const metadata = { title: "Service Visit — Maintenance Programs" };

export default async function ServiceVisitPage() {
  const shopId = await getShopId();
  const canAccess = await canUseReleasedFeature(shopId, "maintenance_programs");
  const user = await getCurrentUser();
  const techName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  if (!canAccess) {
    return (
      <div className="rounded-lg border p-6 text-sm text-center">
        Upgrade to Professional to record service visits.{" "}
        <Link href="/settings/subscription" className="text-brand-navy underline">
          View plans
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 workspace-surface">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Service visit</h1>
        <p className="text-sm text-muted-foreground">
          Quick-lube flow: find member → check off services → complete with timestamped audit record.
        </p>
      </div>
      <ExpressVisitClient defaultTechnicianName={techName} />
    </div>
  );
}
