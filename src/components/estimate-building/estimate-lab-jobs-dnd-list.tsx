"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { AdjustTemplate } from "@/components/estimate-building/estimate-lab-adjustment-shared";
import { EstimateJobCard } from "@/components/repair-order/estimate-job-card";
import { reorderJobs } from "@/server/actions/estimate";
import type { RepairOrderDetail } from "@/server/repair-order";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type JobCardProps = ComponentProps<typeof EstimateJobCard>;
type Fee = RepairOrderDetail["fees"][number];
type Discount = RepairOrderDetail["discounts"][number];

function SortableJobCard(props: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.job.id,
    disabled: !props.canEdit || props.variant !== "lab",
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "relative z-10")}
    >
      <EstimateJobCard
        {...props}
        jobDragHandle={
          props.variant === "lab" && props.canEdit
            ? { listeners, attributes, isDragging }
            : undefined
        }
      />
    </div>
  );
}

/** Lab jobs list with drag-and-drop reorder for job cards. */
export function EstimateLabJobsDndList({
  roId,
  jobs,
  canEdit,
  fees,
  discounts,
  feeTemplates = [],
  discountTemplates = [],
  approvedVia,
  onToggleJob,
  onToggleLabor,
  onTogglePart,
  onJobOpenParts,
  ...cardProps
}: {
  roId: string;
  jobs: JobCardProps["job"][];
  canEdit: boolean;
  fees: Fee[];
  discounts: Discount[];
  feeTemplates?: AdjustTemplate[];
  discountTemplates?: AdjustTemplate[];
  approvedVia?: string | null;
  onToggleJob: (jobId: string, auth: boolean) => void;
  onToggleLabor: (jobId: string, lineId: string, auth: boolean) => void;
  onTogglePart: (jobId: string, lineId: string, auth: boolean) => void;
  onJobOpenParts?: (jobId: string, mode: "manual" | "lookup") => void;
} & Omit<
  JobCardProps,
  | "job"
  | "index"
  | "roId"
  | "canEdit"
  | "jobDragHandle"
  | "jobFees"
  | "jobDiscounts"
  | "onToggleJob"
  | "onToggleLabor"
  | "onTogglePart"
  | "customerApproved"
  | "onOpenParts"
>) {
  const router = useRouter();
  const jobIds = jobs.map((j) => j.id).join(",");
  const [orderedIds, setOrderedIds] = useState(() => jobs.map((j) => j.id));
  const [pending, start] = useTransition();
  // dnd-kit generates unstable aria-describedby ids during SSR — mount DnD after hydration.
  const [dndReady, setDndReady] = useState(false);

  useEffect(() => {
    setDndReady(true);
  }, []);

  useEffect(() => {
    setOrderedIds(jobs.map((j) => j.id));
  }, [jobIds]);

  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const orderedJobs = orderedIds.map((id) => jobMap.get(id)).filter(Boolean) as JobCardProps["job"][];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || pending) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(next);
    start(async () => {
      const result = await reorderJobs({ repairOrderId: roId, orderedJobIds: next });
      if (!result.ok) {
        setOrderedIds(jobs.map((j) => j.id));
      }
      router.refresh();
    });
  }

  function cardPropsFor(job: JobCardProps["job"], i: number): JobCardProps {
    return {
      ...cardProps,
      index: i,
      job,
      roId,
      canEdit,
      customerApproved: approvedVia === "CUSTOMER" && Boolean(job.approvedAt),
      jobFees: fees.filter((f) => f.jobId === job.id),
      jobDiscounts: discounts.filter((d) => d.jobId === job.id),
      feeTemplates,
      discountTemplates,
      onToggleJob: (auth) => onToggleJob(job.id, auth),
      onToggleLabor: (lineId, auth) => onToggleLabor(job.id, lineId, auth),
      onTogglePart: (lineId, auth) => onTogglePart(job.id, lineId, auth),
      onOpenParts: onJobOpenParts ? (mode) => onJobOpenParts(job.id, mode) : undefined,
    };
  }

  if (!dndReady) {
    return (
      <>
        {orderedJobs.map((job, i) => (
          <EstimateJobCard key={job.id} {...cardPropsFor(job, i)} />
        ))}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        {orderedJobs.map((job, i) => (
          <SortableJobCard key={job.id} {...cardPropsFor(job, i)} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
