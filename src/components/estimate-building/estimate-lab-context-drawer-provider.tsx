"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  EstimateLabContextDrawer,
  type ContextDrawerTab,
} from "@/components/estimate-building/estimate-lab-context-drawer";
import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import type { PaymentFinanceData } from "@/components/repair-order/payment-finance-panel";

type DrawerProviderProps = {
  customer: EditableCustomerRecord;
  customerId: string;
  vehicle: EditableVehicle | null;
  roId: string;
  roNumber: number;
  mileageIn: number | null;
  odometerNotWorking: boolean;
  canEdit: boolean;
  drawerData: EstimateContextDrawerData | null;
  vehicleSpecs: EstimateLabVehicleSpecsBundle | null;
  paymentData: PaymentFinanceData | null;
  appointmentEmployees: { id: string; name: string }[];
  defaultAppointmentDurationMins: number;
  children: ReactNode;
};

type DrawerContextValue = {
  openDrawer: (tab: ContextDrawerTab) => void;
  openCustomerHistory: () => void;
  openMessages: () => void;
  openVehicleSpecs: () => void;
  registerOpenVehicleSpecs: (fn: (() => void) | null) => void;
  registerOpenMessages: (fn: (() => void) | null) => void;
};

const EstimateLabContextDrawerContext = createContext<DrawerContextValue | null>(null);

export function useEstimateLabContextDrawer() {
  const ctx = useContext(EstimateLabContextDrawerContext);
  if (!ctx) {
    throw new Error("useEstimateLabContextDrawer must be used within EstimateLabContextDrawerProvider");
  }
  return ctx;
}

export function useEstimateLabContextDrawerOptional() {
  return useContext(EstimateLabContextDrawerContext);
}

export function EstimateLabContextDrawerProvider({
  customer,
  customerId,
  vehicle,
  roId,
  roNumber,
  mileageIn,
  odometerNotWorking,
  canEdit,
  drawerData,
  vehicleSpecs,
  paymentData,
  appointmentEmployees,
  defaultAppointmentDurationMins,
  children,
}: DrawerProviderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<ContextDrawerTab>("profile");
  const [autoOpenSpecs, setAutoOpenSpecs] = useState(false);
  const vehicleSpecsOpRef = useMemo(() => ({ current: null as (() => void) | null }), []);
  const messagesOpRef = useMemo(() => ({ current: null as (() => void) | null }), []);

  const openDrawer = useCallback((tab: ContextDrawerTab, opts?: { autoOpenSpecs?: boolean }) => {
    setDrawerTab(tab);
    setAutoOpenSpecs(Boolean(opts?.autoOpenSpecs));
    setDrawerOpen(true);
  }, []);

  const value = useMemo<DrawerContextValue>(
    () => ({
      openDrawer: (tab) => openDrawer(tab),
      openCustomerHistory: () => openDrawer("orders"),
      openMessages: () => messagesOpRef.current?.(),
      openVehicleSpecs: () => {
        if (vehicleSpecsOpRef.current) vehicleSpecsOpRef.current();
        else openDrawer("vehicles", { autoOpenSpecs: true });
      },
      registerOpenVehicleSpecs: (fn) => {
        vehicleSpecsOpRef.current = fn;
      },
      registerOpenMessages: (fn) => {
        messagesOpRef.current = fn;
      },
    }),
    [messagesOpRef, openDrawer, vehicleSpecsOpRef],
  );

  return (
    <EstimateLabContextDrawerContext.Provider value={value}>
      {children}
      <EstimateLabContextDrawer
        open={drawerOpen}
        onOpenChange={(next) => {
          setDrawerOpen(next);
          if (!next) setAutoOpenSpecs(false);
        }}
        tab={drawerTab}
        onTabChange={(tab) => {
          setDrawerTab(tab);
          if (tab !== "vehicles") setAutoOpenSpecs(false);
        }}
        customer={customer}
        customerId={customerId}
        vehicle={vehicle}
        roId={roId}
        roNumber={roNumber}
        mileageIn={mileageIn}
        odometerNotWorking={odometerNotWorking}
        canEdit={canEdit}
        initialData={drawerData}
        vehicleSpecs={vehicleSpecs}
        paymentData={paymentData}
        appointmentEmployees={appointmentEmployees}
        defaultAppointmentDurationMins={defaultAppointmentDurationMins}
        autoOpenSpecs={autoOpenSpecs}
      />
    </EstimateLabContextDrawerContext.Provider>
  );
}
