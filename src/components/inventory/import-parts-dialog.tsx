"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importInventoryPartsCsv } from "@/server/actions/inventory";

export function ImportPartsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<{ row: number; message: string }[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setError(null);
    setRowErrors([]);
    setSuccess(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File) {
    setError(null);
    setRowErrors([]);
    setSuccess(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const result = await importInventoryPartsCsv(text);
        if (!result.ok) {
          setError(result.error);
          setRowErrors(result.rowErrors ?? []);
          return;
        }
        const partial =
          "rowErrors" in result && result.rowErrors?.length
            ? ` (${result.rowErrors.length} row warning(s))`
            : "";
        setSuccess(`Imported ${result.created} part(s). Skipped ${result.skipped}.${partial}`);
        if ("rowErrors" in result && result.rowErrors) {
          setRowErrors(result.rowErrors);
        }
        router.refresh();
      });
    };
    reader.readAsText(file);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import parts from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Download the template, fill in your part rows, then upload. Part numbers must be unique
            per shop.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/api/inventory/template">
              <Download className="size-4" />
              Download template
            </a>
          </Button>
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Drop CSV here or choose a file</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Choose CSV"}
            </Button>
          </div>
          {success ? <p className="text-emerald-700">{success}</p> : null}
          {error ? <p className="text-brand-red">{error}</p> : null}
          {rowErrors.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2 text-xs text-brand-red">
              {rowErrors.map((e) => (
                <li key={`${e.row}-${e.message}`}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
