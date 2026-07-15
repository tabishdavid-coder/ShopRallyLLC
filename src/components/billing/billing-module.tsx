"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CloudDownload,
  CreditCard,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Plus,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { cn } from "@/lib/utils";
import {
  PLANS,
  PUBLIC_PLAN_ORDER,
  billingStatusLabel,
  formatPriceFromCents,
  planDisplayPrice,
} from "@/lib/plans";
import type { ShopPlan } from "@/generated/prisma";
import type { BillingOverview, BillingInvoice } from "@/lib/billing-shared";
import { BILLING_PLAN_FEATURES, comparePlanAction } from "@/lib/billing-shared";
import type { PlanFeature } from "@/lib/plans";
import { settingsUpgradeLabel } from "@/lib/settings-plan-gates";
import {
  createBillingPortalSession,
  createUpgradeCheckoutSession,
  savePaymentMethodStub,
} from "@/server/actions/billing";

type TabId = "plan" | "history" | "payment-methods";

const TABS: { id: TabId; label: string }[] = [
  { id: "plan", label: "Your Plan" },
  { id: "history", label: "History" },
  { id: "payment-methods", label: "Payment Methods" },
];

export function BillingModule({
  overview,
  blockedFeature,
}: {
  overview: BillingOverview;
  blockedFeature?: PlanFeature | null;
}) {
  const [tab, setTab] = useState<TabId>("plan");

  return (
    <div className="space-y-5">
      {blockedFeature ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">
            {settingsUpgradeLabel(blockedFeature)} requires {PLANS.PROFESSIONAL.name} or above
          </p>
          <p className="mt-1 text-amber-900/85">
            That settings page is not included on your current plan. Compare plans below or contact support to upgrade.
          </p>
        </div>
      ) : null}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your ShopRally subscription — separate from{" "}
          <Link href="/payments" className="font-medium text-brand-navy hover:underline">
            customer payments
          </Link>{" "}
          (Stripe Connect).
        </p>
      </div>

      <nav className={subnavBarClass()}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={subnavTabClass(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "plan" ? <YourPlanTab overview={overview} /> : null}
      {tab === "history" ? <HistoryTab overview={overview} /> : null}
      {tab === "payment-methods" ? <PaymentMethodsTab overview={overview} /> : null}
    </div>
  );
}

