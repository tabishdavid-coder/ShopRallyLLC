"use server";

import { randomBytes } from "crypto";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { appUrl } from "@/lib/app-url";
import { getShopId } from "@/lib/shop";
import { COLUMN_OF, type BoardColumn } from "@/lib/job-board";
import {
  isCorePipelineColumnId,
  pipelineColumnKind,
  resolveRoPipelineColumnId,
  type JobBoardPipelineConfig,
} from "@/lib/job-board-pipeline";
import { getJobBoardPipelineConfig } from "@/server/job-board";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { ShopAuditEventType } from "@/generated/prisma";
import {
  approveAndStartWork,
  authorizeJobsForRo,
  deauthorizeJobsForRo,
} from "@/server/approval";
import { ensureInvoiceForRepairOrder } from "@/server/invoice";
import { requireJobBoardMove, requirePermission } from "@/server/permissions";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { emitAutomationEvent } from "@/server/services/automation-events";
import { ROStatus, type Prisma } from "@/generated/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MoveInput = z.object({
  movedId: z.string().min(1),
  toColumnId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).max(1000),
});
export type MoveInput = z.infer<typeof MoveInput>;

function coreKindForColumnId(columnId: string, pipeline: JobBoardPipelineConfig): BoardColumn | null {
  const kind = pipelineColumnKind(columnId, pipeline);
  if (!kind || kind === "custom") return null;
  return kind;
}

function columnTitle(pipeline: JobBoardPipelineConfig, columnId: string): string {
  return pipeline.columns.find((c) => c.id === columnId)?.title ?? columnId;
}

/** The status (and side effects) to apply when a card is dropped into a column. */
function statusDataFor(toColumn: BoardColumn): Prisma.RepairOrderUpdateInput {
  switch (toColumn) {
    case "estimates":
      // Reverting to an estimate un-approves it.
      return {
        status: ROStatus.ESTIMATE,
        authorizedAt: null,
        authorizedBy: null,
        approvedVia: null,
        completedAt: null,
      };
    case "workInProgress":
      return { status: ROStatus.IN_PROGRESS, completedAt: null };
    case "completed":
      return { status: ROStatus.COMPLETED, completedAt: new Date() };
  }
}

/**
 * Drag-and-drop commit: reorder the destination column and, if the card changed
 * columns, flip its status (Estimates ↔ WIP ↔ Completed, either direction).
 */
export async function moveRepairOrder(raw: MoveInput): Promise<ActionResult> {
  const parsed = MoveInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid move." };
  const { movedId, toColumnId, orderedIds } = parsed.data;

  if (!orderedIds.includes(movedId)) {
    return { ok: false, error: "Invalid move." };
  }

  const shopId = await getShopId();
  const pipeline = await getJobBoardPipelineConfig(shopId);
  const targetCol = pipeline.columns.find((c) => c.id === toColumnId);
  if (!targetCol) return { ok: false, error: "Unknown column." };

  const moved = await prisma.repairOrder.findFirst({
    where: { id: movedId, shopId },
    select: { status: true, jobBoardColumnId: true },
  });
  if (!moved) return { ok: false, error: "Repair order not found." };

  // Same resolution as the board UI (custom bucket overrides status grouping).
  const fromColumnId = resolveRoPipelineColumnId(moved, pipeline);
  const changingColumn = fromColumnId !== toColumnId;
  const toCore = coreKindForColumnId(toColumnId, pipeline);
  const fromCore = isCorePipelineColumnId(fromColumnId) ? fromColumnId : COLUMN_OF[moved.status];
  const authorizesWork =
    changingColumn &&
    fromCore === "estimates" &&
    toCore != null &&
    (toCore === "workInProgress" || toCore === "completed");

  const perm = await requireJobBoardMove(shopId, { authorizesWork });
  if (!perm.ok) return perm;

  await prisma.$transaction(async (tx) => {
    for (const [i, id] of orderedIds.entries()) {
      await tx.repairOrder.updateMany({ where: { id, shopId }, data: { boardOrder: i } });
    }

    if (changingColumn) {
      const data: Prisma.RepairOrderUpdateInput = {};

      if (targetCol.kind === "custom") {
        data.jobBoardColumnId = toColumnId;
      } else {
        data.jobBoardColumnId = null;
        Object.assign(data, statusDataFor(targetCol.kind));
      }

      await tx.repairOrder.updateMany({
        where: { id: movedId, shopId },
        data,
      });

      if (toCore === "estimates") {
        await deauthorizeJobsForRo(tx, movedId, shopId);
      }

      if (
        fromCore === "estimates" &&
        toCore != null &&
        (toCore === "workInProgress" || toCore === "completed")
      ) {
        await authorizeJobsForRo(tx, movedId, shopId);
        await tx.repairOrder.updateMany({
          where: { id: movedId, shopId, authorizedAt: null },
          data: {
            authorizedAt: new Date(),
            authorizedBy: "Shop",
            approvedVia: "SHOP",
          },
        });
      }
    }
  });

  if (changingColumn && toCore === "completed") {
    await ensureInvoiceForRepairOrder(movedId, shopId);
    const ro = await prisma.repairOrder.findFirst({
      where: { id: movedId, shopId },
      select: { customerId: true },
    });
    if (ro?.customerId) {
      await emitAutomationEvent({
        type: "RO_COMPLETED",
        shopId,
        repairOrderId: movedId,
        customerId: ro.customerId,
      });
    }
  }

  if (changingColumn) {
    await recordShopAuditEventSafe({
      shopId,
      repairOrderId: movedId,
      eventType: ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
      summary: `Moved on job board: ${columnTitle(pipeline, fromColumnId)} → ${columnTitle(pipeline, toColumnId)}`,
      metadata: { fromColumnId, toColumnId, via: "job_board_drag" },
    });
  }

  revalidatePath("/job-board");
  for (const path of revalidateEstimatePaths(movedId)) {
    revalidatePath(path);
  }
  return { ok: true };
}

