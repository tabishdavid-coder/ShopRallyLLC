"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as SheetPrimitive } from "radix-ui";
import { ExternalLink, Loader2, Mail, MessageSquare, X } from "lucide-react";

import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import {
  DRAWER_TABS,
  DrawerCarePlanTab,
  DrawerCustomerPaymentHistoryTab,
  DrawerDeferredTab,
  DrawerFinancesTab,
  DrawerPaymentTab,
  DrawerProfileTab,
  DrawerRepairOrdersTab,
  DrawerVehiclesTab,
} from "@/components/estimate-building/estimate-lab-context-drawer-panels";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { Sheet, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";
import { fetchEstimateContextDrawer } from "@/server/actions/estimate-context-drawer";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import type { PaymentFinanceData } from "@/components/repair-order/payment-finance-panel";
import { customerDisplayName, customerInitials, formatCents } from "@/lib/format";
import { smsPhoneHref } from "@/lib/ro-context-display";
import { useCorePlanShop, useShopCapabilities, useSmsUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

export type ContextDrawerTab =
  | "profile"
  | "vehicles"
  | "carePlan"
  | "deferred"
  | "orders"
  | "payment"
  | "finances";

export type CustomerDrawerSource = "estimate" | "customers";

/** Compact status pill — sits under the name / beside RO #, not in the action strip. */
function ActiveStatusBadge({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-brand-navy/15 bg-white px-1.5 text-[10px] font-medium leading-none text-brand-navy transition-colors hover:border-brand-navy/30 hover:bg-brand-light/20"
      aria-pressed={active}
      title={active ? "Mark inactive" : "Mark active"}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-muted-foreground/50",
        )}
        aria-hidden
      />
      {active ? "Active" : "Inactive"}
    </button>
  );
}

/** Full-width Message / Email strip — equal cells, icon + short label. */
const identityActionClass =
  "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-brand-navy/20 bg-white text-xs font-semibold text-brand-navy transition-colors hover:border-brand-navy/35 hover:bg-brand-light/25";
const identityActionDisabledClass =
  "inline-flex h-8 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 text-xs font-semibold text-muted-foreground opacity-70";

function customerRecordFromDetail(
  detail: EstimateContextDrawerData["detail"],
): EditableCustomerRecord {
  return {
    id: detail.id,
    firstName: detail.firstName,
    lastName: detail.lastName,
    company: detail.company,
    phone: detail.phone,
    email: detail.email,
    address: detail.address,
    city: detail.city,
    state: detail.state,
    zip: detail.zip,
    marketingOptIn: detail.marketingOptIn,
    notes: detail.notes,
    tags: detail.tags,
  };
}

