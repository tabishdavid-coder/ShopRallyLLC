"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { laborLineTotal, partLineTotal } from "@/lib/line-calc";
import { computeRoTotals, type RoTotalsResult } from "@/lib/ro-totals";
import {
  toggleJobAuthorized,
  toggleLaborAuthorized,
  togglePartAuthorized,
} from "@/server/actions/estimate";
import type { RepairOrderDetail } from "@/server/repair-order";

type Job = RepairOrderDetail["jobs"][number];
type Fee = RepairOrderDetail["fees"][number];
type Discount = RepairOrderDetail["discounts"][number];

type SelectionState = Record<string, { labor: Record<string, boolean>; parts: Record<string, boolean> }>;

/** Unsaved job edits — merged into live RO totals while a card is in edit mode. */
export type JobEditDraft = {
  laborLines: {
    id?: string;
    hours: number;
    costCents?: number;
    rateCents: number;
    totalCents?: number;
    lastField?: "hours" | "rate" | "total";
    authorized?: boolean;
  }[];
  partLines: {
    id?: string;
    quantity: number;
    retailCents: number;
    costCents: number;
    totalCents?: number;
    lastField?: "qty" | "cost" | "retail" | "total";
    authorized?: boolean;
  }[];
};

type Ctx = {
  mergedJobs: Job[];
  totals: RoTotalsResult;
  toggleJob: (jobId: string, authorized: boolean) => void;
  toggleLabor: (jobId: string, lineId: string, authorized: boolean) => void;
  togglePart: (jobId: string, lineId: string, authorized: boolean) => void;
  setJobDraft: (jobId: string, draft: JobEditDraft | null) => void;
  pending: boolean;
};

const EstimateSelectionContext = createContext<Ctx | null>(null);

function buildSelection(jobs: Job[]): SelectionState {
  const s: SelectionState = {};
  for (const j of jobs) {
    s[j.id] = {
      labor: Object.fromEntries(j.laborLines.map((l) => [l.id, l.authorized])),
      parts: Object.fromEntries(j.partLines.map((p) => [p.id, p.authorized])),
    };
  }
  return s;
}

function jobsWithSelection(jobs: Job[], selection: SelectionState): Job[] {
  return jobs.map((j) => ({
    ...j,
    laborLines: j.laborLines.map((l) => ({
      ...l,
      authorized: selection[j.id]?.labor[l.id] ?? l.authorized,
    })),
    partLines: j.partLines.map((p) => ({
      ...p,
      authorized: selection[j.id]?.parts[p.id] ?? p.authorized,
    })),
  }));
}

