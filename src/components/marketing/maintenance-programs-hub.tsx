"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";

import { AddSubscriberDialog, type EnrollPlanOption } from "@/components/maintenance/add-subscriber-dialog";
import { SharePlansLinkButton } from "@/components/maintenance/share-plans-link-button";
import { MaintenancePublicPageEditor } from "@/components/marketing/maintenance-public-page-editor";
import { MaintenanceSectionNav } from "@/components/marketing/maintenance-section-nav";
import { MaintenanceServiceLibrary } from "@/components/marketing/maintenance-service-library";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import { formatPlanPriceOptions, planStatusLabel } from "@/lib/maintenance-programs";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  archiveMaintenancePlan,
  deleteMaintenancePlan,
  duplicateMaintenancePlan,
} from "@/server/actions/maintenance-programs";
import type { MaintenancePlanRow } from "@/server/maintenance-programs";
import type { MaintenanceProgramService } from "@/generated/prisma";

type Settings = {
  enabled: boolean;
  plansSlug: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  termsDefault: string | null;
  pageTemplate?: import("@/generated/prisma").PlansPageTemplate;
  themeConfig?: unknown;
};

type ShopInfo = {
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type Props = {
  canEdit: boolean;
  settings: Settings;
  plans: MaintenancePlanRow[];
  services: (MaintenanceProgramService & {
    cannedJob?: { id: string; name: string } | null;
    _count?: { entitlements: number };
  })[];
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  laborRateCents: number;
  slug: string;
  shopCode: string;
  plansUrl: string;
  shopName: string;
  embedIframe: string;
  embedLink: string;
  shop: ShopInfo;
  activePlans?: EnrollPlanOption[];
};

type HubSection = "services" | "public-page" | "plans";

export function MaintenanceProgramsHub({
  canEdit,
  settings,
  plans,
  services,
  cannedJobs,
  cannedJobCategories,
  laborRateCents,
  shopCode,
  plansUrl,
  shopName,
  embedIframe,
  embedLink,
  shop,
  activePlans = [],
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<HubSection>("services");
  const [pending, start] = useTransition();
  const router = useRouter();

  const activeServices = services.filter((s) => s.active);
  const livePlans = plans.filter((p) => p.active).length;

  function archive(planId: string) {
    if (!confirm("Unpublish this plan? It will be hidden from the public page but kept for existing subscribers.")) return;
    start(async () => {
      const res = await archiveMaintenancePlan(planId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function removePlan(plan: MaintenancePlanRow) {
    const subCount = plan._count.subscriptions;
    if (subCount > 0) return;

    if (
      !confirm(
        "Permanently delete this plan? This cannot be undone. Entitlements and pricing will be removed.",
      )
    ) {
      return;
    }

    start(async () => {
      const res = await deleteMaintenancePlan(plan.id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function duplicate(planId: string) {
    start(async () => {
      const res = await duplicateMaintenancePlan(planId);
      if (res.ok && res.id) {
        router.push(`/marketing/maintenance-programs/plans/${res.id}`);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {!canEdit ? (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Care Plans are an Elite premium benefit — not included on Core or Pro.{" "}
          <Link href="/settings/subscription" className="font-semibold text-brand-navy underline">
            Upgrade your subscription
          </Link>
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-brand-navy/15 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-brand-navy mr-auto">Enroll subscribers</p>
          <SharePlansLinkButton plansUrl={plansUrl} shopName={shopName} />
          <AddSubscriberDialog plans={activePlans} />
          <Button variant="outline" size="sm" asChild className="border-slate-300">
            <Link href="/maintenance-programs/subscribers">
              <UserPlus className="mr-1.5 size-4" />
              View subscribers
            </Link>
          </Button>
        </div>
      ) : null}

      <ol className="grid gap-3 sm:grid-cols-3 text-sm">
        {[
          { step: "1", title: "Add services", done: activeServices.length > 0, target: "services" as HubSection },
          { step: "2", title: "Build subscriptions", done: plans.length > 0, target: "plans" as HubSection },
          { step: "3", title: "Set pricing & publish", done: plans.some((p) => p.active), target: "public-page" as HubSection },
        ].map((item) => (
          <li key={item.step}>
            <button
              type="button"
              onClick={() => setSection(item.target)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2",
                item.done
                  ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100/80"
                  : "border-slate-300 bg-white hover:border-brand-navy/30 hover:bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  item.done ? "bg-emerald-600 text-white" : "bg-brand-navy text-white",
                )}
              >
                {item.done ? <Check className="size-4" /> : item.step}
              </span>
              <span className="font-semibold text-slate-900">{item.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <MaintenanceSectionNav
        tabs={[
          { id: "services", label: "Service library", badge: activeServices.length || undefined },
          { id: "plans", label: "Subscription plans", badge: plans.length || undefined },
          { id: "public-page", label: "Public page", badge: livePlans ? `${livePlans} live` : undefined },
        ]}
        active={section}
        onChange={(id) => setSection(id as HubSection)}
      />

      {section === "services" ? (
        <div id="services">
          <MaintenanceServiceLibrary
            canEdit={canEdit}
            services={services}
            cannedJobs={cannedJobs}
            cannedJobCategories={cannedJobCategories}
            laborRateCents={laborRateCents}
          />
        </div>
      ) : null}

      {section === "public-page" ? (
        <MaintenancePublicPageEditor
          canEdit={canEdit}
          settings={settings}
          shopCode={shopCode}
          plansUrl={plansUrl}
          embedIframe={embedIframe}
          embedLink={embedLink}
          shop={shop}
        />
      ) : null}

      {section === "plans" ? (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Subscription plans</h2>
            <p className="text-sm text-slate-600">
              Build service bundles, set pricing, and publish to your public page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={plansUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                View public page
              </a>
            </Button>
            {canEdit ? (
              <Button asChild className="bg-brand-navy">
                <Link href="/marketing/maintenance-programs/plans/new">
                  <Plus className="mr-1.5 size-4" />
                  Create plan
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {plans.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-light/20">
              <Plus className="size-6 text-brand-navy" />
            </div>
            <div>
              <p className="font-medium">No maintenance plans yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Build your first plan by dragging preset services like oil changes and tire rotations
                into a subscription bundle.
              </p>
            </div>
            {canEdit ? (
              <Button asChild className="bg-brand-navy">
                <Link href="/marketing/maintenance-programs/plans/new">
                  <Plus className="mr-1.5 size-4" />
                  Create your first plan
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const pricing = formatPlanPriceOptions(plan);
              const status = planStatusLabel(plan);
              const serviceCount = plan.entitlements.length;
              return (
                <article
                  key={plan.id}
                  className="rounded-xl border-2 border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-sm hover:border-brand-navy/35 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {plan.featured ? (
                          <Shield className="size-3.5 text-brand-red shrink-0" aria-label="Featured" />
                        ) : null}
                        <h3 className="font-semibold truncate">{plan.name}</h3>
                      </div>
                      {plan.tagline ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.tagline}</p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        status === "live" && "bg-green-100 text-green-800",
                        status === "ready" && "bg-amber-100 text-amber-900",
                        status === "draft" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {status === "live" ? "Live" : status === "ready" ? "Ready" : "Draft"}
                    </span>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/50 px-2 py-1.5">
                      <dt className="text-muted-foreground">Services</dt>
                      <dd className="font-semibold text-sm mt-0.5">{serviceCount}</dd>
                    </div>
                    <div className="rounded-md bg-muted/50 px-2 py-1.5">
                      <dt className="text-muted-foreground">Subscribers</dt>
                      <dd className="font-semibold text-sm mt-0.5">{plan._count.subscriptions}</dd>
                    </div>
                    <div className="rounded-md bg-muted/50 px-2 py-1.5">
                      <dt className="text-muted-foreground">Term</dt>
                      <dd className="font-semibold text-sm mt-0.5">{plan.termMonths}mo</dd>
                    </div>
                  </dl>

                  <div className="text-sm text-muted-foreground">
                    {status === "draft" ? (
                      <span className="text-muted-foreground italic">Pricing not set</span>
                    ) : (
                      <span>{pricing.primary}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-auto pt-1 border-t">
                    <Button variant="outline" size="sm" className="flex-1 min-w-[80px]" asChild>
                      <Link href={`/marketing/maintenance-programs/plans/${plan.id}`}>
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Link>
                    </Button>
                    {plan.active ? (
                      <Button variant="outline" size="sm" className="flex-1 min-w-[80px]" asChild>
                        <a
                          href={`${plansUrl}#plan-${plan.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="mr-1 size-3.5" />
                          Preview
                        </a>
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[80px]"
                        onClick={() => duplicate(plan.id)}
                        disabled={pending}
                      >
                        <Copy className="mr-1 size-3.5" />
                        Duplicate
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <>
                        {plan.active ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-muted-foreground"
                                onClick={() => archive(plan.id)}
                                disabled={pending}
                              >
                                <Archive className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Unpublish plan (keeps existing subscribers)
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-muted-foreground"
                                onClick={() => removePlan(plan)}
                                disabled={plan._count.subscriptions > 0 || pending}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {plan._count.subscriptions > 0
                              ? `Cannot delete — ${plan._count.subscriptions} subscriber${
                                  plan._count.subscriptions === 1 ? "" : "s"
                                } enrolled. Cancel or migrate ${
                                  plan._count.subscriptions === 1 ? "the subscriber" : "subscribers"
                                } first under Maintenance Programs → Subscribers.`
                              : "Permanently delete this plan"}
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
