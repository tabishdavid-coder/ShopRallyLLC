"use client";

import { useState } from "react";
import { Car, Check, ChevronDown, Copy, Pencil, UserRound, Wrench } from "lucide-react";

import { VinDisplay } from "@/components/vin-display";
import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import {
  EditVehicleDialog,
  type EditableVehicle,
} from "@/components/repair-order/edit-vehicle-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type SectionTone = "vehicle" | "customer" | "ro";

const SECTION_STYLES: Record<
  SectionTone,
  { header: string; edit: string; icon: typeof Car }
> = {
  vehicle: {
    header: "bg-brand-light/35 text-brand-navy border-brand-light/50",
    edit: "text-brand-navy hover:bg-brand-navy/10",
    icon: Car,
  },
  customer: {
    header: "bg-brand-navy text-white border-brand-navy",
    edit: "text-brand-light hover:bg-white/10",
    icon: UserRound,
  },
  ro: {
    header: "bg-slate-100 text-brand-navy border-slate-200",
    edit: "text-brand-navy hover:bg-slate-200/80",
    icon: Wrench,
  },
};

function CopyIconButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-brand-light/25 hover:text-brand-navy"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied!" : `Copy ${label}`}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  );
}

function VinValue({ vin }: { vin: string }) {
  return <VinDisplay vin={vin} className="text-[12px] leading-snug" />;
}

function ContextSection({
  title,
  tone,
  defaultOpen = true,
  onEdit,
  canEdit,
  children,
}: {
  title: string;
  tone: SectionTone;
  defaultOpen?: boolean;
  onEdit?: () => void;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const styles = SECTION_STYLES[tone];
  const Icon = styles.icon;

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="overflow-hidden border-b border-border/70 last:border-b-0"
    >
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 border-b px-3 py-2 text-left text-[13px] font-semibold",
          styles.header,
        )}
      >
        <Icon className="size-3.5 shrink-0 opacity-90" aria-hidden />
        <span className="min-w-0 flex-1">{title}</span>
        {canEdit && onEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors",
              styles.edit,
            )}
            title={`Edit ${title.toLowerCase()}`}
            aria-label={`Edit ${title.toLowerCase()}`}
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        ) : null}
        <ChevronDown className="size-3.5 shrink-0 opacity-70 transition-transform group-data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="bg-white">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function DetailRow({
  label,
  children,
  onClick,
  className,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border/50 px-3 py-2 last:border-b-0",
        onClick && "cursor-pointer hover:bg-brand-light/8",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="shrink-0 pt-0.5 text-[13px] text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-right text-[13px] leading-snug text-foreground">{children}</div>
    </div>
  );
  return inner;
}

function HeroRow({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/50 px-3 py-2.5",
        onClick && "cursor-pointer hover:bg-brand-light/8",
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-[13px] font-semibold leading-snug text-foreground">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

/** AutoLeap-style section cards + row layout, ShopRally brand colors. */
export function EstimateLabCustomerRoSection({
  customerName,
  customer,
  customerId,
  phone,
  email,
  vehicleLabel,
  vin,
  plate,
  plateState,
  vehicleSpec,
  vehicle,
  canEdit,
}: {
  customerName: string;
  customer: EditableCustomerRecord;
  customerId: string;
  phone: string | null;
  email: string | null;
  vehicleLabel: string;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
  vehicleSpec: string | null;
  vehicle: EditableVehicle | null;
  canEdit: boolean;
}) {
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const drawerCtx = useEstimateLabContextDrawerOptional();

  const plateLabel =
    plate && plateState ? `${plate} - ${plateState}` : plate ?? plateState ?? null;

  const openCustomer = canEdit
    ? () => drawerCtx?.openDrawer("profile")
    : undefined;
  const openVehicle = canEdit && vehicle ? () => setVehicleOpen(true) : undefined;

  const customerType = customer.company?.trim() ? "Business" : "Person";

  return (
    <>
      <div>
        <ContextSection
          title="Vehicle"
          tone="vehicle"
          onEdit={openVehicle}
          canEdit={canEdit && Boolean(vehicle)}
        >
          <HeroRow title={vehicleLabel} subtitle={vehicleSpec} onClick={openVehicle} />
          {vin ? (
            <DetailRow label="VIN">
              <span className="inline-flex items-center justify-end gap-1">
                <VinValue vin={vin} />
                <CopyIconButton label="VIN" text={vin} />
              </span>
            </DetailRow>
          ) : canEdit && vehicle ? (
            <DetailRow label="VIN" onClick={openVehicle}>
              <span className="link-subtle font-medium">Add</span>
            </DetailRow>
          ) : null}
          {plateLabel ? (
            <DetailRow label="License plate" onClick={openVehicle}>
              <span className="font-mono text-[12px] font-medium">{plateLabel}</span>
            </DetailRow>
          ) : canEdit && vehicle ? (
            <DetailRow label="License plate" onClick={openVehicle}>
              <span className="link-subtle font-medium">Add</span>
            </DetailRow>
          ) : null}
        </ContextSection>

        <ContextSection title="Customer" tone="customer" onEdit={openCustomer} canEdit={canEdit}>
          <HeroRow
            title={customerName}
            subtitle={customerType}
            onClick={openCustomer}
          />
          {phone ? (
            <DetailRow label="Phone">
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="link-subtle font-medium">
                {phone}
              </a>
            </DetailRow>
          ) : canEdit ? (
            <DetailRow label="Phone" onClick={openCustomer}>
              <span className="link-subtle font-medium">Add</span>
            </DetailRow>
          ) : null}
          {email ? (
            <DetailRow label="Email">
              <a href={`mailto:${email}`} className="link-subtle break-all font-medium">
                {email}
              </a>
            </DetailRow>
          ) : canEdit ? (
            <DetailRow label="Email" onClick={openCustomer}>
              <span className="link-subtle font-medium">Add</span>
            </DetailRow>
          ) : null}
        </ContextSection>
      </div>

      {vehicle ? (
        <EditVehicleDialog
          vehicle={vehicle}
          customerId={customerId}
          open={vehicleOpen}
          onOpenChange={setVehicleOpen}
        />
      ) : null}
    </>
  );
}
