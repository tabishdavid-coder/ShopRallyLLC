"use client";

import { JobBoardDnd } from "@/components/job-board/job-board-dnd";
import type { JobBoard } from "@/lib/job-board";

export function WorkflowBoard({
  board,
  selectedRoId,
  searchQuery,
}: {
  board: JobBoard;
  selectedRoId: string | null;
  searchQuery?: string;
}) {
  const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";

  return (
    <JobBoardDnd
      board={board}
      compact
      showColumnTotals
      selectedRoId={selectedRoId}
      cardHref={(id) => `/workflow?ro=${id}${q}`}
    />
  );
}
