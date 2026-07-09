"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  GitBranch,
  LayoutGrid,
  Receipt,
  RotateCcw,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { COLUMN_OF, type BoardColumn } from "@/lib/job-board";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { cn } from "@/lib/utils";
import {
  approveRepairOrder,
  archiveRepairOrder,
  moveRepairOrderToCoreColumn,
} from "@/server/actions/job-board";
import type { ROStatus } from "@/generated/prisma";

const PHASE_LABEL: Record<ROStatus, string> = {
  ESTIMATE: "Quoted",
  APPROVED: "In bay",
  IN_PROGRESS: "In bay",
  COMPLETED: "Complete",
  INVOICED: "Invoiced",
};

function currentColumn(status: ROStatus): BoardColumn {
  return COLUMN_OF[status];
}

export function RoWorkflowDropdown({
  roId,
  roStatus,
  canArchive = false,
  className,
}: {
  roId: string;
  roStatus: ROStatus;
  canArchive?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [pending, startTransition] = useTransition();

  const phase = PHASE_LABEL[roStatus];
  const column = currentColumn(roStatus);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast("success", success);
        router.refresh();
      } else {
        toast("error", res.error ?? "Action failed");
      }
    });
  }

  const canRevertToEstimate = roStatus !== "ESTIMATE";
  const canStartWork = roStatus === "ESTIMATE" || roStatus === "APPROVED";
  const canComplete =
    roStatus === "APPROVED" || roStatus === "IN_PROGRESS";
  const canCollectPayment =
    roStatus === "COMPLETED" || roStatus === "INVOICED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className={cn(
            "h-8 gap-1 border-brand-navy/25 px-2 text-[11px] font-semibold text-brand-navy",
            className,
          )}
          aria-label={`Workflow — ${phase}`}
        >
          <span className="flex min-w-0 items-center gap-1 truncate">
            <GitBranch className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Workflow</span>
            <span className="truncate font-normal text-muted-foreground">· {phase}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Move phase
        </DropdownMenuLabel>
        {canRevertToEstimate ? (
          <DropdownMenuItem
            disabled={pending || column === "estimates"}
            onSelect={() =>
              run(
                () => moveRepairOrderToCoreColumn(roId, "estimates"),
                "Moved to estimate",
              )
            }
          >
            <RotateCcw className="size-4" />
            Move to estimate
          </DropdownMenuItem>
        ) : null}
        {canStartWork ? (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(() => approveRepairOrder(roId), "Approved — work started")
            }
          >
            <CheckCircle2 className="size-4" />
            Approve & start work
          </DropdownMenuItem>
        ) : null}
        {canComplete ? (
          <DropdownMenuItem
            disabled={pending || column === "completed"}
            onSelect={() =>
              run(
                () => moveRepairOrderToCoreColumn(roId, "completed"),
                "Marked complete",
              )
            }
          >
            <CheckCircle2 className="size-4" />
            Mark complete
          </DropdownMenuItem>
        ) : null}
        {canStartWork && column !== "workInProgress" ? (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(
                () => moveRepairOrderToCoreColumn(roId, "workInProgress"),
                "Moved to work in progress",
              )
            }
          >
            <Wrench className="size-4" />
            Mark in bay
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Open tab
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/repair-orders/${roId}`}>
            <ClipboardList className="size-4" />
            Overview
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/repair-orders/${roId}/estimate`}>
            <Receipt className="size-4" />
            Estimate
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/repair-orders/${roId}/work-in-progress`}>
            <Wrench className="size-4" />
            Work in progress
          </Link>
        </DropdownMenuItem>
        {canCollectPayment ? (
          <DropdownMenuItem asChild>
            <Link href={roEstimateActionHref(roId, "payment")}>
              <Receipt className="size-4" />
              Payment & invoice
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/workflow?ro=${roId}`}>
            <LayoutGrid className="size-4" />
            View on job board
          </Link>
        </DropdownMenuItem>
        {canArchive ? (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(() => archiveRepairOrder(roId), "Repair order archived")
            }
            className="font-medium text-emerald-800 focus:text-emerald-800"
          >
            <Archive className="size-4" />
            Archive RO
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
