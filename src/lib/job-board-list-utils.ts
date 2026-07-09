import type { JobBoard, JobCard } from "@/lib/job-board";
import type { PipelineColumn } from "@/lib/job-board-pipeline";
import type { JobBoardSort } from "@/lib/job-board-filters";

export type JobBoardListRow = {
  card: JobCard;
  column: PipelineColumn;
  stageOrder: number;
};

const STAGE_ORDER: Record<string, number> = {
  estimates: 0,
  workInProgress: 1,
  completed: 2,
  custom: 3,
};

export function flattenJobBoard(board: JobBoard): JobBoardListRow[] {
  const rows: JobBoardListRow[] = [];
  for (const column of board.columns) {
    const cards = board.cardsByColumnId[column.id] ?? [];
    const stageOrder = STAGE_ORDER[column.kind] ?? 99;
    for (const card of cards) {
      rows.push({ card, column, stageOrder });
    }
  }
  return rows;
}

function createdMs(value: Date | string): number {
  return new Date(value).getTime();
}

export function sortJobBoardListRows(rows: JobBoardListRow[], sort: JobBoardSort): JobBoardListRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "created":
        return createdMs(b.card.createdAt) - createdMs(a.card.createdAt);
      case "total":
        return b.card.totalCents - a.card.totalCents;
      case "stage": {
        const stageDiff = a.stageOrder - b.stageOrder;
        if (stageDiff !== 0) return stageDiff;
        return a.card.number - b.card.number;
      }
      case "number":
      default:
        return b.card.number - a.card.number;
    }
  });
  return copy;
}

export function jobBoardListSummary(rows: JobBoardListRow[]) {
  const totalCents = rows.reduce((sum, row) => sum + row.card.totalCents, 0);
  return { count: rows.length, totalCents };
}
