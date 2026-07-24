"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CustomerContextDrawer,
  type ContextDrawerTab,
} from "@/components/customers/customer-context-drawer";
import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";

export type JobBoardHistoryTarget = {
  customerId: string;
  customerName: string;
  /** Optional — profile-only opens (e.g. Messages) may omit RO context. */
  roId?: string;
  roNumber?: number;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string | null;
  marketingOptIn?: boolean;
  vehicleId?: string | null;
  vehicle?: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    plate: string | null;
    plateState: string | null;
  } | null;
};

export type JobBoardVehicleTarget = JobBoardHistoryTarget & {
  vehicleId: string;
  vehicleLabel: string;
};

/** @deprecated Use JobBoardVehicleTarget */
export type JobBoardSpecsTarget = JobBoardVehicleTarget;

type JobBoardContextValue = {
  openCustomerHistory: (
    target: JobBoardHistoryTarget,
    options?: { tab?: ContextDrawerTab },
  ) => void;
  /** Opens Vehicles tab for identity edit (not Specs enrichment). */
  openVehicleDetails: (target: JobBoardVehicleTarget) => void;
};

const JobBoardContext = createContext<JobBoardContextValue | null>(null);

export function useJobBoardContextOptional() {
  return useContext(JobBoardContext);
}

/** @deprecated Use useJobBoardContextOptional */
export function useJobBoardHistoryOptional() {
  return useContext(JobBoardContext);
}

function seedCustomer(target: JobBoardHistoryTarget): EditableCustomerRecord {
  const nameParts = target.customerName.trim().split(/\s+/);
  const firstName = target.customerFirstName ?? nameParts[0] ?? "";
  const lastName =
    target.customerLastName ??
    (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
  return {
    id: target.customerId,
    firstName,
    lastName,
    company: null,
    phone: target.customerPhone ?? null,
    email: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    marketingOptIn: target.marketingOptIn ?? false,
    notes: null,
    tags: [],
  };
}

function seedVehicle(target: JobBoardHistoryTarget): EditableVehicle | null {
  const v = target.vehicle;
  if (!v) return null;
  return {
    id: v.id,
    year: v.year,
    make: v.make,
    model: v.model,
    plate: v.plate,
    plateState: v.plateState,
  };
}

export function JobBoardHistoryProvider({
  children,
  appointmentEmployees = [],
  defaultAppointmentDurationMins = 60,
}: {
  children: ReactNode;
  appointmentEmployees?: { id: string; name: string }[];
  defaultAppointmentDurationMins?: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<ContextDrawerTab>("profile");
  const [target, setTarget] = useState<JobBoardHistoryTarget | null>(null);

  /** Opens the shared customer lifecycle drawer without leaving the host page. */
  const openCustomerHistory = useCallback(
    (next: JobBoardHistoryTarget, options?: { tab?: ContextDrawerTab }) => {
      setTarget(next);
      setDrawerTab(options?.tab ?? "orders");
      setDrawerOpen(true);
    },
    [],
  );

  /** Opens Vehicles tab for identity edit — stays on job board. */
  const openVehicleDetails = useCallback((next: JobBoardVehicleTarget) => {
    setTarget({
      ...next,
      vehicleId: next.vehicleId,
      vehicle: next.vehicle ?? (next.vehicleId
        ? {
            id: next.vehicleId,
            year: null,
            make: null,
            model: null,
            plate: null,
            plateState: null,
          }
        : null),
    });
    setDrawerTab("vehicles");
    setDrawerOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openCustomerHistory, openVehicleDetails }),
    [openCustomerHistory, openVehicleDetails],
  );

  const customer = target ? seedCustomer(target) : null;
  const vehicle = target ? seedVehicle(target) : null;

  return (
    <JobBoardContext.Provider value={value}>
      {children}
      {target && customer ? (
        <CustomerContextDrawer
          open={drawerOpen}
          onOpenChange={(next) => {
            setDrawerOpen(next);
            if (!next) setTarget(null);
          }}
          tab={drawerTab}
          onTabChange={setDrawerTab}
          customer={customer}
          customerId={target.customerId}
          vehicle={vehicle}
          roId={target.roId}
          roNumber={target.roNumber}
          canEdit
          initialData={null}
          appointmentEmployees={appointmentEmployees}
          defaultAppointmentDurationMins={defaultAppointmentDurationMins}
          source={target.roId ? "estimate" : "customers"}
        />
      ) : null}
    </JobBoardContext.Provider>
  );
}
