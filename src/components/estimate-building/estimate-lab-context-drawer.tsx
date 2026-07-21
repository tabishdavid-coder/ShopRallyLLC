"use client";



import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { Dialog as SheetPrimitive } from "radix-ui";

import { ExternalLink, Loader2, MessageSquare, Pencil, X } from "lucide-react";



import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";

import {

  DRAWER_TABS,

  DrawerActionRail,

  DrawerCarePlanTab,
  DrawerCustomerPaymentHistoryTab,

  DrawerDeferredTab,

  DrawerFinancesTab,

  DrawerPaymentTab,

  DrawerProfileTab,

  DrawerRepairOrdersTab,

  DrawerVehiclesTab,

} from "@/components/estimate-building/estimate-lab-context-drawer-panels";

import { Sheet, SheetOverlay, SheetPortal } from "@/components/ui/sheet";

import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";

import { fetchEstimateContextDrawer } from "@/server/actions/estimate-context-drawer";

import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";

import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";

import type { PaymentFinanceData } from "@/components/repair-order/payment-finance-panel";

import { customerDisplayName, customerInitials, formatCents } from "@/lib/format";
import { useCorePlanShop, useShopCapabilities } from "@/lib/shop-capabilities";
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
      className="inline-flex items-center gap-1.5 rounded-full border border-[#DDE5EF] bg-white px-2.5 py-1 text-xs font-medium text-[#0B1F3B] transition-colors hover:bg-[#F7F9FC]"
      aria-pressed={active}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          active ? "bg-emerald-500" : "bg-[#8CA2C0]",
        )}
        aria-hidden
      />
      {active ? "Active" : "Inactive"}
    </button>
  );
}



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



/** AutoLeap-inspired customer drawer — ShopRally navy/light-blue chrome, industry tab names. */

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

  vehicleSpecs = null,

  paymentData = null,

  appointmentEmployees,

  defaultAppointmentDurationMins,

  autoOpenSpecs = false,

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

  vehicleSpecs?: EstimateLabVehicleSpecsBundle | null;

  paymentData?: PaymentFinanceData | null;

  appointmentEmployees: { id: string; name: string }[];

  defaultAppointmentDurationMins: number;

  /** When true and Vehicles tab is active, expand pull-spec for the RO vehicle. */
  autoOpenSpecs?: boolean;

  source?: CustomerDrawerSource;

}) {

  const router = useRouter();
  const corePlan = useCorePlanShop();
  const { maintenancePrograms } = useShopCapabilities();
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



  const title = customerDisplayName(activeCustomerRecord);



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

  const subtitle = hasRoContext && roNumber != null

    ? `RO #${roNumber}`

    : "Customer profile";



  return (

    <Sheet open={open} onOpenChange={onOpenChange}>

      <SheetPortal>

        <SheetOverlay className="bg-black/45 backdrop-blur-[1px] duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />

        <SheetPrimitive.Content

          aria-describedby={undefined}

          data-side="right"

          className={cn(

            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 overflow-hidden bg-background p-0 shadow-2xl outline-none",

            "border-l-[1.5px] border-[#DDE5EF] sm:max-w-[min(58rem,calc(100vw-0.5rem))]",

            "duration-300 ease-out data-open:animate-in data-closed:animate-out",

            "data-open:slide-in-from-right data-closed:slide-out-to-right data-open:fade-in-0 data-closed:fade-out-0",

          )}

        >

          {/* Header — avatar, name, credit, active badge, messages */}
          <header className="shrink-0 border-b border-[#DDE5EF] bg-white px-4 py-3 pr-12">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1E7FE0] text-sm font-semibold text-white">
                  {customerInitials(activeCustomerRecord)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-base font-semibold text-[#0B1F3B]">{title}</h2>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => onTabChange("profile")}
                        className="inline-flex shrink-0 rounded p-0.5 text-[#8CA2C0] hover:bg-[#F0F3F8] hover:text-[#0B1F3B]"
                        aria-label="Edit customer profile"
                        title="Edit profile"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    ) : null}
                    {hasRoContext && !isCustomersSource ? (
                      <Link
                        href={`/customers?customer=${customerId}`}
                        className="inline-flex shrink-0 text-[#8CA2C0] hover:text-[#0B1F3B]"
                        aria-label="Open customer in CRM"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[#5B7295]">{subtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {!corePlan ? (
                  <p className="text-sm text-[#0B1F3B]">
                    Available credit:{" "}
                    <span className="font-semibold tabular-nums">{formatCents(creditCents)}</span>
                  </p>
                ) : null}
                <ActiveStatusBadge active={activeCustomer} onChange={setActiveCustomer} />
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#5B7295] transition-colors hover:text-[#0B1F3B] disabled:opacity-60"
                  disabled
                  title="Messaging coming soon"
                >
                  <MessageSquare className="size-4 text-[#8CA2C0]" />
                  Messages
                </button>
              </div>
            </div>
          </header>



          {/* Tab bar — orange active underline */}
          <div className="flex shrink-0 items-end border-b border-[#DDE5EF] bg-white px-2">
            <div
              role="tablist"
              aria-label="Customer record"
              className="flex min-w-0 flex-1 items-end overflow-x-auto scrollbar-none"
            >
              {drawerTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => onTabChange(t.id)}
                  className={cn(
                    "relative shrink-0 px-4 py-3 text-sm transition-colors duration-150",
                    tab === t.id
                      ? "font-semibold text-[#0B1F3B] after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#E86A10]"
                      : "font-medium text-[#5B7295] hover:text-[#0B1F3B]",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.label}
                    {t.id === "deferred" && deferredCount > 0 ? (
                      <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[#E86A10] px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white">
                        {deferredCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>



          {/* Body: main + action rail */}

          <div className="flex min-h-0 flex-1">

            <div className="min-w-0 flex-1 overflow-y-auto bg-[#F7F9FC] px-4 py-4 sm:px-5">

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

                      customerId={customerId}

                      customerName={title}

                      currentRoVehicleId={vehicle?.id ?? null}

                      roId={roId}

                      roMileageIn={_mileageIn}

                      roOdometerNotWorking={_odometerNotWorking}

                      vehicleSpecs={vehicleSpecs}

                      canEdit={canEdit}

                      autoOpenSpecs={autoOpenSpecs}

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



            <DrawerActionRail

              customerId={customerId}

              customerName={title}

              vehicleId={vehicle?.id ?? null}

              roId={roId}

              roNumber={roNumber}

              appointments={data?.appointments ?? []}

              employees={appointmentEmployees}

              defaultDurationMins={defaultAppointmentDurationMins}

              onAppointmentCreated={() => reload(true)}

            />

          </div>



          <SheetPrimitive.Close className="absolute top-3.5 right-3 rounded-md p-1.5 text-[#5B7295] hover:bg-[#F0F3F8] hover:text-[#0B1F3B]">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>

      </SheetPortal>

    </Sheet>

  );

}

