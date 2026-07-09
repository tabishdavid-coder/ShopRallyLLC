"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobBoardPipelineConfig, PipelineColumn } from "@/lib/job-board-pipeline";
import {
  removeJobBoardPipelineColumn,
  saveJobBoardPipelineConfig,
} from "@/server/actions/job-board";

const input =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

export function JobBoardPipelineSettings({ initial }: { initial: JobBoardPipelineConfig }) {
  const [columns, setColumns] = useState<PipelineColumn[]>(initial.columns);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateColumn(id: string, patch: Partial<Pick<PipelineColumn, "title" | "subtitle">>) {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveJobBoardPipelineConfig({ columns });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function removeCustom(id: string) {
    startTransition(async () => {
      const res = await removeJobBoardPipelineColumn(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setColumns((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold">Pipeline sections</h4>
        <p className="text-sm text-muted-foreground">
          Rename the three core stages or remove custom sections you added on the job board.
        </p>
      </div>

      <div className="space-y-3">
        {columns.map((col) => (
          <div key={col.id} className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {col.kind === "custom" ? "Custom section" : "Core stage"}
              </span>
              {col.kind === "custom" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => removeCustom(col.id)}
                >
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                <Input
                  className={input}
                  value={col.title}
                  maxLength={80}
                  onChange={(e) => updateColumn(col.id, { title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Subtitle</label>
                <Input
                  className={input}
                  value={col.subtitle}
                  maxLength={200}
                  onChange={(e) => updateColumn(col.id, { subtitle: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? <span className="mr-auto text-xs text-emerald-600">Saved</span> : null}
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save pipeline layout
        </Button>
      </div>
    </div>
  );
}
