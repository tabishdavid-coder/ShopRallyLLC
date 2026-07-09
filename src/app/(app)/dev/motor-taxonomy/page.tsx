import Link from "next/link";
import { ExternalLink, GitBranch } from "lucide-react";

import { MotorTaxonomyTree } from "@/components/dev/motor-taxonomy-tree";
import { Badge } from "@/components/ui/badge";
import { getMotorCatalogTree } from "@/server/services/motor/motor-taxonomy";

export const metadata = { title: "MOTOR Taxonomy — Dev" };

export const dynamic = "force-dynamic";

const DEFAULT_BASE_VEHICLE_ID = 22124;
const DEFAULT_VIN = "19XFA1F51AE028415";

type PageProps = {
  searchParams: Promise<{ baseVehicleId?: string }>;
};

function countNodes(
  tree: Awaited<ReturnType<typeof getMotorCatalogTree>>,
): { systems: number; groups: number; subgroups: number } {
  let systems = 0;
  let groups = 0;
  let subgroups = 0;

  function walk(nodes: typeof tree) {
    for (const node of nodes) {
      if (node.level === "system") systems += 1;
      else if (node.level === "group") groups += 1;
      else subgroups += 1;
      walk(node.children);
    }
  }

  walk(tree);
  return { systems, groups, subgroups };
}

export default async function DevMotorTaxonomyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const baseVehicleId = Number(params.baseVehicleId) || DEFAULT_BASE_VEHICLE_ID;
  const tree = await getMotorCatalogTree(baseVehicleId);
  const counts = countNodes(tree);
  const isEmpty = tree.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      <header className="space-y-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <GitBranch className="size-5 text-brand-navy" />
          <h1 className="text-lg font-semibold tracking-tight">MOTOR Taxonomy Tree</h1>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            MotorCatalogNode
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Synced MOTOR Estimated Work Times DrillDown taxonomy for{" "}
          <strong className="font-medium text-foreground">2010 Honda Civic</strong> (
          <code className="text-xs">{DEFAULT_VIN}</code>) — BaseVehicleID{" "}
          <code className="text-xs">{baseVehicleId}</code>. Structure: System → Group → SubGroup.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{counts.systems} systems</Badge>
          <Badge variant="secondary">{counts.groups} groups</Badge>
          <Badge variant="secondary">{counts.subgroups} subgroups</Badge>
          <Link
            href="/dev/labor-paths"
            className="inline-flex items-center gap-1 text-brand-navy hover:underline"
          >
            Labor browse paths <ExternalLink className="size-3" />
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-amber-300/60 bg-amber-50/50 p-4 text-sm text-amber-900">
          <p className="font-medium">No taxonomy nodes in DB for BaseVehicleID {baseVehicleId}.</p>
          <p className="mt-1 text-xs">
            Run{" "}
            <code className="rounded bg-amber-100 px-1">
              npm run sync:motor-taxonomy -- --baseVehicleId={baseVehicleId}
            </code>{" "}
            then refresh.
          </p>
        </div>
      ) : (
        <MotorTaxonomyTree nodes={tree} defaultOpen />
      )}

      <footer className="rounded-lg border border-dashed border-brand-navy/15 bg-brand-navy/[0.02] p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">CLI:</strong>{" "}
        <code>npm run print:motor-taxonomy</code> or{" "}
        <code>npx tsx scripts/print-motor-taxonomy-tree.ts --baseVehicleId={baseVehicleId}</code>
      </footer>
    </div>
  );
}
