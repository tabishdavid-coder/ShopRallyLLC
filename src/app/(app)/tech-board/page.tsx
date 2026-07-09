import { getShopId } from "@/lib/shop";
import { TechBoardView } from "@/components/tech-board/tech-board-view";
import { TechBoardToolbar } from "@/components/tech-board/tech-board-toolbar";
import { getTechBoard } from "@/server/tech-board";
import { getShopTechnicians } from "@/server/staff";

export const metadata = { title: "Tech Board — ShopRally" };

export default async function TechBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tech?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const technicianId = sp.tech ?? "";
  const shopId = await getShopId();

  const [columns, technicians] = await Promise.all([
    getTechBoard(shopId, {
      q: q || undefined,
      technicianId: technicianId || undefined,
    }),
    getShopTechnicians(shopId, { boardEligible: true }),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 job-board-shell">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-brand-navy">Tech Board</h1>
        <p className="text-sm text-muted-foreground">
          Dispatch approved work by technician — assign jobs from the RO WIP tab or estimate.
        </p>
      </div>
      <TechBoardToolbar query={q} technicianId={technicianId} technicians={technicians} />
      <TechBoardView columns={columns} />
    </div>
  );
}