/** Move an RO into a core job-board column (estimate / WIP / completed). */
export async function moveRepairOrderToCoreColumn(
  roId: string,
  target: BoardColumn,
): Promise<ActionResult> {
  const shopId = await getShopId();
  const pipeline = await getJobBoardPipelineConfig(shopId);
  const toColumnId = pipeline.columns.find((c) => c.kind === target)?.id ?? target;

  const ros = await prisma.repairOrder.findMany({
    where: { shopId, archivedAt: null },
    orderBy: [{ boardOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, status: true, jobBoardColumnId: true },
  });

  const inColumn = ros.filter(
    (r) => resolveRoPipelineColumnId(r, pipeline) === toColumnId && r.id !== roId,
  );
  const orderedIds = [roId, ...inColumn.map((r) => r.id)];

  return moveRepairOrder({ movedId: roId, toColumnId, orderedIds });
}

/** Shop-side approval: approve the estimate and move it to WIP. */
export async function approveRepairOrder(roId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "estimate.approve");
  if (!perm.ok) return perm;
  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: { id: true, status: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  if (ro.status !== ROStatus.ESTIMATE && ro.status !== ROStatus.APPROVED) {
    return { ok: false, error: "This repair order is already in progress." };
  }

  await approveAndStartWork(roId, shopId, "SHOP", "Shop");
  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: roId,
    eventType: ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
    summary: "Shop approved estimate and started work",
    metadata: { via: "job_board" },
  });
  revalidatePath("/job-board");
  revalidatePath(`/repair-orders/${roId}`);
  revalidatePath(`/repair-orders/${roId}/estimate`);
  revalidatePath(`/repair-orders/${roId}/work-in-progress`);
  return { ok: true };
}

export type LinkResult = { ok: true; url: string } | { ok: false; error: string };

/** Generate (or reuse) the customer approval link for an estimate. */
export async function createApprovalLink(roId: string): Promise<LinkResult> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "estimate.approve");
  if (!perm.ok) return perm;
  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: { approvalToken: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const token = ro.approvalToken ?? randomBytes(24).toString("base64url");
  const updated = await prisma.repairOrder.updateMany({
    where: { id: roId, shopId },
    data: { approvalToken: token, approvalSentAt: new Date() },
  });
  if (updated.count === 0) return { ok: false, error: "Repair order not found." };

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: roId,
    eventType: ShopAuditEventType.ESTIMATE_LINK_CREATED,
    summary: ro.approvalToken ? "Customer approval link refreshed" : "Customer approval link created",
    metadata: { action: "approval_link_created" },
  });

  revalidatePath("/job-board");
  for (const path of revalidateEstimatePaths(roId)) {
    revalidatePath(path);
  }
  return { ok: true, url: await appUrl(`/approve/${token}`) };
}

