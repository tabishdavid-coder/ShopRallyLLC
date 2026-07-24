"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  Receipt,
  Save,
  Search,
  Shield,
  Tag,
  User,
  Users,
} from "lucide-react";

import { CustomerConsentCheckboxes } from "@/components/customers/customer-consent-checkboxes";
import {
  CustomerTagPicker,
  validateCustomerForm,
  type CustomerFormType,
  type EditableCustomerRecord,
} from "@/components/customers/customer-form-shared";
import {
  CUSTOMER_INTAKE_FIELD,
  CustomerIntakeFieldLabel,
  CustomerIntakeFormSection,
  CustomerIntakeIconInput,
  CustomerIntakeIconSelect,
  CustomerIntakeTypeTabs,
} from "@/components/customers/customer-intake-form-chrome";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import {
  DRIVETRAIN_OPTIONS,
  TRANSMISSION_OPTIONS,
  US_STATE_CODES,
  US_STATE_NAMES,
  VEHICLE_COLORS,
  VEHICLE_NOTES_MAX,
} from "@/components/vehicles/create-vehicle-form";
import {
  VEHICLE_INTAKE_BTN_PRIMARY,
  VEHICLE_INTAKE_FIELD,
  VehicleIntakeFieldLabel,
  VehicleIntakeFormSection,
} from "@/components/vehicles/vehicle-intake-form-chrome";
import { US_STATES } from "@/lib/platform-shop-form";
import {
  usePlateVinLookup,
  type VehicleLookupFields,
} from "@/components/vehicles/use-plate-vin-lookup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SharePlansLinkButton } from "@/components/maintenance/share-plans-link-button";
import type { ContextDrawerTab } from "@/components/estimate-building/estimate-lab-context-drawer";
import { fetchCustomerCarePlans } from "@/server/actions/customer-care-plans";
import { fetchCustomerPaymentHistory } from "@/server/actions/customer-payment-history";
import { PaymentFinancePanel, type PaymentFinanceData } from "@/components/repair-order/payment-finance-panel";
import { PaymentTransactionsPanel } from "@/components/repair-order/payment-transactions-panel";
import type {
  EstimateContextDrawerCarePlan,
  EstimateContextDrawerDeferredJob,
  EstimateContextDrawerRo,
  EstimateContextDrawerVehicle,
} from "@/lib/estimate-context-drawer-types";

type VehicleDrawerPanel = "details" | "history";
import { formatCents } from "@/lib/format";
import { formatVehicleDisplayLabel } from "@/lib/vehicle-display";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { formatPhoneInput } from "@/lib/phone";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { useAutodevDecodingUiEnabled } from "@/lib/shop-capabilities";
import { getCustomerTagNames } from "@/server/actions/customer-settings";
import { updateCustomer } from "@/server/actions/customers";
import { updateVehicle } from "@/server/actions/vehicles";
import type { ROStatus } from "@/generated/prisma";

const DRAWER_FIELD =
  "h-9 rounded-md border-border bg-white text-sm shadow-none focus-visible:border-brand-navy focus-visible:ring-brand-navy/20";

const DRAWER_BTN_PRIMARY =
  "h-9 rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-navy/90";

const DRAWER_BTN_OUTLINE =
  "h-9 rounded-md border-border bg-white px-4 text-sm font-medium text-brand-navy hover:bg-brand-navy/[0.04]";

const DRAWER_BTN_ACCENT =
  "h-9 rounded-md border-brand-navy/30 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-brand-light/20";

/** Pane header — matches Vehicles orange-icon + light divider rhythm. */
function DrawerPaneHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eaecf0] py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-brand-orange" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/** Flat section chrome — orange icon + title (Profile/Vehicles rhythm). */
function DrawerFlatSection({
  icon: Icon,
  title,
  children,
  className,
  headerAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-brand-orange" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {headerAction}
      </div>
      <div>{children}</div>
    </section>
  );
}

function DrawerEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-white px-4 py-8">
      <div className="flex flex-col items-center text-center">
        <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-brand-navy/[0.06]">
          <Icon className="size-5 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium text-brand-navy">{title}</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 text-sm font-medium text-brand-navy hover:underline"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function fmtRoWhen(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function vehicleTitle(v: EstimateContextDrawerVehicle) {
  return formatVehicleDisplayLabel(v);
}

function customerPayload(
  c: EditableCustomerRecord,
  patch: Partial<EditableCustomerRecord & { transactionalSmsConsent?: boolean; marketingEmailConsent?: boolean }>,
) {
  const merged = { ...c, ...patch };
  const type = merged.company?.trim() ? ("business" as const) : ("person" as const);
  return {
    id: merged.id,
    type,
    firstName: merged.firstName ?? "",
    lastName: merged.lastName ?? "",
    company: merged.company ?? "",
    phone: merged.phone ?? "",
    email: merged.email ?? "",
    address: merged.address ?? "",
    city: merged.city ?? "",
    state: merged.state ?? "",
    zip: merged.zip ?? "",
    marketingOptIn: merged.marketingOptIn,
    notes: merged.notes ?? "",
    tags: merged.tags ?? [],
    transactionalSmsConsent: patch.transactionalSmsConsent ?? false,
    marketingEmailConsent: patch.marketingEmailConsent ?? false,
  };
}