function YourPlanTab({ overview }: { overview: BillingOverview }) {
  const { subscription, paymentMethod, nextBillingDate, usage } = overview;
  const plan = subscription.plan;
  const def = PLANS[plan];
  const showDowngradeWarning =
    plan === "ENTERPRISE" || (plan === "PROFESSIONAL" && subscription.features.customerSms);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current plan
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{def.name}</h2>
              <span className="inline-flex items-center gap-1 text-lg font-semibold tabular-nums">
                {planDisplayPrice(def, false)}
                <span className="text-sm font-normal text-muted-foreground">/shop/month</span>
                <Info className="size-3.5 text-muted-foreground" aria-label="Per location pricing" />
              </span>
            </div>
          </div>
          <StatusBadge
            status={subscription.billingStatus}
            trialEndsAt={subscription.trialEndsAt}
          />
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Plan status</dt>
            <dd className="font-medium text-emerald-700">
              {billingStatusLabel(subscription.billingStatus)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Next billing date</dt>
            <dd className="font-medium">
              {nextBillingDate
                ? new Date(nextBillingDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Card info</dt>
            <dd className="font-medium">
              {paymentMethod ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {paymentMethod.brand} ending in {paymentMethod.last4}
                  <ManageBillingButton variant="link" />
                </span>
              ) : subscription.billingStatus === "TRIAL" ? (
                "No card on file"
              ) : (
                <ManageBillingButton variant="link" />
              )}
            </dd>
          </div>
        </dl>
      </div>

      <UsageMeters usage={usage} plan={plan} />

      {showDowngradeWarning ? (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <p>
            If you downgrade from {def.name}, two-way SMS will be disabled for your shop.
            Message history can only be accessed while SMS is enabled on your plan.
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold">ShopRally Plans</h3>
        <div className={cn("mt-4 grid gap-4", PUBLIC_PLAN_ORDER.length === 1 ? "max-w-md" : "lg:grid-cols-3")}>
          {PUBLIC_PLAN_ORDER.map((planId) => (
            <PlanColumn
              key={planId}
              planId={planId}
              currentPlan={plan}
              billingStatus={subscription.billingStatus}
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Customize your plan</h3>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-md border p-4">
          <div className="max-w-xl space-y-2">
            <p className="font-semibold">ShopRally Multi-Shop</p>
            <p className="text-sm text-muted-foreground">
              +$79
              /shop/month — Everything you need to run multiple shops in one place.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Centralized shop management</li>
              <li>• Shared customer history</li>
              <li>• Organization-level reports</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/support">Learn more</Link>
          </Button>
        </div>
        {plan === "ENTERPRISE" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Your {PLANS.ENTERPRISE.name} plan includes ShopSite, Local SEO, maintenance programs,
            and premium migration.
          </p>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        To cancel or downgrade your plan, contact us at{" "}
        <a href="mailto:info@getshoprally.com" className="font-medium text-brand-navy hover:underline">
          info@getshoprally.com
        </a>{" "}
        or visit{" "}
        <Link href="/support" className="font-medium text-brand-navy hover:underline">
          Help &amp; Support
        </Link>
        .
      </p>
    </div>
  );
}

function PlanColumn({
  planId,
  currentPlan,
  billingStatus,
}: {
  planId: ShopPlan;
  currentPlan: ShopPlan;
  billingStatus: string;
}) {
  const plan = PLANS[planId];
  const action = comparePlanAction(currentPlan, planId);
  const features = BILLING_PLAN_FEATURES[planId];
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handlePlanAction() {
    setMessage(null);
    start(async () => {
      const res = await createUpgradeCheckoutSession(planId);
      if (res.ok) {
        setMessage(res.message ?? "Redirecting to checkout…");
        if (res.url) window.location.href = res.url;
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card p-4 shadow-sm",
        action === "current" && "border-brand-navy ring-1 ring-brand-navy/20",
        plan.popular && action !== "current" && "border-brand-red/30",
      )}
    >
      {plan.popular ? (
        <span className="mb-2 inline-flex w-fit rounded bg-brand-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Most Popular
        </span>
      ) : null}
      <p className="text-lg font-bold">{plan.name}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {planDisplayPrice(plan, false)}
        <span className="text-sm font-normal text-muted-foreground"> /shop/month</span>
      </p>
      {action === "current" && billingStatus === "ACTIVE" ? (
        <p className="mt-1 text-xs font-medium text-brand-navy">
          Your price: {planDisplayPrice(plan, false)} /shop/month
        </p>
      ) : null}
      <p className="mt-2 min-h-[2.5rem] text-sm text-muted-foreground">{plan.tagline}</p>

      <div className="mt-4">
        {action === "current" ? (
          <Button className="w-full bg-brand-navy" disabled>
            <Check className="mr-1.5 size-4" />
            Current plan
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full uppercase tracking-wide"
            disabled={pending || billingStatus === "CANCELED"}
            onClick={handlePlanAction}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {action === "upgrade" ? "Upgrade" : "Downgrade"}
          </Button>
        )}
      </div>

      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}

      <div className="mt-4 flex-1 space-y-2 border-t pt-4">
        {features.intro ? (
          <p className="text-sm font-medium">{features.intro}</p>
        ) : null}
        <ul className="space-y-2">
          {features.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UsageMeters({
  usage,
  plan,
}: {
  usage: BillingOverview["usage"];
  plan: ShopPlan;
}) {
  const decodeOverage =
    usage.vinPlateOverageCentsEstimate > 0
      ? `$${(usage.vinPlateOverageCentsEstimate / 100).toFixed(0)} estimated overage ($10 / 100) — billed manually until Stripe Billing`
      : plan === "STARTER"
        ? "Included allowance · $10 per additional 100 after 100"
        : null;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Usage this period</h3>
        <span className="text-xs text-muted-foreground">{PLANS[plan].name} limits</span>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <UsageMeter
          label="Users"
          used={usage.usersCount}
          limit={usage.usersLimit}
        />
        <UsageMeter
          label="Repair orders (month)"
          used={usage.repairOrdersThisMonth}
          limit={usage.repairOrdersLimit}
        />
        <UsageMeter
          label="VIN & plate decodes"
          used={usage.vinPlateDecodesThisMonth}
          limit={usage.vinPlateDecodesLimit}
          footnote={decodeOverage}
        />
        <UsageMeter
          label="SMS credits"
          used={usage.smsCreditsUsed}
          limit={usage.smsCreditsLimit}
          hidden={plan === "STARTER"}
        />
        <UsageMeter label="Locations" used={usage.locationsCount} limit={plan === "ENTERPRISE" ? null : 1} />
      </dl>
    </div>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  hidden,
  footnote,
}: {
  label: string;
  used: number;
  limit: number | null;
  hidden?: boolean;
  footnote?: string | null;
}) {
  if (hidden) return null;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
  const overLimit = limit !== null && used > limit;

  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">
        {used}
        {limit !== null ? ` / ${limit}` : " (unlimited)"}
        {overLimit ? (
          <span className="ml-1 text-xs font-medium text-amber-700">overage</span>
        ) : null}
      </dd>
      {pct !== null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              overLimit || pct >= 90
                ? "bg-brand-red"
                : pct >= 70
                  ? "bg-amber-500"
                  : "bg-brand-navy",
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      ) : null}
      {footnote ? (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}

function HistoryTab({ overview }: { overview: BillingOverview }) {
  const { invoices, subscription } = overview;

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <FileText className="mx-auto size-10 text-muted-foreground/50" />
        <p className="mt-3 font-medium">No billing history yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {subscription.billingStatus === "TRIAL"
            ? "Invoices will appear here after you subscribe to a paid plan."
            : "Your invoices will appear here once Stripe Billing is connected."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Billing History</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled title="Stripe Billing — coming soon">
            Make payment
          </Button>
          <Button variant="outline" size="icon" className="size-9" disabled title="Export — coming soon">
            <CloudDownload className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-3 py-2.5" />
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Description</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Latest invoice</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: BillingInvoice }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/20">
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </td>
        <td className="px-3 py-3 tabular-nums">
          {new Date(invoice.date).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          })}
        </td>
        <td className="px-3 py-3">
          <p>{invoice.lineItems[0]?.description ?? "Invoice"}</p>
          {!expanded && invoice.lineItems.length > 1 ? (
            <p className="text-xs text-muted-foreground">+{invoice.lineItems.length - 1} more</p>
          ) : null}
        </td>
        <td className="px-3 py-3 text-right font-medium tabular-nums">
          ${(invoice.amountCents / 100).toFixed(2)}
        </td>
        <td className="px-3 py-3">
          <InvoiceStatusBadge status={invoice.status} />
        </td>
        <td className="px-3 py-3 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-brand-navy"
            disabled
            title="PDF download — Stripe Billing coming soon"
          >
            <FileText className="size-3.5" />
            PDF
          </Button>
        </td>
      </tr>
      {expanded
        ? invoice.lineItems.slice(1).map((line) => (
            <tr key={line.description} className="border-b bg-muted/10">
              <td />
              <td />
              <td className="px-3 py-2 pl-8 text-muted-foreground">{line.description}</td>
              <td />
              <td />
              <td />
            </tr>
          ))
        : null}
    </>
  );
}

function PaymentMethodsTab({ overview }: { overview: BillingOverview }) {
  const { paymentMethod, subscription } = overview;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Existing cards</h3>

      {paymentMethod ? (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{paymentMethod.cardholderName}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="size-4" />
                {paymentMethod.brand} ending in {paymentMethod.last4} —{" "}
                {String(paymentMethod.expMonth).padStart(2, "0")}/{paymentMethod.expYear}
              </p>
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                Future payments will use this card.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check className="size-3.5" />
                Default card
              </span>
              <ManageBillingButton variant="icon" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {subscription.billingStatus === "TRIAL"
            ? "Add a card when you subscribe — your trial does not require a payment method yet."
            : "No payment method on file."}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 uppercase tracking-wide"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="size-4" />
        Add card
      </Button>

      <AddCardDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function AddCardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    start(async () => {
      const res = await savePaymentMethodStub();
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add credit or debit card</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Card capture will use Stripe when billing goes live. Fields below are preview-only.
        </p>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="card-number">Card number</Label>
            <Input id="card-number" placeholder="•••• •••• •••• ••••" disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="exp">Expiration date</Label>
              <Input id="exp" placeholder="MM / YY" disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" placeholder="Enter CVC" disabled />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="first">First name</Label>
              <Input id="first" disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last">Last name</Label>
              <Input id="last" disabled />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="addr1">Address line 1</Label>
            <Input id="addr1" disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="addr2">Address line 2</Label>
            <Input id="addr2" disabled />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" disabled />
            </div>
            <div className="space-y-1">
              <Label>State / Province</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TX">TX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="zip">Zip / Postal</Label>
              <Input id="zip" disabled />
            </div>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-brand-navy" onClick={handleSave} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageBillingButton({ variant }: { variant: "link" | "icon" }) {
  const [pending, start] = useTransition();

  function handleClick() {
    start(async () => {
      const res = await createBillingPortalSession();
      if (res.ok && res.url) {
        window.location.href = res.url;
      }
    });
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-sm font-medium text-brand-navy hover:underline disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage"}
      </button>
    );
  }

  return (
    <Button variant="ghost" size="icon" className="size-8" disabled={pending} onClick={handleClick}>
      <Settings2 className="size-4" />
    </Button>
  );
}

function StatusBadge({
  status,
  trialEndsAt,
}: {
  status: BillingOverview["subscription"]["billingStatus"];
  trialEndsAt: string | null;
}) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800"
      : status === "TRIAL"
        ? "bg-amber-100 text-amber-800"
        : status === "PAST_DUE"
          ? "bg-red-100 text-red-800"
          : "bg-muted text-muted-foreground";

  return (
    <div className="text-right">
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
        {billingStatusLabel(status)}
      </span>
      {status === "TRIAL" && trialEndsAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {Math.max(
            0,
            Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000),
          )}{" "}
          days remaining · ends {new Date(trialEndsAt).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: BillingInvoice["status"] }) {
  const styles =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-800"
      : status === "PAST_DUE"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${styles}`}>
      {status === "PAID" ? "Paid" : status === "PAST_DUE" ? "Past due" : "Open"}
    </span>
  );
}

export function BillingQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href="/pricing" target="_blank">
          View all plans
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href="/support">Contact support</Link>
      </Button>
    </div>
  );
}
