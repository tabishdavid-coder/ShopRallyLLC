"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Battery,
  Calendar,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Droplets,
  Gauge,
  Loader2,
  MapPin,
  Phone,
  Search,
  Snowflake,
  User,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomerConsentCheckboxes } from "@/components/customers/customer-consent-checkboxes";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingVehicleYears } from "@/lib/booking-vehicle-options";
import { CAR_MAKES } from "@/lib/vehicle-makes";
import { formatPhoneInput } from "@/lib/phone";
import { formatMinutesLabel, parseTimeToMinutes } from "@/lib/appointments";
import type { BookingFieldConfig, BookingService } from "@/lib/booking-settings";
import { cn } from "@/lib/utils";
import {
  fetchBookingDaySchedule,
  submitIntakeForm,
  type IntakeResult,
} from "@/server/actions/intake";
import {
  getCarEngines,
  getCarModels,
  getCarTrims,
} from "@/server/actions/vehicle-catalog";
import type { VehicleEngineOption } from "@/lib/vehicle-catalog-types";
import { decodeVin, lookupPlate } from "@/server/actions/vehicles";

type Props = {
  shopSlug: string;
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  dates: string[];
  services: BookingService[];
  fieldConfig: BookingFieldConfig;
  confirmationMessage?: string;
  defaultDurationMins: number;
  dropOffEnabled?: boolean;
  dropOffLabel?: string;
  /** Pro+ Auto.dev plate→VIN — false on Core (manual plate + free NHTSA VIN only). */
  plateLookupEnabled?: boolean;
};

type StepId = "services" | "contact" | "vehicle" | "schedule" | "review";

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleTrim: string;
  vehicleEngine: string;
  vehicleVin: string;
  vehiclePlate: string;
  vehiclePlateState: string;
  vehicleDescription: string;
  serviceIds: string[];
  serviceConcerns: string;
  date: string;
  startTime: string;
  transactionalSmsConsent: boolean;
  marketingOptIn: boolean;
  marketingEmailConsent: boolean;
};

const vehicleYears = bookingVehicleYears();
const vehicleMakes = CAR_MAKES;
const CONCERNS_MAX = 300;

/** 44px touch targets + 16px font (prevents iOS input zoom). */
const TOUCH_INPUT = "h-11 text-base md:text-base";
const SELECT_TRIGGER =
  "h-11 w-full border border-input bg-white text-base md:text-base";
const MODE_TOGGLE_LINK =
  "inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-brand-navy hover:underline active:opacity-80";
const FOOTER_SAFE =
  "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 px-4 sm:px-5";
const FORM_SHELL =
  "flex h-[min(720px,100dvh)] flex-col overflow-hidden bg-card sm:h-[720px] sm:rounded-2xl sm:border sm:shadow-sm";
const CONTENT_SCROLL =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-5 sm:px-5";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addCalendarDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function vehicleSummaryLabel(form: FormState): string | null {
  if (form.vehicleYear && form.vehicleMake.trim() && form.vehicleModel.trim()) {
    return `${form.vehicleYear} ${form.vehicleMake} ${form.vehicleModel}`;
  }
  if (form.vehicleDescription.trim()) return form.vehicleDescription.trim();
  if (form.vehiclePlate.trim()) {
    return `${form.vehiclePlate}${form.vehiclePlateState ? ` (${form.vehiclePlateState})` : ""}`;
  }
  return null;
}

