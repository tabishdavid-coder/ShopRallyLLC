"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BOOKING_DAYS,
  BOOKING_DAY_LABELS,
  type BookingDayKey,
  type BookingSettings,
} from "@/lib/booking-settings";
import { updateMarketingBookingSettings } from "@/server/actions/marketing-booking";

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
];

const MIN_NOTICE_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "4 hours" },
  { value: 24, label: "24 hours" },
];

type Props = {
  initial: {
    onlineBookingEnabled: boolean;
    bookingSlug: string | null;
    code: string;
    bookingSettings: BookingSettings;
  };
  bookingUrl: string;
  embedIframe: string;
  embedLink: string;
};

export function OnlineBookingSettings({
  initial,
  bookingUrl,
  embedIframe,
  embedLink,
}: Props) {
  const [enabled, setEnabled] = useState(initial.onlineBookingEnabled);
  const [slug, setSlug] = useState(initial.bookingSlug ?? slugify(initial.code));
  const [settings, setSettings] = useState(initial.bookingSettings);
  const [notifyEmail, setNotifyEmail] = useState(
    initial.bookingSettings.notifyEmails?.[0] ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    setSaved(false);
    const payload: BookingSettings = {
      ...settings,
      notifyEmails: notifyEmail.trim() ? [notifyEmail.trim()] : [],
    };
    start(async () => {
      const res = await updateMarketingBookingSettings({
        onlineBookingEnabled: enabled,
        bookingSlug: slug.trim().toLowerCase(),
        bookingSettings: payload,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function updateService(
    index: number,
    patch: Partial<BookingSettings["services"][number]>,
  ) {
    setSettings((s) => ({
      ...s,
      services: s.services.map((svc, i) => (i === index ? { ...svc, ...patch } : svc)),
    }));
  }

  function addService() {
    setSettings((s) => ({
      ...s,
      services: [
        ...s.services,
        {
          id: `svc-${Date.now()}`,
          name: "",
          description: "",
          durationMins: 60,
          sortOrder: s.services.length,
        },
      ],
    }));
  }

  function removeService(index: number) {
    setSettings((s) => ({
      ...s,
      services: s.services.filter((_, i) => i !== index),
    }));
  }

  function updateDay(day: BookingDayKey, patch: Partial<BookingSettings["availability"][BookingDayKey]>) {
    setSettings((s) => ({
      ...s,
      availability: {
        ...s.availability,
        [day]: { ...s.availability[day], ...patch },
      },
    }));
  }

  function setFieldConfig(patch: Partial<BookingSettings["fieldConfig"]>) {
    setSettings((s) => ({
      ...s,
      fieldConfig: { ...s.fieldConfig, ...patch },
    }));
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Online Booking</h2>
          <p className="text-sm text-muted-foreground">
            Configure your public booking page, services, availability, and embed codes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {enabled ? (
            <Button variant="outline" size="sm" asChild>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" /> Preview
              </a>
            </Button>
          ) : null}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>

      {/* Enable + slug */}
      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="booking-enabled"
            checked={enabled}
            onCheckedChange={(v) => setEnabled(v === true)}
          />
          <Label htmlFor="booking-enabled" className="cursor-pointer font-medium">
            Enable online booking
          </Label>
        </div>
        <div>
          <Label className="mb-1 block text-sm font-medium">Booking URL slug</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/book/</span>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="your-shop-name"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {/* Setup */}
      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">Setup</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-sm">Minimum notice</Label>
            <Select
              value={String(settings.minNoticeHours)}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, minNoticeHours: Number(v) }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MIN_NOTICE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Staff notification email</Label>
            <Input
              type="email"
              placeholder="service@yourshop.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Sent when a customer books online. Falls back to shop email if empty.
            </p>
          </div>
        </div>
        <div>
          <Label className="mb-1 block text-sm">Confirmation message</Label>
          <Textarea
            rows={2}
            placeholder="Optional message shown after booking…"
            value={settings.confirmationMessage ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                confirmationMessage: e.target.value || undefined,
              }))
            }
          />
        </div>
      </section>

      {/* Form fields */}
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Form fields</h3>
        <p className="text-sm text-muted-foreground">
          Control which fields appear on your public booking form.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldToggle
            id="email-required"
            label="Email required"
            checked={settings.fieldConfig.emailRequired}
            onChange={(v) => setFieldConfig({ emailRequired: v })}
          />
          <FieldToggle
            id="vehicle-required"
            label="Vehicle (year/make/model) required"
            checked={settings.fieldConfig.vehicleRequired}
            onChange={(v) => setFieldConfig({ vehicleRequired: v })}
          />
          <FieldToggle
            id="show-vehicle-desc"
            label="Show vehicle description field"
            checked={settings.fieldConfig.showVehicleDescription}
            onChange={(v) => setFieldConfig({ showVehicleDescription: v })}
          />
          <FieldToggle
            id="show-concerns"
            label="Show service concerns textarea"
            checked={settings.fieldConfig.showServiceConcerns}
            onChange={(v) => setFieldConfig({ showServiceConcerns: v })}
          />
          <FieldToggle
            id="show-vin"
            label="Show optional VIN field"
            checked={settings.fieldConfig.showVin}
            onChange={(v) => setFieldConfig({ showVin: v })}
          />
          <FieldToggle
            id="show-plate"
            label="Show plate / VIN lookup toggle"
            checked={settings.fieldConfig.showPlateLookup}
            onChange={(v) => setFieldConfig({ showPlateLookup: v })}
          />
        </div>
      </section>

      {/* Availability */}
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand-navy" />
          <h3 className="font-medium">Availability</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Booking hours per day. Uses shop appointment settings as defaults when first enabled.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Day</th>
                <th className="pb-2 pr-3 font-medium">Open</th>
                <th className="pb-2 pr-3 font-medium">Start</th>
                <th className="pb-2 pr-3 font-medium">End</th>
              </tr>
            </thead>
            <tbody>
              {BOOKING_DAYS.map((day) => {
                const row = settings.availability[day];
                return (
                  <tr key={day} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{BOOKING_DAY_LABELS[day]}</td>
                    <td className="py-2 pr-3">
                      <Checkbox
                        checked={row.enabled}
                        onCheckedChange={(v) => updateDay(day, { enabled: v === true })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="time"
                        className={cn(inputCls, !row.enabled && "opacity-50")}
                        disabled={!row.enabled}
                        value={row.start}
                        onChange={(e) => updateDay(day, { start: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="time"
                        className={cn(inputCls, !row.enabled && "opacity-50")}
                        disabled={!row.enabled}
                        value={row.end}
                        onChange={(e) => updateDay(day, { end: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Services</h3>
        <p className="text-sm text-muted-foreground">
          Services shown on your public booking form. Duration drives appointment length.
        </p>
        <div className="space-y-2">
          {settings.services.map((svc, i) => (
            <div
              key={svc.id}
              className="flex flex-wrap items-start gap-2 rounded-md border bg-muted/20 p-3"
            >
              <Input
                placeholder="Service name"
                value={svc.name}
                onChange={(e) => updateService(i, { name: e.target.value })}
                className="min-w-[140px] flex-1"
              />
              <Input
                placeholder="Description (optional)"
                value={svc.description ?? ""}
                onChange={(e) => updateService(i, { description: e.target.value })}
                className="min-w-[160px] flex-[2]"
              />
              <Select
                value={String(svc.durationMins)}
                onValueChange={(v) => updateService(i, { durationMins: Number(v) })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeService(i)}
                disabled={settings.services.length <= 1}
                aria-label="Remove service"
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addService}>
          <Plus className="size-4" /> Add service
        </Button>
      </section>

      {/* Embed codes */}
      {enabled ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-brand-navy" />
            <h3 className="font-medium">Share &amp; embed</h3>
          </div>
          <EmbedBlock
            title="Public booking link"
            code={bookingUrl}
            copyKey="url"
            copied={copied}
            onCopy={copy}
          />
          <EmbedBlock
            title="Embed on your website (iframe)"
            code={embedIframe}
            copyKey="iframe"
            copied={copied}
            onCopy={copy}
          />
          <EmbedBlock
            title="Book Now button"
            code={embedLink}
            copyKey="link"
            copied={copied}
            onCopy={copy}
          />
        </section>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? (
          <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
        </Button>
      </div>
    </div>
  );
}

function FieldToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="cursor-pointer text-sm">
        {label}
      </Label>
    </div>
  );
}

function EmbedBlock({
  title,
  code,
  copyKey,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <Button variant="outline" size="sm" onClick={() => onCopy(code, copyKey)}>
          {copied === copyKey ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
