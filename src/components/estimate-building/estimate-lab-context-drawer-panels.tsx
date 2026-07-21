"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Plus,
  Receipt,
  Search,
  Shield,
  Tag,
} from "lucide-react";

import { CustomerConsentCheckboxes } from "@/components/customers/customer-consent-checkboxes";
import { DrawerCustomerInsightsCard } from "@/components/customers/drawer-customer-insights";
import {
  CustomerTagPicker,
  PersonBusinessToggle,
  validateCustomerForm,
  type CustomerFormType,
  type EditableCustomerRecord,
} from "@/components/customers/customer-form-shared";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import {
  US_STATE_CODES,
  US_STATE_NAMES,
} from "@/components/vehicles/create-vehicle-form";
import {
  usePlateVinLookup,
  type VehicleLookupFields,
} from "@/components/vehicles/use-plate-vin-lookup";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
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
import { SharePlansLinkButton } from "@/components/maintenance/share-plans-link-button";
import type { ContextDrawerTab } from "@/components/estimate-building/estimate-lab-context-drawer";
import { fetchCustomerCarePlans } from "@/server/actions/customer-care-plans";
import { fetchCustomerPaymentHistory } from "@/server/actions/customer-payment-history";
import { EstimateLabVehicleSpecsSection } from "@/components/estimate-building/estimate-lab-vehicle-specs-section";
import { PaymentFinancePanel, type PaymentFinanceData } from "@/components/repair-order/payment-finance-panel";
import { PaymentTransactionsPanel } from "@/components/repair-order/payment-transactions-panel";
import type {
  EstimateContextDrawerAppointment,
  EstimateContextDrawerCarePlan,
  EstimateContextDrawerDeferredJob,
  EstimateContextDrawerRo,
  EstimateContextDrawerVehicle,
} from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { formatCents, customerDisplayName } from "@/lib/format";
import { formatVehicleDisplayLabel } from "@/lib/vehicle-display";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { fetchVehicleSpecsBundle } from "@/server/actions/vehicle-specs";
import { formatPhoneInput } from "@/lib/phone";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { useAutodevDecodingUiEnabled, useVehicleSpecsUiEnabled } from "@/lib/shop-capabilities";
import { getCustomerTagNames } from "@/server/actions/customer-settings";
import { updateCustomer } from "@/server/actions/customers";
import { updateVehicle } from "@/server/actions/vehicles";
import type { ROStatus } from "@/generated/prisma";

const DRAWER_FIELD =
  "h-9 rounded-md border-[#DDE5EF] bg-white text-sm shadow-none focus-visible:border-[#1E7FE0] focus-visible:ring-[#1E7FE0]/20";

const DRAWER_BTN_PRIMARY =
  "h-9 rounded-md bg-[#E86A10] px-4 text-sm font-semibold text-white hover:bg-[#E86A10]/90";

const DRAWER_BTN_OUTLINE =
  "h-9 rounded-md border-[#DDE5EF] bg-white px-4 text-sm font-medium text-[#0B1F3B] hover:bg-[#F0F3F8]";

const DRAWER_BTN_AZURE =
  "h-9 rounded-md border-[#1E7FE0] bg-white px-4 text-sm font-semibold text-[#1E7FE0] hover:bg-[#f2f8fe]";

/** White card shell used across all drawer tabs. */
function DrawerContentCard({
  title,
  children,
  className,
  headerAction,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-[#DDE5EF] bg-white", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#DDE5EF]/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#0B1F3B]">{title}</h3>
          {headerAction}
        </div>
      ) : null}
      <div className={cn(title ? "p-4" : "p-4")}>{children}</div>
    </section>
  );
}

function DrawerSubheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-sm font-semibold text-[#0B1F3B]">{children}</p>
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
    <DrawerContentCard>
      <div className="flex flex-col items-center py-8 text-center">
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#F0F3F8]">
          <Icon className="size-5 text-[#8CA2C0]" />
        </span>
        <p className="text-sm font-medium text-[#0B1F3B]">{title}</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#5B7295]">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 text-sm font-medium text-[#1E7FE0] hover:underline"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </DrawerContentCard>
  );
}

function fmtApptWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  customerId,
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

  return (
    <div className="space-y-4 pb-4">
      <DrawerCustomerInsightsCard customerId={customerId} drawerOpen={drawerOpen} />

      <DrawerContentCard title="Customer Information">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <PersonBusinessToggle type={type} onChange={setType} compact className="rounded-full border-[#DDE5EF] p-0.5" />
            <CrmFormField label="Customer type" compact className="min-w-[8.5rem]">
              <Select defaultValue="regular">
                <SelectTrigger className={DRAWER_FIELD}>
                  <SelectValue placeholder="Regular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </CrmFormField>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {type === "business" ? (
              <CrmFormField label="Business name" compact className="col-span-2">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
              </CrmFormField>
            ) : (
              <>
                <CrmFormField label="First name" compact>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
                </CrmFormField>
                <CrmFormField label="Last name" compact>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
                </CrmFormField>
              </>
            )}
            <CrmFormField label="Phone" compact>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                inputMode="tel"
                placeholder="(555) 555-5555"
                disabled={!canEdit || pending}
                className={DRAWER_FIELD}
              />
            </CrmFormField>
            <CrmFormField label="Type" compact>
              <Select value={phoneType} onValueChange={setPhoneType} disabled={!canEdit || pending}>
                <SelectTrigger className={DRAWER_FIELD}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField label="Email" compact className="col-span-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                disabled={!canEdit || pending}
                className={DRAWER_FIELD}
              />
            </CrmFormField>
          </div>

          <div>
            <DrawerSubheading>Primary Address</DrawerSubheading>
            <div className="grid grid-cols-6 gap-3">
              <CrmFormField label="Address" compact className="col-span-6">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
              </CrmFormField>
              <CrmFormField label="City" compact className="col-span-3">
                <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
              </CrmFormField>
              <CrmFormField label="State" compact className="col-span-1">
                <Select value={state || undefined} onValueChange={setState} disabled={!canEdit || pending}>
                  <SelectTrigger className={DRAWER_FIELD}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATE_CODES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
              <CrmFormField label="Zip" compact className="col-span-2">
                <Input value={zip} onChange={(e) => setZip(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
              </CrmFormField>
            </div>
          </div>

          <div>
            <DrawerSubheading>Communication</DrawerSubheading>
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

          <div className="grid grid-cols-2 gap-4">
            <CrmFormField label="Internal notes" compact>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit || pending}
                rows={3}
                className={cn(DRAWER_FIELD, "min-h-[5rem] resize-none py-2")}
              />
            </CrmFormField>
            <div>
              <p className="mb-1.5 text-xs font-medium text-[#0B1F3B]">Tags</p>
              <CustomerTagPicker
                compact
                availableTags={
                  availableTags.length > 0
                    ? availableTags
                    : Array.from(new Set([...(customer.tags ?? []), ...tags]))
                }
                selected={tags}
                onToggle={(t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
              />
              {canEdit ? (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[#E86A10] px-3 py-1.5 text-xs font-medium text-[#E86A10] hover:bg-[#E86A10]/5"
                  disabled
                  title="Tag management coming soon"
                >
                  <Plus className="size-3.5" />
                  Add tag
                </button>
              ) : null}
            </div>
          </div>

          {canEdit ? (
            <div className="flex items-center justify-end gap-3 border-t border-[#DDE5EF]/60 pt-4">
              {error ? <p className="mr-auto text-xs text-brand-red">{error}</p> : null}
              <Button type="button" variant="outline" className={DRAWER_BTN_OUTLINE} disabled={pending} onClick={resetForm}>
                Cancel
              </Button>
              <Button type="button" className={DRAWER_BTN_PRIMARY} disabled={pending} onClick={save}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          ) : (
            error ? <p className="text-xs text-brand-red">{error}</p> : null
          )}
        </div>
      </DrawerContentCard>
    </div>
  );
}

function VehicleAccordionCard({
  vehicle,
  customerId,
  currentRoVehicleId,
  roId,
  roMileageIn = null,
  roOdometerNotWorking = false,
  preloadedSpecs,
  canEdit,
  autoOpenSpecs = false,
  onSaved,
}: {
  vehicle: EstimateContextDrawerVehicle;
  customerId: string;
  currentRoVehicleId: string | null;
  roId?: string;
  roMileageIn?: number | null;
  roOdometerNotWorking?: boolean;
  preloadedSpecs: EstimateLabVehicleSpecsBundle | null;
  canEdit: boolean;
  autoOpenSpecs?: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(vehicle.id === currentRoVehicleId || autoOpenSpecs);
  const vehicleSpecsOk = useVehicleSpecsUiEnabled();
  const autodevDecodingOk = useAutodevDecodingUiEnabled();
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specsData, setSpecsData] = useState<EstimateLabVehicleSpecsBundle | null>(
    vehicle.id === currentRoVehicleId ? preloadedSpecs : null,
  );
  const [specsError, setSpecsError] = useState<string | null>(null);
  const autoSpecsRequested = useRef(false);
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
  const [decodedData, setDecodedData] = useState<unknown | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [specsPending, startSpecs] = useTransition();
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
    setDecodedData(undefined);
    setSaveError(null);
    clearMessages();
  }, [vehicle, clearMessages]);

  useEffect(() => {
    if (vehicle.id === currentRoVehicleId && preloadedSpecs) {
      setSpecsData(preloadedSpecs);
    }
  }, [vehicle.id, currentRoVehicleId, preloadedSpecs]);

  useEffect(() => {
    if (!autoOpenSpecs || !vehicleSpecsOk) {
      autoSpecsRequested.current = false;
      return;
    }
    if (autoSpecsRequested.current) return;
    if (currentRoVehicleId && vehicle.id !== currentRoVehicleId) return;
    autoSpecsRequested.current = true;
    setOpen(true);
    if (specsData || preloadedSpecs) {
      if (preloadedSpecs && !specsData) setSpecsData(preloadedSpecs);
      setSpecsOpen(true);
      return;
    }
    setSpecsError(null);
    startSpecs(async () => {
      const res = await fetchVehicleSpecsBundle(vehicle.id, {
        excludeRoId: vehicle.id === currentRoVehicleId && roId ? roId : undefined,
      });
      if (res.ok) {
        setSpecsData(res.data);
        setSpecsOpen(true);
      } else {
        setSpecsError(res.error);
      }
    });
  }, [
    autoOpenSpecs,
    vehicleSpecsOk,
    currentRoVehicleId,
    preloadedSpecs,
    roId,
    specsData,
    vehicle.id,
  ]);

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

  function toggleSpecs() {
    if (specsOpen) {
      setSpecsOpen(false);
      return;
    }
    if (specsData) {
      setSpecsOpen(true);
      return;
    }
    setSpecsError(null);
    startSpecs(async () => {
      const res = await fetchVehicleSpecsBundle(vehicle.id, {
        excludeRoId: vehicle.id === currentRoVehicleId && roId ? roId : undefined,
      });
      if (res.ok) {
        setSpecsData(res.data);
        setSpecsOpen(true);
      } else {
        setSpecsError(res.error);
      }
    });
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
        unitNumber: vehicle.unitNumber,
        notes: vehicle.notes,
        engine: engine.trim() || null,
        transmission: transmission.trim() || null,
        drivetrain: drivetrain.trim() || null,
        bodyClass: bodyClass.trim() || null,
        tireSizeFront: null,
        tireSizeRear: null,
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

  return (
    <div className="overflow-hidden rounded-lg border border-[#DDE5EF] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-[#DDE5EF]/60 bg-[#F7F9FC] px-4 py-3 text-left"
      >
        {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
        <Car className="size-4 shrink-0 text-brand-navy/60" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide">{title}</span>
        {vehicle.plate ? (
          <Badge variant="outline" className="shrink-0 font-mono text-[10px] uppercase">
            {vehicle.plate}
          </Badge>
        ) : null}
        {vehicle.id === currentRoVehicleId ? (
          <Badge className="shrink-0 bg-brand-navy/10 text-[10px] text-brand-navy hover:bg-brand-navy/10">On RO</Badge>
        ) : null}
        {vehicle.id === currentRoVehicleId && (roOdometerNotWorking || roMileageIn != null) ? (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {roOdometerNotWorking
              ? "Odo N/W"
              : `${roMileageIn!.toLocaleString("en-US")} mi`}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled
              title="Coming soon"
            >
              History
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled
              title="Coming soon"
            >
              Tire storage
            </Button>
            {vehicleSpecsOk ? (
              <Button
                type="button"
                variant={specsOpen ? "default" : "outline"}
                size="sm"
                className={cn("h-7 text-xs", specsOpen && "bg-brand-navy hover:bg-brand-navy/90")}
                disabled={specsPending}
                onClick={toggleSpecs}
              >
                {specsPending ? (
                  <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
                ) : null}
                Vehicle specs
              </Button>
            ) : null}
          </div>

          {specsError ? <p className="text-xs text-brand-red">{specsError}</p> : null}

          {vehicleSpecsOk && specsOpen && specsData ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/10">
              <EstimateLabVehicleSpecsSection
                data={specsData}
                canEdit={canEdit}
                showTitle
              />
            </div>
          ) : null}

          <div className="grid grid-cols-4 gap-3">
            <CrmFormField label="Year">
              <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} disabled={!canEdit || busy} className={DRAWER_FIELD} />
            </CrmFormField>
            <CrmFormField label="Make">
              <Input value={make} onChange={(e) => setMake(e.target.value)} disabled={!canEdit || busy} className={DRAWER_FIELD} />
            </CrmFormField>
            <CrmFormField label="Model" className="col-span-2">
              <Input value={model} onChange={(e) => setModel(e.target.value)} disabled={!canEdit || busy} className={DRAWER_FIELD} />
            </CrmFormField>
          </div>

          <CrmFormField label="Trim">
            <Input value={trim} onChange={(e) => setTrim(e.target.value)} disabled={!canEdit || busy} className={DRAWER_FIELD} />
          </CrmFormField>

          <CrmFormField label="Vehicle name (customer-facing)">
            <Input value={title} readOnly className={cn(DRAWER_FIELD, "bg-muted/20")} />
          </CrmFormField>

          <div className="flex items-end gap-2">
            <CrmFormField label="VIN" className="min-w-0 flex-1">
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
                className={cn(DRAWER_FIELD, "font-mono text-xs uppercase")}
              />
            </CrmFormField>
            {canEdit && canDecodeVin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mb-0.5 h-8 shrink-0 border-brand-navy/25 text-brand-navy hover:bg-brand-navy/[0.04]"
                disabled={busy}
                onClick={() => runVinDecode()}
              >
                {lookupPending ? <Loader2 className="size-3.5 animate-spin" /> : "Decode"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="icon-sm" className="mb-0.5 shrink-0" onClick={copyVin} disabled={!vin} aria-label="Copy VIN">
              <Copy className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <CrmFormField label="License plate">
              <Input
                value={plate}
                onChange={(e) => {
                  setPlate(e.target.value.toUpperCase());
                  clearMessages();
                  setSaveError(null);
                }}
                placeholder="e.g. ABC1234"
                disabled={!canEdit || busy}
                className={cn(DRAWER_FIELD, "font-mono uppercase")}
              />
            </CrmFormField>
            <CrmFormField label="State">
              <Select
                value={plateState || "NY"}
                onValueChange={(v) => {
                  setPlateState(v);
                  clearMessages();
                }}
                disabled={!canEdit || busy}
              >
                <SelectTrigger className={DRAWER_FIELD}>
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
            </CrmFormField>
          </div>

          {canEdit && !autodevDecodingOk ? (
            <p className="text-xs text-muted-foreground">
              Enter the plate manually on Core. Decode a 17-character VIN (NHTSA) or fill in year / make /
              model below.
            </p>
          ) : null}

          {canEdit && canLookupPlate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-brand-navy/25 text-brand-navy hover:bg-brand-navy/[0.04]"
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

          {lookupNote ? (
            <p className="text-xs text-emerald-700">{lookupNote}</p>
          ) : null}
          {displayError ? (
            <p className="text-xs text-brand-red">{displayError}</p>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end pt-1">
              <Button type="button" className={DRAWER_BTN_PRIMARY} disabled={busy} onClick={save}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DrawerVehiclesTab({
  vehicles,
  customerId,
  customerName,
  currentRoVehicleId,
  roId,
  roMileageIn = null,
  roOdometerNotWorking = false,
  vehicleSpecs,
  canEdit,
  autoOpenSpecs = false,
  onSaved,
}: {
  vehicles: EstimateContextDrawerVehicle[];
  customerId: string;
  customerName: string;
  currentRoVehicleId: string | null;
  roId?: string;
  /** Current RO odometer in — shown on the vehicle marked On RO. */
  roMileageIn?: number | null;
  roOdometerNotWorking?: boolean;
  vehicleSpecs: EstimateLabVehicleSpecsBundle | null;
  canEdit: boolean;
  autoOpenSpecs?: boolean;
  onSaved: () => void;
}) {
  return (
    <div className="space-y-3 pb-4">
      {canEdit ? (
        <AddVehicleDialog
          customerId={customerId}
          customerName={customerName}
          onCreated={() => onSaved()}
          trigger={
            <Button type="button" className={cn(DRAWER_BTN_AZURE, "w-full justify-center gap-1.5")}>
              <Plus className="size-4" />
              Vehicle
            </Button>
          }
        />
      ) : null}

      {vehicles.length === 0 ? (
        <DrawerEmptyState
          icon={Car}
          title="No vehicles on file"
          description="Add a vehicle to link repair orders and service history."
        />
      ) : (
        vehicles.map((v) => (
          <VehicleAccordionCard
            key={v.id}
            vehicle={v}
            customerId={customerId}
            currentRoVehicleId={currentRoVehicleId}
            roId={roId}
            roMileageIn={v.id === currentRoVehicleId ? roMileageIn : null}
            roOdometerNotWorking={v.id === currentRoVehicleId ? roOdometerNotWorking : false}
            preloadedSpecs={
              v.id === currentRoVehicleId && vehicleSpecs?.vehicleId === v.id ? vehicleSpecs : null
            }
            canEdit={canEdit}
            autoOpenSpecs={
              autoOpenSpecs &&
              (!currentRoVehicleId || v.id === currentRoVehicleId)
            }
            onSaved={onSaved}
          />
        ))
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
      <DrawerEmptyState
        icon={Tag}
        title="No deferred work"
        description="Declined or deferred services from inspections will appear here for follow-up."
      />
    );
  }

  const currentRo = currentRoId ? jobs.filter((j) => j.roId === currentRoId) : [];
  const other = currentRoId ? jobs.filter((j) => j.roId !== currentRoId) : jobs;

  function JobRow({ job }: { job: EstimateContextDrawerDeferredJob }) {
    const pill = RO_STATUS_PILL[job.roStatus as ROStatus] ?? RO_STATUS_PILL.ESTIMATE;
    return (
      <Link
        href={`/repair-orders/${job.roId}/estimate`}
        className="block rounded-lg border border-[#DDE5EF] bg-white p-3 transition-colors hover:border-[#1E7FE0]/40 hover:bg-[#f2f8fe]/30"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[#0B1F3B]">{job.jobName}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B7295]">
              <span className="font-medium tabular-nums text-[#1E7FE0]">RO #{job.roNumber}</span>
              <Badge variant="outline" className={cn("text-[10px]", pill.className)}>
                {pill.label}
              </Badge>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-[#8CA2C0]">
              <Car className="size-3 shrink-0" />
              {job.vehicleLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-[#0B1F3B]">
              {formatCents(job.totalCents)}
            </p>
            <p className="mt-0.5 text-[10px] text-[#8CA2C0]">{fmtDate(job.deferredAt)}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {currentRo.length > 0 ? (
        <DrawerContentCard title="This repair order">
          <div className="space-y-2">
            {currentRo.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </DrawerContentCard>
      ) : null}

      {other.length > 0 ? (
        <DrawerContentCard title={currentRo.length > 0 ? "Other deferred work" : "Deferred jobs"}>
          <p className="mb-3 text-xs text-[#5B7295]">
            Quoted services the customer declined or did not authorize — follow up on a future visit.
          </p>
          <div className="space-y-2">
            {other.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </DrawerContentCard>
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

    return (
      <Link
        href={`/repair-orders/${ro.id}/estimate`}
        className={cn(
          "block rounded-lg border border-[#DDE5EF] bg-white p-3 transition-colors hover:border-[#1E7FE0]/40 hover:bg-[#f2f8fe]/30",
          currentRoId && ro.id === currentRoId && "ring-1 ring-[#E86A10]/30",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-foreground">{ro.number}</span>
              <Badge variant="outline" className={cn("text-[10px]", pill.className)}>
                {pill.label}
              </Badge>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              {fmtRoWhen(ro.createdAt)}
            </p>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/85">
              <Car className="size-3.5 shrink-0 text-brand-navy/50" />
              {ro.vehicleLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{formatCents(ro.totalCents)}</p>
            {unapproved ? (
              <Badge className="mt-1 bg-amber-100 text-[10px] text-amber-900 hover:bg-amber-100">Unapproved</Badge>
            ) : null}
          </div>
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">{customerName}</p>
      </Link>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" className={DRAWER_BTN_PRIMARY} asChild>
          <Link href={`/repair-orders/new?customerId=${customerId}`}>
            <Plus className="size-4" />
            Estimate
          </Link>
        </Button>
        <Button type="button" className={DRAWER_BTN_AZURE} disabled title="Coming soon">
          <Plus className="size-4" />
          Appointment
        </Button>
      </div>

      <DrawerContentCard title="Active Repair Orders">
        <div className="space-y-2">
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#5B7295]">No open repair orders.</p>
          ) : (
            active.map((ro) => <RoRow key={ro.id} ro={ro} />)
          )}
        </div>
      </DrawerContentCard>

      {archived.length > 0 ? (
        <DrawerContentCard title="Completed">
          <div className="space-y-2">
            {archived.slice(0, 8).map((ro) => (
              <RoRow key={ro.id} ro={ro} />
            ))}
          </div>
        </DrawerContentCard>
      ) : null}
    </div>
  );
}

export function DrawerPaymentTab({ data }: { data: PaymentFinanceData }) {
  return <PaymentFinancePanel data={data} />;
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
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-brand-navy" />
        Loading payments…
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

  return (
    <div className="space-y-4 pb-4">
      <DrawerContentCard title="Payment History">
        <p className="mb-3 text-xs text-[#5B7295]">
          All recorded payments across repair orders for this customer.
        </p>
        <PaymentTransactionsPanel
          embedded
          payments={payments}
          failedPayments={failedPayments}
          customerWide
        />
      </DrawerContentCard>
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
    <li className="overflow-hidden rounded-lg border border-border/80 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 bg-brand-navy/[0.03] px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-brand-navy">
            <Shield className="size-4 shrink-0 text-brand-navy/80" aria-hidden />
            {plan.planName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{plan.vehicleLabel}</p>
        </div>
        <Badge className={cn("shrink-0 text-[10px]", CARE_PLAN_STATUS_STYLE[plan.status] ?? "bg-muted")}>
          {plan.status.replace("_", " ")}
        </Badge>
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
        <Button asChild variant="outline" size="sm" className="h-8 w-full gap-1 border-brand-navy/20 text-brand-navy">
          <Link href={`/maintenance-programs/subscribers/${plan.id}`}>
            View member
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>
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
      <DrawerContentCard title={AP_TERMS.maintenancePrograms}>
        <p className="text-sm text-[#5B7295]">
          Care Plans are an Elite premium benefit — upgrade to enroll customers from the drawer.
        </p>
        <Button asChild variant="outline" size="sm" className={cn(DRAWER_BTN_AZURE, "mt-3")}>
          <Link href="/settings/subscription">View plans</Link>
        </Button>
      </DrawerContentCard>
    );
  }

  const membersHref = `/maintenance-programs/subscribers?customerId=${encodeURIComponent(customerId)}`;

  return (
    <div className="space-y-4 pb-4">
      <DrawerContentCard
        title={AP_TERMS.maintenancePrograms}
        headerAction={
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
            <Button asChild size="sm" className={DRAWER_BTN_PRIMARY}>
              <Link href={membersHref}>
                <Plus className="size-3.5" />
                Enroll
              </Link>
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-xs text-[#5B7295]">
          Memberships and enrollment for {customerName}.
        </p>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Shield className="mb-2 size-9 text-[#8CA2C0]/60" />
            <p className="text-sm font-medium text-[#0B1F3B]">Not enrolled in a care plan</p>
            <p className="mt-1 text-xs text-[#5B7295]">
              Enroll at the counter or send {customerName.split(" ")[0] ?? "them"} the public signup link.
            </p>
            <Button asChild variant="outline" size="sm" className={cn(DRAWER_BTN_AZURE, "mt-4")}>
              <Link href={membersHref}>Open {AP_TERMS.maintenanceSubscribers}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {plans.map((plan) => (
                <CarePlanMembershipCard key={plan.id} plan={plan} />
              ))}
            </ul>
            <div className="mt-4 flex justify-end border-t border-[#DDE5EF]/60 pt-3">
              <Link
                href={membersHref}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1E7FE0] hover:underline"
              >
                View all in {AP_TERMS.maintenanceSubscribers}
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </>
        )}
      </DrawerContentCard>
    </div>
  );
}

export function DrawerFinancesTab({ availableCreditCents }: { availableCreditCents: number }) {
  const [sub, setSub] = useState<"credit" | "ar">("credit");

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={sub === "credit" ? "default" : "outline"}
          className={cn("h-10 gap-2", sub === "credit" ? DRAWER_BTN_PRIMARY : DRAWER_BTN_AZURE)}
          onClick={() => setSub("credit")}
        >
          <Receipt className="size-4" />
          Store credit
        </Button>
        <Button
          type="button"
          variant={sub === "ar" ? "default" : "outline"}
          className={cn("h-10 gap-2", sub === "ar" ? DRAWER_BTN_PRIMARY : DRAWER_BTN_AZURE)}
          onClick={() => setSub("ar")}
        >
          <History className="size-4" />
          AR account
        </Button>
      </div>

      {sub === "credit" ? (
        <DrawerContentCard
          title="Store Credit"
          headerAction={
            <Button type="button" variant="outline" size="sm" className={DRAWER_BTN_AZURE} disabled title="Coming soon">
              <Plus className="size-3.5" />
              Credit memo
            </Button>
          }
        >
          <div className="overflow-hidden rounded-md border border-[#DDE5EF]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#DDE5EF] bg-[#F7F9FC] text-left text-xs font-semibold text-[#5B7295]">
                  <th className="px-3 py-2">Memo #</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#DDE5EF]/60 bg-[#f2f8fe]/40 font-medium text-[#0B1F3B]">
                  <td className="px-3 py-3" colSpan={3}>
                    Total available credit
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCents(availableCreditCents)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DrawerContentCard>
      ) : (
        <DrawerEmptyState
          icon={History}
          title="Accounts receivable"
          description="Open invoices and charge-account balances will appear here."
        />
      )}
    </div>
  );
}

export function DrawerActionRail({
  customerId,
  customerName,
  vehicleId,
  roId,
  roNumber,
  appointments,
  employees,
  defaultDurationMins,
  onAppointmentCreated,
}: {
  customerId: string;
  customerName: string;
  vehicleId: string | null;
  roId?: string;
  roNumber?: number;
  appointments: EstimateContextDrawerAppointment[];
  employees: { id: string; name: string }[];
  defaultDurationMins: number;
  onAppointmentCreated?: () => void;
}) {
  const [apptOpen, setApptOpen] = useState(false);
  const estimateClass = cn(
    "flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold text-white transition-colors",
    "bg-[#E86A10] hover:bg-[#E86A10]/90",
  );
  const outlineActionClass =
    "flex w-full items-center justify-center gap-1.5 rounded-md border border-[#1E7FE0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1E7FE0] transition-colors hover:bg-[#f2f8fe] [&_svg]:text-[#1E7FE0]";

  return (
    <aside className="hidden w-[13rem] shrink-0 flex-col border-l border-[#DDE5EF] bg-[#F7F9FC] md:flex">
      <div className="border-b border-[#DDE5EF] p-4">
        <div className="space-y-2">
          <Link href={`/repair-orders/new?customerId=${customerId}`} className={estimateClass}>
            <Plus className="size-4" />
            Estimate
          </Link>
          <button type="button" className={outlineActionClass} onClick={() => setApptOpen(true)}>
            <Plus className="size-4" />
            Appointment
          </button>
        </div>
      </div>

      <NewAppointmentDialog
        open={apptOpen}
        onOpenChange={setApptOpen}
        defaultDurationMins={defaultDurationMins}
        employees={employees}
        onCreated={onAppointmentCreated}
        defaults={{
          customerId,
          customerName,
          vehicleId,
          repairOrderId: roId,
          notes: roNumber != null ? `RO #${roNumber}` : undefined,
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <DrawerContentCard>
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="mb-2 flex size-9 items-center justify-center rounded-full bg-[#F0F3F8]">
                <Calendar className="size-4 text-[#8CA2C0]" />
              </span>
              <p className="text-xs leading-relaxed text-[#5B7295]">
                No upcoming appointments for this customer.
              </p>
              <button
                type="button"
                onClick={() => setApptOpen(true)}
                className="mt-2 text-sm font-medium text-[#1E7FE0] hover:underline"
              >
                Schedule Appointment
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li key={a.id} className="rounded-md border border-[#DDE5EF] bg-[#F7F9FC] px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-[#0B1F3B]">{a.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#5B7295]">{fmtApptWhen(a.startAt)}</p>
                  {a.vehicleLabel ? (
                    <p className="mt-0.5 truncate text-[10px] text-[#8CA2C0]">{a.vehicleLabel}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DrawerContentCard>
      </div>
    </aside>
  );
}

export const DRAWER_TABS: { id: ContextDrawerTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "vehicles", label: "Vehicles" },
  { id: "carePlan", label: "Care Plan" },
  { id: "deferred", label: "Deferred" },
  { id: "orders", label: "Repair Orders" },
  { id: "payment", label: "Payment" },
  { id: "finances", label: "Finances" },
];
