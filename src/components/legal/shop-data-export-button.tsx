"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportShopDataSummary } from "@/server/actions/legal";

export function ShopDataExportButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function download() {
    setError(null);
    start(async () => {
      const res = await exportShopDataSummary();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold text-brand-navy">Export shop data</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Download a JSON summary of your shop profile and record counts. Full CSV export coming
        in a future release.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 gap-1.5"
        onClick={download}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Export summary (JSON)
      </Button>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Need a full data export?{" "}
        <Link href="/support" className="font-medium text-brand-navy hover:underline">
          Contact support
        </Link>
        .
      </p>
    </div>
  );
}
