"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Star, RotateCcw, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/format";
import { fmtDate } from "@/lib/datetime";
import { CANNED_JOB_CATEGORIES } from "@/lib/canned-job-schemas";
import { CategoryFilterChips } from "@/components/canned-jobs/category-filter-chips";
import {
  activateCannedJob,
  deactivateCannedJob,
  deleteCannedJob,
  duplicateCannedJob,
  fetchCannedJobDetail,
} from "@/server/actions/canned-jobs";
import type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";
import { CannedJobFormSheet } from "@/components/canned-jobs/canned-job-form-sheet";

function formatLastUsed(d: Date | string | null): string {
  if (!d) return "Never";
  return fmtDate(d);
}

function formatUpdated(d: Date | string): string {
  return fmtDate(d);
}

export function CannedJobsManager({
  initialJobs,
  categories,
  laborRateCents = 15000,
}: {
  initialJobs: CannedJobSummary[];
  categories: string[];
  laborRateCents?: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJob, setEditJob] = useState<CannedJobDetail | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filterCategories = useMemo(
    () => [...new Set([...categories, ...CANNED_JOB_CATEGORIES])].sort(),
    [categories],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initialJobs.filter((j) => {
      if (category && j.category !== category) return false;
      if (!needle) return true;
      return (
        j.name.toLowerCase().includes(needle) ||
        (j.category?.toLowerCase().includes(needle) ?? false) ||
        (j.description?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [initialJobs, q, category]);

  function openCreate() {
    setEditJob(null);
    setDialogOpen(true);
  }

  function handleEditClick(id: string) {
    setError(null);
    start(async () => {
      const res = await fetchCannedJobDetail(id);
      if (res.ok) {
        setEditJob(res.job);
        setDialogOpen(true);
      } else setError(res.error);
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    setError(null);
    start(async () => {
      const res = isActive ? await deactivateCannedJob(id) : await activateCannedJob(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteCannedJob(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function duplicate(id: string) {
    setError(null);
    start(async () => {
      const res = await duplicateCannedJob(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Canned Jobs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reusable job templates with labor and parts. Service writers apply them from the Estimate tab;
            pricing uses your shop labor rate and markup matrices at apply time.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" /> New Canned Job
        </Button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56 sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search canned jobs…"
              className="pl-8"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length} job{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <CategoryFilterChips categories={filterCategories} value={category} onChange={setCategory} className="scrollbar-thin overflow-x-auto overscroll-x-contain" />
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="px-4 py-2.5">Job</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5 text-right">Labor</th>
              <th className="px-4 py-2.5 text-right">Parts</th>
              <th className="px-4 py-2.5 text-right">Used</th>
              <th className="px-4 py-2.5">Last used</th>
              <th className="px-4 py-2.5">Updated</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 w-32" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  No canned jobs yet. Create one or save a job from an estimate using the star icon.
                </td>
              </tr>
            ) : (
              filtered.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{j.name}</div>
                    {j.description ? (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{j.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {j.category ? (
                      <Badge variant="outline" className="font-normal">
                        {j.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {j.laborLineCount} / {j.laborHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {j.partLineCount} / {formatCents(j.partsCostCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{j.usageCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLastUsed(j.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatUpdated(j.updatedAt)}</td>
                  <td className="px-4 py-3">
                    {j.isActive ? (
                      <Badge className="bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(j.id)}
                        disabled={pending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(j.id)}
                        disabled={pending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Duplicate"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(j.id, j.isActive)}
                        disabled={pending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={j.isActive ? "Deactivate" : "Activate"}
                      >
                        {j.isActive ? <Star className="size-4" /> : <RotateCcw className="size-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(j.id, j.name)}
                        disabled={pending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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

      <CannedJobFormSheet
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditJob(null);
        }}
        job={editJob}
        categories={categories}
        laborRateCents={laborRateCents}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
