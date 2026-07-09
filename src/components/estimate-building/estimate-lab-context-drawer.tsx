"use client";



import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { Dialog as SheetPrimitive } from "radix-ui";

import { ExternalLink, Loader2, MessageSquare, UserRound, X } from "lucide-react";



import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import { DrawerCustomerInsightsStrip } from "@/components/customers/drawer-customer-insights";

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

import { customerDisplayName, formatCents } from "@/lib/format";

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



function HeaderToggle({

  label,

  checked,

  onChange,

  disabled,

}: {

  label: string;

  checked: boolean;

  onChange: (next: boolean) => void;

  disabled?: boolean;

}) {

  return (

    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">

      <button

        type="button"

        role="switch"

        aria-checked={checked}

        disabled={disabled}

        onClick={() => onChange(!checked)}

        className={cn(

          "relative h-5 w-9 shrink-0 rounded-full shadow-inner transition-colors",

          checked ? "bg-brand-navy shadow-sm" : "bg-muted-foreground/30",

          disabled && "opacity-50",

        )}

      >

        <span

          className={cn(

            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",

            checked ? "left-[18px]" : "left-0.5",

          )}

        />

      </button>

      {label}

    </label>

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

            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 overflow-hidden bg-[#f8fafc] p-0 shadow-2xl outline-none",

            "border-l border-brand-navy/10 sm:max-w-[min(58rem,calc(100vw-0.5rem))]",

            "duration-300 ease-out data-open:animate-in data-closed:animate-out",

            "data-open:slide-in-from-right data-closed:slide-out-to-right data-open:fade-in-0 data-closed:fade-out-0",

          )}

        >

          {/* Header — white bar like reference, ShopRally accents */}

          <header className="shrink-0 border-b border-border/80 bg-white px-4 py-3">

            <div className="flex flex-wrap items-start justify-between gap-3 pr-10">

              <div className="flex min-w-0 items-start gap-2">

                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy/8 text-brand-navy">

                  <UserRound className="size-4" />

                </span>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="truncate text-base font-semibold text-brand-navy">{title}</h2>

                    {hasRoContext && !isCustomersSource ? (

                      <Link

                        href={`/customers?customer=${customerId}`}

                        className="inline-flex shrink-0 text-brand-navy/50 hover:text-brand-navy"

                        aria-label="Open customer in CRM"

                      >

                        <ExternalLink className="size-3.5" />

                      </Link>

                    ) : null}

                    <span className="text-sm text-brand-navy/70">

                      (Available credit:{" "}

                      <span className="font-semibold tabular-nums text-brand-navy">{formatCents(creditCents)}</span>)

                    </span>

                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

                </div>

              </div>



              <div className="flex flex-wrap items-center gap-4">

                <HeaderToggle label="Active" checked={activeCustomer} onChange={setActiveCustomer} />

              </div>

            </div>

          </header>



          {/* Tab bar — elevated strip with active tab depth */}

          <div className="flex shrink-0 items-end gap-1 border-b border-brand-navy/12 bg-gradient-to-b from-slate-50 to-white px-2 pt-1.5 shadow-[inset_0_-1px_0_rgba(30,58,86,0.06),0_1px_3px_rgba(30,58,86,0.06)]">

            <div

              role="tablist"

              aria-label="Customer record"

              className="flex min-w-0 flex-1 items-end overflow-x-auto scrollbar-none"

            >

              {DRAWER_TABS.map((t) => (

                <button

                  key={t.id}

                  type="button"

                  role="tab"

                  aria-selected={tab === t.id}

                  onClick={() => onTabChange(t.id)}

                  className={cn(

                    "relative shrink-0 rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150",

                    tab === t.id

                      ? "z-[1] bg-white font-semibold text-brand-navy shadow-[0_-1px_4px_rgba(30,58,86,0.08),0_1px_0_0_white] after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand-orange"

                      : "text-muted-foreground hover:bg-brand-light/20 hover:text-brand-navy",

                  )}

                >

                  {t.label}

                </button>

              ))}

            </div>

            <button

              type="button"

              className="mb-0.5 mr-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-brand-navy/70 transition-colors hover:border-brand-navy/10 hover:bg-brand-light/20 hover:text-brand-navy disabled:opacity-60"

              disabled

              title="Messaging coming soon"

            >

              <MessageSquare className="size-4 text-brand-navy/50" />

              Messages

            </button>

          </div>



          <DrawerCustomerInsightsStrip customerId={customerId} drawerOpen={open} />



          {/* Body: main + action rail */}

          <div className="flex min-h-0 flex-1">

            <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">

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

                  {tab === "deferred" ? <DrawerDeferredTab /> : null}

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

                  {tab === "finances" ? (

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



          <SheetPrimitive.Close className="absolute top-3.5 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground">

            <X className="size-4" />

            <span className="sr-only">Close</span>

          </SheetPrimitive.Close>

        </SheetPrimitive.Content>

      </SheetPortal>

    </Sheet>

  );

}