export function DrawerProfileTab({
  customer,
  customerId: _customerId,
  drawerOpen,
  canEdit,
  onSaved,
}: {
  customer: EditableCustomerRecord & {
    transactionalSmsConsent?: boolean;
    marketingEmailConsent?: boolean;
    leadSource?: string | null;
  };
  customerId: string;
  drawerOpen: boolean;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const seedType: CustomerFormType = customer.company?.trim() ? "business" : "person";
  const [type, setType] = useState<CustomerFormType>(seedType);
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [company, setCompany] = useState(customer.company ?? "");
  const [phone, setPhone] = useState(customer.phone ? formatPhoneInput(customer.phone) : "");
  const [phoneType, setPhoneType] = useState("Mobile");
  const [email, setEmail] = useState(customer.email ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [state, setState] = useState(customer.state ?? "");
  const [zip, setZip] = useState(customer.zip ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [tags, setTags] = useState<string[]>(customer.tags ?? []);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [transactionalSms, setTransactionalSms] = useState(customer.transactionalSmsConsent ?? false);
  const [marketingSms, setMarketingSms] = useState(customer.marketingOptIn ?? false);
  const [marketingEmail, setMarketingEmail] = useState(customer.marketingEmailConsent ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function resetForm() {
    setType(customer.company?.trim() ? "business" : "person");
    setFirstName(customer.firstName ?? "");
    setLastName(customer.lastName ?? "");
    setCompany(customer.company ?? "");
    setPhone(customer.phone ? formatPhoneInput(customer.phone) : "");
    setPhoneType("Mobile");
    setEmail(customer.email ?? "");
    setAddress(customer.address ?? "");
    setCity(customer.city ?? "");
    setState(customer.state ?? "");
    setZip(customer.zip ?? "");
    setNotes(customer.notes ?? "");
    setTags(customer.tags ?? []);
    setTransactionalSms(customer.transactionalSmsConsent ?? false);
    setMarketingSms(customer.marketingOptIn ?? false);
    setMarketingEmail(customer.marketingEmailConsent ?? false);
    setError(null);
  }

  useEffect(() => {
    resetForm();
  }, [customer]);

  useEffect(() => {
    if (!drawerOpen) return;
    let cancelled = false;
    void getCustomerTagNames().then((names) => {
      if (!cancelled) setAvailableTags(names);
    });
    return () => {
      cancelled = true;
    };
  }, [drawerOpen]);

  function save() {
    if (!canEdit) return;
    const validation = validateCustomerForm(type, { firstName, lastName, company, phone, email });
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateCustomer(
        customerPayload(customer, {
          firstName,
          lastName,
          company: type === "business" ? company : null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip: zip.trim() || null,
          notes: notes.trim() || null,
          tags,
          marketingOptIn: marketingSms,
          transactionalSmsConsent: transactionalSms,
          marketingEmailConsent: marketingEmail,
        }),
      );
      if (res.ok) onSaved();
      else setError(res.error ?? "Could not save.");
    });
  }

  const displayName =
    type === "business" && company.trim()
      ? company.trim()
      : `${firstName} ${lastName}`.trim();
  const disabled = !canEdit || pending;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex min-h-full flex-col bg-white">
        <CustomerIntakeTypeTabs
          type={type}
          onChange={setType}
          disabled={disabled}
        />

        <div className="min-h-0 flex-1 space-y-7 py-5">
          <CustomerIntakeFormSection icon={User} title="Customer Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <CustomerIntakeFieldLabel label="First Name" required={type === "person"} />
                <CustomerIntakeIconInput
                  icon={User}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  disabled={disabled}
                />
              </div>
              <div>
                <CustomerIntakeFieldLabel label="Last Name" required={type === "person"} />
                <CustomerIntakeIconInput
                  icon={User}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  disabled={disabled}
                />
              </div>
              <div>
                <CustomerIntakeFieldLabel label="Display Name" />
                <CustomerIntakeIconInput
                  icon={Users}
                  value={displayName}
                  readOnly
                  disabled
                  placeholder="How this customer appears"
                />
              </div>
              <div>
                <CustomerIntakeFieldLabel
                  label="Company Name"
                  required={type === "business"}
                  optional={type === "person"}
                />
                <CustomerIntakeIconInput
                  icon={Building2}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <CustomerIntakeFieldLabel label="Phone" />
                <div className="flex h-10 overflow-hidden rounded-md border border-[#d0d5dd] bg-white focus-within:border-brand-orange/50 focus-within:ring-3 focus-within:ring-brand-orange/20">
                  <Select
                    value={phoneType}
                    onValueChange={setPhoneType}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-full w-[118px] shrink-0 rounded-none border-0 border-r border-[#d0d5dd] bg-transparent px-2.5 text-sm shadow-none focus:ring-0">
                      <Phone className="mr-1.5 size-3.5 text-muted-foreground/60" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    placeholder="(555) 123-4567"
                    inputMode="tel"
                    disabled={disabled}
                    className="h-full rounded-none border-0 pl-3 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
              <div>
                <CustomerIntakeFieldLabel label="Email" />
                <CustomerIntakeIconInput
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  type="email"
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <CustomerIntakeFieldLabel label="Communication preferences" />
              <div className="rounded-md border border-[#eaecf0] bg-[#fafbfc] px-3 py-3">
                <CustomerConsentCheckboxes
                  compact
                  transactionalSmsConsent={transactionalSms}
                  marketingOptIn={marketingSms}
                  marketingEmailConsent={marketingEmail}
                  onTransactionalChange={setTransactionalSms}
                  onMarketingSmsChange={setMarketingSms}
                  onMarketingEmailChange={setMarketingEmail}
                />
              </div>
            </div>
          </CustomerIntakeFormSection>

          <div className="h-px bg-[#eaecf0]" />

          <CustomerIntakeFormSection icon={MapPin} title="Address">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <CustomerIntakeFieldLabel label="Address Line 1" />
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address"
                  disabled={disabled}
                  className={cn(CUSTOMER_INTAKE_FIELD, "pl-3")}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <CustomerIntakeFieldLabel label="City" />
                <CustomerIntakeIconInput
                  icon={Building2}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  disabled={disabled}
                />
              </div>
              <div>
                <CustomerIntakeFieldLabel label="State / Province" />
                <CustomerIntakeIconSelect
                  icon={MapPin}
                  value={state}
                  onValueChange={setState}
                  placeholder="State / Province"
                  disabled={disabled}
                >
                  {(US_STATES.length ? US_STATES : US_STATE_CODES).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </CustomerIntakeIconSelect>
              </div>
              <div>
                <CustomerIntakeFieldLabel label="Zip / Postal Code" />
                <CustomerIntakeIconInput
                  icon={Mail}
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP / Postal code"
                  disabled={disabled}
                />
              </div>
            </div>
          </CustomerIntakeFormSection>

          <div className="h-px bg-[#eaecf0]" />

          <CustomerIntakeFormSection icon={FileText} title="Additional Information">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <CustomerIntakeFieldLabel label="Tags" optional />
                <div className="rounded-md border border-[#d0d5dd] bg-white p-3">
                  <CustomerTagPicker
                    compact
                    availableTags={
                      availableTags.length > 0
                        ? availableTags
                        : Array.from(new Set([...(customer.tags ?? []), ...tags]))
                    }
                    selected={tags}
                    onToggle={(t) =>
                      setTags((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <CustomerIntakeFieldLabel label="Notes" optional />
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground/60" />
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this customer..."
                    disabled={disabled}
                    className="min-h-[96px] resize-y rounded-md border-[#d0d5dd] bg-white pl-9 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:border-brand-orange/50 focus-visible:ring-brand-orange/20"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </CustomerIntakeFormSection>

          {error && !canEdit ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        {canEdit ? (
          <div className="sticky bottom-0 z-10 -mx-4 mt-auto flex items-center justify-end gap-3 border-t border-[#eaecf0] bg-white px-4 py-4 sm:-mx-5 sm:px-5">
            {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              variant="outline"
              className="h-10 border-[#d0d5dd] px-5"
              disabled={pending}
              onClick={resetForm}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 gap-2 bg-brand-orange px-5 text-white hover:bg-brand-orange/90"
              disabled={pending}
              onClick={save}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending ? "Saving…" : "Save Customer"}
            </Button>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function VehicleAccordionCard({
  vehicle,
  customerId,
  repairOrders,
  currentRoId,
  currentRoVehicleId,
  roMileageIn = null,
  roOdometerNotWorking = false,
  canEdit,
  onSaved,
}: {
  vehicle: EstimateContextDrawerVehicle;
  customerId: string;
  repairOrders: EstimateContextDrawerRo[];
  currentRoId?: string;
  currentRoVehicleId: string | null;
  roMileageIn?: number | null;
  roOdometerNotWorking?: boolean;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(vehicle.id === currentRoVehicleId);
  const [panel, setPanel] = useState<VehicleDrawerPanel>("details");
  const autodevDecodingOk = useAutodevDecodingUiEnabled();
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [year, setYear] = useState(vehicle.year != null ? String(vehicle.year) : "");
  const [make, setMake] = useState(vehicle.make ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [trim, setTrim] = useState(vehicle.trim ?? "");
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [plateState, setPlateState] = useState(vehicle.plateState ?? "NY");
  const [engine, setEngine] = useState(vehicle.engine ?? "");
  const [transmission, setTransmission] = useState(vehicle.transmission ?? "");
  const [drivetrain, setDrivetrain] = useState(vehicle.drivetrain ?? "");
  const [bodyClass, setBodyClass] = useState(vehicle.bodyClass ?? "");
  const [color, setColor] = useState(vehicle.color ?? "");
  const [unitNumber, setUnitNumber] = useState(vehicle.unitNumber ?? "");
  const [notes, setNotes] = useState(vehicle.notes ?? "");
  const [decodedData, setDecodedData] = useState<unknown | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const {
    pending: lookupPending,
    error: lookupError,
    note: lookupNote,
    clearMessages,
    lookupByPlate,
    lookupByVin,
  } = usePlateVinLookup();
  const title = vehicleTitle({
    ...vehicle,
    year: year.trim() ? Number(year) : null,
    make: make || null,
    model: model || null,
    trim: trim || null,
  });
  const vinNormalized = vin.trim().replace(/\s/g, "").toUpperCase();
  const canDecodeVin = vinNormalized.length === 17;
  const canLookupPlate = autodevDecodingOk && plate.trim().length > 0;
  const busy = pending || lookupPending;
  const vehicleOrders = useMemo(
    () => repairOrders.filter((ro) => ro.vehicleId === vehicle.id),
    [repairOrders, vehicle.id],
  );
  const colorOptions = useMemo(() => {
    if (color && !VEHICLE_COLORS.includes(color as (typeof VEHICLE_COLORS)[number])) {
      return [color, ...VEHICLE_COLORS];
    }
    return [...VEHICLE_COLORS];
  }, [color]);

  useEffect(() => {
    setVin(vehicle.vin ?? "");
    setYear(vehicle.year != null ? String(vehicle.year) : "");
    setMake(vehicle.make ?? "");
    setModel(vehicle.model ?? "");
    setTrim(vehicle.trim ?? "");
    setPlate(vehicle.plate ?? "");
    setPlateState(vehicle.plateState ?? "NY");
    setEngine(vehicle.engine ?? "");
    setTransmission(vehicle.transmission ?? "");
    setDrivetrain(vehicle.drivetrain ?? "");
    setBodyClass(vehicle.bodyClass ?? "");
    setColor(vehicle.color ?? "");
    setUnitNumber(vehicle.unitNumber ?? "");
    setNotes(vehicle.notes ?? "");
    setDecodedData(undefined);
    setSaveError(null);
    setPanel("details");
    clearMessages();
  }, [vehicle, clearMessages]);

  function currentLookupFields(): VehicleLookupFields {
    return {
      vin,
      year: year.trim() ? Number(year) : null,
      make: make || null,
      model: model || null,
      trim: trim || null,
      engine: engine || null,
      transmission: transmission || null,
      drivetrain: drivetrain || null,
      bodyClass: bodyClass || null,
      decodedData,
    };
  }

  function applyLookup(fields: VehicleLookupFields, resolvedVin: string | null) {
    if (resolvedVin) setVin(resolvedVin);
    if (fields.year != null) setYear(String(fields.year));
    if (fields.make) setMake(fields.make);
    if (fields.model) setModel(fields.model);
    if (fields.trim) setTrim(fields.trim);
    if (fields.engine) setEngine(fields.engine);
    if (fields.transmission) setTransmission(fields.transmission);
    if (fields.drivetrain) setDrivetrain(fields.drivetrain);
    if (fields.bodyClass) setBodyClass(fields.bodyClass);
    if (fields.decodedData !== undefined) setDecodedData(fields.decodedData);
  }

  function runVinDecode(raw?: string) {
    if (!canEdit) return;
    lookupByVin(
      raw ?? vin,
      currentLookupFields(),
      ({ vin: resolvedVin, fields }) => applyLookup(fields, resolvedVin),
      { overwrite: true },
    );
  }

  function runPlateLookup() {
    if (!canEdit) return;
    lookupByPlate(
      plateState,
      plate,
      currentLookupFields(),
      ({ vin: resolvedVin, fields }) => applyLookup(fields, resolvedVin),
      { overwrite: true },
    );
  }

  function save() {
    if (!canEdit) return;
    setSaveError(null);
    start(async () => {
      const parsedYear = year.trim() ? Number(year) : null;
      const res = await updateVehicle({
        id: vehicle.id,
        customerId,
        vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
        year: parsedYear ?? undefined,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        trim: trim.trim() || undefined,
        plate: plate.trim() || undefined,
        plateState: plate.trim() ? plateState.trim() || undefined : undefined,
        unitNumber: unitNumber.trim() || null,
        notes: notes.trim() || null,
        color: color.trim() || null,
        engine: engine.trim() || null,
        transmission: transmission.trim() || null,
        drivetrain: drivetrain.trim() || null,
        bodyClass: bodyClass.trim() || null,
        decodedData,
      });
      if (res.ok) {
        clearMessages();
        onSaved();
      } else {
        setSaveError(res.error);
      }
    });
  }

  async function copyVin() {
    if (!vin) return;
    try {
      await navigator.clipboard.writeText(vin);
    } catch {
      /* ignore */
    }
  }

  const displayError = saveError ?? lookupError;
  const onThisRo = vehicle.id === currentRoVehicleId;

  return (
    <div className="border-b border-[#eaecf0] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 py-3.5 text-left transition-colors hover:bg-brand-navy/[0.02]"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <Car className="size-4 shrink-0 text-brand-orange" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {title || "Untitled vehicle"}
        </span>
        {vehicle.plate ? (
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {vehicle.plate}
          </span>
        ) : null}
        {onThisRo ? (
          <span className="shrink-0 rounded-md bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy">
            On RO
          </span>
        ) : null}
        {onThisRo && (roOdometerNotWorking || roMileageIn != null) ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {roOdometerNotWorking
              ? "Odo N/W"
              : `${roMileageIn!.toLocaleString("en-US")} mi`}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="pb-6">
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#eaecf0]">
            <button
              type="button"
              onClick={() => setPanel("details")}
              className={cn(
                "border-b-2 px-0.5 py-2.5 text-sm font-medium transition-colors",
                panel === "details"
                  ? "border-brand-orange text-brand-orange"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setPanel("history")}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-0.5 py-2.5 text-sm font-medium transition-colors",
                panel === "history"
                  ? "border-brand-orange text-brand-orange"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <History className="size-3.5" aria-hidden />
              History
              {vehicleOrders.length > 0 ? (
                <span className="text-xs font-normal tabular-nums text-muted-foreground">
                  ({vehicleOrders.length})
                </span>
              ) : null}
            </button>
            <span
              className="inline-flex items-center gap-1.5 px-0.5 py-2.5 text-sm text-muted-foreground/55"
              title="Coming soon"
            >
              Tire storage
            </span>
          </div>

          {panel === "history" ? (
            <VehicleIntakeFormSection icon={History} title="Repair order history">
              {vehicleOrders.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No repair orders for this vehicle yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#eaecf0]">
                  {vehicleOrders.map((ro) => {
                    const pill = RO_STATUS_PILL[ro.status as ROStatus] ?? RO_STATUS_PILL.ESTIMATE;
                    const isCurrent = currentRoId === ro.id;
                    return (
                      <li key={ro.id}>
                        <Link
                          href={`/repair-orders/${ro.id}/estimate`}
                          className={cn(
                            "flex items-start justify-between gap-3 py-3 transition-colors hover:bg-brand-navy/[0.03]",
                            isCurrent && "bg-brand-navy/[0.03]",
                          )}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold tabular-nums text-foreground">
                                #{ro.number}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px]", pill.className)}>
                                {pill.label}
                              </Badge>
                              {isCurrent ? (
                                <span className="text-[10px] font-semibold text-brand-navy">
                                  Current
                                </span>
                              ) : null}
                            </div>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CalendarDays className="size-3.5 shrink-0" />
                              {fmtRoWhen(ro.createdAt)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatCents(ro.totalCents)}
                            </p>
                            {ro.balanceCents != null && ro.balanceCents > 0 ? (
                              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                                Due {formatCents(ro.balanceCents)}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </VehicleIntakeFormSection>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-7">
                {lookupNote ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    {lookupNote}
                  </div>
                ) : null}

                <VehicleIntakeFormSection icon={Car} title="Vehicle details">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
                    <div>
                      <VehicleIntakeFieldLabel label="Year" />
                      <Input
                        value={year}
                        onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="2014"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Make" />
                      <Input
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder="Honda"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Model" />
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Accord"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Trim" />
                      <Input
                        value={trim}
                        onChange={(e) => setTrim(e.target.value)}
                        placeholder="EX-L"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
                    <div className="col-span-2">
                      <VehicleIntakeFieldLabel label="VIN" />
                      <div className="flex items-center gap-2">
                        <Input
                          value={vin}
                          onChange={(e) => {
                            setVin(e.target.value.toUpperCase());
                            clearMessages();
                            setSaveError(null);
                          }}
                          onBlur={() => {
                            if (canEdit && canDecodeVin) runVinDecode(vin);
                          }}
                          maxLength={17}
                          placeholder="17-character VIN"
                          disabled={!canEdit || busy}
                          className={cn(VEHICLE_INTAKE_FIELD, "min-w-0 flex-1 font-mono uppercase")}
                        />
                        {canEdit && canDecodeVin ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 shrink-0 rounded-none border-[#d0d5dd] px-3 text-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
                            disabled={busy}
                            onClick={() => runVinDecode()}
                          >
                            {lookupPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "Decode"
                            )}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-10 shrink-0 rounded-none border-[#d0d5dd]"
                          onClick={copyVin}
                          disabled={!vin}
                          aria-label="Copy VIN"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="License Plate" />
                      <Input
                        value={plate}
                        onChange={(e) => {
                          setPlate(e.target.value.toUpperCase());
                          clearMessages();
                          setSaveError(null);
                        }}
                        placeholder="ABC1234"
                        disabled={!canEdit || busy}
                        className={cn(VEHICLE_INTAKE_FIELD, "font-mono uppercase")}
                      />
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Registration State" />
                      <Select
                        value={plateState || "NY"}
                        onValueChange={(v) => {
                          setPlateState(v);
                          clearMessages();
                        }}
                        disabled={!canEdit || busy}
                      >
                        <SelectTrigger className={cn(VEHICLE_INTAKE_FIELD, "w-full min-w-0")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATE_CODES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {US_STATE_NAMES[s] ?? s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <VehicleIntakeFieldLabel label="Engine" />
                      <Input
                        value={engine}
                        onChange={(e) => setEngine(e.target.value)}
                        placeholder="3.5L V6"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Transmission" />
                      <select
                        value={transmission || ""}
                        onChange={(e) => setTransmission(e.target.value)}
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      >
                        <option value="">Select…</option>
                        {TRANSMISSION_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        {transmission &&
                        !TRANSMISSION_OPTIONS.includes(
                          transmission as (typeof TRANSMISSION_OPTIONS)[number],
                        ) ? (
                          <option value={transmission}>{transmission}</option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Drivetrain" />
                      <select
                        value={drivetrain || ""}
                        onChange={(e) => setDrivetrain(e.target.value)}
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      >
                        <option value="">Select…</option>
                        {DRIVETRAIN_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        {drivetrain &&
                        !DRIVETRAIN_OPTIONS.includes(
                          drivetrain as (typeof DRIVETRAIN_OPTIONS)[number],
                        ) ? (
                          <option value={drivetrain}>{drivetrain}</option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Color" />
                      <div className="relative">
                        <Palette className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground/60" />
                        <Select
                          value={color || undefined}
                          onValueChange={setColor}
                          disabled={!canEdit || busy}
                        >
                          <SelectTrigger
                            className={cn(VEHICLE_INTAKE_FIELD, "w-full min-w-0 pl-9")}
                          >
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <VehicleIntakeFieldLabel label="Body class" />
                      <Input
                        value={bodyClass}
                        onChange={(e) => setBodyClass(e.target.value)}
                        placeholder="Sedan"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                    <div>
                      <VehicleIntakeFieldLabel label="Unit #" />
                      <Input
                        value={unitNumber}
                        onChange={(e) => setUnitNumber(e.target.value)}
                        placeholder="Fleet / unit #"
                        disabled={!canEdit || busy}
                        className={VEHICLE_INTAKE_FIELD}
                      />
                    </div>
                    <div className="col-span-2">
                      <VehicleIntakeFieldLabel
                        label="Vehicle Name (visible to customers)"
                        info="Shown on estimates, invoices, and customer-facing documents."
                      />
                      <Input
                        value={title}
                        readOnly
                        className={cn(VEHICLE_INTAKE_FIELD, "bg-[#fafbfc] text-muted-foreground")}
                      />
                    </div>
                  </div>

                  {canEdit && !autodevDecodingOk ? (
                    <p className="text-xs text-muted-foreground">
                      Enter the plate manually on Core. Decode a 17-character VIN (NHTSA) or fill in
                      year / make / model above.
                    </p>
                  ) : null}

                  {canEdit && canLookupPlate ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 rounded-none border-[#d0d5dd] text-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
                      disabled={busy}
                      onClick={runPlateLookup}
                    >
                      {lookupPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      Look up VIN
                    </Button>
                  ) : null}

                  {displayError ? (
                    <p className="text-sm text-destructive">{displayError}</p>
                  ) : null}
                </VehicleIntakeFormSection>

                <div className="h-px bg-[#eaecf0]" />

                <VehicleIntakeFormSection icon={FileText} title="Notes">
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground/60" />
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, VEHICLE_NOTES_MAX))}
                      placeholder="Internal notes about this vehicle"
                      disabled={!canEdit || busy}
                      rows={3}
                      className="min-h-[88px] resize-y rounded-none border-[#d0d5dd] bg-white pl-9 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:border-brand-orange/50 focus-visible:ring-brand-orange/20"
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    {notes.length}/{VEHICLE_NOTES_MAX}
                  </p>
                </VehicleIntakeFormSection>

                {canEdit ? (
                  <div className="flex items-center justify-end border-t border-[#eaecf0] pt-4">
                    {displayError ? (
                      <p className="mr-auto text-sm text-destructive">{displayError}</p>
                    ) : null}
                    <Button
                      type="button"
                      className={VEHICLE_INTAKE_BTN_PRIMARY}
                      disabled={busy}
                      onClick={save}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Update
                    </Button>
                  </div>
                ) : null}
              </div>
            </TooltipProvider>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DrawerVehiclesTab({
  vehicles,
  repairOrders,
  customerId,
  customerName,
  currentRoId,
  currentRoVehicleId,
  roMileageIn = null,
  roOdometerNotWorking = false,
  canEdit,
  onSaved,
}: {
  vehicles: EstimateContextDrawerVehicle[];
  repairOrders: EstimateContextDrawerRo[];
  customerId: string;
  customerName: string;
  currentRoId?: string;
  currentRoVehicleId: string | null;
  /** Current RO odometer in — shown on the vehicle marked On RO. */
  roMileageIn?: number | null;
  roOdometerNotWorking?: boolean;
  canEdit: boolean;
  onSaved: () => void;
}) {
  return (
    <div className="relative flex min-h-full flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#eaecf0] py-3">
        <div className="flex items-center gap-2">
          <Car className="size-4 text-brand-orange" />
          <h3 className="text-sm font-semibold text-foreground">Vehicles</h3>
        </div>
        {canEdit ? (
          <AddVehicleDialog
            customerId={customerId}
            customerName={customerName}
            onCreated={() => onSaved()}
            trigger={
              <Button type="button" size="sm" className={cn(DRAWER_BTN_PRIMARY, "h-8 gap-1.5")}>
                <Plus className="size-3.5" />
                Vehicle
              </Button>
            }
          />
        ) : null}
      </div>

      {vehicles.length === 0 ? (
        <div className="py-8">
          <DrawerEmptyState
            icon={Car}
            title="No vehicles on file"
            description="Add a vehicle to link repair orders and service history."
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          {vehicles.map((v) => (
            <VehicleAccordionCard
              key={v.id}
              vehicle={v}
              customerId={customerId}
              repairOrders={repairOrders}
              currentRoId={currentRoId}
              currentRoVehicleId={currentRoVehicleId}
              roMileageIn={v.id === currentRoVehicleId ? roMileageIn : null}
              roOdometerNotWorking={v.id === currentRoVehicleId ? roOdometerNotWorking : false}
              canEdit={canEdit}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DrawerDeferredTab({
  jobs,
  currentRoId,
}: {
  jobs: EstimateContextDrawerDeferredJob[];
  currentRoId?: string;
}) {
  if (jobs.length === 0) {
    return (
      <div className="relative flex min-h-full flex-col bg-white">
        <DrawerPaneHeader icon={Tag} title="Declined" />
        <div className="py-8">
          <DrawerEmptyState
            icon={Tag}
            title="No declined work"
            description="Declined services from inspections will appear here for follow-up."
          />
        </div>
      </div>
    );
  }

  const currentRo = currentRoId ? jobs.filter((j) => j.roId === currentRoId) : [];
  const other = currentRoId ? jobs.filter((j) => j.roId !== currentRoId) : jobs;

  function JobRow({ job }: { job: EstimateContextDrawerDeferredJob }) {
    const pill = RO_STATUS_PILL[job.roStatus as ROStatus] ?? RO_STATUS_PILL.ESTIMATE;
    return (
      <Link
        href={`/repair-orders/${job.roId}/estimate`}
        className="flex items-start justify-between gap-3 border-b border-[#eaecf0] py-3.5 transition-colors last:border-b-0 hover:bg-brand-navy/[0.02]"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{job.jobName}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium tabular-nums text-brand-navy">RO #{job.roNumber}</span>
            <Badge variant="outline" className={cn("text-[10px]", pill.className)}>
              {pill.label}
            </Badge>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Car className="size-3 shrink-0 text-brand-orange" />
            {job.vehicleLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatCents(job.totalCents)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(job.deferredAt)}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-white pb-4">
      <DrawerPaneHeader icon={Tag} title="Declined" />

      {currentRo.length > 0 ? (
        <div className="pt-4">
          <DrawerFlatSection icon={ClipboardList} title="This repair order">
            <div>{currentRo.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}</div>
          </DrawerFlatSection>
        </div>
      ) : null}

      {other.length > 0 ? (
        <div className={cn(currentRo.length > 0 && "mt-5 border-t border-[#eaecf0] pt-5")}>
          <DrawerFlatSection
            icon={Tag}
            title={currentRo.length > 0 ? "Other declined work" : "Declined jobs"}
          >
            {currentRo.length > 0 ? (
              <p className="mb-1 text-xs text-muted-foreground">
                Quoted services the customer declined or did not authorize — follow up on a future
                visit.
              </p>
            ) : null}
            <div>{other.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}</div>
          </DrawerFlatSection>
        </div>
      ) : null}
    </div>
  );
}

export function DrawerRepairOrdersTab({
  orders,
  currentRoId,
  customerId,
  customerName,
}: {
  orders: EstimateContextDrawerRo[];
  currentRoId?: string;
  customerId: string;
  customerName: string;
}) {
  const active = orders.filter((ro) => ro.status !== "COMPLETED" && ro.status !== "INVOICED");
  const archived = orders.filter((ro) => ro.status === "COMPLETED" || ro.status === "INVOICED");

  function RoRow({ ro }: { ro: EstimateContextDrawerRo }) {
    const pill = RO_STATUS_PILL[ro.status as ROStatus] ?? RO_STATUS_PILL.ESTIMATE;
    const unapproved = ro.status === "ESTIMATE";
    const isCurrent = Boolean(currentRoId && ro.id === currentRoId);

    return (
      <Link
        href={`/repair-orders/${ro.id}/estimate`}
        className={cn(
          "relative flex items-start justify-between gap-3 border-b border-[#eaecf0] py-3.5 pl-3 transition-colors last:border-b-0 hover:bg-brand-navy/[0.02]",
          isCurrent && "bg-brand-navy/[0.03] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-orange",
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-foreground">{ro.number}</span>
            <Badge variant="outline" className={cn("text-[10px]", pill.className)}>
              {pill.label}
            </Badge>
            {unapproved ? (
              <Badge className="bg-amber-100 text-[10px] text-amber-900 hover:bg-amber-100">
                Unapproved
              </Badge>
            ) : null}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            {fmtRoWhen(ro.createdAt)}
          </p>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/85">
            <Car className="size-3.5 shrink-0 text-brand-orange" />
            {ro.vehicleLabel}
          </p>
          <p className="truncate text-xs text-muted-foreground">{customerName}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {formatCents(ro.totalCents)}
        </p>
      </Link>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-white pb-4">
      <DrawerPaneHeader
        icon={ClipboardList}
        title="Repair Orders"
        action={
          <Button asChild size="sm" className={cn(DRAWER_BTN_PRIMARY, "h-8 gap-1.5")}>
            <Link href={`/repair-orders/new?customerId=${customerId}`}>
              <Plus className="size-3.5" />
              Estimate
            </Link>
          </Button>
        }
      />

      <div className="pt-4">
        <DrawerFlatSection icon={FileText} title="Active">
          {active.length === 0 ? (
            <p className="border-b border-[#eaecf0] py-6 text-center text-sm text-muted-foreground">
              No open repair orders.{" "}
              <Link
                href={`/repair-orders/new?customerId=${customerId}`}
                className="font-medium text-brand-navy hover:underline"
              >
                Create estimate
              </Link>
            </p>
          ) : (
            <div>{active.map((ro) => <RoRow key={ro.id} ro={ro} />)}</div>
          )}
        </DrawerFlatSection>
      </div>

      {archived.length > 0 ? (
        <div className="mt-5 border-t border-[#eaecf0] pt-5">
          <DrawerFlatSection icon={History} title="Completed">
            <div>{archived.slice(0, 8).map((ro) => (
              <RoRow key={ro.id} ro={ro} />
            ))}</div>
          </DrawerFlatSection>
        </div>
      ) : null}
    </div>
  );
}

export function DrawerPaymentTab({ data }: { data: PaymentFinanceData }) {
  return (
    <div className="relative flex min-h-full flex-col bg-white pb-4">
      <DrawerPaneHeader icon={Receipt} title="Payment" />
      <div className="pt-4">
        <PaymentFinancePanel data={data} />
      </div>
    </div>
  );
}

/** Payment history across all ROs — used when drawer opens without an active RO. */
export function DrawerCustomerPaymentHistoryTab({ customerId }: { customerId: string }) {
  const [payments, setPayments] = useState<import("@/lib/payment-display").PaymentRow[]>([]);
  const [failedPayments, setFailedPayments] = useState<import("@/lib/payment-display").PaymentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => {
      try {
        const res = await fetchCustomerPaymentHistory(customerId);
        if (res.ok) {
          setPayments(res.payments);
          setFailedPayments(res.failedPayments);
          setLoadError(null);
        } else {
          setLoadError(res.error);
        }
      } catch {
        setLoadError("Could not load payment history. Try again.");
      }
    });
  }, [customerId]);

  if (loading && payments.length === 0 && !loadError) {
    return (
      <div className="relative flex min-h-full flex-col bg-white">
        <DrawerPaneHeader icon={Receipt} title="Payment" />
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand-navy" />
          Loading payments…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative flex min-h-full flex-col bg-white">
        <DrawerPaneHeader icon={Receipt} title="Payment" />
        <div className="py-8 text-center">
          <p className="text-sm text-brand-red">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-white pb-4">
      <DrawerPaneHeader icon={Receipt} title="Payment" />
      <div className="pt-4">
        <DrawerFlatSection icon={History} title="Payment history">
          <p className="mb-2 text-xs text-muted-foreground">
            All recorded payments across repair orders for this customer.
          </p>
          <PaymentTransactionsPanel
            embedded
            payments={payments}
            failedPayments={failedPayments}
            customerWide
          />
        </DrawerFlatSection>
      </div>
    </div>
  );
}

const CARE_PLAN_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAST_DUE: "bg-amber-100 text-amber-900",
  PENDING: "bg-brand-light/20 text-brand-navy",
  PAUSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
};

const CARE_PLAN_PAYMENT_LABELS: Record<string, string> = {
  PAY_IN_FULL: "Pay in full",
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
  MANUAL: "Manual / comp",
};

function CarePlanMembershipCard({ plan }: { plan: EstimateContextDrawerCarePlan }) {
  return (
    <li className="border-b border-[#eaecf0] py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
            <Shield className="size-4 shrink-0 text-brand-orange" aria-hidden />
            {plan.planName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{plan.vehicleLabel}</p>
        </div>
        <Badge className={cn("shrink-0 text-[10px]", CARE_PLAN_STATUS_STYLE[plan.status] ?? "bg-muted")}>
          {plan.status.replace("_", " ")}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Expires {fmtDate(plan.endsAt)}</span>
        <span className="text-muted-foreground/50" aria-hidden>
          ·
        </span>
        <span>{plan.progress}</span>
        <span className="text-muted-foreground/50" aria-hidden>
          ·
        </span>
        <span>{CARE_PLAN_PAYMENT_LABELS[plan.paymentMode] ?? plan.paymentMode}</span>
      </div>
      <Link
        href={`/maintenance-programs/subscribers/${plan.id}`}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
      >
        View member
        <ChevronRight className="size-3.5" />
      </Link>
    </li>
  );
}

/** Care plan memberships — lazy-loaded like payment history. */
export function DrawerCarePlanTab({
  customerId,
  customerName,
  customerEmail,
  customerPhone,
}: {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
}) {
  const [plans, setPlans] = useState<EstimateContextDrawerCarePlan[]>([]);
  const [plansUrl, setPlansUrl] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => {
      try {
        const res = await fetchCustomerCarePlans(customerId);
        if (res.ok) {
          setPlans(res.plans);
          setPlansUrl(res.plansUrl);
          setShopName(res.shopName);
          setCanAccess(res.canAccess);
          setLoadError(null);
        } else {
          setLoadError(res.error);
        }
      } catch {
        setLoadError("Could not load care plan memberships. Try again.");
      }
    });
  }, [customerId]);

  if (loading && plans.length === 0 && !loadError) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-brand-navy" />
        Loading care plans…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-brand-red">{loadError}</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="relative flex min-h-full flex-col bg-white pb-4">
        <DrawerPaneHeader icon={Shield} title={AP_TERMS.maintenancePrograms} />
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            Care Plans are an Elite premium benefit — upgrade to enroll customers from the drawer.
          </p>
          <Button asChild variant="outline" size="sm" className={cn(DRAWER_BTN_ACCENT, "mt-3")}>
            <Link href="/settings/subscription">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  const membersHref = `/maintenance-programs/subscribers?customerId=${encodeURIComponent(customerId)}`;

  return (
    <div className="relative flex min-h-full flex-col bg-white pb-4">
      <DrawerPaneHeader
        icon={Shield}
        title={AP_TERMS.maintenancePrograms}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {plansUrl && shopName ? (
              <SharePlansLinkButton
                plansUrl={plansUrl}
                shopName={shopName}
                customer={{
                  id: customerId,
                  firstName: customerName.split(" ")[0] ?? customerName,
                  phone: customerPhone,
                  email: customerEmail,
                }}
              />
            ) : null}
            <Button asChild size="sm" className={cn(DRAWER_BTN_PRIMARY, "h-8 gap-1.5")}>
              <Link href={membersHref}>
                <Plus className="size-3.5" />
                Enroll
              </Link>
            </Button>
          </div>
        }
      />

      <div className="pt-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Memberships and enrollment for {customerName}.
        </p>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-brand-navy/[0.06]">
              <Shield className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium text-brand-navy">Not enrolled in a care plan</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Enroll at the counter or send {customerName.split(" ")[0] ?? "them"} the public signup
              link.
            </p>
            <Link
              href={membersHref}
              className="mt-3 text-sm font-medium text-brand-navy hover:underline"
            >
              Open {AP_TERMS.maintenanceSubscribers}
            </Link>
          </div>
        ) : (
          <>
            <ul>
              {plans.map((plan) => (
                <CarePlanMembershipCard key={plan.id} plan={plan} />
              ))}
            </ul>
            <div className="mt-4 flex justify-end border-t border-[#eaecf0] pt-3">
              <Link
                href={membersHref}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
              >
                View all in {AP_TERMS.maintenanceSubscribers}
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DrawerFinancesTab({ availableCreditCents }: { availableCreditCents: number }) {
  const [sub, setSub] = useState<"credit" | "ar">("credit");

  return (
    <div className="relative flex min-h-full flex-col bg-white pb-4">
      <DrawerPaneHeader icon={Receipt} title="Finances" />

      <div className="flex gap-4 border-b border-[#eaecf0] pt-1">
        <button
          type="button"
          onClick={() => setSub("credit")}
          className={cn(
            "border-b-2 px-0.5 py-2.5 text-sm font-medium transition-colors",
            sub === "credit"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Store credit
        </button>
        <button
          type="button"
          onClick={() => setSub("ar")}
          className={cn(
            "border-b-2 px-0.5 py-2.5 text-sm font-medium transition-colors",
            sub === "ar"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          AR account
        </button>
      </div>

      <div className="pt-4">
        {sub === "credit" ? (
          <DrawerFlatSection
            icon={Receipt}
            title="Store credit"
            headerAction={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(DRAWER_BTN_ACCENT, "h-8")}
                disabled
                title="Coming soon"
              >
                <Plus className="size-3.5" />
                Credit memo
              </Button>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eaecf0] text-left text-xs font-semibold text-muted-foreground">
                  <th className="py-2 pr-3">Memo #</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#eaecf0] font-medium text-foreground">
                  <td className="py-3 pr-3" colSpan={3}>
                    Total available credit
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCents(availableCreditCents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </DrawerFlatSection>
        ) : (
          <DrawerEmptyState
            icon={History}
            title="Accounts receivable"
            description="Open invoices and charge-account balances will appear here."
          />
        )}
      </div>
    </div>
  );
}

export const DRAWER_TABS: { id: ContextDrawerTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "vehicles", label: "Vehicles" },
  { id: "deferred", label: "Declined" },
  { id: "orders", label: "Repair Orders" },
  { id: "payment", label: "Payment" },
  { id: "carePlan", label: "Care Plan" },
  { id: "finances", label: "Finances" },
];
