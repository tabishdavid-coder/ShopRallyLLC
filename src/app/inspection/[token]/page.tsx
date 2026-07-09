import { notFound } from "next/navigation";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { ServiceAdvisorCard } from "@/components/service-advisor-card";
import { InspectionItemStatusBadge, InspectionWorkflowBadge } from "@/components/inspections/inspection-badges";
import { groupInspectionItems, INSPECTION_STATUS_DOT } from "@/lib/inspection";
import { getPublicInspectionView } from "@/server/inspections";
import { cn } from "@/lib/utils";
import { InspectionStatus } from "@/generated/prisma";

export const metadata = { title: "Your vehicle inspection — ShopRally" };

export default async function PublicInspectionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getPublicInspectionView(token);
  if (!view) notFound();

  const groups = groupInspectionItems(view.items);
  const isComplete = view.status === InspectionStatus.COMPLETED;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-5">
        <ShopRallyLogo href="https://getshoprally.com" size="sm" />

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="border-b pb-4">
            <p className="text-sm text-muted-foreground">{view.shopName}</p>
            <h1 className="mt-1 text-xl font-bold">{view.templateName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              RO #{view.roNumber} · {view.customerName} · {view.vehicleLabel}
            </p>
            {view.performedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Completed {view.performedAt.toLocaleDateString("en-US")}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <InspectionWorkflowBadge status={view.status} />
              <span className="text-xs text-muted-foreground">
                {view.progress.rated}/{view.progress.total} items rated ({view.progress.percent}%)
              </span>
            </div>
            <ServiceAdvisorCard advisor={view.serviceAdvisor} compact className="mt-2" />
          </div>

          <div className="space-y-4 py-4">
            {groups.map((group) => (
              <section key={group.category}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">{group.category}</h2>
                <ul className="divide-y rounded-lg border">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("size-2.5 shrink-0 rounded-full", INSPECTION_STATUS_DOT[item.status])}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        {item.status !== "NA" ? (
                          <InspectionItemStatusBadge status={item.status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Not rated</span>
                        )}
                        {item.note ? (
                          <p className="text-xs text-muted-foreground max-w-xs text-right">{item.note}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {isComplete ? (
            <p className="border-t pt-4 text-sm text-emerald-800">
              Your inspection has been completed. Contact {view.shopName} if you have questions about
              any recommended services.
            </p>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">
              This inspection is still in progress. Your shop may update results before sharing the
              final report.
            </p>
          )}
        </div>

        <PoweredByShopRally className="text-center" />
      </div>
    </div>
  );
}
