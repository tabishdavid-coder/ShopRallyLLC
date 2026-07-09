"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Search, Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canvasItemFromCannedJob,
  canvasItemFromPreset,
  canvasItemFromProgramService,
  formatIntervalHint,
  type LibraryDragData,
  type PlanCanvasItem,
} from "@/components/marketing/plan-builder-types";
import type { ProgramServiceType } from "@/lib/maintenance-programs";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import { PRESET_MAINTENANCE_SERVICES } from "@/lib/preset-maintenance-services";
import type { MaintenanceProgramService } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type ProgramService = MaintenanceProgramService & {
  cannedJob?: { id: string; name: string } | null;
};

type Props = {
  canEdit: boolean;
  items: PlanCanvasItem[];
  onChange: (items: PlanCanvasItem[]) => void;
  programServices?: ProgramService[] | null;
  cannedJobs?: CannedJobSummary[] | null;
  onAddCustom: () => void;
};

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

type LibraryEntry = {
  id: string;
  name: string;
  description?: string;
  category: string;
  dragData: LibraryDragData;
  sourceLabel: string;
};

const CANVAS_DROP_ID = "plan-canvas-drop";

function DraggableLibraryItem({
  entry,
  disabled,
  onClickAdd,
}: {
  entry: LibraryEntry;
  disabled: boolean;
  onClickAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lib-${entry.id}`,
    data: entry.dragData,
    disabled,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClickAdd}
      disabled={disabled}
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border bg-background p-2.5 text-left text-sm transition-colors",
        "hover:border-brand-navy/40 hover:bg-brand-light/5",
        disabled && "opacity-50 cursor-not-allowed",
        isDragging && "ring-2 ring-brand-navy/30",
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground mt-0.5 opacity-60 group-hover:opacity-100" />
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{entry.name}</p>
        {entry.description ? (
          <p className="text-xs text-muted-foreground line-clamp-1">{entry.description}</p>
        ) : null}
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
          {entry.sourceLabel}
        </p>
      </div>
    </button>
  );
}

function SortablePlanCard({
  item,
  canEdit,
  onUpdate,
  onRemove,
}: {
  item: PlanCanvasItem;
  canEdit: boolean;
  onUpdate: (patch: Partial<PlanCanvasItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.clientId,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const inputCls =
    "h-7 rounded border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3 space-y-2",
        isDragging && "ring-2 ring-brand-navy/30 shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        {canEdit ? (
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <GripVertical className="size-4 text-muted-foreground/40 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{item.label}</p>
          {item.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          ) : null}
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-6">
        {item.kind === "COUNTED" || item.kind === "COUPON" || item.kind === "ACCESS" ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Visits</span>
            <Input
              type="number"
              min={1}
              className={`${inputCls} w-14`}
              value={item.quantity ?? 1}
              onChange={(e) =>
                onUpdate({ quantity: parseInt(e.target.value, 10) || 1 })
              }
              disabled={!canEdit}
            />
          </div>
        ) : null}
        {(item.kind === "INTERVAL" || item.kind === "UNLIMITED" || item.intervalDays) && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Every</span>
            <Input
              type="number"
              min={1}
              className={`${inputCls} w-14`}
              value={item.intervalDays ?? 90}
              onChange={(e) =>
                onUpdate({ intervalDays: parseInt(e.target.value, 10) || 90 })
              }
              disabled={!canEdit}
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{formatIntervalHint(item)}</span>
      </div>
    </div>
  );
}

function PlanDropZone({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROP_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[280px] rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver ? "border-brand-navy bg-brand-light/10" : "border-muted-foreground/25",
        isEmpty && "flex items-center justify-center",
      )}
    >
      {isEmpty ? (
        <div className="text-center text-sm text-muted-foreground px-4 py-8">
          <Wrench className="size-8 mx-auto mb-2 text-brand-navy/40" />
          <p className="font-medium">Drag services here</p>
          <p className="text-xs mt-1">or click a preset from the library</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function buildLibraryEntries(
  programServices: ProgramService[] | undefined,
  cannedJobs: CannedJobSummary[] | undefined,
  usedKeys: Set<string>,
): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  const usedNames = new Set<string>();
  const services = asArray(programServices);
  const jobs = asArray(cannedJobs);

  for (const s of services) {
    usedNames.add(s.name.toLowerCase());
    const key = `ps-${s.id}`;
    if (usedKeys.has(key)) continue;
    entries.push({
      id: key,
      name: s.name,
      description: s.description ?? undefined,
      category: s.cannedJob ? "Job template" : "Your library",
      dragData: { source: "program-service", serviceId: s.id },
      sourceLabel: s.cannedJob ? "Job template" : "Your library",
    });
  }

  for (const preset of PRESET_MAINTENANCE_SERVICES) {
    if (usedNames.has(preset.name.toLowerCase())) continue;
    const key = `preset-${preset.id}`;
    if (usedKeys.has(key)) continue;
    entries.push({
      id: key,
      name: preset.name,
      description: preset.description,
      category: preset.category,
      dragData: { source: "preset", presetId: preset.id },
      sourceLabel: "Preset",
    });
  }

  const linkedCannedIds = new Set(services.filter((s) => s.cannedJobId).map((s) => s.cannedJobId!));
  for (const job of jobs) {
    if (linkedCannedIds.has(job.id)) continue;
    if (usedNames.has(job.name.toLowerCase())) continue;
    const cat = job.category?.toLowerCase() ?? "";
    if (!cat.includes("maint") && !cat.includes("fluid") && !cat.includes("inspect") && !cat.includes("brake")) {
      continue;
    }
    const key = `cj-${job.id}`;
    if (usedKeys.has(key)) continue;
    entries.push({
      id: key,
      name: job.name,
      description: job.description ?? undefined,
      category: job.category ?? "Templates",
      dragData: { source: "canned-job", cannedJobId: job.id, name: job.name },
      sourceLabel: "Canned job",
    });
  }

  return entries;
}

function resolveDragToItem(
  data: LibraryDragData,
  programServices: ProgramService[] | undefined,
  cannedJobs: CannedJobSummary[] | undefined,
): PlanCanvasItem | null {
  const services = asArray(programServices);
  const jobs = asArray(cannedJobs);

  if (data.source === "program-service") {
    const svc = services.find((s) => s.id === data.serviceId);
    if (!svc) return null;
    return canvasItemFromProgramService({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      cannedJobId: svc.cannedJobId,
      serviceType: svc.serviceType as ProgramServiceType,
      defaultQuantity: svc.defaultQuantity,
      defaultIntervalDays: svc.defaultIntervalDays,
      defaultDiscountBps: svc.defaultDiscountBps,
    });
  }
  if (data.source === "preset") {
    const preset = PRESET_MAINTENANCE_SERVICES.find((p) => p.id === data.presetId);
    if (!preset) return null;
    return canvasItemFromPreset(preset);
  }
  if (data.source === "canned-job") {
    const job = jobs.find((j) => j.id === data.cannedJobId);
    if (!job) return null;
    return canvasItemFromCannedJob({ id: job.id, name: job.name, description: job.description });
  }
  return null;
}

export function PlanBuilderDnd({
  canEdit,
  items: rawItems,
  onChange,
  programServices,
  cannedJobs,
  onAddCustom,
}: Props) {
  const items = asArray(rawItems);
  const services = asArray(programServices);
  const jobs = asArray(cannedJobs);
  const [search, setSearch] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const usedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) {
      if (item.programServiceId) keys.add(`ps-${item.programServiceId}`);
      if (item.presetId) keys.add(`preset-${item.presetId}`);
      if (item.cannedJobId && !item.programServiceId) keys.add(`cj-${item.cannedJobId}`);
    }
    return keys;
  }, [items]);

  const libraryEntries = useMemo(
    () => buildLibraryEntries(services, jobs, usedKeys),
    [services, jobs, usedKeys],
  );

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return libraryEntries;
    return libraryEntries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q),
    );
  }, [libraryEntries, search]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addFromLibrary(entry: LibraryEntry) {
    if (!canEdit) return;
    const item = resolveDragToItem(entry.dragData, services, jobs);
    if (!item) return;
    onChange([...items, { ...item, sortOrder: items.length }]);
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || !canEdit) return;

    const activeId = String(active.id);

    // Reorder within canvas
    if (!activeId.startsWith("lib-")) {
      const oldIndex = items.findIndex((i) => i.clientId === activeId);
      const overId = String(over.id);
      if (oldIndex < 0) return;

      if (overId === CANVAS_DROP_ID) {
        return;
      }

      const newIndex = items.findIndex((i) => i.clientId === overId);
      if (newIndex >= 0 && oldIndex !== newIndex) {
        onChange(arrayMove(items, oldIndex, newIndex).map((it, i) => ({ ...it, sortOrder: i })));
      }
      return;
    }

    // Drop from library onto canvas
    const overId = String(over.id);
    const isCanvasTarget =
      overId === CANVAS_DROP_ID || items.some((i) => i.clientId === overId);
    if (!isCanvasTarget) return;

    const dragData = active.data.current as LibraryDragData | undefined;
    if (!dragData) return;

    const item = resolveDragToItem(dragData, services, jobs);
    if (!item) return;

    const overIndex = items.findIndex((i) => i.clientId === overId);
    const next = [...items];
    if (overIndex >= 0) next.splice(overIndex, 0, { ...item, sortOrder: overIndex });
    else next.push({ ...item, sortOrder: next.length });
    onChange(next.map((it, i) => ({ ...it, sortOrder: i })));
  }

  function updateItem(clientId: string, patch: Partial<PlanCanvasItem>) {
    onChange(items.map((it) => (it.clientId === clientId ? { ...it, ...patch } : it)));
  }

  function removeItem(clientId: string) {
    onChange(
      items.filter((it) => it.clientId !== clientId).map((it, i) => ({ ...it, sortOrder: i })),
    );
  }

  const activeLibraryEntry = activeDragId?.startsWith("lib-")
    ? filteredLibrary.find((e) => `lib-${e.id}` === activeDragId)
    : null;

  const activeCanvasItem = activeDragId && !activeDragId.startsWith("lib-")
    ? items.find((i) => i.clientId === activeDragId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
        {/* Left: Service library */}
        <aside className="rounded-lg border bg-card p-4 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div>
            <h3 className="text-sm font-semibold">Service library</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag presets into your plan or click to add
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredLibrary.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? "No matches." : "All available services are in your plan."}
              </p>
            ) : (
              filteredLibrary.map((entry) => (
                <DraggableLibraryItem
                  key={entry.id}
                  entry={entry}
                  disabled={!canEdit}
                  onClickAdd={() => addFromLibrary(entry)}
                />
              ))
            )}
          </div>

          {canEdit ? (
            <Button variant="outline" size="sm" className="w-full" onClick={onAddCustom}>
              <Plus className="mr-1.5 size-3.5" />
              Custom service
            </Button>
          ) : null}
        </aside>

        {/* Right: Plan canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Plan services
              {items.length > 0 ? (
                <span className="ml-1.5 text-muted-foreground font-normal">({items.length})</span>
              ) : null}
            </h3>
          </div>

          <PlanDropZone isEmpty={items.length === 0}>
            {items.length > 0 ? (
              <SortableContext
                items={items.map((i) => i.clientId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortablePlanCard
                      key={item.clientId}
                      item={item}
                      canEdit={canEdit}
                      onUpdate={(patch) => updateItem(item.clientId, patch)}
                      onRemove={() => removeItem(item.clientId)}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : null}
          </PlanDropZone>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLibraryEntry ? (
          <div className="rounded-md border bg-card p-2.5 shadow-lg text-sm font-medium max-w-[240px]">
            {activeLibraryEntry.name}
          </div>
        ) : activeCanvasItem ? (
          <div className="rounded-lg border bg-card p-3 shadow-lg text-sm font-medium max-w-[320px]">
            {activeCanvasItem.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
