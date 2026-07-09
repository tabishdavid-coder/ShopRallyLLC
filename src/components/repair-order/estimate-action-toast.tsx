"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastKind = "success" | "error";

type ToastState = { kind: ToastKind; message: string } | null;

type Ctx = {
  toast: (kind: ToastKind, message: string) => void;
};

const EstimateActionToastContext = createContext<Ctx | null>(null);

const AUTO_DISMISS_MS = 3500;

export function EstimateActionToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>(null);

  const toast = useCallback((kind: ToastKind, message: string) => {
    setState({ kind, message });
  }, []);

  useEffect(() => {
    if (!state) return;
    const id = setTimeout(() => setState(null), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <EstimateActionToastContext.Provider value={{ toast }}>
      {children}
      {state ? (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            state.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {state.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0" />
          )}
          <p className="min-w-0 flex-1 text-sm font-medium">{state.message}</p>
          <button
            type="button"
            onClick={() => setState(null)}
            className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </EstimateActionToastContext.Provider>
  );
}

export function useEstimateActionToast() {
  const ctx = useContext(EstimateActionToastContext);
  if (!ctx) {
    return {
      toast: (_kind: ToastKind, _message: string) => {},
    };
  }
  return ctx;
}