export function EstimateSelectionProvider({
  jobs,
  fees,
  discounts,
  shopSuppliesCents,
  taxRateBps,
  taxOnLabor,
  taxOnParts,
  taxOnFees,
  taxCapCents,
  children,
}: {
  jobs: Job[];
  fees: Fee[];
  discounts: Discount[];
  shopSuppliesCents: number;
  taxRateBps: number;
  taxOnLabor: boolean;
  taxOnParts: boolean;
  taxOnFees: boolean;
  taxCapCents?: number | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selection, setSelection] = useState(() => buildSelection(jobs));
  const [drafts, setDrafts] = useState<Record<string, JobEditDraft>>({});

  useEffect(() => {
    setSelection(buildSelection(jobs));
  }, [jobs]);

  const mergedJobs = useMemo(() => jobsWithSelection(jobs, selection), [jobs, selection]);

  const partsCostCents = useMemo(
    () =>
      mergedJobs.reduce((s, j) => {
        const draft = drafts[j.id];
        if (draft) {
          return (
            s +
            draft.partLines
              .filter((p) => p.authorized !== false)
              .reduce((x, p) => x + p.costCents * p.quantity, 0)
          );
        }
        return (
          s +
          j.partLines.filter((p) => p.authorized).reduce((x, p) => x + p.costCents * p.quantity, 0)
        );
      }, 0),
    [mergedJobs, drafts],
  );

  const laborCostCents = useMemo(
    () =>
      mergedJobs.reduce((s, j) => {
        const draft = drafts[j.id];
        if (draft) {
          return (
            s +
            draft.laborLines
              .filter((l) => l.authorized !== false)
              .reduce((x, l) => x + (l.costCents ?? 0), 0)
          );
        }
        return (
          s +
          j.laborLines
            .filter((l) => l.authorized)
            .reduce(
              (x, l) =>
                x + ("costCents" in l && typeof l.costCents === "number" ? l.costCents : 0),
              0,
            )
        );
      }, 0),
    [mergedJobs, drafts],
  );

  const totals = useMemo(
    () =>
      computeRoTotals(
        {
          shopSuppliesCents,
          taxRateBps,
          taxOnLabor,
          taxOnParts,
          taxOnFees,
          taxCapCents,
          jobs: mergedJobs.map((j) => {
            const draft = drafts[j.id];
            if (draft) {
              return {
                id: j.id,
                laborTaxable: j.laborTaxable,
                partsTaxable: j.partsTaxable,
                laborLines: draft.laborLines.map((l) => ({
                  totalCents: laborLineTotal(l),
                  authorized: l.id ? (selection[j.id]?.labor[l.id] ?? l.authorized !== false) : l.authorized !== false,
                })),
                partLines: draft.partLines.map((p) => ({
                  totalCents: partLineTotal(p),
                  authorized: p.id ? (selection[j.id]?.parts[p.id] ?? p.authorized !== false) : p.authorized !== false,
                })),
              };
            }
            return {
              id: j.id,
              laborTaxable: j.laborTaxable,
              partsTaxable: j.partsTaxable,
              laborLines: j.laborLines.map((l) => ({ totalCents: l.totalCents, authorized: l.authorized })),
              partLines: j.partLines.map((p) => ({ totalCents: p.totalCents, authorized: p.authorized })),
            };
          }),
          fees: fees.map((f) => ({
            jobId: f.jobId,
            method: f.method,
            base: f.base,
            amount: f.amount,
            capCents: f.capCents,
            taxable: f.taxable,
          })),
          discounts: discounts.map((d) => ({
            jobId: d.jobId,
            method: d.method,
            base: d.base,
            amount: d.amount,
          })),
        },
        partsCostCents,
        laborCostCents,
      ),
    [
      mergedJobs,
      fees,
      discounts,
      shopSuppliesCents,
      taxRateBps,
      taxOnLabor,
      taxOnParts,
      taxOnFees,
      taxCapCents,
      partsCostCents,
      laborCostCents,
      drafts,
      selection,
    ],
  );

  const persist = useCallback(
    (fn: () => Promise<{ ok: boolean }>) => {
      start(async () => {
        await fn();
        router.refresh();
      });
    },
    [router],
  );

  const toggleJob = useCallback(
    (jobId: string, authorized: boolean) => {
      setSelection((prev) => {
        const job = jobs.find((j) => j.id === jobId);
        if (!job) return prev;
        return {
          ...prev,
          [jobId]: {
            labor: Object.fromEntries(job.laborLines.map((l) => [l.id, authorized])),
            parts: Object.fromEntries(job.partLines.map((p) => [p.id, authorized])),
          },
        };
      });
      persist(() => toggleJobAuthorized(jobId, authorized));
    },
    [jobs, persist],
  );

  const toggleLabor = useCallback(
    (jobId: string, lineId: string, authorized: boolean) => {
      setSelection((prev) => ({
        ...prev,
        [jobId]: { ...prev[jobId], labor: { ...prev[jobId]?.labor, [lineId]: authorized } },
      }));
      persist(() => toggleLaborAuthorized(lineId, authorized));
    },
    [persist],
  );

  const togglePart = useCallback(
    (jobId: string, lineId: string, authorized: boolean) => {
      setSelection((prev) => ({
        ...prev,
        [jobId]: { ...prev[jobId], parts: { ...prev[jobId]?.parts, [lineId]: authorized } },
      }));
      persist(() => togglePartAuthorized(lineId, authorized));
    },
    [persist],
  );

  const setJobDraft = useCallback((jobId: string, draft: JobEditDraft | null) => {
    setDrafts((prev) => {
      if (!draft) {
        if (!(jobId in prev)) return prev;
        const { [jobId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [jobId]: draft };
    });
  }, []);

  const value = useMemo(
    () => ({ mergedJobs, totals, toggleJob, toggleLabor, togglePart, setJobDraft, pending }),
    [mergedJobs, totals, toggleJob, toggleLabor, togglePart, setJobDraft, pending],
  );

  return <EstimateSelectionContext.Provider value={value}>{children}</EstimateSelectionContext.Provider>;
}

export function useEstimateSelection() {
  const ctx = useContext(EstimateSelectionContext);
  if (!ctx) throw new Error("useEstimateSelection must be used within EstimateSelectionProvider");
  return ctx;
}
