"use client";

import { useEffect, useState, useTransition } from "react";
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
  Shield,
  Tag,
} from "lucide-react";

import { CustomerConsentCheckboxes } from "@/components/customers/customer-consent-checkboxes";
import {
  CustomerTagPicker,
  CustomerFormCollapsible,
  PersonBusinessToggle,
  customerFieldInputClass,
  validateCustomerForm,
  type CustomerFormType,
  type EditableCustomerRecord,
} from "@/components/customers/customer-form-shared";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  EstimateContextDrawerRo,
  EstimateContextDrawerVehicle,
} from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { formatCents, customerDisplayName } from "@/lib/format";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { fetchVehicleSpecsBundle } from "@/server/actions/vehicle-specs";
import { formatPhoneInput } from "@/lib/phone";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { updateCustomer } from "@/server/actions/customers";
import { updateVehicle } from "@/server/actions/vehicles";
import type { ROStatus } from "@/generated/prisma";

const DRAWER_FIELD =
  "h-8 rounded-sm border-border/80 bg-white text-sm shadow-none focus-visible:border-brand-navy/40 focus-visible:ring-brand-navy/20";

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
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle";
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
  canEdit,
  onSaved,
}: {
  customer: EditableCustomerRecord & {
    transactionalSmsConsent?: boolean;
    marketingEmailConsent?: boolean;
    leadSource?: string | null;
  };
  canEdit: boolean;
  onSaved: () => void;
}) {
  const seedType: CustomerFormType = customer.company?.trim() ? "business" : "person";
  const [type, setType] = useState<CustomerFormType>(seedType);
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [company, setCompany] = useState(customer.company ?? "");
  const [phone, setPhone] = useState(customer.phone ? formatPhoneInput(customer.phone) : "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [state, setState] = useState(customer.state ?? "");
  const [zip, setZip] = useState(customer.zip ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [tags, setTags] = useState<string[]>(customer.tags ?? []);
  const [transactionalSms, setTransactionalSms] = useState(customer.transactionalSmsConsent ?? false);
  const [marketingSms, setMarketingSms] = useState(customer.marketingOptIn ?? false);
  const [marketingEmail, setMarketingEmail] = useState(customer.marketingEmailConsent ?? false);
  const [taxExempt, setTaxExempt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setType(customer.company?.trim() ? "business" : "person");
    setFirstName(customer.firstName ?? "");
    setLastName(customer.lastName ?? "");
    setCompany(customer.company ?? "");
    setPhone(customer.phone ? formatPhoneInput(customer.phone) : "");
    setEmail(customer.email ?? "");
    setAddress(customer.address ?? "");
    setCity(customer.city ?? "");
    setState(customer.state ?? "");
    setZip(customer.zip ?? "");
    setNotes(customer.notes ?? "");
    setTags(customer.tags ?? []);
  }, [customer]);

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
    <div className="space-y-2.5 pb-1">
      <div className="flex flex-wrap items-end gap-2">
        <PersonBusinessToggle type={type} onChange={setType} compact />
        <CrmFormField label="Customer type" compact className="min-w-[8.5rem] flex-1">
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

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
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
            disabled={!canEdit || pending}
            className={DRAWER_FIELD}
          />
        </CrmFormField>
        <CrmFormField label="Email" compact>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
        </CrmFormField>
      </div>

      <div className="rounded-md border border-border/70 bg-muted/[0.12] px-2.5 py-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Primary address
        </p>
        <div className="grid grid-cols-4 gap-2">
          <CrmFormField label="Address" compact className="col-span-4">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
          </CrmFormField>
          <CrmFormField label="City" compact className="col-span-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
          </CrmFormField>
          <CrmFormField label="State" compact>
            <Input value={state} onChange={(e) => setState(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
          </CrmFormField>
          <CrmFormField label="Zip" compact>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
          </CrmFormField>
        </div>
      </div>

      <CustomerFormCollapsible title="Communication preference" compact defaultOpen={false}>
        <CustomerConsentCheckboxes
          compact
          transactionalSmsConsent={transactionalSms}
          marketingOptIn={marketingSms}
          marketingEmailConsent={marketingEmail}
          onTransactionalChange={setTransactionalSms}
          onMarketingSmsChange={setMarketingSms}
          onMarketingEmailChange={setMarketingEmail}
        />
        <label className="flex items-center gap-2 text-xs text-foreground">
          <Checkbox checked={taxExempt} onCheckedChange={(v) => setTaxExempt(v === true)} disabled={!canEdit} className="size-3.5" />
          Tax exempt
          <span className="text-[11px] text-muted-foreground">(coming soon)</span>
        </label>
      </CustomerFormCollapsible>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <CrmFormField label="Internal notes" compact>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit || pending}
            rows={2}
            className={cn(DRAWER_FIELD, "min-h-[3.25rem] resize-none py-1.5")}
          />
        </CrmFormField>
        <div>
          <p className="mb-1 text-xs font-medium text-foreground">Tags</p>
          <CustomerTagPicker
            compact
            availableTags={[]}
            selected={tags}
            onToggle={(t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
          />
        </div>
      </div>

      {error ? <p className="text-xs text-brand-red">{error}</p> : null}

      {canEdit ? (
        <div className="flex justify-end border-t border-border/60 pt-2">
          <Button
            type="button"
            size="sm"
            className="h-8 min-w-[6.5rem] bg-brand-navy hover:bg-brand-navy/90"
            disabled={pending}
            onClick={save}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function VehicleAccordionCard({
  vehicle,
  customerId,
  currentRoVehicleId,
  roId,
  preloadedSpecs,
  canEdit,
  onSaved,
}: {
  vehicle: EstimateContextDrawerVehicle;
  customerId: string;
  currentRoVehicleId: string | null;
  roId?: string;
  preloadedSpecs: EstimateLabVehicleSpecsBundle | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(vehicle.id === currentRoVehicleId);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specsData, setSpecsData] = useState<EstimateLabVehicleSpecsBundle | null>(
    vehicle.id === currentRoVehicleId ? preloadedSpecs : null,
  );
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [year, setYear] = useState(vehicle.year != null ? String(vehicle.year) : "");
  const [make, setMake] = useState(vehicle.make ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [trim, setTrim] = useState(vehicle.trim ?? "");
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [plateState, setPlateState] = useState(vehicle.plateState ?? "");
  const [pending, start] = useTransition();
  const [specsPending, startSpecs] = useTransition();
  const title = vehicleTitle(vehicle);

  useEffect(() => {
    setVin(vehicle.vin ?? "");
    setYear(vehicle.year != null ? String(vehicle.year) : "");
    setMake(vehicle.make ?? "");
    setModel(vehicle.model ?? "");
    setTrim(vehicle.trim ?? "");
    setPlate(vehicle.plate ?? "");
    setPlateState(vehicle.plateState ?? "");
  }, [vehicle]);

  useEffect(() => {
    if (vehicle.id === currentRoVehicleId && preloadedSpecs) {
      setSpecsData(preloadedSpecs);
    }
  }, [vehicle.id, currentRoVehicleId, preloadedSpecs]);

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
    start(async () => {
      const parsedYear = year.trim() ? Number(year) : null;
      await updateVehicle({
        id: vehicle.id,
        customerId,
        vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
        year: parsedYear ?? undefined,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        trim: trim.trim() || undefined,
        plate: plate.trim() || undefined,
        plateState: plateState.trim() || undefined,
        unitNumber: vehicle.unitNumber,
        notes: vehicle.notes,
        engine: vehicle.engine,
        transmission: vehicle.transmission,
        drivetrain: vehicle.drivetrain,
        bodyClass: vehicle.bodyClass,
        tireSizeFront: null,
        tireSizeRear: null,
      });
      onSaved();
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

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-border/60 bg-muted/[0.12] px-3 py-2.5 text-left"
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
          </div>

          {specsError ? <p className="text-xs text-brand-red">{specsError}</p> : null}

          {specsOpen && specsData ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/10">
              <EstimateLabVehicleSpecsSection data={specsData} canEdit={canEdit} />
            </div>
          ) : null}

          <div className="grid grid-cols-4 gap-3">
            <CrmFormField label="Year">
              <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} disabled={!canEdit || pending} className={DRAWER_FIELD} />
            </CrmFormField>
            <CrmFormField label="Make">
              <Input value={make} onChange={(e) => setMake(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
            </CrmFormField>
            <CrmFormField label="Model" className="col-span-2">
              <Input value={model} onChange={(e) => setModel(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
            </CrmFormField>
          </div>

          <CrmFormField label="Trim">
            <Input value={trim} onChange={(e) => setTrim(e.target.value)} disabled={!canEdit || pending} className={DRAWER_FIELD} />
          </CrmFormField>

          <CrmFormField label="Vehicle name (customer-facing)">
            <Input value={title} readOnly className={cn(DRAWER_FIELD, "bg-muted/20")} />
          </CrmFormField>

          <div className="flex items-end gap-2">
            <CrmFormField label="VIN" className="min-w-0 flex-1">
              <Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} disabled={!canEdit || pending} className={cn(DRAWER_FIELD, "font-mono text-xs")} />
            </CrmFormField>
            <Button type="button" variant="outline" size="icon-sm" className="mb-0.5 shrink-0" onClick={copyVin} disabled={!vin} aria-label="Copy VIN">
              <Copy className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CrmFormField label="License plate">
              <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} disabled={!canEdit || pending} className={DRAWER_FIELD} />
            </CrmFormField>
            <CrmFormField label="Registration state">
              <Input value={plateState} onChange={(e) => setPlateState(e.target.value.toUpperCase())} disabled={!canEdit || pending} className={DRAWER_FIELD} />
            </CrmFormField>
          </div>

          {canEdit ? (
            <div className="flex justify-end pt-1">
              <Button type="button" className="bg-brand-navy hover:bg-brand-navy/90" disabled={pending} onClick={save}>
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
  vehicleSpecs,
  canEdit,
  onSaved,
}: {
  vehicles: EstimateContextDrawerVehicle[];
  customerId: string;
  customerName: string;
  currentRoVehicleId: string | null;
  roId?: string;
  vehicleSpecs: EstimateLabVehicleSpecsBundle | null;
  canEdit: boolean;
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
            <Button type="button" variant="outline" className="h-9 w-full justify-center gap-1.5 border-brand-navy/20 text-brand-navy hover:bg-brand-navy/[0.04]">
              <Plus className="size-4" />
              Vehicle
            </Button>
          }
        />
      ) : null}

      {vehicles.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No vehicles on file yet.</p>
      ) : (
        vehicles.map((v) => (
          <VehicleAccordionCard
            key={v.id}
            vehicle={v}
            customerId={customerId}
            currentRoVehicleId={currentRoVehicleId}
            roId={roId}
            preloadedSpecs={
              v.id === currentRoVehicleId && vehicleSpecs?.vehicleId === v.id ? vehicleSpecs : null
            }
            canEdit={canEdit}
            onSaved={onSaved}
          />
        ))
      )}
    </div>
  );
}

export function DrawerDeferredTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Tag className="mb-3 size-10 text-muted-foreground/35" />
      <p className="text-sm font-medium text-foreground">No deferred work</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Declined or deferred services from inspections will appear here for follow-up.
      </p>
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
          "block rounded-lg border border-border/80 bg-white p-3 shadow-sm transition-colors hover:border-brand-navy/25 hover:bg-brand-navy/[0.02]",
          currentRoId && ro.id === currentRoId && "ring-1 ring-brand-navy/20",
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
    <div className="space-y-5 pb-4">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-10 justify-center gap-2 border-border/80" asChild>
          <Link href={`/repair-orders/new?customerId=${customerId}`}>
            <Receipt className="size-4 text-brand-navy/70" />
            Estimate
          </Link>
        </Button>
        <Button type="button" variant="outline" className="h-10 justify-center gap-2 border-border/80" disabled title="Coming soon">
          <Calendar className="size-4 text-brand-navy/70" />
          Appointment
        </Button>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active</h3>
        <div className="space-y-2">
          {active.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/80 py-8 text-center text-sm text-muted-foreground">
              No open repair orders.
            </p>
          ) : (
            active.map((ro) => <RoRow key={ro.id} ro={ro} />)
          )}
        </div>
      </section>

      {archived.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Completed</h3>
          <div className="space-y-2">
            {archived.slice(0, 8).map((ro) => (
              <RoRow key={ro.id} ro={ro} />
            ))}
          </div>
        </section>
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
    <div className="space-y-3 pb-4">
      <div>
        <h3 className="text-sm font-semibold text-brand-navy">Payment history</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          All recorded payments across repair orders for this customer.
        </p>
      </div>
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <PaymentTransactionsPanel
          embedded
          payments={payments}
          failedPayments={failedPayments}
          customerWide
        />
      </section>
    </div>
  );
}

const CARE_PLAN_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAST_DUE: "bg-amber-100 text-amber-900",
  PENDING: "bg-blue-100 text-blue-800",
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
      <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 px-4 py-6 text-sm text-on-brand-wash">
        <p className="font-medium text-brand-navy">{AP_TERMS.maintenancePrograms}</p>
        <p className="mt-1 text-muted-foreground">
          Upgrade to Enterprise to enroll customers in care plans from the drawer.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3 border-brand-navy text-brand-navy">
          <Link href="/settings/subscription">View plans</Link>
        </Button>
      </div>
    );
  }

  const membersHref = `/maintenance-programs/subscribers?customerId=${encodeURIComponent(customerId)}`;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
            <Shield className="size-4 text-brand-navy/80" aria-hidden />
            {AP_TERMS.maintenancePrograms}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Memberships and enrollment for {customerName}.
          </p>
        </div>
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
          <Button asChild size="sm" variant="default" className="gap-1 bg-brand-navy hover:bg-brand-navy/90">
            <Link href={membersHref}>
              <Plus className="size-3.5" />
              Enroll
            </Link>
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-white/60 px-4 py-10 text-center">
          <Shield className="mx-auto mb-2 size-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Not enrolled in a care plan</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enroll at the counter or send {customerName.split(" ")[0] ?? "them"} the public signup link.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 border-brand-navy/25 text-brand-navy">
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
          <div className="flex justify-end border-t border-border/60 pt-3">
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
  );
}

export function DrawerFinancesTab({ availableCreditCents }: { availableCreditCents: number }) {
  const [sub, setSub] = useState<"credit" | "ar">("credit");

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={sub === "credit" ? "default" : "outline"}
          className={cn("h-10 gap-2", sub === "credit" && "bg-brand-navy hover:bg-brand-navy/90")}
          onClick={() => setSub("credit")}
        >
          <Receipt className="size-4" />
          Store credit
        </Button>
        <Button
          type="button"
          variant={sub === "ar" ? "default" : "outline"}
          className={cn("h-10 gap-2", sub === "ar" && "bg-brand-navy hover:bg-brand-navy/90")}
          onClick={() => setSub("ar")}
        >
          <History className="size-4" />
          AR account
        </Button>
      </div>

      {sub === "credit" ? (
        <>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" className="gap-1" disabled title="Coming soon">
              <Plus className="size-3.5" />
              Credit memo
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Memo #</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60 bg-brand-navy/[0.03] font-medium">
                  <td className="px-3 py-3" colSpan={3}>
                    Total available credit
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCents(availableCreditCents)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border/80 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Accounts receivable</p>
          <p className="mt-1 text-xs text-muted-foreground">Open invoices and charge-account balances will appear here.</p>
        </div>
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
  const actionClass =
    "flex w-full items-center justify-center gap-1.5 rounded-md border border-brand-light/50 bg-brand-light/15 px-3 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-navy/25 hover:bg-brand-light/25";
  const disabledActionClass = cn(actionClass, "cursor-not-allowed opacity-50 hover:border-brand-light/50 hover:bg-brand-light/15");

  return (
    <aside className="hidden w-[12.75rem] shrink-0 flex-col border-l border-border/80 bg-muted/[0.08] md:flex">
      <div className="space-y-2 border-b border-border/60 p-3">
        <Link href={`/repair-orders/new?customerId=${customerId}`} className={actionClass}>
          <Plus className="size-4" />
          Estimate
        </Link>
        <button type="button" className={actionClass} onClick={() => setApptOpen(true)}>
          <Plus className="size-4" />
          Appointment
        </button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex w-full">
                <button type="button" className={disabledActionClass} disabled aria-disabled="true">
                  <Plus className="size-4" />
                  Credit memo
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              Credit memos are not available yet. View store credit under Finances.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Appointments
        </h3>
        {appointments.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-white/60 px-3 py-8 text-center">
            <Calendar className="mx-auto mb-2 size-8 text-muted-foreground/30" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              No upcoming appointments for this customer.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {appointments.map((a) => (
              <li key={a.id} className="rounded-md border border-border/70 bg-white px-2.5 py-2">
                <p className="truncate text-xs font-semibold text-foreground">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtApptWhen(a.startAt)}</p>
                {a.vehicleLabel ? (
                  <p className="mt-0.5 truncate text-[10px] uppercase text-muted-foreground/80">{a.vehicleLabel}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export const DRAWER_TABS: { id: ContextDrawerTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "vehicles", label: "Vehicles" },
  { id: "carePlan", label: "Care Plan" },
  { id: "deferred", label: "Deferred" },
  { id: "orders", label: "Repair orders" },
  { id: "payment", label: "Payment" },
  { id: "finances", label: "Finances" },
];
