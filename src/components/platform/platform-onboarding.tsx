"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Building2, CheckCircle2, Circle, Globe, Loader2, Plus, Rocket } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { MasterIdRevealDialog } from "@/components/platform/master-id-reveal-dialog";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { activatePendingShop } from "@/server/actions/shop-intake";
import type { OnboardingShopRow } from "@/server/platform/onboarding";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PlatformOnboarding({
  shops,
  inPipelineCount,
  readyToLaunchCount,
  createdShopName,
  focusShopId,
}: {
  shops: OnboardingShopRow[];
  inPipelineCount: number;
  readyToLaunchCount: number;
  createdShopName?: string;
  focusShopId?: string;
}) {
  const pipeline = shops.filter((s) => !s.isLive);
  const live = shops.filter((s) => s.isLive);
  const pendingApproval = pipeline.filter((s) => s.needsApproval);

  return (
    <div className="space-y-8">
      <PlatformPageIntro
        title="Onboarding"
        description="Track new shop setup from provision through go-live. Approve intake submissions, then complete legal, billing, and go-live steps."
      >
        <Button asChild variant="outline">
          <Link href="/platform/shops?invite=1">Send intake link</Link>
        </Button>
        <Button asChild className="bg-brand-navy">
          <Link href="/platform/shops/new">
            <Plus className="mr-1.5 size-4" />
            Add shop
          </Link>
        </Button>
      </PlatformPageIntro>

      {createdShopName ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <p className="font-semibold">Shop created — {createdShopName}</p>
          <p className="mt-1 text-emerald-800">
            Complete the checklist below, then open the shop CRM to invite the team and run day-to-day
            operations.
          </p>
        </div>
      ) : null}

      {pendingApproval.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-brand-light/30 bg-brand-light/10 px-5 py-4">
          <h3 className="font-semibold text-brand-navy">
            Pending approval ({pendingApproval.length})
          </h3>
          <p className="text-sm text-brand-navy/85">
            Prospect intake forms awaiting your review. Activate to start trial onboarding and reveal
            the shop master key.
          </p>
          <ul className="grid gap-3 pt-1">
            {pendingApproval.map((shop) => (
              <ShopOnboardingCard key={shop.id} shop={shop} highlighted={shop.id === focusShopId} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="In pipeline" value={inPipelineCount} icon={Rocket} />
        <SummaryCard label="Ready to launch" value={readyToLaunchCount} tone="success" />
        <SummaryCard label="Live shops" value={live.length} />
      </div>

      {pipeline.length === 0 ? (
        <EmptyPipeline />
      ) : (
        <section className="space-y-4">
          <h3 className="font-semibold text-brand-navy">Setup pipeline</h3>
          <ul className="grid gap-4">
            {pipeline.filter((s) => !s.needsApproval).map((shop) => (
              <ShopOnboardingCard key={shop.id} shop={shop} highlighted={shop.id === focusShopId} />
            ))}
          </ul>
        </section>
      )}

      {live.length > 0 ? (
        <section className="space-y-4">
          <h3 className="font-semibold text-brand-navy">Live tenants</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {live.map((shop) => (
              <li
                key={shop.id}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm shadow-sm"
              >
                <div>
                  <Link
                    href={`/platform/shops/${shop.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {shop.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {shop.code} · All {shop.totalSteps} steps complete
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  Live
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon = Rocket,
  tone,
}: {
  label: string;
  value: number;
  icon?: typeof Rocket;
  tone?: "success";
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tabular-nums",
          tone === "success" ? "text-emerald-700" : "text-brand-navy",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ShopOnboardingCard({
  shop,
  highlighted,
}: {
  shop: OnboardingShopRow;
  highlighted?: boolean;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLLIElement>(null);
  const [pending, start] = useTransition();
  const [masterReveal, setMasterReveal] = useState<{
    masterId: string;
    shopName: string;
  } | null>(null);
  const pct = Math.round((shop.completedCount / shop.totalSteps) * 100);
  const compliancePct = Math.round(
    (shop.complianceCompletedCount / shop.complianceTotalSteps) * 100,
  );
  const complianceSteps = shop.steps.filter((s) => s.group === "compliance");
  const opsSteps = shop.steps.filter((s) => s.group !== "compliance");

  useEffect(() => {
    if (!highlighted || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  function approveShop() {
    start(async () => {
      const res = await activatePendingShop(shop.id);
      if (res.ok) {
        setMasterReveal({ masterId: res.masterId, shopName: res.shopName });
        router.refresh();
      }
    });
  }

  return (
    <>
      <li
        ref={cardRef}
        className={cn(
          "rounded-xl border bg-card shadow-sm",
          highlighted && "ring-2 ring-brand-navy/40",
          shop.needsApproval && "border-sky-300",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <Link
              href={`/platform/shops/${shop.id}`}
              className="text-lg font-semibold text-brand-navy hover:underline"
            >
              {shop.name}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {shop.code} · {shop.status} · Trial ends {fmtDate(shop.trialEndsAt)} · Joined{" "}
              {fmtDate(shop.createdAt)}
            </p>
            <p className="mt-1 text-xs font-medium text-brand-navy">
              Compliance {shop.complianceCompletedCount}/{shop.complianceTotalSteps} ({compliancePct}
              %)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-brand-navy">
                {shop.completedCount}/{shop.totalSteps} steps
              </p>
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-navy transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild size="sm" variant="outline" className="gap-1.5 border-brand-navy/30">
                <Link href={`/platform/websites/${shop.id}`}>
                  <Globe className="size-3.5" />
                  Website
                </Link>
              </Button>
              {shop.needsApproval ? (
                <Button
                  size="sm"
                  className="bg-brand-navy"
                  disabled={pending}
                  onClick={approveShop}
                >
                  {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Approve & activate
                </Button>
              ) : (
                <EnterShopCrmButton
                  shopId={shop.id}
                  shopName={shop.name}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-brand-navy/30 text-brand-navy"
                >
                  <Building2 className="size-3.5" />
                  Open shop CRM
                </EnterShopCrmButton>
              )}
            </div>
          </div>
        </div>
        <div className="border-b px-5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Compliance
          </p>
        </div>
        <ul className="grid gap-0 divide-y sm:grid-cols-2 lg:grid-cols-4">
          {complianceSteps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ul>
        <div className="border-b border-t px-5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Operations
          </p>
        </div>
        <ul className="grid gap-0 divide-y sm:grid-cols-2 lg:grid-cols-3">
          {opsSteps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ul>
      </li>

      <MasterIdRevealDialog
        open={Boolean(masterReveal)}
        onOpenChange={(o) => !o && setMasterReveal(null)}
        masterId={masterReveal?.masterId ?? null}
        shopName={masterReveal?.shopName ?? shop.name}
        onContinue={() => setMasterReveal(null)}
      />
    </>
  );
}

function StepRow({ step }: { step: OnboardingShopRow["steps"][number] }) {
  return (
    <li className="flex items-start gap-2 px-5 py-3 text-sm">
      {step.done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
      )}
      <div className="min-w-0">
        {step.href && !step.done ? (
          <Link href={step.href} className="font-medium text-brand-navy hover:underline">
            {step.label}
            <ArrowRight className="ml-1 inline size-3" />
          </Link>
        ) : (
          <span className={cn("font-medium", step.done && "text-muted-foreground")}>
            {step.label}
          </span>
        )}
        <p className="text-xs text-muted-foreground">{step.description}</p>
        {step.stub && !step.done ? (
          <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide text-amber-700">
            Stub — link opens setup area
          </span>
        ) : null}
      </div>
    </li>
  );
}

function EmptyPipeline() {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center shadow-sm">
      <Rocket className="mx-auto size-10 text-brand-navy/40" />
      <h3 className="mt-4 text-lg font-semibold text-brand-navy">No shops in onboarding</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Provision a new tenant to start the checklist — legal, billing, team invite, and go-live.
      </p>
      <Button asChild className="mt-6 bg-brand-navy">
        <Link href="/platform/shops/new">
          Add your first shop
          <ArrowRight className="ml-1.5 size-4" />
        </Link>
      </Button>
    </div>
  );
}
