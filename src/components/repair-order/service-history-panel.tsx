"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Loader2, RefreshCw, Gauge, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVehicleServiceHistory, type ServiceHistoryResult } from "@/server/actions/service-history";

export function ServiceHistoryPanel({ vehicleId, hasVin }: { vehicleId: string; hasVin: boolean }) {
  const [res, setRes] = useState<ServiceHistoryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getVehicleServiceHistory(vehicleId).then((r) => {
      setRes(r);
      setLoading(false);
    });
  }, [vehicleId]);

  useEffect(() => {
    if (hasVin) load();
  }, [hasVin, load]);

  const records = res?.ok ? res.history?.records ?? [] : [];
  const mode = res?.ok ? res.mode : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" /> Service History
          {mode ? (
            <Badge variant={mode === "live" ? "default" : "secondary"} className="text-[10px]">
              {mode === "live" ? "Carfax" : "Carfax (mock)"}
            </Badge>
          ) : null}
        </CardTitle>
        {hasVin ? (
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh service history"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="text-sm">
        {!hasVin ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-4" /> Add a VIN to this vehicle to pull its Carfax service history.
          </p>
        ) : loading && !res ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading service history…
          </p>
        ) : res && !res.ok ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-4" /> {res.error}
          </p>
        ) : records.length === 0 ? (
          <p className="text-muted-foreground">No prior service history found for this vehicle.</p>
        ) : (
          <ul className="space-y-3">
            {records.map((r, i) => (
              <li key={i} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.date ?? "—"}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {r.odometer != null ? (
                      <span className="flex items-center gap-1">
                        <Gauge className="size-3.5" /> {r.odometer.toLocaleString()} mi
                      </span>
                    ) : null}
                    {r.source ? <span>{r.source}</span> : null}
                  </span>
                </div>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {r.services.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
