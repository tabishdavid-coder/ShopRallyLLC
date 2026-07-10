"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  MessageSquare,
  MoreHorizontal,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { formatCents, customerDisplayName } from "@/lib/format";
import { parseApprovalSignature } from "@/lib/approval-signature";
import type { VehicleSpecsView } from "@/lib/vehicle-specs-view";
import { RoVehicleSpecsPanel } from "@/components/repair-order/ro-vehicle-specs-panel";
import type { RepairOrderDetail } from "@/server/repair-order";
import type { RoSidebarOptions } from "@/server/ro-sidebar-options";
import { EditCustomerDialog } from "@/components/repair-order/edit-customer-dialog";
import { EditVehicleDialog } from "@/components/repair-order/edit-vehicle-dialog";
import {
  DateTimeFieldDialog,
  MileageInDialog,
  MileageOutDialog,
  SelectFieldDialog,
  TextFieldDialog,
  useRoMileageSave,
  useRoSidebarSave,
} from "@/components/repair-order/ro-sidebar-field-dialogs";
import { ApprovalSignaturePanel } from "@/components/repair-order/approval-signature-panel";
import { RoWorkflowDropdown } from "@/components/repair-order/ro-workflow-dropdown";
import { formatPhoneInput } from "@/lib/phone";
import { VinDisplay } from "@/components/vin-display";
import {
  formatVehicleContextLabel,
  smsPhoneHref,
  splitVinForDisplay,
} from "@/lib/ro-context-display";
import { SMS_ENABLED } from "@/lib/features";
import { cn } from "@/lib/utils";
import { ROStatus } from "@/generated/prisma";
import { RoMessages } from "@/components/repair-order/ro-messages";

function ContextQuickAction({
  label,
  href,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-brand-navy";

  if (href) {
    return (
      <a href={href} className={className} aria-label={label} title={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function CopyFieldButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <ContextQuickAction label={copied ? "Copied" : label} onClick={onCopy}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </ContextQuickAction>
  );
}

function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtMiles(n: number) {
  return `${n.toLocaleString()} mi`;
}

function EditableValue({
  value,
  emptyLabel,
  onEdit,
  className,
  align = "end",
}: {
  value: React.ReactNode;
  emptyLabel: string;
  onEdit: () => void;
  className?: string;
  align?: "start" | "end";
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "boolean" && !value);
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "min-w-0 hover:underline",
        align === "start" ? "truncate text-left" : "truncate text-right",
        isEmpty ? "font-normal text-brand-navy/60" : "text-foreground",
        className,
      )}
    >
      {isEmpty ? emptyLabel : value}
    </button>
  );
}

function DetailRow({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2 text-[13px] last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right font-medium text-foreground">
        {value}
        {action}
      </span>
    </div>
  );
}

type DialogKey =
  | "serviceWriter"
  | "technician"
  | "keyTag"
  | "laborRate"
  | "promiseTime"
  | "saveParts"
  | "marketingSource"
  | "appointmentOption"
  | "roNotes"
  | "mileageIn"
  | "mileageOut"
  | "customer"
  | "vehicle";

