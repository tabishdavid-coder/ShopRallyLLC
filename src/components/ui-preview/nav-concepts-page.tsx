"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";

import { ShopRallyMark } from "@/components/brand/shoprally-logo";
import {
  PreviewSidebar,
  useApplyPreviewNavModel,
} from "@/components/ui-preview/preview-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  PREVIEW_SHELL_LAYOUT_KEY,
  PREVIEW_SHELL_LAYOUTS,
  PREVIEW_TOP_NAV,
  type PreviewShellLayoutId,
} from "@/lib/preview-top-nav-config";
import {
  PREVIEW_NAV_MODELS,
  getPreviewNavModel,
  type PreviewNavModelId,
} from "@/lib/preview-nav-models";
import { cn } from "@/lib/utils";
import type { Shop } from "@/lib/shop";

function MiniTopNavMock() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card text-[8px]">
      <div className="flex items-center gap-1 border-b bg-brand-navy px-2 py-1.5 text-white">
        <ShopRallyMark size={14} variant="onDark" decorative className="shrink-0" />
        {PREVIEW_TOP_NAV.slice(0, 6).map((e) => (
          <span key={e.label} className="rounded bg-white/10 px-1 py-0.5">
            {e.label}
          </span>
        ))}
        <span className="ml-auto rounded bg-brand-red px-1">New Repair Order</span>
      </div>
      <div className="flex gap-1 border-b px-2 py-1 text-brand-navy/70">
        <span className="rounded bg-brand-navy px-1 text-white">Shop Home</span>
        <span>Tech Board</span>
        <span>Appointments</span>
      </div>
      <div className="h-16 bg-[oklch(0.985_0.008_247)]" />
    </div>
  );
}

