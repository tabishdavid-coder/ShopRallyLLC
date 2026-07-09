import type { BoardColumn } from "@/lib/job-board";
import { JOB_BOARD_COLUMN_META } from "@/lib/job-board-theme";

import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";

/** Kanban column labels — industry-standard shop terminology. */
export const AP_BAY_PIPELINE_COLUMN_LABELS: Record<BoardColumn, string> = {
  estimates: JOB_BOARD_COLUMN_META.estimates.title,
  workInProgress: "Work in Progress",
  completed: JOB_BOARD_COLUMN_META.completed.title,
};

/** Column header + subtitle copy for the job board. */
export const AP_BAY_PIPELINE_COLUMN_META: Record<
  BoardColumn,
  { title: string; subtitle: string }
> = {
  estimates: JOB_BOARD_COLUMN_META.estimates,
  workInProgress: {
    title: "Work in Progress",
    subtitle: "Authorized jobs actively in the bay",
  },
  completed: JOB_BOARD_COLUMN_META.completed,
};

export function apBayPipelineColumnLabels(): Record<BoardColumn, string> | undefined {
  return isAutopilot3030Shell() ? AP_BAY_PIPELINE_COLUMN_LABELS : undefined;
}

export function apBayPipelineColumnMeta():
  | Record<BoardColumn, { title: string; subtitle: string }>
  | undefined {
  return isAutopilot3030Shell() ? AP_BAY_PIPELINE_COLUMN_META : undefined;
}

export function resolveJobBoardColumnMeta(): Record<
  BoardColumn,
  { title: string; subtitle: string }
> {
  return apBayPipelineColumnMeta() ?? JOB_BOARD_COLUMN_META;
}

export function resolveJobBoardColumnLabels(): Record<BoardColumn, string> {
  const ap = apBayPipelineColumnLabels();
  if (ap) return ap;
  return {
    estimates: JOB_BOARD_COLUMN_META.estimates.title,
    workInProgress: JOB_BOARD_COLUMN_META.workInProgress.title,
    completed: JOB_BOARD_COLUMN_META.completed.title,
  };
}

export function apBayPipelineEmptyHint(): string {
  return isAutopilot3030Shell()
    ? "Drag a repair order here"
    : "Drag a repair order here";
}
