"use client";

import Link from "next/link";
import { Building2, ExternalLink, LayoutDashboard, Palette, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { designModeHref, MERGED_CRM_SURFACES, type MergedCrmSurface } from "@/lib/design-mode-merged-crm";
import { SHOPRALLY_CRM_DEV_PORT } from "@/lib/design-mode-tokens";
import { cn } from "@/lib/utils";

const SHELL_META = {
  master: { label: "Master CRM", className: "bg-brand-navy text-white" },
  shop: { label: "Shop CRM", className: "bg-brand-light text-brand-navy" },
  archive: { label: "Archive", className: "border-brand-navy/30 text-brand-navy" },
} as const;

function SurfaceCard({ surface }: { surface: MergedCrmSurface }) {
  const meta = SHELL_META[surface.shell];
  const href = designModeHref(surface.href);

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-brand-navy/35 hover:bg-brand-light/5"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge className={cn("shrink-0", meta.className)} variant={surface.shell === "archive" ? "outline" : "default"}>
          {meta.label}
        </Badge>
        <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <h3 className="mt-3 font-semibold text-brand-navy">{surface.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{surface.description}</p>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">{href}</p>
    </Link>
  );
}

/** Dev hub — browse merged CRM on main with design panel open. */
export function DesignModeMergedHub() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="space-y-3 rounded-xl border-2 border-brand-navy/20 bg-gradient-to-br from-brand-light/15 to-transparent p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">
            <Palette className="mr-1 size-3" />
            Design mode
          </Badge>
          <Badge variant="outline" className="border-brand-light font-mono text-brand-navy">
            :{SHOPRALLY_CRM_DEV_PORT}
          </Badge>
          <Badge variant="outline" className="border-emerald-600 text-emerald-700">
            Merged on main
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Merged CRM — live on DEV</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Batches 1–6 shipped to <code className="text-xs">main</code>. Each tile opens the real app with the
          design dock (<strong className="text-foreground">?design=open</strong>). Annotate with{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Shift+D</kbd>.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="bg-brand-navy">
            <Link href={designModeHref("/platform")}>
              <Building2 className="mr-1.5 size-3.5" />
              Master CRM
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={designModeHref("/dashboard")}>
              <LayoutDashboard className="mr-1.5 size-3.5" />
              Shop CRM
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={designModeHref("/design-review")}>
              <Sparkles className="mr-1.5 size-3.5" />
              Release archive
            </Link>
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy">Surfaces</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MERGED_CRM_SURFACES.map((surface) => (
            <SurfaceCard key={surface.id} surface={surface} />
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Dev server: <code className="rounded bg-muted px-1">npm run dev:3004</code> → port 3004 · Off on{" "}
        <code className="rounded bg-muted px-1">dev:3030</code> · Hide with{" "}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE=0</code>
      </p>
    </div>
  );
}
