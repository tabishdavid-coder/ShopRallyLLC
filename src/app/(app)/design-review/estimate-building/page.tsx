import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EstimateBuildingLabPanel } from "@/components/estimate-building/estimate-building-lab-panel";
import { EstimateBuildingDesignModeRedirect } from "@/components/estimate-building/estimate-building-design-mode-redirect";
import { EstimateWorkspaceScope } from "@/components/estimate-building/estimate-workspace-scope";
import {
  EstimateLabRoPicker,
  type EstimateLabRoOption,
} from "@/components/estimate-building/estimate-lab-ro-picker";
import { designModeHref } from "@/lib/design-mode-merged-crm";
import { DESIGN_MODE_QUERY, isDesignModeEnabled } from "@/lib/design-mode-tokens";
import { getShopId } from "@/lib/shop";
import { listEstimateLabRos } from "@/server/estimate-building-lab";

export const metadata = { title: "Estimate Building Lab — ShopRally" };

function customerLabel(c: { firstName: string | null; lastName: string | null; company: string | null }) {
  return (
    c.company?.trim() ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    "Customer"
  );
}

function vehicleLabel(v: { year: number | null; make: string | null; model: string | null } | null) {
  if (!v) return "Vehicle";
  return [v.year, v.make, v.model].filter(Boolean).join(" ");
}

function pickDefaultRo(ros: Awaited<ReturnType<typeof listEstimateLabRos>>, requestedId?: string) {
  if (requestedId && ros.some((r) => r.id === requestedId)) return requestedId;
  return ros[0]?.id ?? null;
}

export default async function EstimateBuildingLabPage({
  searchParams,
}: {
  searchParams: Promise<{ ro?: string; design?: string }>;
}) {
  const sp = await searchParams;
  const designModeEnabled = isDesignModeEnabled();

  if (designModeEnabled && sp.design !== "open") {
    const params = new URLSearchParams();
    if (sp.ro) params.set("ro", sp.ro);
    params.set(DESIGN_MODE_QUERY, "open");
    redirect(`/design-review/estimate-building?${params.toString()}`);
  }
  const shopId = await getShopId();
  const ros = await listEstimateLabRos(shopId);
  const selectedRoId = pickDefaultRo(ros, sp.ro);
  const selectedRo = ros.find((r) => r.id === selectedRoId);

  const pickerOptions: EstimateLabRoOption[] = ros.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    customerLabel: customerLabel(r.customer),
    vehicleLabel: vehicleLabel(r.vehicle),
    jobCount: r._count.jobs,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3">
      {designModeEnabled ? (
        <Suspense fallback={null}>
          <EstimateBuildingDesignModeRedirect />
        </Suspense>
      ) : null}
      <header className="shrink-0 space-y-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={designModeHref("/design-review")}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >            <ArrowLeft className="size-3.5" />
            Design review
          </Link>
          <Badge variant="outline" className="border-brand-navy/30 bg-brand-navy/5 font-mono text-brand-navy">
            Design mode
          </Badge>
          <Badge variant="outline" className="border-brand-navy text-brand-navy">
            <FlaskConical className="mr-1 size-3" />
            Estimate building
          </Badge>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-brand-navy">Estimate Building Lab</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Blended Tekmetric + AutoLeap estimate builder on live repair orders. Main{" "}
              <code className="text-xs">/repair-orders/[id]/estimate</code> is unchanged until merge approval.
            </p>
          </div>
          <Suspense fallback={null}>
            <EstimateLabRoPicker
              ros={pickerOptions}
              selectedId={selectedRoId}
              selectedNumber={selectedRo?.number ?? null}
            />
          </Suspense>
        </div>
      </header>

      <section className="estimate-workspace min-h-0 flex-1 overflow-hidden">
        <EstimateWorkspaceScope />
        {selectedRoId ? (
          <EstimateBuildingLabPanel roId={selectedRoId} shopId={shopId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">No editable repair orders found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create or open an estimate-status RO from the job board, then return here.
            </p>
            <Link href="/job-board" className="text-sm font-semibold text-brand-navy hover:underline">
              Open job board →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
