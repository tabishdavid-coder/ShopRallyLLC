"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { CannedJobFormSheet } from "@/components/canned-jobs/canned-job-form-sheet";
import { CategoryFilterChips } from "@/components/canned-jobs/category-filter-chips";
import {
  CatalogListBody,
  CatalogListCard,
  CatalogListCount,
  CatalogListEmpty,
  CatalogListError,
  CatalogListFooter,
  CatalogListHeader,
  CatalogListPage,
  CatalogListTableHeadRow,
  CatalogListToolbar,
  CatalogListToolbarRow,
  catalogSearchInputClass,
  catalogSelectTriggerClass,
} from "@/components/catalog/catalog-list-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CANNED_JOB_CATEGORIES } from "@/lib/canned-job-schemas";
import type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";
import { formatCents } from "@/lib/format";
import {
  activateCannedJob,
  deactivateCannedJob,
  deleteCannedJob,
  duplicateCannedJob,
  fetchCannedJobDetail,
} from "@/server/actions/canned-jobs";
import { cn } from "@/lib/utils";

type EditorMode = "none" | "create" | "edit";
type StatusFilter = "all" | "active" | "inactive";

const PER_PAGE = 25;

function categoryTone(category: string | null): string {
  if (!category) return "border-border bg-muted/40 text-muted-foreground";
  const map: Record<string, string> = {
    Brakes: "border-brand-red/25 bg-brand-red/8 text-brand-red",
    Maintenance: "border-brand-navy/25 bg-brand-navy/8 text-brand-navy",
    Inspection: "border-emerald-600/25 bg-emerald-600/8 text-emerald-800",
    Fluids: "border-sky-600/25 bg-sky-600/8 text-sky-800",
    Electrical: "border-amber-600/25 bg-amber-600/8 text-amber-900",
    Engine: "border-violet-600/25 bg-violet-600/8 text-violet-900",
    Suspension: "border-orange-600/25 bg-orange-600/8 text-orange-900",
  };
  return map[category] ?? "border-brand-light/40 bg-brand-light/15 text-brand-navy";
}

function jobCostBasis(job: CannedJobSummary, laborRateCents: number) {
  const laborCostCents = Math.round(job.laborHours * laborRateCents);
  const totalCents = job.partsCostCents + laborCostCents;
  return { laborCostCents, totalCents };
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [editorMode, setEditorMode] = useState<EditorMode>("none");
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
      if (statusFilter === "active" && !j.isActive) return false;
      if (statusFilter === "inactive" && j.isActive) return false;
      if (!needle) return true;
      return (
        j.name.toLowerCase().includes(needle) ||
        (j.category?.toLowerCase().includes(needle) ?? false) ||
        (j.description?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [initialJobs, q, category, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const dialogOpen = editorMode !== "none";

  function openCreate() {
    setError(null);
    setEditJob(null);
    setEditorMode("create");
  }

  function closeEditor() {
    setEditorMode("none");
    setEditJob(null);
    setError(null);
  }

  function handleEdit(id: string) {
    setError(null);
    start(async () => {
      const res = await fetchCannedJobDetail(id);
      if (res.ok) {
        setEditJob(res.job);
        setEditorMode("edit");
      } else {
        setError(res.error);
      }
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

  function handleSaved() {
    closeEditor();
    router.refresh();
  }

  return (
    <CatalogListPage>
      <CatalogListHeader
        title="Canned Jobs"
        description="Shop service templates — labor and parts apply from your rate and markup matrices on estimates."
        action={
          <Button
            onClick={openCreate}
            className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
          >
            <Plus className="size-4" />
            Canned job
          </Button>
        }
      />

      <CatalogListCard>
        <CatalogListToolbar>
          <CatalogListToolbarRow>
            <div className="relative min-w-0 flex-1 basis-52">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search canned jobs…"
                className={catalogSearchInputClass}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(catalogSelectTriggerClass, "w-[7.5rem]")}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <CatalogListCount count={filtered.length} label="job" />
          </CatalogListToolbarRow>

          <CategoryFilterChips
            categories={filterCategories}
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            className="scrollbar-thin overflow-x-auto overscroll-x-contain pb-0.5"
          />
        </CatalogListToolbar>

        {error ? <CatalogListError message={error} /> : null}

        <CatalogListBody>
          {filtered.length === 0 ? (
            <CatalogListEmpty
              title="No canned jobs match"
              description={
                initialJobs.length === 0
                  ? "Create your first template or save a job from an estimate."
                  : "Try clearing filters or search terms."
              }
              action={
                initialJobs.length === 0 ? (
                  <Button
                    onClick={openCreate}
                    className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                  >
                    <Plus className="size-4" /> Create canned job
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <CatalogListTableHeadRow>
                  <TableHead className="min-w-[12rem] font-semibold">Name</TableHead>
                  <TableHead className="w-[8rem] font-semibold">Tags</TableHead>
                  <TableHead className="w-[4.5rem] text-right font-semibold">Items</TableHead>
                  <TableHead className="w-[5.5rem] text-right font-semibold">Labor</TableHead>
                  <TableHead className="w-[5.5rem] text-right font-semibold">Parts</TableHead>
                  <TableHead className="w-[5.5rem] text-right font-semibold">Cost</TableHead>
                  <TableHead className="w-[5.5rem] text-right font-semibold">Price</TableHead>
                  <TableHead className="w-[5.5rem] font-semibold">Status</TableHead>
                  <TableHead className="w-10" />
                </CatalogListTableHeadRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((job) => {
                  const itemCount = job.laborLineCount + job.partLineCount;
                  const { laborCostCents, totalCents } = jobCostBasis(job, laborRateCents);

                  return (
                    <TableRow
                      key={job.id}
                      className={cn(
                        "cursor-pointer",
                        !job.isActive && "opacity-70",
                        pending && "pointer-events-none opacity-60",
                      )}
                      onClick={() => handleEdit(job.id)}
                    >
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{job.name}</p>
                          {job.description ? (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {job.description}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {job.category ? (
                          <span
                            className={cn(
                              "inline-block max-w-full truncate rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                              categoryTone(job.category),
                            )}
                          >
                            {job.category}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm">
                        {itemCount}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                        <span className="block">{job.laborHours.toFixed(1)}h</span>
                        <span className="text-[11px]">{formatCents(laborCostCents)}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                        {job.partLineCount > 0 ? formatCents(job.partsCostCents) : "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm">
                        {formatCents(totalCents)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm font-semibold text-brand-navy">
                        {formatCents(totalCents)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {job.isActive ? (
                          <Badge className="h-5 border-0 bg-emerald-600/12 px-1.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-600/12">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-muted-foreground"
                              disabled={pending}
                              aria-label={`Actions for ${job.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEdit(job.id)}>
                              <Pencil className="size-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(job.id)}>
                              <Copy className="size-3.5" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActive(job.id, job.isActive)}
                            >
                              {job.isActive ? (
                                <>
                                  <Star className="size-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="size-3.5" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => remove(job.id, job.name)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CatalogListBody>

        {filtered.length > PER_PAGE ? (
          <CatalogListFooter>
            <p className="text-xs tabular-nums text-muted-foreground">
              {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CatalogListFooter>
        ) : null}
      </CatalogListCard>

      <CannedJobFormSheet
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
        job={editorMode === "edit" ? editJob : null}
        categories={categories}
        laborRateCents={laborRateCents}
        onSaved={handleSaved}
      />
    </CatalogListPage>
  );
}
