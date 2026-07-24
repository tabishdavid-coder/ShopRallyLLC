"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Copy, Eye, FileText, Link2, Loader2, Pencil, Plus, Search } from "lucide-react";

import { PlatformInviteShopDialog } from "@/components/platform/platform-invite-shop-dialog";
import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { StripeConnectStatusPill } from "@/components/platform/stripe-connect-status-pill";
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
import {
  updatePlatformShop,
} from "@/server/actions/platform";
import {
  assignShopSmsNumber,
  provisionShopSmsNumber,
  syncShopTwilioWebhooks,
} from "@/server/actions/platform-sms";
import type { PlatformShopRow } from "@/server/platform-shops";
import {
  getPlatformShopHealth,
  platformShopHealthLabel,
  platformShopHealthStyles,
} from "@/lib/platform-shop-health";
import { effectiveTwilioPhoneNumber } from "@/lib/sms-constants";
import {
  BILLING_STATUS,
  SHOP_PLAN,
  SHOP_STATUS,
} from "@/lib/platform-types";
import type { BillingStatus, ShopPlan, ShopStatus } from "@/generated/prisma";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SmsStatusPill({
  smsEnabled,
  setupStatus,
  twilioPhoneNumber,
  smsSetupRequestedAt,
}: {
  smsEnabled: boolean;
  setupStatus: PlatformShopRow["smsSetupStatus"];
  twilioPhoneNumber: string | null;
  smsSetupRequestedAt: Date | null;
}) {
  if (setupStatus === "configured") {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
          {smsEnabled ? "Enabled" : "Disabled"}
        </span>
        <p className="font-mono text-[10px] text-muted-foreground">{twilioPhoneNumber}</p>
      </div>
    );
  }
  if (setupStatus === "pending_port") {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {smsSetupRequestedAt ? "Request pending" : "Pending port"}
        </span>
        {smsSetupRequestedAt ? (
          <p className="text-[10px] text-muted-foreground">
            Requested {fmtDateTime(smsSetupRequestedAt)}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      Not configured
    </span>
  );
}

type ShopFormState = {
  name: string;
  code: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  status: ShopStatus;
  plan: ShopPlan;
  billingStatus: BillingStatus;
};

const emptyForm = (): ShopFormState => ({
  name: "",
  code: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  status: SHOP_STATUS.ACTIVE,
  plan: SHOP_PLAN.STARTER,
  billingStatus: BILLING_STATUS.TRIAL,
});

export function PlatformShopsTable({
  shops,
  activeShopId,
  prefillCreate,
  openInvite,
}: {
  shops: PlatformShopRow[];
  activeShopId: string;
  prefillCreate?: { name?: string; email?: string; phone?: string };
  openInvite?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(Boolean(openInvite));
  const [editShop, setEditShop] = useState<PlatformShopRow | null>(null);
  const [form, setForm] = useState<ShopFormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [smsShop, setSmsShop] = useState<PlatformShopRow | null>(null);
  const [smsAssignNumber, setSmsAssignNumber] = useState("");
  const [smsAreaCode, setSmsAreaCode] = useState("");

  useEffect(() => {
    if (!prefillCreate?.name && !prefillCreate?.email) return;
    const q = new URLSearchParams();
    if (prefillCreate.name) q.set("name", prefillCreate.name);
    if (prefillCreate.email) q.set("email", prefillCreate.email);
    if (prefillCreate.phone) q.set("phone", prefillCreate.phone);
    router.replace(`/platform/shops/new?${q.toString()}`);
  }, [prefillCreate?.name, prefillCreate?.email, prefillCreate?.phone, router]);

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.masterId.toLowerCase().includes(q),
    );
  }, [shops, search]);

  function copyMasterId(masterId: string) {
    void navigator.clipboard.writeText(masterId).then(() => {
      setCopiedId(masterId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function openEdit(shop: PlatformShopRow) {
    setForm({
      name: shop.name,
      code: shop.code,
      phone: shop.phone ?? "",
      email: shop.email ?? "",
      city: shop.city ?? "",
      state: shop.state ?? "",
      status: shop.status,
      plan: shop.plan,
      billingStatus: shop.billingStatus,
    });
    setError(null);
    setEditShop(shop);
  }

  function saveEdit() {
    if (!editShop) return;
    setError(null);
    start(async () => {
      const res = await updatePlatformShop({
        id: editShop.id,
        name: form.name,
        code: form.code,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        state: form.state || null,
        status: form.status,
        plan: form.plan,
        billingStatus: form.billingStatus,
      });
      if (res.ok) {
        setEditShop(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function provisionSms(shopId: string) {
    setError(null);
    start(async () => {
      const res = await provisionShopSmsNumber({
        shopId,
        areaCode: smsAreaCode.trim() || undefined,
      });
      if (res.ok) {
        setSmsShop(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function assignSms(shopId: string) {
    setError(null);
    start(async () => {
      const res = await assignShopSmsNumber({
        shopId,
        twilioPhoneNumber: smsAssignNumber,
      });
      if (res.ok) {
        setSmsShop(null);
        setSmsAssignNumber("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function syncSmsWebhooks(shopId: string) {
    setError(null);
    start(async () => {
      const res = await syncShopTwilioWebhooks({ shopId });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function fmtDate(d: Date) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, or Master ID…"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredShops.length} of {shops.length} shop{shops.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <Link2 className="size-4" /> Send intake link
        </Button>
        <Button size="sm" className="gap-1.5 bg-brand-navy" asChild>
          <Link href="/platform/shops/new">
            <Plus className="size-4" /> Add shop
          </Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div
        className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        data-planned-change="PLAT-01"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Shop</th>
              <th className="px-4 py-2">Master ID</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Health</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">SMS</th>
              <th className="px-4 py-2">Payments</th>
              <th className="px-4 py-2">Last active</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShops.map((shop) => (
              <tr key={shop.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-brand-navy/10 text-xs font-bold text-brand-navy">
                      {shop.code}
                    </div>
                    <div>
                      <Link
                        href={`/platform/shops/${shop.id}`}
                        className="font-medium text-brand-navy hover:underline"
                      >
                        {shop.name}
                      </Link>
                      {shop.id === activeShopId ? (
                        <p className="text-xs text-brand-navy">Active context</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs">{shop.masterId}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Copy Master ID"
                      onClick={() => copyMasterId(shop.masterId)}
                    >
                      {copiedId === shop.masterId ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PlanPill plan={shop.plan} billingStatus={shop.billingStatus} />
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const health = getPlatformShopHealth(shop);
                    return (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                          platformShopHealthStyles(health),
                        )}
                      >
                        {platformShopHealthLabel(health)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={shop.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {[shop.city, shop.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <SmsStatusPill
                    smsEnabled={shop.smsEnabled}
                    setupStatus={shop.smsSetupStatus}
                    twilioPhoneNumber={shop.twilioPhoneNumber}
                    smsSetupRequestedAt={shop.smsSetupRequestedAt}
                  />
                  {shop.lastSmsAt ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Last msg {fmtDateTime(shop.lastSmsAt)}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px] text-brand-navy"
                    onClick={() => {
                      setSmsShop(shop);
                      setSmsAssignNumber(shop.twilioPhoneNumber ?? "");
                      setSmsAreaCode(
                        shop.smsPreferredAreaCode ??
                          shop.state?.replace(/\D/g, "").slice(0, 3) ??
                          "",
                      );
                      setError(null);
                    }}
                  >
                    Manage SMS
                    {shop.smsSetupRequestedAt && !effectiveTwilioPhoneNumber(shop.twilioPhoneNumber)
                      ? " •"
                      : ""}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <StripeConnectStatusPill
                    status={shop.stripeConnectStatus}
                    accountId={shop.stripeConnectAccountId}
                    compact
                  />
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px] text-brand-navy"
                    asChild
                  >
                    <Link href={`/platform/shops/${shop.id}`}>Shop detail</Link>
                  </Button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {shop.lastActiveAt ? fmtDate(shop.lastActiveAt) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(shop.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <EnterShopCrmButton
                      shopId={shop.id}
                      shopName={shop.name}
                      size="sm"
                      className="gap-1 bg-brand-navy hover:bg-brand-navy/90"
                      onError={setError}
                    >
                      <Building2 className="size-3.5" />
                      Open shop CRM
                    </EnterShopCrmButton>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      title="Shop detail"
                    >
                      <Link href={`/platform/shops/${shop.id}`}>
                        <Eye className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      title="Custom MSA / legal"
                    >
                      <Link href={`/platform/shops/${shop.id}/legal`}>
                        <FileText className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(shop)}
                      disabled={pending}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlatformInviteShopDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <ShopDialog
        open={Boolean(editShop)}
        onOpenChange={(o) => !o && setEditShop(null)}
        title="Edit shop"
        form={form}
        onFormChange={setForm}
        onSave={saveEdit}
        pending={pending}
        error={error}
      />

      <Dialog open={Boolean(smsShop)} onOpenChange={(o) => !o && setSmsShop(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>SMS — {smsShop?.name}</DialogTitle>
          </DialogHeader>
          {smsShop ? (
            <div className="grid gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Platform-managed Twilio number for this shop. Provisioning buys a local number and
                configures SMS + Voice inbound webhooks automatically.
              </p>
              {smsShop.smsSetupRequestedAt && !effectiveTwilioPhoneNumber(smsShop.twilioPhoneNumber) ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <p className="font-medium">Shop setup request pending</p>
                  <dl className="mt-2 grid gap-1 text-xs">
                    <div>
                      <dt className="inline text-muted-foreground">Landline: </dt>
                      <dd className="inline">{smsShop.landlineNumber ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">Area code: </dt>
                      <dd className="inline">{smsShop.smsPreferredAreaCode ?? "—"}</dd>
                    </div>
                    {smsShop.smsSetupRequestNotes ? (
                      <div>
                        <dt className="text-muted-foreground">Notes</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap">{smsShop.smsSetupRequestNotes}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline text-muted-foreground">Requested: </dt>
                      <dd className="inline">{fmtDateTime(smsShop.smsSetupRequestedAt)}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
              {effectiveTwilioPhoneNumber(smsShop.twilioPhoneNumber) ? (
                <div className="space-y-2">
                  <p className="font-mono text-sm">
                    {effectiveTwilioPhoneNumber(smsShop.twilioPhoneNumber)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => syncSmsWebhooks(smsShop.id)}
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Sync SMS + Voice webhooks
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No number assigned yet.</p>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="sms-area">Area code (optional)</Label>
                <Input
                  id="sms-area"
                  value={smsAreaCode}
                  maxLength={3}
                  placeholder="518"
                  onChange={(e) => setSmsAreaCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <Button
                className="bg-brand-navy"
                disabled={pending || Boolean(effectiveTwilioPhoneNumber(smsShop.twilioPhoneNumber))}
                onClick={() => provisionSms(smsShop.id)}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Provision test number
              </Button>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or assign manually</span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sms-number">E.164 number (after port)</Label>
                <Input
                  id="sms-number"
                  value={smsAssignNumber}
                  placeholder="+15551234567"
                  onChange={(e) => setSmsAssignNumber(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled={pending} onClick={() => assignSms(smsShop.id)}>
                Assign number
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlanPill({ plan, billingStatus }: { plan: ShopPlan; billingStatus: BillingStatus }) {
  return (
    <div className="space-y-0.5">
      <span className="inline-flex rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs font-medium text-brand-navy">
        {PLANS[plan].name}
      </span>
      {billingStatus !== BILLING_STATUS.ACTIVE ? (
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{billingStatus}</p>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: ShopStatus }) {
  const styles =
    status === SHOP_STATUS.ACTIVE
      ? "bg-emerald-100 text-emerald-800"
      : status === SHOP_STATUS.TRIAL
        ? "bg-amber-100 text-amber-800"
        : status === SHOP_STATUS.PENDING
          ? "bg-sky-100 text-sky-800"
          : "bg-red-100 text-red-800";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function ShopDialog({
  open,
  onOpenChange,
  title,
  form,
  onFormChange,
  onSave,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: ShopFormState;
  onFormChange: (form: ShopFormState) => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="shop-name">Name</Label>
            <Input
              id="shop-name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="shop-code">Code</Label>
              <Input
                id="shop-code"
                value={form.code}
                maxLength={6}
                onChange={(e) => onFormChange({ ...form, code: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => onFormChange({ ...form, status: v as ShopStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHOP_STATUS.ACTIVE}>Active</SelectItem>
                  <SelectItem value={SHOP_STATUS.TRIAL}>Trial</SelectItem>
                  <SelectItem value={SHOP_STATUS.SUSPENDED}>Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Plan</Label>
              <Select
                value={form.plan}
                onValueChange={(v) => onFormChange({ ...form, plan: v as ShopPlan })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHOP_PLAN.STARTER}>{PLANS.STARTER.name}</SelectItem>
                  <SelectItem value={SHOP_PLAN.PROFESSIONAL}>{PLANS.PROFESSIONAL.name}</SelectItem>
                  <SelectItem value={SHOP_PLAN.ENTERPRISE}>{PLANS.ENTERPRISE.name}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Billing</Label>
              <Select
                value={form.billingStatus}
                onValueChange={(v) => onFormChange({ ...form, billingStatus: v as BillingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BILLING_STATUS.TRIAL}>Trial</SelectItem>
                  <SelectItem value={BILLING_STATUS.ACTIVE}>Active</SelectItem>
                  <SelectItem value={BILLING_STATUS.PAST_DUE}>Past due</SelectItem>
                  <SelectItem value={BILLING_STATUS.CANCELED}>Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="shop-city">City</Label>
              <Input
                id="shop-city"
                value={form.city}
                onChange={(e) => onFormChange({ ...form, city: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="shop-state">State</Label>
              <Input
                id="shop-state"
                value={form.state}
                onChange={(e) => onFormChange({ ...form, state: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="shop-phone">Phone</Label>
            <Input
              id="shop-phone"
              value={form.phone}
              onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="shop-email">Email</Label>
            <Input
              id="shop-email"
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button className="bg-brand-navy" onClick={onSave} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