/** Revoke the customer approval link (clears the token + sent timestamp). */
export async function disableApprovalLink(roId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "estimate.approve");
  if (!perm.ok) return perm;
  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, shopId }, select: { id: true } });
  if (!ro) return { ok: false, error: "Repair order not found." };
  const updated = await prisma.repairOrder.updateMany({
    where: { id: roId, shopId },
    data: { approvalToken: null, approvalSentAt: null },
  });
  if (updated.count === 0) return { ok: false, error: "Repair order not found." };

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: roId,
    eventType: ShopAuditEventType.ESTIMATE_LINK_REVOKED,
    summary: "Customer approval link disabled",
    metadata: { action: "approval_link_disabled" },
  });

  revalidatePath("/job-board");
  revalidatePath(`/repair-orders/${roId}/estimate`);
  return { ok: true };
}

/** Hide an RO from the active job board (manual archive). */
export async function archiveRepairOrder(roId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "job_board.view");
  if (!perm.ok) return perm;

  const updated = await prisma.repairOrder.updateMany({
    where: { id: roId, shopId, archivedAt: null },
    // Clear custom-section membership so an empty column is deletable after archive.
    data: { archivedAt: new Date(), jobBoardColumnId: null },
  });
  if (updated.count === 0) return { ok: false, error: "Repair order not found." };

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: roId,
    eventType: ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
    summary: "Archived from job board",
    metadata: { via: "job_board_archive" },
  });

  revalidatePath("/job-board");
  for (const path of revalidateEstimatePaths(roId)) {
    revalidatePath(path);
  }
  return { ok: true };
}

const PipelineConfigInput = z.object({
  columns: z.array(
    z.object({
      id: z.string().min(1).max(64),
      kind: z.enum(["estimates", "workInProgress", "completed", "custom"]),
      title: z.string().min(1).max(80),
      subtitle: z.string().max(200),
    }),
  ),
});

/** Save full pipeline layout (rename core columns + custom sections). */
export async function saveJobBoardPipelineConfig(raw: unknown): Promise<ActionResult> {
  const parsed = PipelineConfigInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid pipeline layout." };

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "employees.manage");
  if (!perm.ok) return perm;

  const { saveShopJobBoardPipeline } = await import("@/server/job-board");
  await saveShopJobBoardPipeline(shopId, parsed.data);

  revalidatePath("/job-board");
  revalidatePath("/dashboard");
  revalidatePath("/settings/ro-settings");
  return { ok: true };
}

/** Add a custom section to the right of the job board. */
export async function addJobBoardPipelineColumn(title: string): Promise<ActionResult> {
  const name = title.trim();
  if (!name) return { ok: false, error: "Section name is required." };

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "employees.manage");
  if (!perm.ok) return perm;

  const { getJobBoardPipelineConfig, saveShopJobBoardPipeline } = await import("@/server/job-board");
  const { newCustomPipelineColumn } = await import("@/lib/job-board-pipeline");

  const config = await getJobBoardPipelineConfig(shopId);
  if (config.columns.length >= 12) {
    return { ok: false, error: "Maximum of 12 sections reached." };
  }

  const column = newCustomPipelineColumn(
    name,
    config.columns.filter((c) => c.kind === "custom"),
  );
  await saveShopJobBoardPipeline(shopId, { columns: [...config.columns, column] });

  revalidatePath("/job-board");
  revalidatePath("/settings/ro-settings");
  return { ok: true };
}

/**
 * Remove a custom section. Refuses if any ROs are still assigned to it —
 * cards must be moved out first (no silent reassignment).
 */
export async function removeJobBoardPipelineColumn(columnId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "employees.manage");
  if (!perm.ok) return perm;

  const { getJobBoardPipelineConfig, saveShopJobBoardPipeline } = await import("@/server/job-board");
  const config = await getJobBoardPipelineConfig(shopId);
  const target = config.columns.find((c) => c.id === columnId);
  if (!target || target.kind !== "custom") {
    return { ok: false, error: "Only custom sections can be removed." };
  }

  // Match the job board: only active (non-archived) cards block delete.
  // Archived ROs are hidden from the board but previously kept jobBoardColumnId.
  const occupied = await prisma.repairOrder.count({
    where: { shopId, jobBoardColumnId: columnId, archivedAt: null },
  });
  if (occupied > 0) {
    return {
      ok: false,
      error: `This section still has ${occupied} repair order${occupied === 1 ? "" : "s"}. Move them out before deleting.`,
    };
  }

  // Drop leftover assignments (archived / orphans) so the column id is fully free.
  await prisma.repairOrder.updateMany({
    where: { shopId, jobBoardColumnId: columnId },
    data: { jobBoardColumnId: null },
  });

  await saveShopJobBoardPipeline(shopId, {
    columns: config.columns.filter((c) => c.id !== columnId),
  });

  revalidatePath("/job-board");
  revalidatePath("/dashboard");
  revalidatePath("/settings/ro-settings");
  return { ok: true };
}
