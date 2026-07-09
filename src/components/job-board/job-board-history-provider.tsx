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
  roId: string;
  roNumber: number;
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

export type JobBoardSpecsTarget = JobBoardHistoryTarget & {
  vehicleId: string;
  vehicleLabel: string;
};

type JobBoardContextValue = {
  openCustomerHistory: (target: JobBoardHistoryTarget) => void;
  openVehicleSpecs: (target: JobBoardSpecsTarget) => void;
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
  const [autoOpenSpecs, setAutoOpenSpecs] = useState(false);
  const [target, setTarget] = useState<JobBoardHistoryTarget | null>(null);

  /** Opens the shared RO/customer right menu on Repair orders (current RO highlighted). */
  const openCustomerHistory = useCallback((next: JobBoardHistoryTarget) => {
    setTarget(next);
    setDrawerTab("orders");
    setAutoOpenSpecs(false);
    setDrawerOpen(true);
  }, []);

  /** Opens the same right menu on Vehicles with specs expanded — stays on job board. */
  const openVehicleSpecs = useCallback((next: JobBoardSpecsTarget) => {
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
    setAutoOpenSpecs(true);
    setDrawerOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openCustomerHistory, openVehicleSpecs }),
    [openCustomerHistory, openVehicleSpecs],
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
            if (!next) {
              setTarget(null);
              setAutoOpenSpecs(false);
            }
          }}
          tab={drawerTab}
          onTabChange={(tab) => {
            setDrawerTab(tab);
            if (tab !== "vehicles") setAutoOpenSpecs(false);
          }}
          customer={customer}
          customerId={target.customerId}
          vehicle={vehicle}
          roId={target.roId}
          roNumber={target.roNumber}
          canEdit
          initialData={null}
          appointmentEmployees={appointmentEmployees}
          defaultAppointmentDurationMins={defaultAppointmentDurationMins}
          autoOpenSpecs={autoOpenSpecs}
          source="estimate"
        />
      ) : null}
    </JobBoardContext.Provider>
  );
}