/** ShopRally customer lifecycle drawer — left rail nav + main pane (not AutoLeap tabs). */
export function EstimateLabContextDrawer({
  open,
  onOpenChange,
  tab,
  onTabChange,
  customer,
  customerId,
  vehicle = null,
  roId,
  roNumber,
  mileageIn: _mileageIn = null,
  odometerNotWorking: _odometerNotWorking = false,
  canEdit,
  initialData,
  paymentData = null,
  appointmentEmployees: _appointmentEmployees,
  defaultAppointmentDurationMins: _defaultAppointmentDurationMins,
  source = roId ? "estimate" : "customers",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: ContextDrawerTab;
  onTabChange: (tab: ContextDrawerTab) => void;
  customer: EditableCustomerRecord;
  customerId: string;
  vehicle?: EditableVehicle | null;
  roId?: string;
  roNumber?: number;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
  canEdit: boolean;
  initialData: EstimateContextDrawerData | null;
  /** @deprecated Specs product removed — ignored if passed. */
  vehicleSpecs?: EstimateLabVehicleSpecsBundle | null;
  paymentData?: PaymentFinanceData | null;
  /** @deprecated Left-rail appointment CTAs removed — kept for call-site compat. */
  appointmentEmployees?: { id: string; name: string }[];
  /** @deprecated Left-rail appointment CTAs removed — kept for call-site compat. */
  defaultAppointmentDurationMins?: number;
  source?: CustomerDrawerSource;
}) {
  const router = useRouter();
  const corePlan = useCorePlanShop();
  const { maintenancePrograms } = useShopCapabilities();
  const smsEnabled = useSmsUiEnabled();
  const drawerCtx = useEstimateLabContextDrawerOptional();
  const drawerTabs = useMemo(() => {
    return DRAWER_TABS.filter((t) => {
      if (t.id === "finances" && corePlan) return false;
      // Care Plans are Elite (premium) — hide tab on Core/Pro, not an upgrade teaser.
      if (t.id === "carePlan" && !maintenancePrograms) return false;
      return true;
    });
  }, [corePlan, maintenancePrograms]);

  const [data, setData] = useState<EstimateContextDrawerData | null>(initialData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [activeCustomer, setActiveCustomer] = useState(true);

  const hasRoContext = Boolean(roId);
  const isCustomersSource = source === "customers";

  const activeCustomerRecord = useMemo(() => {
    if (data) return customerRecordFromDetail(data.detail);
    return customer;
  }, [customer, data]);

  const title = customerDisplayName(activeCustomerRecord, {
    nameOrder: "firstLast",
  });
  const customerPhone = activeCustomerRecord.phone?.trim() || null;
  const customerEmail = activeCustomerRecord.email?.trim() || null;
  const canMessage = smsEnabled || Boolean(customerPhone);
  const messageTitle = !canMessage
    ? "Add a phone number to message this customer"
    : !customerPhone && smsEnabled
      ? "Open messages — add a phone number to send texts"
      : "Message customer";

  const openCustomerMessage = useCallback(() => {
    if (!canMessage) return;
    // Estimate workspace: open the in-page RO messages dock when available.
    if (smsEnabled && drawerCtx && hasRoContext) {
      drawerCtx.openMessages();
      return;
    }
    if (smsEnabled) {
      router.push(`/messages?customerId=${customerId}`);
      return;
    }
    if (customerPhone) {
      window.location.href = smsPhoneHref(customerPhone);
    }
  }, [
    canMessage,
    smsEnabled,
    drawerCtx,
    hasRoContext,
    router,
    customerId,
    customerPhone,
  ]);

  useEffect(() => {
    setData(initialData);
    setLoadError(null);
  }, [initialData, customerId]);

  const reload = useCallback(
    (refreshPage = false) => {
      startLoad(async () => {
        try {
          const res = await fetchEstimateContextDrawer(customerId);
          if (res.ok) {
            setData(res.data);
            setLoadError(null);
            if (refreshPage) router.refresh();
          } else {
            setLoadError(res.error);
          }
        } catch {
          setLoadError("Could not load customer profile. Try again.");
        }
      });
    },
    [customerId, router],
  );

  useEffect(() => {
    if (!open) return;
    setData(initialData);
    setLoadError(null);
    reload(false);
  }, [open, customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const creditCents = data?.availableCreditCents ?? 0;
  const deferredCount = data?.deferredJobs?.length ?? 0;

  useEffect(() => {
    if (corePlan && tab === "finances") onTabChange("payment");
  }, [corePlan, tab, onTabChange]);

  useEffect(() => {
    if (!maintenancePrograms && tab === "carePlan") onTabChange("profile");
  }, [maintenancePrograms, tab, onTabChange]);

  /** Identity subtitle: RO # only in RO context — no filler "Customer profile". */
  const identitySubtitle =
    hasRoContext && roNumber != null ? `RO #${roNumber}` : null;

  const activeTabLabel =
    drawerTabs.find((t) => t.id === tab)?.label ??
    DRAWER_TABS.find((t) => t.id === tab)?.label ??
    "Profile";

  const sectionMeta = useMemo(() => {
    if (tab === "profile" && activeCustomerRecord.phone) {
      return activeCustomerRecord.phone;
    }
    if (tab === "vehicles") {
      const n = data?.detail.vehicles.length ?? 0;
      return n === 1 ? "1 vehicle" : `${n} vehicles`;
    }
    if (tab === "deferred") {
      return deferredCount === 1 ? "1 declined" : `${deferredCount} declined`;
    }
    if (tab === "orders") {
      const n = data?.detail.repairOrders.length ?? 0;
      return n === 1 ? "1 repair order" : `${n} repair orders`;
    }
    if (tab === "payment") return hasRoContext ? "This repair order" : "Payment history";
    if (tab === "finances" && !corePlan) return formatCents(creditCents);
    return identitySubtitle;
  }, [
    tab,
    activeCustomerRecord.phone,
    data?.detail.vehicles.length,
    data?.detail.repairOrders.length,
    deferredCount,
    hasRoContext,
    corePlan,
    creditCents,
    identitySubtitle,
  ]);

  function NavButton({
    id,
    label,
    badge,
    compact,
  }: {
    id: ContextDrawerTab;
    label: string;
    badge?: number;
    compact?: boolean;
  }) {
    const selected = tab === id;
    if (compact) {
      return (
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onTabChange(id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            selected
              ? "bg-brand-navy text-white"
              : "bg-white text-muted-foreground ring-1 ring-border hover:text-brand-navy",
          )}
        >
          {label}
          {badge != null && badge > 0 ? (
            <span
              className={cn(
                "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                selected ? "bg-white/20 text-white" : "bg-brand-red text-white",
              )}
            >
              {badge}
            </span>
          ) : null}
        </button>
      );
    }
    return (
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => onTabChange(id)}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
          selected
            ? "bg-brand-navy/[0.06] font-semibold text-brand-navy before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-red"
            : "font-medium text-muted-foreground hover:bg-brand-navy/[0.04] hover:text-brand-navy",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge != null && badge > 0 ? (
          <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
    );
  }

  const identityBlock = (
    <div className="space-y-3">
      {/* Identity: monogram + name; Active is status, not an action chip */}
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-navy text-[13px] font-semibold tracking-wide text-white">
          {customerInitials(activeCustomerRecord)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-sm font-bold leading-snug text-brand-navy">
              {title}
            </h2>
            {hasRoContext && !isCustomersSource ? (
              <Link
                href={`/customers?customer=${customerId}`}
                className="inline-flex shrink-0 text-muted-foreground hover:text-brand-navy"
                aria-label="Open customer in CRM"
              >
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {identitySubtitle ? (
              <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                {identitySubtitle}
              </p>
            ) : null}
            <ActiveStatusBadge active={activeCustomer} onChange={setActiveCustomer} />
          </div>
          {!corePlan ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Credit{" "}
              <span className="font-semibold tabular-nums text-brand-navy">
                {formatCents(creditCents)}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Action strip: Message | Email (full-width; Message alone when no email) */}
      <div
        className={cn(
          "grid gap-1.5",
          customerEmail ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <span title={messageTitle} className="min-w-0">
          <button
            type="button"
            onClick={openCustomerMessage}
            disabled={!canMessage}
            aria-label={messageTitle}
            className={canMessage ? identityActionClass : identityActionDisabledClass}
          >
            <MessageSquare className="size-3.5 shrink-0" />
            Message
          </button>
        </span>
        {customerEmail ? (
          <a
            href={`mailto:${encodeURIComponent(customerEmail)}`}
            title={`Email ${customerEmail}`}
            aria-label={`Email ${customerEmail}`}
            className={identityActionClass}
          >
            <Mail className="size-3.5 shrink-0" />
            Email
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/45 backdrop-blur-[1px] duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <SheetPrimitive.Content
          aria-describedby={undefined}
          data-side="right"
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 overflow-hidden bg-background p-0 shadow-2xl outline-none",
            "border-l border-border sm:max-w-[min(64rem,calc(100vw-0.5rem))]",
            "duration-300 ease-out data-open:animate-in data-closed:animate-out",
            "data-open:slide-in-from-right data-closed:slide-out-to-right data-open:fade-in-0 data-closed:fade-out-0",
          )}
        >
          {/* Mobile compact header */}
          <header className="shrink-0 border-b border-border bg-white px-4 py-3 pr-12 md:hidden">
            {identityBlock}
          </header>

          {/* Mobile chip strip */}
          <div
            role="tablist"
            aria-label="Customer record"
            className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-brand-navy/[0.03] px-3 py-2 scrollbar-none md:hidden"
          >
            {drawerTabs.map((t) => (
              <NavButton
                key={t.id}
                id={t.id}
                label={t.label}
                badge={t.id === "deferred" ? deferredCount : undefined}
                compact
              />
            ))}
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Desktop left lifecycle rail */}
            <aside className="hidden w-[14.5rem] shrink-0 flex-col border-r border-border bg-brand-navy/[0.03] md:flex">
              <div className="shrink-0 border-b border-border px-3 py-4">
                {identityBlock}
              </div>

              <nav
                role="tablist"
                aria-label="Customer record"
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3"
              >
                {drawerTabs.map((t) => (
                  <NavButton
                    key={t.id}
                    id={t.id}
                    label={t.label}
                    badge={t.id === "deferred" ? deferredCount : undefined}
                  />
                ))}
              </nav>
            </aside>

            {/* Main pane */}
            <div className="flex min-w-0 flex-1 flex-col bg-white">
              <div className="hidden shrink-0 border-b border-border px-5 py-3 md:block">
                <h3 className="text-base font-semibold text-brand-navy">{activeTabLabel}</h3>
                {sectionMeta ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{sectionMeta}</p>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-brand-navy/[0.02] px-4 py-4 sm:px-5">
                {loading && !data ? (
                  <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin text-brand-navy" />
                    Loading customer…
                  </div>
                ) : null}

                {loadError ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-brand-red">{loadError}</p>
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-brand-navy underline"
                      onClick={() => reload(false)}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                {data ? (
                  <>
                    {tab === "profile" ? (
                      <DrawerProfileTab
                        customer={{
                          ...activeCustomerRecord,
                          transactionalSmsConsent: data.detail.transactionalSmsConsent,
                          marketingEmailConsent: data.detail.marketingEmailConsent,
                          leadSource: data.detail.leadSource,
                        }}
                        customerId={customerId}
                        drawerOpen={open}
                        canEdit={canEdit}
                        onSaved={() => reload(true)}
                      />
                    ) : null}

                    {tab === "vehicles" ? (
                      <DrawerVehiclesTab
                        vehicles={data.detail.vehicles}
                        repairOrders={data.detail.repairOrders}
                        customerId={customerId}
                        customerName={title}
                        currentRoId={roId}
                        currentRoVehicleId={vehicle?.id ?? null}
                        roMileageIn={_mileageIn}
                        roOdometerNotWorking={_odometerNotWorking}
                        canEdit={canEdit}
                        onSaved={() => reload(true)}
                      />
                    ) : null}

                    {tab === "carePlan" ? (
                      <DrawerCarePlanTab
                        customerId={customerId}
                        customerName={title}
                        customerEmail={activeCustomerRecord.email}
                        customerPhone={activeCustomerRecord.phone}
                      />
                    ) : null}

                    {tab === "deferred" ? (
                      <DrawerDeferredTab
                        jobs={data.deferredJobs ?? []}
                        currentRoId={roId}
                      />
                    ) : null}

                    {tab === "orders" ? (
                      <DrawerRepairOrdersTab
                        orders={data.detail.repairOrders}
                        currentRoId={roId}
                        customerId={customerId}
                        customerName={title}
                      />
                    ) : null}

                    {tab === "payment" ? (
                      paymentData ? (
                        <DrawerPaymentTab data={paymentData} />
                      ) : (
                        <DrawerCustomerPaymentHistoryTab customerId={customerId} />
                      )
                    ) : null}

                    {tab === "finances" && !corePlan ? (
                      <DrawerFinancesTab availableCreditCents={data.availableCreditCents} />
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <SheetPrimitive.Close className="absolute top-3.5 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-brand-navy/[0.06] hover:text-brand-navy">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
