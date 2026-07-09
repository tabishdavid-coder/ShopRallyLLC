"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type EstimateLabPaymentPreview = "UNPAID" | "PARTIAL" | "PAID";

type Ctx = {
  paymentPreview: EstimateLabPaymentPreview | null;
  setPaymentPreview: (status: EstimateLabPaymentPreview | null) => void;
};

const EstimateLabDisplayContext = createContext<Ctx | null>(null);

export function EstimateLabDisplayProvider({ children }: { children: ReactNode }) {
  const [paymentPreview, setPaymentPreviewState] = useState<EstimateLabPaymentPreview | null>(
    null,
  );

  const setPaymentPreview = useCallback((status: EstimateLabPaymentPreview | null) => {
    setPaymentPreviewState(status);
  }, []);

  const value = useMemo(
    () => ({ paymentPreview, setPaymentPreview }),
    [paymentPreview, setPaymentPreview],
  );

  return (
    <EstimateLabDisplayContext.Provider value={value}>{children}</EstimateLabDisplayContext.Provider>
  );
}

export function useEstimateLabDisplay() {
  const ctx = useContext(EstimateLabDisplayContext);
  if (!ctx) {
    throw new Error("useEstimateLabDisplay must be used within EstimateLabDisplayProvider");
  }
  return ctx;
}

/** Design-mode preview — does not write to invoice / payments. */
export function previewPaidCents(
  preview: EstimateLabPaymentPreview,
  totalCents: number,
): number {
  if (totalCents <= 0) return 0;
  if (preview === "UNPAID") return 0;
  if (preview === "PARTIAL") return Math.round(totalCents * 0.5);
  return totalCents;
}

export function effectiveLabPaidCents(
  preview: EstimateLabPaymentPreview | null,
  actualPaidCents: number,
  totalCents: number,
): number {
  if (!preview) return actualPaidCents;
  return previewPaidCents(preview, totalCents);
}