export function RoContextDeck({
  ro,
  options,
  customerTags = [],
  vehicleSpecs,
}: {
  ro: RepairOrderDetail;
  options: RoSidebarOptions;
  customerTags?: string[];
  vehicleSpecs: VehicleSpecsView;
}) {
  const v = ro.vehicle;
  const c = ro.customer;
  const save = useRoSidebarSave(ro.id);
  const saveMileage = useRoMileageSave(ro.id);
  const [dialog, setDialog] = useState<DialogKey | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const open = (key: DialogKey) => () => setDialog(key);
  const close = () => setDialog(null);

  const address = [c.address, [c.city, c.state].filter(Boolean).join(", "), c.zip]
    .filter(Boolean)
    .join(" ");
  const vehicleLabel = formatVehicleContextLabel(v);
  const vinDisplay = v?.vin ? splitVinForDisplay(v.vin) : null;
  const plateDisplay = v?.plate
    ? `${v.plate}${v.plateState ? ` - ${v.plateState}` : ""}`
    : null;

  const effectiveRate = ro.laborRateCents ?? ro.shop.laborRateCents;
  const laborRateLabel =
    options.laborRates.find((r) => r.rateCents === effectiveRate)?.name ??
    formatCents(effectiveRate);

  const roNotesPreview =
    ro.notes && ro.notes.length > 40 ? `${ro.notes.slice(0, 40)}…` : ro.notes;

  const approvalSignature = parseApprovalSignature(ro);
  const balanceDueCents = ro.invoice?.balanceCents ?? null;
  const staffSummary = [
    ro.serviceWriterName ? `Writer ${ro.serviceWriterName}` : null,
    ro.technicianName ? `Tech ${ro.technicianName}` : null,
    `Rate ${formatCents(effectiveRate)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const canArchiveRo =
    (ro.status === ROStatus.COMPLETED || ro.status === ROStatus.INVOICED) &&
    Boolean(ro.invoice?.payments.length) &&
    (balanceDueCents ?? 0) <= 0;

  const contextCard =
    "ro-context-card group flex h-8 min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-2 border-brand-navy/30 bg-white px-2.5 text-left shadow-sm transition-all hover:border-brand-navy/50 hover:shadow-md";

  const phoneFormatted = c.phone ? formatPhoneInput(c.phone) : "";

  return (
    <>
      {/* Compact customer + vehicle context row — mirrors the Estimate tab's
       *  context cards instead of the old full-width chip grid. All fields
       *  (writer/tech/rate/plate/VIN/notes/etc.) still live one click away in
       *  the Details sheet below. */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border bg-muted/10 px-3 py-2 md:px-4">
        {approvalSignature ? (
          <span className="ro-meta-chip ro-meta-chip--auth inline-flex shrink-0 items-center gap-1 self-center">
            <ShieldCheck className="size-3 shrink-0 text-emerald-600" aria-hidden />
            <span className="text-[11px] font-semibold text-emerald-700">Authorized</span>
          </span>
        ) : null}

        <div
          role="button"
          tabIndex={0}
          onClick={() => setDetailsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDetailsOpen(true);
            }
          }}
          className={cn(contextCard, "min-w-0 flex-1")}
        >
          <UserRound className="size-3.5 shrink-0 text-brand-navy/80 group-hover:text-brand-navy" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs">
            <span className="font-semibold text-brand-navy">{customerDisplayName(c)}</span>
            {phoneFormatted ? (
              <>
                <span className="mx-1 text-muted-foreground/45" aria-hidden>
                  ·
                </span>
                <span className="font-normal tabular-nums text-muted-foreground">{phoneFormatted}</span>
              </>
            ) : null}
          </span>
          {phoneFormatted ? (
            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {c.phone ? (
                SMS_ENABLED ? (
                  <ContextQuickAction label="Text customer" onClick={() => setMessagesOpen(true)}>
                    <MessageSquare className="size-3" />
                  </ContextQuickAction>
                ) : (
                  <ContextQuickAction label="Text customer" href={smsPhoneHref(c.phone)}>
                    <MessageSquare className="size-3" />
                  </ContextQuickAction>
                )
              ) : null}
              {c.phone ? <CopyFieldButton value={c.phone} label="Copy phone" /> : null}
            </div>
          ) : null}
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-brand-navy" aria-hidden />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setDetailsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDetailsOpen(true);
            }
          }}
          className={cn(contextCard, "min-w-0 flex-1")}
        >
          <Car className="size-3.5 shrink-0 text-brand-navy/80 group-hover:text-brand-navy" aria-hidden />
          <span className="flex min-w-0 flex-1 items-center overflow-hidden text-xs">
            {v ? (
              <>
                <span
                  className="truncate font-semibold text-brand-navy"
                  title={vehicleLabel.full}
                >
                  {vehicleLabel.display}
                </span>
                {vinDisplay ? (
                  <>
                    <span className="mx-1 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <VinDisplay
                      vin={vinDisplay.full}
                      className="shrink-0 text-[13px] font-normal"
                    />
                    <CopyFieldButton value={vinDisplay.full} label="Copy VIN" />
                  </>
                ) : null}
                {v.plate ? (
                  <>
                    <span className="mx-1 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 font-normal text-muted-foreground">{v.plate}</span>
                    <CopyFieldButton value={v.plate} label="Copy plate" />
                  </>
                ) : null}
                {v.plateState ? (
                  <>
                    <span className="mx-1 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 font-normal text-muted-foreground">{v.plateState}</span>
                  </>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">No vehicle</span>
            )}
          </span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-brand-navy" aria-hidden />
        </div>

        <RoWorkflowDropdown
          roId={ro.id}
          roNumber={ro.number}
          roStatus={ro.status}
          customerName={customerDisplayName(c)}
          phone={c.phone}
          canArchive={canArchiveRo}
          className="h-8 shrink-0"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 border-brand-navy/25 px-2 text-[11px] font-semibold text-brand-navy"
          asChild
          title={balanceDueCents && balanceDueCents > 0 ? "Collect payment" : "Payment & invoice"}
        >
          <Link href={roEstimateActionHref(ro.id, "payment")}>
            <CreditCard className="size-3.5" />
            <span className="hidden sm:inline">
              {balanceDueCents && balanceDueCents > 0 ? `Pay ${formatCents(balanceDueCents)}` : "Payment"}
            </span>
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ro-context-bar-details h-8 shrink-0 gap-1 border px-2 text-[11px] font-semibold"
          onClick={() => setDetailsOpen(true)}
          title={staffSummary}
        >
          <MoreHorizontal className="size-3.5" />
          <span className="hidden sm:inline">Details</span>
        </Button>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-brand-light/40 p-0 sm:max-w-md"
        >
          <SheetHeader className="shrink-0 border-b border-brand-light/30 bg-brand-navy px-5 py-4 text-left text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-light">Repair order</p>
            <SheetTitle className="text-lg font-bold text-white">Order details</SheetTitle>
            <SheetDescription className="text-sm text-white/75">
              RO #{ro.number} · {customerDisplayName(c)}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10">
            <Collapsible defaultOpen className="border-b border-brand-light/20">
              <CollapsibleTrigger className="flex w-full items-center justify-between bg-brand-light/10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-brand-navy">
                RO fields
                <ChevronDown className="size-4" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <DetailRow
                  label="Service Writer"
                  value={
                    <EditableValue
                      value={ro.serviceWriterName}
                      emptyLabel="Add"
                      onEdit={open("serviceWriter")}
                    />
                  }
                />
                <DetailRow
                  label="Technician"
                  value={
                    <EditableValue
                      value={ro.technicianName}
                      emptyLabel="Select"
                      onEdit={open("technician")}
                    />
                  }
                />
                <DetailRow
                  label="Key Tag"
                  value={
                    <EditableValue value={ro.keyTag} emptyLabel="Add" onEdit={open("keyTag")} />
                  }
                />
                <DetailRow
                  label="Labor Rate"
                  value={
                    <EditableValue
                      value={`${laborRateLabel} (${formatCents(effectiveRate)})`}
                      emptyLabel="Select"
                      onEdit={open("laborRate")}
                    />
                  }
                />
                <DetailRow label="Time In" value={fmtDateTime(ro.createdAt)} />
                <DetailRow
                  label="Odometer In"
                  value={
                    <EditableValue
                      value={
                        ro.odometerNotWorking
                          ? "Not working"
                          : ro.mileageIn != null
                            ? fmtMiles(ro.mileageIn)
                            : null
                      }
                      emptyLabel="Add"
                      onEdit={open("mileageIn")}
                    />
                  }
                />
                <DetailRow
                  label="Odometer Out"
                  value={
                    <EditableValue
                      value={ro.mileageOut != null ? fmtMiles(ro.mileageOut) : null}
                      emptyLabel="Add"
                      onEdit={open("mileageOut")}
                    />
                  }
                />
                <DetailRow
                  label="Promise Time"
                  value={
                    <EditableValue
                      value={ro.promiseTime ? fmtDateTime(ro.promiseTime) : null}
                      emptyLabel="Add"
                      onEdit={open("promiseTime")}
                    />
                  }
                />
                <DetailRow
                  label="Save Parts"
                  value={
                    <EditableValue
                      value={ro.saveParts ? "Yes" : "No"}
                      emptyLabel="No"
                      onEdit={open("saveParts")}
                    />
                  }
                />
                <DetailRow
                  label="Marketing Source"
                  value={
                    <EditableValue
                      value={ro.marketingSource}
                      emptyLabel="Add"
                      onEdit={open("marketingSource")}
                    />
                  }
                />
                <DetailRow
                  label="Appointment Option"
                  value={
                    <EditableValue
                      value={ro.appointmentOption}
                      emptyLabel="Add"
                      onEdit={open("appointmentOption")}
                    />
                  }
                />
                <DetailRow
                  label="RO Notes"
                  value={
                    <EditableValue
                      value={roNotesPreview}
                      emptyLabel="Add"
                      onEdit={open("roNotes")}
                    />
                  }
                />
              </CollapsibleContent>
            </Collapsible>

            {approvalSignature ? (
              <div className="border-b border-border px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Authorization
                </p>
                <ApprovalSignaturePanel info={approvalSignature} compact />
              </div>
            ) : null}

            {v ? (
              <>
                <Collapsible defaultOpen className="border-b border-border">
                  <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
                    Vehicle
                    <ChevronDown className="size-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <DetailRow
                      label="VIN"
                      value={v.vin ? <VinDisplay vin={v.vin} className="text-[13px]" /> : "—"}
                    />
                    <DetailRow label="Plate" value={plateDisplay ?? "—"} />
                    <DetailRow label="Body Type" value={v.bodyClass ?? "—"} />
                    <DetailRow label="Transmission" value={v.transmission ?? "—"} />
                    <DetailRow label="Drivetrain" value={v.drivetrain ?? "—"} />
                    <DetailRow
                      label="Unit #"
                      value={
                        <EditableValue value={v.unitNumber} emptyLabel="Add" onEdit={open("vehicle")} />
                      }
                    />
                    <DetailRow
                      label="Vehicle Notes"
                      value={
                        <EditableValue value={v.notes} emptyLabel="Add" onEdit={open("vehicle")} />
                      }
                    />
                  </CollapsibleContent>
                </Collapsible>
                <RoVehicleSpecsPanel
                  specs={vehicleSpecs}
                />
              </>
            ) : null}

            <Collapsible defaultOpen className="border-b border-border">
              <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
                Contact
                <ChevronDown className="size-4" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <DetailRow
                  label="Email"
                  value={
                    <EditableValue value={c.email} emptyLabel="Add" onEdit={open("customer")} />
                  }
                />
                <DetailRow
                  label="Address"
                  value={
                    <EditableValue value={address || null} emptyLabel="Add" onEdit={open("customer")} />
                  }
                />
                <DetailRow
                  label="Customer Notes"
                  value={
                    <EditableValue value={c.notes} emptyLabel="Add" onEdit={open("customer")} />
                  }
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </SheetContent>
      </Sheet>

      <SelectFieldDialog
        open={dialog === "serviceWriter"}
        onOpenChange={(o) => !o && close()}
        title="Service Writer"
        label="Employee"
        value={ro.serviceWriterId}
        allowClear
        options={options.serviceWriters.map((s) => ({ value: s.id, label: s.name }))}
        onSave={async (id) => save({ serviceWriterId: id })}
      />
      <SelectFieldDialog
        open={dialog === "technician"}
        onOpenChange={(o) => !o && close()}
        title="Technician"
        label="Technician"
        value={ro.technicianId}
        allowClear
        options={options.technicians.map((s) => ({ value: s.id, label: s.name }))}
        onSave={async (id) => save({ technicianId: id })}
      />
      <TextFieldDialog
        open={dialog === "keyTag"}
        onOpenChange={(o) => !o && close()}
        title="Key Tag"
        label="Key tag number"
        value={ro.keyTag}
        onSave={async (val) => save({ keyTag: val })}
      />
      <SelectFieldDialog
        open={dialog === "laborRate"}
        onOpenChange={(o) => !o && close()}
        title="Labor Rate"
        label="Rate"
        value={String(effectiveRate)}
        options={options.laborRates.map((r) => ({
          value: String(r.rateCents),
          label: `${r.name} (${formatCents(r.rateCents)})`,
        }))}
        onSave={async (val) => save({ laborRateCents: val ? Number(val) : null })}
      />
      <DateTimeFieldDialog
        open={dialog === "promiseTime"}
        onOpenChange={(o) => !o && close()}
        title="Promise Time"
        value={ro.promiseTime}
        onSave={async (val) => save({ promiseTime: val })}
      />
      <SelectFieldDialog
        open={dialog === "saveParts"}
        onOpenChange={(o) => !o && close()}
        title="Save Parts"
        label="Save removed parts for customer?"
        value={ro.saveParts ? "yes" : "no"}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        onSave={async (val) => save({ saveParts: val === "yes" })}
      />
      <SelectFieldDialog
        open={dialog === "marketingSource"}
        onOpenChange={(o) => !o && close()}
        title="Marketing Source"
        label="Lead source"
        value={ro.marketingSource}
        allowClear
        options={options.leadSources.map((s) => ({ value: s, label: s }))}
        onSave={async (val) => save({ marketingSource: val })}
      />
      <SelectFieldDialog
        open={dialog === "appointmentOption"}
        onOpenChange={(o) => !o && close()}
        title="Appointment Option"
        label="Option"
        value={ro.appointmentOption}
        allowClear
        options={options.appointmentOptions.map((s) => ({ value: s, label: s }))}
        onSave={async (val) => save({ appointmentOption: val })}
      />
      <TextFieldDialog
        open={dialog === "roNotes"}
        onOpenChange={(o) => !o && close()}
        title="RO Notes"
        label="Notes"
        value={ro.notes}
        multiline
        onSave={async (val) => save({ notes: val })}
      />
      <MileageInDialog
        open={dialog === "mileageIn"}
        onOpenChange={(o) => !o && close()}
        mileageIn={ro.mileageIn}
        odometerNotWorking={ro.odometerNotWorking}
        reqOdometer={options.reqOdometer}
        onSave={async (patch) => saveMileage(patch)}
      />
      <MileageOutDialog
        open={dialog === "mileageOut"}
        onOpenChange={(o) => !o && close()}
        mileageOut={ro.mileageOut}
        onSave={async (val) => saveMileage({ mileageOut: val })}
      />
      <EditCustomerDialog
        customer={c}
        open={dialog === "customer"}
        onOpenChange={(o) => (o ? setDialog("customer") : close())}
        availableTags={customerTags}
      />
      {v ? (
        <EditVehicleDialog
          vehicle={v}
          customerId={ro.customerId}
          open={dialog === "vehicle"}
          onOpenChange={(o) => (o ? setDialog("vehicle") : close())}
        />
      ) : null}
      <RoMessages
        customerId={ro.customerId}
        customerName={customerDisplayName(c)}
        customerPhone={c.phone}
        marketingOptIn={c.marketingOptIn}
        roId={ro.id}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        hideTrigger
      />
    </>
  );
}

/** @deprecated Use RoContextDeck */
export const RoInfoSidebar = RoContextDeck;