function buildGoogleCalendarUrl(input: {
  title: string;
  date: string;
  startTime: string;
  durationMins: number;
  location: string;
  details: string;
}): string {
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = input.startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + input.durationMins * 60_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${fmt(startAt)}/${fmt(endAt)}`,
    location: input.location,
    details: input.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function serviceIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("brake")) return CircleGauge;
  if (n.includes("oil")) return Droplets;
  if (n.includes("tire")) return Gauge;
  if (n.includes("heat") || n.includes("a/c") || n.includes("ac")) return Snowflake;
  if (n.includes("inspect")) return Wrench;
  if (n.includes("battery")) return Battery;
  if (n.includes("engine") || n.includes("trans")) return Wrench;
  return Car;
}

function phoneComplete(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

/** Schedule/confirmation summary: services and concerns as separate rows. */
function formatBookingServiceSummary(
  serviceNames: string | undefined | null,
  concerns: string | undefined | null,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const names = serviceNames?.trim();
  const note = concerns?.trim();
  if (names) rows.push({ label: "Services", value: names });
  if (note) rows.push({ label: "Your note", value: note });
  return rows;
}

export function BookingIntakeForm({
  shopSlug,
  shopName,
  shopPhone,
  shopAddress,
  dates,
  services,
  fieldConfig,
  confirmationMessage,
  defaultDurationMins,
  dropOffEnabled = true,
  dropOffLabel = "I will drop-off my vehicle",
  plateLookupEnabled = false,
}: Props) {
  const sortedServices = useMemo(
    () => [...services].sort((a, b) => a.sortOrder - b.sortOrder),
    [services],
  );

  const steps = useMemo((): StepId[] => {
    const s: StepId[] = ["services", "contact"];
    if (
      fieldConfig.vehicleRequired ||
      fieldConfig.showVin ||
      fieldConfig.showPlateLookup ||
      fieldConfig.showVehicleDescription
    ) {
      s.push("vehicle");
    }
    s.push("schedule", "review");
    return s;
  }, [fieldConfig]);

  const [stepIndex, setStepIndex] = useState(0);
  const [vehicleMode, setVehicleMode] = useState<"ymm" | "plate">("ymm");
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleTrim: "",
    vehicleEngine: "",
    vehicleVin: "",
    vehiclePlate: "",
    vehiclePlateState: "NY",
    vehicleDescription: "",
    serviceIds: [],
    serviceConcerns: "",
    date: dates[0] ?? "",
    startTime: "",
    transactionalSmsConsent: false,
    marketingOptIn: false,
    marketingEmailConsent: false,
  });
  const [daySchedule, setDaySchedule] = useState<{
    allSlots: string[];
    availableSlots: string[];
    dayEnabled: boolean;
  }>({ allSlots: [], availableSlots: [], dayEnabled: false });
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = dates[0] ? dateFromIso(dates[0]) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const bookableDateSet = useMemo(() => new Set(dates), [dates]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<IntakeResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [decodingVin, startDecodeVin] = useTransition();
  const [vinDecodeNote, setVinDecodeNote] = useState<string | null>(null);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [catalogTrims, setCatalogTrims] = useState<string[]>([]);
  const [catalogEngines, setCatalogEngines] = useState<VehicleEngineOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [trimsLoading, setTrimsLoading] = useState(false);
  const [enginesLoading, setEnginesLoading] = useState(false);

  const currentStep = steps[stepIndex] ?? "services";
  const progressPct = steps.length > 1 ? ((stepIndex + 1) / steps.length) * 100 : 100;

  const selectedServices = sortedServices.filter((s) => form.serviceIds.includes(s.id));
  const serviceSummary = useMemo(
    () =>
      formatBookingServiceSummary(
        selectedServices.map((s) => s.name).join(", ") || undefined,
        fieldConfig.showServiceConcerns ? form.serviceConcerns : undefined,
      ),
    [selectedServices, form.serviceConcerns, fieldConfig.showServiceConcerns],
  );
  const durationMins = selectedServices.length
    ? Math.max(...selectedServices.map((s) => s.durationMins))
    : defaultDurationMins;

  const vehicleStepIndex = steps.indexOf("vehicle");
  const showVehicleChip =
    (currentStep === "schedule" || currentStep === "review") &&
    (vehicleStepIndex < 0 || stepIndex > vehicleStepIndex);
  const vehicleChip = showVehicleChip ? vehicleSummaryLabel(form) : null;

  // YMM is always the default; plate/VIN mode only when shop enables it.
  const showPlateMode = fieldConfig.showPlateLookup && vehicleMode === "plate";

  useEffect(() => {
    if (currentStep !== "schedule" || !form.date) return;
    setLoadingSlots(true);
    setError(null);
    fetchBookingDaySchedule(shopSlug, form.date, durationMins)
      .then((schedule) => {
        setDaySchedule(schedule);
        setForm((f) => ({
          ...f,
          startTime: schedule.availableSlots.includes(f.startTime)
            ? f.startTime
            : (schedule.availableSlots[0] ?? ""),
        }));
      })
      .finally(() => setLoadingSlots(false));
  }, [shopSlug, form.date, durationMins, currentStep]);

  const yearNum = form.vehicleYear ? Number(form.vehicleYear) : null;

  useEffect(() => {
    if (!form.vehicleMake || !yearNum) {
      setCatalogModels([]);
      return;
    }
    setModelsLoading(true);
    getCarModels(form.vehicleMake, yearNum)
      .then(setCatalogModels)
      .finally(() => setModelsLoading(false));
  }, [form.vehicleMake, yearNum]);

  useEffect(() => {
    if (!form.vehicleMake || !yearNum || !form.vehicleModel) {
      setCatalogTrims([]);
      return;
    }
    setTrimsLoading(true);
    getCarTrims(form.vehicleMake, yearNum, form.vehicleModel)
      .then(setCatalogTrims)
      .finally(() => setTrimsLoading(false));
  }, [form.vehicleMake, yearNum, form.vehicleModel]);

  useEffect(() => {
    if (!form.vehicleMake || !yearNum || !form.vehicleTrim) {
      setCatalogEngines([]);
      return;
    }
    setEnginesLoading(true);
    getCarEngines(form.vehicleMake, yearNum, form.vehicleTrim)
      .then((engines) => {
        setCatalogEngines(engines);
        if (engines.length === 1) {
          setForm((f) =>
            f.vehicleEngine ? f : { ...f, vehicleEngine: engines[0]!.label },
          );
        }
      })
      .finally(() => setEnginesLoading(false));
  }, [form.vehicleMake, yearNum, form.vehicleTrim]);

  function setVehicleYear(year: string) {
    setForm((f) => ({
      ...f,
      vehicleYear: year,
      vehicleMake: "",
      vehicleModel: "",
      vehicleTrim: "",
      vehicleEngine: "",
    }));
  }

  function setVehicleMake(make: string) {
    setForm((f) => ({
      ...f,
      vehicleMake: make,
      vehicleModel: "",
      vehicleTrim: "",
      vehicleEngine: "",
    }));
  }

  function setVehicleModel(model: string) {
    setForm((f) => ({
      ...f,
      vehicleModel: model,
      vehicleTrim: "",
      vehicleEngine: "",
    }));
  }

  function setVehicleTrim(trim: string) {
    setForm((f) => ({
      ...f,
      vehicleTrim: trim,
      vehicleEngine: "",
    }));
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function tryDecodeVin(raw: string) {
    if (!fieldConfig.showVin) return;
    const v = raw.trim().replace(/\s/g, "").toUpperCase();
    if (v.length !== 17) return;
    startDecodeVin(async () => {
      setVinDecodeNote(null);
      const res = await decodeVin(v);
      if (res.ok) {
        const d = res.decoded;
        setForm((f) => ({
          ...f,
          vehicleVin: v,
          vehicleYear: d.year ? String(d.year) : f.vehicleYear,
          vehicleMake: d.make ?? f.vehicleMake,
          vehicleModel: d.model ?? f.vehicleModel,
          vehicleTrim: d.trim ?? f.vehicleTrim,
          vehicleEngine: d.engine ?? f.vehicleEngine,
        }));
        setVinDecodeNote(
          [d.year, d.make, d.model, d.trim].filter(Boolean).join(" ") || "VIN decoded",
        );
      } else {
        setVinDecodeNote(res.error);
      }
    });
  }

  function tryLookupPlate(rawPlate: string, state: string) {
    if (!plateLookupEnabled) return;
    const pl = rawPlate.trim();
    if (!pl || pl.replace(/\s/g, "").length === 17) return;
    startDecodeVin(async () => {
      setVinDecodeNote(null);
      const res = await lookupPlate(state, pl);
      if (res.ok) {
        const d = res.decoded;
        setForm((f) => ({
          ...f,
          vehiclePlate: pl.toUpperCase(),
          vehicleVin: res.vin ?? f.vehicleVin,
          vehicleYear: d.year ? String(d.year) : f.vehicleYear,
          vehicleMake: d.make ?? f.vehicleMake,
          vehicleModel: d.model ?? f.vehicleModel,
          vehicleTrim: d.trim ?? f.vehicleTrim,
          vehicleEngine: d.engine ?? f.vehicleEngine,
        }));
        setVinDecodeNote(
          [d.year, d.make, d.model, d.trim].filter(Boolean).join(" ") || "Vehicle found",
        );
      } else {
        setVinDecodeNote(res.error);
      }
    });
  }

  function toggleService(id: string) {
    setForm((f) => {
      const has = f.serviceIds.includes(id);
      if (has) {
        const next = f.serviceIds.filter((x) => x !== id);
        return { ...f, serviceIds: next };
      }
      return { ...f, serviceIds: [...f.serviceIds, id] };
    });
  }

  function canContinue(): boolean {
    switch (currentStep) {
      case "services":
        if (sortedServices.length === 0) return true;
        if (form.serviceIds.length > 0) return true;
        if (fieldConfig.showServiceConcerns && form.serviceConcerns.trim()) return true;
        return false;
      case "contact":
        if (!form.firstName.trim() || !form.lastName.trim() || !phoneComplete(form.phone))
          return false;
        if (fieldConfig.emailRequired && !form.email.trim()) return false;
        return true;
      case "vehicle": {
        if (!fieldConfig.vehicleRequired) return true;
        const hasYmm =
          Boolean(form.vehicleYear) &&
          Boolean(form.vehicleMake.trim()) &&
          Boolean(form.vehicleModel.trim());
        const hasPlate = Boolean(form.vehiclePlate.trim());
        if (showPlateMode) return hasPlate;
        return hasYmm;
      }
      case "schedule":
        return Boolean(
          form.date &&
            form.startTime &&
            daySchedule.availableSlots.includes(form.startTime),
        );
      case "review":
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    setError(null);
    if (currentStep === "review") {
      submitForm();
      return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function submitForm() {
    setError(null);

    const hasServices = form.serviceIds.length > 0;
    const hasConcerns = form.serviceConcerns.trim().length > 0;
    if (sortedServices.length > 0 && !hasServices && !hasConcerns) {
      setError("Please select a service or describe what you need help with.");
      return;
    }
    if (
      fieldConfig.showServiceConcerns &&
      sortedServices.length === 0 &&
      !hasConcerns
    ) {
      setError("Please describe what you need help with.");
      return;
    }

    startTransition(async () => {
      const [primaryId, ...restIds] = form.serviceIds;
      const res = await submitIntakeForm({
        shopSlug,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || null,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
        vehicleMake: form.vehicleMake || null,
        vehicleModel: form.vehicleModel || null,
        vehicleTrim: form.vehicleTrim || null,
        vehicleEngine: form.vehicleEngine || null,
        vehicleVin:
          fieldConfig.showVin && !showPlateMode ? form.vehicleVin || null : null,
        vehiclePlate: showPlateMode ? form.vehiclePlate || null : null,
        vehiclePlateState: showPlateMode ? form.vehiclePlateState || null : null,
        vehicleDescription: fieldConfig.showVehicleDescription
          ? form.vehicleDescription || null
          : null,
        serviceId: primaryId || null,
        additionalServiceIds: restIds.length ? restIds : undefined,
        serviceConcerns: fieldConfig.showServiceConcerns ? form.serviceConcerns : "",
        date: form.date,
        startTime: form.startTime,
        transactionalSmsConsent: form.transactionalSmsConsent,
        marketingOptIn: form.marketingOptIn,
        marketingEmailConsent: form.marketingEmailConsent,
      });
      if (res.ok) {
        setConfirmation(res);
      } else {
        setError(res.error);
      }
    });
  }

  if (confirmation?.ok) {
    const timeLabel = formatMinutesLabel(parseTimeToMinutes(confirmation.startTime));
    const dateLabel = formatDateLabel(confirmation.date);
    const phone = confirmation.shopPhone ?? shopPhone;
    const address = confirmation.shopAddress ?? shopAddress;
    const sentParts: string[] = [];
    if (confirmation.notifications.email) sentParts.push("email");
    if (confirmation.notifications.sms) sentParts.push("text message");

    const confirmedServiceSummary = formatBookingServiceSummary(
      confirmation.serviceName,
      confirmation.serviceConcerns,
    );

    return (
      <div className={FORM_SHELL}>
        <div className="bg-brand-navy px-4 py-3 text-center text-sm font-semibold text-white sm:px-5">
          {shopName}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 text-center sm:p-8">
          <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
          <h2 className="mt-4 text-xl font-bold sm:text-2xl">You&apos;re booked!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {confirmationMessage ??
              `Thank you — ${confirmation.shopName} has your appointment on the calendar.`}
          </p>
          <div className="mt-6 space-y-3 rounded-xl bg-muted/40 p-4 text-left text-sm">
            {confirmedServiceSummary.map((row) => (
              <SummaryRow key={row.label} label={row.label} value={row.value} />
            ))}
            <SummaryRow label="When" value={`${dateLabel} at ${timeLabel}`} />
            <SummaryRow label="Duration" value={`${confirmation.durationMins} minutes`} />
            <SummaryRow label="Name" value={confirmation.customerName} />
            {(phone || address) && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Shop contact
                </p>
                {phone ? (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={`tel:${phone.replace(/\D/g, "")}`}
                      className="font-medium hover:underline"
                    >
                      {phone}
                    </a>
                  </p>
                ) : null}
                {address ? (
                  <p className="mt-1 flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>{address}</span>
                  </p>
                ) : null}
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {sentParts.length
              ? `A confirmation has been sent via ${sentParts.join(" and ")}.`
              : "Save this page — the shop may follow up to confirm your appointment."}
          </p>
        </div>
      </div>
    );
  }

  const isHeroStep = currentStep === "services" && stepIndex === 0;
  const emailLabel = fieldConfig.emailRequired ? "Email *" : "Email";
  const vehicleRequired = fieldConfig.vehicleRequired;
  const isReviewStep = currentStep === "review";
  const continueEnabled = canContinue() && !pending;

  const weekStart = startOfWeekMonday(form.date ? dateFromIso(form.date) : new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => addCalendarDays(weekStart, i));

  function selectDate(iso: string) {
    if (!bookableDateSet.has(iso)) return;
    setField("date", iso);
    setViewMonth(new Date(dateFromIso(iso).getFullYear(), dateFromIso(iso).getMonth(), 1));
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    setViewMonth(next);
    const inMonth = dates.filter((d) => {
      const dt = dateFromIso(d);
      return dt.getMonth() === next.getMonth() && dt.getFullYear() === next.getFullYear();
    });
    if (inMonth[0]) selectDate(inMonth[0]);
  }

  function shiftWeek(delta: number) {
    const base = form.date ? dateFromIso(form.date) : new Date();
    const next = addCalendarDays(base, delta * 7);
    const iso = isoFromDate(next);
    if (bookableDateSet.has(iso)) {
      selectDate(iso);
    } else {
      const fallback = dates.find((d) => d >= iso) ?? dates[dates.length - 1];
      if (fallback) selectDate(fallback);
    }
  }

  const servicesLabel =
    selectedServices.map((s) => s.name).join(", ") ||
    (fieldConfig.showServiceConcerns && form.serviceConcerns.trim()
      ? form.serviceConcerns.trim()
      : "Appointment");

  const googleCalendarUrl =
    form.date && form.startTime
      ? buildGoogleCalendarUrl({
          title: `${shopName} — ${servicesLabel}`,
          date: form.date,
          startTime: form.startTime,
          durationMins,
          location: shopAddress ?? shopName,
          details: [
            servicesLabel,
            fieldConfig.showServiceConcerns && form.serviceConcerns.trim()
              ? form.serviceConcerns.trim()
              : null,
            vehicleChip,
          ]
            .filter(Boolean)
            .join("\n"),
        })
      : null;

  return (
    <div className={FORM_SHELL}>
      {/* Header */}
      <div className="relative shrink-0 border-b bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="size-8 shrink-0" aria-hidden />
          <p className="flex-1 truncate text-center text-sm font-semibold">{shopName}</p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:bg-muted/80"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        {vehicleChip ? (
          <div className="mt-2 flex justify-end">
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Car className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{vehicleChip}</span>
            </span>
          </div>
        ) : null}
        {!isHeroStep ? (
          <>
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="-ml-2 mt-1 flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-base font-medium text-brand-navy active:bg-accent"
              >
                <ChevronLeft className="size-5" aria-hidden /> Back
              </button>
            ) : null}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-navy transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Hero (step 1 only) */}
      {isHeroStep ? (
        <div className="relative shrink-0 bg-brand-navy px-4 pb-10 pt-8 text-center text-white sm:px-6">
          <div className="mb-4 flex justify-center sm:absolute sm:right-4 sm:top-4 sm:mb-0">
            <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <User className="size-3.5 shrink-0" aria-hidden /> Returning customer?
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Schedule your visit</h2>
          <p className="mt-1 text-sm italic text-white/80">Takes about 2 minutes or less</p>
          <svg
            className="absolute -bottom-px left-0 w-full text-white"
            viewBox="0 0 400 24"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : null}

      <div
        className={cn(
          CONTENT_SCROLL,
          isHeroStep && "pt-6",
          currentStep === "schedule" && "flex flex-col pb-0",
        )}
      >
        {currentStep === "services" ? (
          <ServicesStep
            sortedServices={sortedServices}
            form={form}
            fieldConfig={fieldConfig}
            toggleService={toggleService}
            setField={setField}
          />
        ) : null}

        {currentStep === "contact" ? (
          <div className="space-y-5">
            <StepHeading
              title="Enter your phone number"
              subtitle="We'll use this to confirm your appointment"
            />
            <Field label="Phone *">
              <Input
                required
                type="tel"
                inputMode="tel"
                placeholder="518-227-9897"
                className={cn(TOUCH_INPUT, "text-center text-lg tracking-wide")}
                value={form.phone}
                onChange={(e) => setField("phone", formatPhoneInput(e.target.value))}
                autoComplete="tel"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name *">
                <Input
                  required
                  className={TOUCH_INPUT}
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Last name *">
                <Input
                  required
                  className={TOUCH_INPUT}
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  autoComplete="family-name"
                />
              </Field>
            </div>
            <Field label={emailLabel}>
              <Input
                required={fieldConfig.emailRequired}
                type="email"
                inputMode="email"
                className={TOUCH_INPUT}
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                autoComplete="email"
              />
            </Field>
          </div>
        ) : null}

        {currentStep === "vehicle" ? (
          <div className="space-y-6">
            <StepHeading title="Add your vehicle" />
            {showPlateMode ? (
              <>
                <div className="grid gap-4 sm:grid-cols-[1fr_5.5rem]">
                  <Field label={plateLookupEnabled ? "Plate / VIN" : "VIN or plate"}>
                    <Input
                      placeholder={
                        plateLookupEnabled
                          ? "Enter Plate or VIN"
                          : "17-character VIN or enter plate manually"
                      }
                      className={TOUCH_INPUT}
                      value={form.vehiclePlate}
                      onChange={(e) => {
                        const next = e.target.value.toUpperCase().slice(0, 17);
                        setField("vehiclePlate", next);
                        if (next.replace(/[^A-HJ-NPR-Z0-9]/gi, "").length === 17) {
                          tryDecodeVin(next);
                        }
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v.replace(/[^A-HJ-NPR-Z0-9]/gi, "").length === 17) {
                          tryDecodeVin(v);
                        } else if (v && plateLookupEnabled) {
                          tryLookupPlate(v, form.vehiclePlateState);
                        }
                      }}
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                  </Field>
                  <Field label="State">
                    <Select
                      value={form.vehiclePlateState}
                      onValueChange={(v) => setField("vehiclePlateState", v)}
                    >
                      <SelectTrigger className={SELECT_TRIGGER}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {fieldConfig.showPlateLookup ? (
                  <button
                    type="button"
                    onClick={() => setVehicleMode("ymm")}
                    className={MODE_TOGGLE_LINK}
                  >
                    <Search className="size-4 shrink-0" aria-hidden /> Search by Year / Make / Model
                  </button>
                ) : null}
                {!plateLookupEnabled && showPlateMode ? (
                  <p className="text-xs text-muted-foreground">
                    VIN decode uses free NHTSA vPIC. Plates are saved manually — no plate lookup on
                    Core.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="space-y-5">
                {/* Primary: Year / Make / Model (required to continue) */}
                <div className="space-y-4">
                  <PrimaryField label={vehicleRequired ? "Year *" : "Year"}>
                    <Select
                      value={form.vehicleYear || (vehicleRequired ? "" : "__none__")}
                      onValueChange={(v) => setVehicleYear(v === "__none__" ? "" : v)}
                      required={vehicleRequired}
                    >
                      <SelectTrigger className={SELECT_TRIGGER}>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {!vehicleRequired ? (
                          <SelectItem value="__none__">—</SelectItem>
                        ) : null}
                        {vehicleYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PrimaryField>
                  <PrimaryField label={vehicleRequired ? "Make *" : "Make"}>
                    <Select
                      value={form.vehicleMake || (vehicleRequired ? "" : "__none__")}
                      onValueChange={(v) => setVehicleMake(v === "__none__" ? "" : v)}
                      disabled={!form.vehicleYear}
                      required={vehicleRequired}
                    >
                      <SelectTrigger className={SELECT_TRIGGER}>
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {!vehicleRequired ? (
                          <SelectItem value="__none__">—</SelectItem>
                        ) : null}
                        {form.vehicleMake &&
                        !vehicleMakes.some(
                          (m) => m.toLowerCase() === form.vehicleMake.toLowerCase(),
                        ) ? (
                          <SelectItem value={form.vehicleMake}>{form.vehicleMake}</SelectItem>
                        ) : null}
                        {vehicleMakes.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PrimaryField>
                  <PrimaryField label={vehicleRequired ? "Model *" : "Model"}>
                    {modelsLoading ? (
                      <div
                        className={cn(
                          TOUCH_INPUT,
                          "flex items-center gap-2 rounded-md border border-input px-3 text-muted-foreground",
                        )}
                      >
                        <Loader2 className="size-4 animate-spin" /> Loading models…
                      </div>
                    ) : (
                      <Select
                        value={form.vehicleModel || (vehicleRequired ? "" : "__none__")}
                        onValueChange={(v) => setVehicleModel(v === "__none__" ? "" : v)}
                        disabled={!form.vehicleMake}
                        required={vehicleRequired}
                      >
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {!vehicleRequired ? (
                            <SelectItem value="__none__">—</SelectItem>
                          ) : null}
                          {form.vehicleModel && !catalogModels.includes(form.vehicleModel) ? (
                            <SelectItem value={form.vehicleModel}>{form.vehicleModel}</SelectItem>
                          ) : null}
                          {catalogModels.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </PrimaryField>
                </div>

                {/* Secondary: optional submodel / engine (shown after model) */}
                {form.vehicleModel.trim() ? (
                  <div className="space-y-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-3.5 sm:px-4">
                    <p className="text-xs font-medium text-muted-foreground">Optional details</p>
                    <div className="space-y-3">
                      <OptionalField label="Submodel">
                        {trimsLoading ? (
                          <div
                            className={cn(
                              TOUCH_INPUT,
                              "flex items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-muted-foreground",
                            )}
                          >
                            <Loader2 className="size-4 animate-spin" /> Loading submodels…
                          </div>
                        ) : catalogTrims.length > 0 ? (
                          <Select
                            value={form.vehicleTrim || "__none__"}
                            onValueChange={(v) => setVehicleTrim(v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className={cn(SELECT_TRIGGER, "text-sm")}>
                              <SelectValue placeholder="Select submodel" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {form.vehicleTrim && !catalogTrims.includes(form.vehicleTrim) ? (
                                <SelectItem value={form.vehicleTrim}>{form.vehicleTrim}</SelectItem>
                              ) : null}
                              {catalogTrims.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Enter submodel"
                            className={cn(TOUCH_INPUT, "text-sm")}
                            value={form.vehicleTrim}
                            onChange={(e) => setVehicleTrim(e.target.value)}
                            autoComplete="off"
                          />
                        )}
                      </OptionalField>
                      <OptionalField label="Engine">
                        {enginesLoading ? (
                          <div
                            className={cn(
                              TOUCH_INPUT,
                              "flex items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-muted-foreground",
                            )}
                          >
                            <Loader2 className="size-4 animate-spin" /> Loading engines…
                          </div>
                        ) : catalogEngines.length > 0 ? (
                          <Select
                            value={form.vehicleEngine || "__none__"}
                            onValueChange={(v) => setField("vehicleEngine", v === "__none__" ? "" : v)}
                            disabled={!form.vehicleTrim}
                          >
                            <SelectTrigger className={cn(SELECT_TRIGGER, "text-sm")}>
                              <SelectValue placeholder="Select engine" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {form.vehicleEngine &&
                              !catalogEngines.some((e) => e.label === form.vehicleEngine) ? (
                                <SelectItem value={form.vehicleEngine}>{form.vehicleEngine}</SelectItem>
                              ) : null}
                              {catalogEngines.map((e) => (
                                <SelectItem key={e.vehicleId} value={e.label}>
                                  {e.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={
                              form.vehicleTrim ? "Enter engine" : "Select submodel or type engine"
                            }
                            className={cn(TOUCH_INPUT, "text-sm")}
                            value={form.vehicleEngine}
                            onChange={(e) => setField("vehicleEngine", e.target.value)}
                            autoComplete="off"
                          />
                        )}
                      </OptionalField>
                    </div>
                  </div>
                ) : null}

                {/* Alternate lookup at bottom */}
                {fieldConfig.showPlateLookup ? (
                  <button
                    type="button"
                    onClick={() => setVehicleMode("plate")}
                    className={MODE_TOGGLE_LINK}
                  >
                    <Search className="size-4 shrink-0" aria-hidden />{" "}
                    {plateLookupEnabled ? "Search by Plate / VIN" : "Search by VIN"}
                  </button>
                ) : null}
                {fieldConfig.showVin && !fieldConfig.showPlateLookup ? (
                  <OptionalField label="VIN">
                    <Input
                      placeholder="17-character VIN"
                      maxLength={17}
                      className={cn(TOUCH_INPUT, "text-sm")}
                      value={form.vehicleVin}
                      onChange={(e) => {
                        const next = e.target.value.toUpperCase().slice(0, 17);
                        setField("vehicleVin", next);
                        if (next.length === 17) tryDecodeVin(next);
                      }}
                      onBlur={(e) => tryDecodeVin(e.target.value)}
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                  </OptionalField>
                ) : null}
              </div>
            )}
            {decodingVin ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Decoding VIN…
              </p>
            ) : null}
            {vinDecodeNote ? (
              <p className="text-sm text-amber-700">{vinDecodeNote}</p>
            ) : null}
            {fieldConfig.showVehicleDescription ? (
              <Field label="Or describe your vehicle">
                <Input
                  placeholder="e.g. Blue pickup truck"
                  className={TOUCH_INPUT}
                  value={form.vehicleDescription}
                  onChange={(e) => setField("vehicleDescription", e.target.value)}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {currentStep === "schedule" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <StepHeading title="Pick a date & time" subtitle={`Appointments are ${durationMins} minutes`} />
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex size-9 items-center justify-center rounded-md text-brand-navy hover:bg-muted active:bg-muted/80"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-5" />
              </button>
              <p className="text-sm font-semibold">{formatMonthYear(viewMonth)}</p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex size-9 items-center justify-center rounded-md text-brand-navy hover:bg-muted active:bg-muted/80"
                aria-label="Next month"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftWeek(-1)}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain pb-1">
                {weekDates.map((day) => {
                  const iso = isoFromDate(day);
                  const bookable = bookableDateSet.has(iso);
                  const selected = form.date === iso;
                  const dow = day.toLocaleDateString("en-US", { weekday: "short" });
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={!bookable}
                      onClick={() => selectDate(iso)}
                      className={cn(
                        "flex min-w-[3.25rem] flex-1 flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors",
                        selected
                          ? "border-brand-navy bg-brand-navy text-white"
                          : bookable
                            ? "border-input bg-background hover:border-brand-navy/40 active:bg-accent"
                            : "cursor-not-allowed border-transparent bg-muted/50 text-muted-foreground/50",
                      )}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                        {dow}
                      </span>
                      <span className="text-base font-semibold">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => shiftWeek(1)}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Next week"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
              {loadingSlots ? (
                <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading times…
                </div>
              ) : !daySchedule.dayEnabled || daySchedule.allSlots.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No times available this day.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {daySchedule.allSlots.map((t) => {
                    const available = daySchedule.availableSlots.includes(t);
                    const selected = form.startTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={!available}
                        onClick={() => available && setField("startTime", t)}
                        className={cn(
                          "min-h-11 rounded-lg border px-2 py-2.5 text-base font-medium transition-colors",
                          selected
                            ? "border-brand-navy bg-brand-navy text-white"
                            : available
                              ? "border-input bg-background active:bg-accent"
                              : "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground/45 line-through",
                        )}
                      >
                        {formatMinutesLabel(parseTimeToMinutes(t))}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {currentStep === "review" ? (
          <div className="space-y-5 pb-2">
            <div className="text-center">
              <Calendar className="mx-auto size-12 text-brand-navy" aria-hidden />
              <h2 className="mt-3 text-xl font-bold sm:text-2xl">One more step!</h2>
              <p className="mt-1 text-sm text-muted-foreground">Review and book</p>
            </div>
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4 text-sm">
              <ReviewRow label="Date" value={formatDateLong(form.date)} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <ReviewRow
                  label="Time"
                  value={formatMinutesLabel(parseTimeToMinutes(form.startTime))}
                  inline
                />
                {googleCalendarUrl ? (
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-navy hover:underline"
                  >
                    Add to Google Calendar
                  </a>
                ) : null}
              </div>
              {shopAddress ? <ReviewRow label="Location" value={shopAddress} /> : null}
              {vehicleChip ? <ReviewRow label="Vehicle" value={vehicleChip} /> : null}
              {serviceSummary.length > 0
                ? serviceSummary.map((row) => (
                    <ReviewRow key={row.label} label={row.label} value={row.value} />
                  ))
                : null}
              {dropOffEnabled ? (
                <ReviewRow label="Drop-off" value={dropOffLabel} />
              ) : null}
            </div>
            <CustomerConsentCheckboxes
              transactionalSmsConsent={form.transactionalSmsConsent}
              marketingOptIn={form.marketingOptIn}
              marketingEmailConsent={form.marketingEmailConsent}
              onTransactionalChange={(v) => setField("transactionalSmsConsent", v)}
              onMarketingSmsChange={(v) => setField("marketingOptIn", v)}
              onMarketingEmailChange={(v) => setField("marketingEmailConsent", v)}
              showEmail={Boolean(form.email.trim())}
            />
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By booking, you agree to {shopName}&apos;s terms of service and privacy policy.
              Appointment times are estimates and may change based on shop availability.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {/* Sticky footer */}
      <div
        className={cn(
          "sticky bottom-0 shrink-0 border-t bg-white/95 backdrop-blur-sm",
          FOOTER_SAFE,
        )}
      >
        <Button
          type="button"
          className={cn(
            "min-h-11 w-full text-base disabled:pointer-events-none disabled:opacity-100",
            continueEnabled
              ? "bg-brand-navy text-white hover:bg-brand-navy/90"
              : "bg-brand-light/50 text-brand-navy/45 hover:bg-brand-light/50",
          )}
          size="lg"
          disabled={pending || !canContinue()}
          onClick={goNext}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Booking…
            </>
          ) : isReviewStep ? (
            "Book appointment"
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}

function ServicesStep({
  sortedServices,
  form,
  fieldConfig,
  toggleService,
  setField,
}: {
  sortedServices: BookingService[];
  form: FormState;
  fieldConfig: BookingFieldConfig;
  toggleService: (id: string) => void;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="space-y-6">
      {fieldConfig.showServiceConcerns ? (
        <section aria-labelledby="booking-concerns-heading">
          <p id="booking-concerns-heading" className="mb-2 text-sm font-semibold">
            Not sure what you need?
          </p>
          <Textarea
            id="booking-concerns"
            rows={3}
            maxLength={CONCERNS_MAX}
            placeholder="Tell us what's happening…"
            value={form.serviceConcerns}
            onChange={(e) => setField("serviceConcerns", e.target.value.slice(0, CONCERNS_MAX))}
            className="resize-none text-base md:text-base"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {form.serviceConcerns.length}/{CONCERNS_MAX}
          </p>
        </section>
      ) : null}

      {sortedServices.length > 0 ? (
        <section
          aria-labelledby="booking-instant-heading"
          className={cn(fieldConfig.showServiceConcerns && "border-t border-border pt-6")}
        >
          <p id="booking-instant-heading" className="mb-3 text-sm font-semibold">
            Instant booking
          </p>
          <div className="space-y-2">
            {sortedServices.map((svc) => {
              const Icon = serviceIcon(svc.name);
              const selected = form.serviceIds.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors active:scale-[0.99]",
                    selected
                      ? "border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy/20"
                      : "border-border active:bg-muted/40",
                  )}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold">{svc.name}</span>
                    {svc.description ? (
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {svc.description}
                      </span>
                    ) : null}
                  </span>
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleService(svc.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="size-5 shrink-0 data-[state=checked]:border-brand-navy data-[state=checked]:bg-brand-navy"
                    aria-label={`Select ${svc.name}`}
                  />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function PrimaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="block text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function OptionalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  inline = false,
}: {
  label: string;
  value: string;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <p>
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium">{value}</span>
      </p>
    );
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </p>
  );
}
