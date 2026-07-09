"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  defaultTimezoneForState,
  emptyPlatformShopForm,
  slugifyShopName,
  suggestShopCode,
  US_STATES,
  US_TIMEZONE_OPTIONS,
  type PlatformShopFormState,
} from "@/lib/platform-shop-form";
import { BILLING_STATUS, SHOP_PLAN } from "@/lib/platform-types";
import { PLANS } from "@/lib/plans";
import type { BillingStatus, ShopPlan } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type Props = {
  form: PlatformShopFormState;
  onChange: (form: PlatformShopFormState) => void;
  onSubmit: () => void;
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
  showBillingDefaults?: boolean;
  idPrefix?: string;
  footer?: React.ReactNode;
  submitDisabled?: boolean;
};

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b pb-2">
      <h3 className="text-sm font-semibold text-brand-navy">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function PlatformShopFormFields({
  form,
  onChange,
  onSubmit,
  pending,
  error,
  submitLabel = "Create shop",
  showBillingDefaults = true,
  idPrefix = "shop",
  footer,
  submitDisabled,
}: Props) {
  const [slugTouched, setSlugTouched] = useState(Boolean(form.bookingSlug.trim()));
  const [codeTouched, setCodeTouched] = useState(Boolean(form.code.trim()));

  useEffect(() => {
    if (slugTouched || !form.name.trim()) return;
    onChange({ ...form, bookingSlug: slugifyShopName(form.name) });
  }, [form.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (codeTouched || !form.name.trim()) return;
    onChange({ ...form, code: suggestShopCode(form.name) });
  }, [form.name]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof PlatformShopFormState>(key: K, value: PlatformShopFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  function onStateChange(state: string) {
    const next = { ...form, state };
    if (!form.timezone.trim() || form.timezone === defaultTimezoneForState(form.state)) {
      next.timezone = defaultTimezoneForState(state);
    }
    onChange(next);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <section className="space-y-3">
        <SectionHeading
          title="Business"
          description="Legal entity vs DBA shop name, switcher code, and online booking slug."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-legal`}>Legal business name *</Label>
            <Input
              id={`${idPrefix}-legal`}
              value={form.legalEntityName}
              onChange={(e) => set("legalEntityName", e.target.value)}
              placeholder="In & Out AutoHaus Garage LLC"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Contracting entity for MSA, tax, and 10DLC registration.
            </p>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-name`}>Shop name (DBA) *</Label>
            <Input
              id={`${idPrefix}-name`}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="In & Out AutoHaus Garage"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-code`}>Shop code *</Label>
            <Input
              id={`${idPrefix}-code`}
              value={form.code}
              maxLength={6}
              onChange={(e) => {
                setCodeTouched(true);
                set("code", e.target.value.toUpperCase());
              }}
              placeholder="IO"
              required
            />
            <p className="text-[11px] text-muted-foreground">Max 6 chars — sidebar avatar & master ID.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-slug`}>Booking slug *</Label>
            <Input
              id={`${idPrefix}-slug`}
              value={form.bookingSlug}
              onChange={(e) => {
                setSlugTouched(true);
                set("bookingSlug", e.target.value.toLowerCase());
              }}
              placeholder="in-and-out-autohaus"
              required
            />
            <p className="text-[11px] text-muted-foreground">/book/[slug] — must be unique.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Contact" description="Primary owner or general manager." />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-contact`}>Primary contact name *</Label>
            <Input
              id={`${idPrefix}-contact`}
              value={form.primaryContactName}
              onChange={(e) => set("primaryContactName", e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-phone`}>Phone *</Label>
            <Input
              id={`${idPrefix}-phone`}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(518) 555-0100"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-email`}>Contact email *</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="owner@shop.com"
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Address" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-address`}>Street *</Label>
            <Input
              id={`${idPrefix}-address`}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 State Street"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-city`}>City *</Label>
            <Input
              id={`${idPrefix}-city`}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label>State *</Label>
            <Select value={form.state || undefined} onValueChange={onStateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-zip`}>ZIP *</Label>
            <Input
              id={`${idPrefix}-zip`}
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
              placeholder="12305"
              required
            />
          </div>
        </div>
      </section>

      {showBillingDefaults ? (
        <section className="space-y-3">
          <SectionHeading title="Billing" description="Plan tier and trial settings." />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Plan *</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v as ShopPlan)}>
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
              <Label>Billing status</Label>
              <Select
                value={form.billingStatus}
                onValueChange={(v) => set("billingStatus", v as BillingStatus)}
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
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-trial`}>Trial end (optional)</Label>
              <Input
                id={`${idPrefix}-trial`}
                type="date"
                value={form.trialEndsAt}
                onChange={(e) => set("trialEndsAt", e.target.value)}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionHeading
          title="Defaults"
          description="Labor rate, timezone, and outbound CRM email."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-labor`}>Default labor rate ($/hr) *</Label>
            <Input
              id={`${idPrefix}-labor`}
              inputMode="decimal"
              value={form.laborRateDollars}
              onChange={(e) => set("laborRateDollars", e.target.value)}
              placeholder="125"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Timezone *</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-1">
            <Label htmlFor={`${idPrefix}-shop-email`}>Shop email (CRM sends) *</Label>
            <Input
              id={`${idPrefix}-shop-email`}
              type="email"
              value={form.shopEmail}
              onChange={(e) => set("shopEmail", e.target.value)}
              placeholder="service@yourshop.com"
              required
            />
          </div>
        </div>
      </section>

      {footer}

      {error ? (
        <p className={cn("rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive")}>
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" className="bg-brand-navy" disabled={pending || submitDisabled}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export { emptyPlatformShopForm };
