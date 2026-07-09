"use client";

import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  exportCustomerData,
  scheduleCustomerDeletion,
} from "@/server/actions/customer-data";

type CustomerDataMenuProps = {
  customerId: string;
  customerName: string;
  canExport: boolean;
  canDelete: boolean;
  isDeleted: boolean;
};

export function CustomerDataMenu({
  customerId,
  customerName,
  canExport,
  canDelete,
  isDeleted,
}: CustomerDataMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canExport && !canDelete) return null;

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const res = await exportCustomerData(customerId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `customer-${customerId.slice(0, 8)}-export.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Remove ${customerName} from active customers? Their profile will be anonymized after the retention grace period. Open repair orders are not affected.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await scheduleCustomerDeletion(customerId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/customers");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canExport && !isDeleted ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={pending}
          onClick={handleExport}
        >
          <Download className="size-3.5" />
          Export data
        </Button>
      ) : null}
      {canDelete && !isDeleted ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={pending}
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
          Remove customer
        </Button>
      ) : null}
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
