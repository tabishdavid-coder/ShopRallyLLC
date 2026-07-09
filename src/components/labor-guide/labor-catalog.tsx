"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Trash2, Sparkles, Loader2, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  refreshStaleLaborCatalog,
  regenerateLaborRow,
  deleteLaborRow,
} from "@/server/actions/labor-catalog";
import type { LaborCatalog, LaborCatalogRow } from "@/server/labor-catalog";

function vehicleLabel(r: LaborCatalogRow): string {
  return [r.vehicleYear, r.vehicleMake, r.vehicleModel].filter(Boolean).join(" ") || "—";
}

function laborLabel(r: LaborCatalogRow): string {
  const per = `${r.laborHoursPerUnit.toFixed(2)}h`;
  if (r.unitLabel.toLowerCase() === "vehicle") return per;
  return `${per} × ${r.unitsOnVehicle} ${r.unitLabel}${r.unitsOnVehicle === 1 ? "" : "s"}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export function LaborCatalog({ catalog }: { catalog: LaborCatalog }) {
  const router = useRouter();
  const { rows, stats, capped, cap } = catalog;
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (source && r.source !== source) return false;
      if (!needle) return true;
      return (
        vehicleLabel(r).toLowerCase().includes(needle) ||
        r.jobName.toLowerCase().includes(needle) ||
        r.queryText.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, source]);

  function refreshStale() {
    setError(null);
    start(async () => {
      const res = await refreshStaleLaborCatalog();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function regenerate(id: string) {
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await regenerateLaborRow(id);
      setBusyId(null);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function remove(id: string, label: string) {
    if (!confirm(`Delete the labor entry "${label}"? It will be re-generated next time it's searched.`)) return;
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await deleteLaborRow(id);
      setBusyId(null);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Database className="size-6 text-primary" /> Labor Book
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The shared flat-rate labor-time catalog that powers the estimate&apos;s Smart Labor Book.
            Every search a writer runs is cached here, so the next lookup is instant and free. Pre-build
            it with <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:build-labor</code>.
          </p>
        </div>
        <Button
          onClick={refreshStale}
          disabled={pending || stats.staleCount === 0}
          variant="outline"
          className="gap-1.5"
          title={
            stats.staleCount === 0
              ? "No entries older than the cache TTL"
              : `Re-generate ${stats.staleCount} stale ${stats.staleCount === 1 ? "entry" : "entries"}`
          }
        >
          {pending && !busyId ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh stale{stats.staleCount ? ` (${stats.staleCount})` : ""}
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entries" value={stats.total} />
        <Stat label="Vehicles" value={stats.distinctVehicles} />
        <Stat label="Total lookups" value={stats.totalHits} />
        <Stat label={`Stale (>${stats.ttlDays}d)`} value={stats.staleCount} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vehicle, job, or repair…"
            className="pl-8"
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          {stats.bySource.map((s) => (
            <option key={s.source} value={s.source}>
              {s.source} ({s.count})
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} shown
          {capped ? ` · top ${cap} of ${stats.total}` : ""}
        </span>
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Vehicle</th>
              <th className="px-4 py-2.5">Repair / job</th>
              <th className="px-4 py-2.5">Labor</th>
              <th className="px-4 py-2.5">Source</th>
              <th className="px-4 py-2.5 text-right">Hits</th>
              <th className="px-4 py-2.5">Updated</th>
              <th className="w-20 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {stats.total === 0
                    ? "The catalog is empty. Run npm run db:build-labor, or search a repair on an estimate to populate it."
                    : "No entries match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 align-top hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{vehicleLabel(r)}</div>
                    {r.vehicleEngine ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.vehicleEngine}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.jobName}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground" title={r.queryText}>
                      &ldquo;{r.queryText}&rdquo;
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{laborLabel(r)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal">
                      {r.source}
                    </Badge>
                    {r.model ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{r.model}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.hitCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="whitespace-nowrap">
                      {r.refreshedAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {r.stale ? (
                      <Badge variant="secondary" className="ml-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">
                        Stale
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => regenerate(r.id)}
                        disabled={pending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                        title="Regenerate from AI"
                      >
                        {busyId === r.id && pending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id, `${vehicleLabel(r)} — ${r.jobName}`)}
                        disabled={pending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