function MiniNavMock({ modelId }: { modelId: PreviewNavModelId }) {
  const model = getPreviewNavModel(modelId);
  const isRail = model.id === "stripe-rail";

  if (isRail && model.sections) {
    return (
      <div className="flex h-full overflow-hidden rounded-b-lg border-t bg-card text-[8px]">
        <div className="flex w-8 shrink-0 flex-col items-center gap-1 bg-brand-navy py-2">
          {model.sections.slice(0, 5).map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "size-5 rounded",
                i === 0 ? "bg-white/20" : "bg-white/5",
              )}
            />
          ))}
        </div>
        <div className="flex-1 p-2">
          <p className="mb-1 font-bold uppercase text-brand-navy/50">{model.sections[0]?.label}</p>
          {model.sections[0]?.items.slice(0, 5).map((item) => (
            <p key={item.title} className="truncate py-0.5 text-brand-navy">
              {item.title}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-b-lg border-t bg-card p-2 text-[8px]">
      {model.groups?.map((group) => (
        <div key={group.label ?? "root"} className="mb-2">
          {group.label ? (
            <p className="mb-0.5 font-bold uppercase tracking-wide text-brand-navy/45">
              {group.label}
            </p>
          ) : null}
          {group.items.slice(0, group.label ? 4 : 3).map((item, i) => (
            <p
              key={item.title + item.href}
              className={cn(
                "truncate rounded px-1 py-0.5",
                i === 0 && "bg-brand-light/30 font-semibold text-brand-navy",
              )}
            >
              {item.title}
            </p>
          ))}
          {(group.items.length > 4) ? (
            <p className="text-muted-foreground">+{group.items.length - 4} more</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function NavConceptsInner({ shops, activeShopId }: { shops: Shop[]; activeShopId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<PreviewNavModelId>("hubspot");
  const [shellLayout, setShellLayout] = useState<PreviewShellLayoutId>("top-nav");
  const applyModel = useApplyPreviewNavModel();
  const meta = getPreviewNavModel(selected);

  function applyShellLayout(id: PreviewShellLayoutId) {
    try {
      localStorage.setItem(PREVIEW_SHELL_LAYOUT_KEY, id);
    } catch {
      /* ignore */
    }
    setShellLayout(id);
    router.push(`/preview?shell=${id}`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
            <Link href="/preview">
              <ArrowLeft className="size-3.5" />
              Back to shop home
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            Navigation layout
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Move menus off the left sidebar for easier scanning — or compare sidebar
            grouping models. All changes stay in this preview environment.
          </p>
        </div>
        <Badge variant="outline" className="border-brand-light text-brand-navy">
          shoprally preview
        </Badge>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">
          Step 1 — Where menus live
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PREVIEW_SHELL_LAYOUTS.map((layout) => (
            <Card
              key={layout.id}
              className={cn(
                shellLayout === layout.id && "ring-2 ring-brand-navy",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{layout.name}</CardTitle>
                  {layout.recommended ? (
                    <Badge className="bg-brand-navy">Recommended</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{layout.reference}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {layout.id === "top-nav" ? (
                  <MiniTopNavMock />
                ) : (
                  <MiniNavMock modelId="hubspot" />
                )}
                <p className="text-sm text-muted-foreground">{layout.description}</p>
                <Button
                  size="sm"
                  className="w-full bg-brand-navy"
                  onClick={() => applyShellLayout(layout.id)}
                >
                  Use {layout.name.toLowerCase()}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-brand-navy">
          Step 2 — Sidebar grouping (if using left sidebar)
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Only applies when shell layout is left sidebar. Top command bar uses its
          own module spread.
        </p>

      <div className="flex flex-wrap gap-2">
        {PREVIEW_NAV_MODELS.map((m) => (
          <Button
            key={m.id}
            type="button"
            size="sm"
            variant={selected === m.id ? "default" : "outline"}
            className={cn(selected === m.id && "bg-brand-navy")}
            onClick={() => setSelected(m.id)}
          >
            {m.name}
            {m.recommended ? " ★" : ""}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-md">
          <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">{meta.name}</span>
            {meta.recommended ? (
              <Badge className="bg-brand-navy">Recommended</Badge>
            ) : null}
          </div>
          <div className="grid min-h-[360px] grid-cols-[140px_1fr]">
            <MiniNavMock modelId={selected} />
            <div className="flex items-center justify-center bg-[oklch(0.985_0.008_247)] p-4 text-center text-xs text-muted-foreground">
              Main content area — job board, customers, etc.
              <br />
              <span className="text-brand-navy/70">{meta.reference}</span>
            </div>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{meta.tagline}</p>
            <p className="text-xs text-muted-foreground">Reference: {meta.reference}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-semibold text-emerald-700">Strengths</p>
              <ul className="space-y-1">
                {meta.pros.map((p) => (
                  <li key={p} className="flex gap-2 text-muted-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-semibold text-brand-red">Trade-offs</p>
              <ul className="space-y-1">
                {meta.cons.map((c) => (
                  <li key={c} className="flex gap-2 text-muted-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-red" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full gap-1.5 bg-brand-navy"
              onClick={() => applyModel(selected)}
            >
              Use this menu in preview
              <ExternalLink className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">CRM comparison</h2>
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">CRM pattern</th>
                  <th className="py-2 pr-4 font-medium">How menus spread</th>
                  <th className="py-2 pr-4 font-medium">Best for</th>
                  <th className="py-2 font-medium">ShopRally mapping</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  [
                    "HubSpot / Freshworks",
                    "Horizontal top bar + dropdown modules",
                    "Easier scan, full-width content",
                    "Top command bar ★ (default)",
                  ],
                  [
                    "HubSpot sidebar",
                    "Objects by job: Today → Work → Records → Setup",
                    "Daily ops + CRM balance",
                    "Work-first sidebar model",
                  ],
                  [
                    "Salesforce",
                    "App launcher + clouds (Sales, Service…)",
                    "Large teams, role training",
                    "App clouds model",
                  ],
                  [
                    "Stripe",
                    "Icon rail + contextual flyout",
                    "Dense tools, max content space",
                    "Icon rail model",
                  ],
                  [
                    "Pipedrive",
                    "Pipeline + flat primary, rest in More",
                    "Service advisors, speed",
                    "Pipeline-primary model",
                  ],
                  [
                    "Intercom",
                    "Inbox first, everything else secondary",
                    "SMS-heavy follow-up shops",
                    "Inbox-centric model",
                  ],
                  [
                    "Legacy shop SMS",
                    "Long grouped sidebar, all modules visible",
                    "Shops migrating from older SMS tools",
                    "Classic grouped sidebar",
                  ],
                ].map(([crm, spread, best, map]) => (
                  <tr key={crm} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium text-foreground">{crm}</td>
                    <td className="py-2 pr-4">{spread}</td>
                    <td className="py-2 pr-4">{best}</td>
                    <td className="py-2">{map}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">Live sidebar preview</h2>
        <div className="overflow-hidden rounded-xl border border-brand-light/50">
          <SidebarProvider defaultOpen>
            <div className="flex h-[480px]">
              <PreviewSidebar shops={shops} activeShopId={activeShopId} unreadSmsCount={2} />
              <div className="flex flex-1 items-center justify-center bg-[oklch(0.985_0.008_247)] text-sm text-muted-foreground">
                Select a layout above, then click &quot;Use this menu in preview&quot;
              </div>
            </div>
          </SidebarProvider>
        </div>
      </div>
    </div>
  );
}

export default function NavConceptsPage({
  shops,
  activeShopId,
}: {
  shops: Shop[];
  activeShopId: string;
}) {
  return (
    <Suspense fallback={null}>
      <NavConceptsInner shops={shops} activeShopId={activeShopId} />
    </Suspense>
  );
}
