"use client";

import { JobBoardDnd } from "@/components/job-board/job-board-dnd";
import { JobBoardToolbar } from "@/components/job-board/job-board-toolbar";
import { buildAttentionItems } from "@/components/ui-preview/landing/attention-items";
import { AttentionQueue } from "@/components/ui-preview/landing/attention-queue";
import { BentoStats } from "@/components/ui-preview/landing/bento-stats";
import { ShopDayHeader } from "@/components/ui-preview/landing/shop-day-header";
import { StageProgress } from "@/components/ui-preview/landing/stage-progress";
import type { DashboardData } from "@/lib/dashboard";
import type { JobBoard } from "@/lib/job-board";
import { buildRoLabelOptions } from "@/lib/ro-label";
import type { Shop } from "@/lib/shop";

type PreviewLandingProps = {
  shop: Shop;
  board: JobBoard;
  employees: { id: string; name: string }[];
  dashboardData: DashboardData;
  unreadSmsCount?: number;
  query: string;
  employeeId: string;
  appointmentOption: string;
};

/** Hybrid shop landing — brand bento stats, action queue, pipeline bar, live job board. */
export function PreviewLanding({
  shop,
  board,
  employees,
  dashboardData,
  unreadSmsCount = 0,
  query,
  employeeId,
  appointmentOption,
}: PreviewLandingProps) {
  const attentionItems = buildAttentionItems(board, unreadSmsCount);
  const labelOptions = buildRoLabelOptions(board);

  return (
    <div className="space-y-4">
      <ShopDayHeader shop={shop} />

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <AttentionQueue items={attentionItems} />
        <BentoStats data={dashboardData} />
      </div>

      <StageProgress board={board} />

      <div className="preview-workspace flex min-h-[calc(100vh-26rem)] flex-col gap-4">
        <JobBoardToolbar
          query={query}
          employeeId={employeeId}
          appointmentOption={appointmentOption}
          visibility="active"
          payment={null}
          approval={null}
          marketingSource=""
          view="board"
          sort="number"
          employees={employees}
          labelOptions={labelOptions}
        />
        <JobBoardDnd board={board} showColumnTotals />
      </div>
    </div>
  );
}
