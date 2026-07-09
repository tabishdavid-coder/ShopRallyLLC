"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
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
import { Loader2 } from "lucide-react";

import { JobCard } from "@/components/job-board/job-card";
import { JobBoardHistoryProvider } from "@/components/job-board/job-board-history-provider";
import { JobBoardMessagesProvider } from "@/components/job-board/job-board-messages-provider";
import { JobCardMenu } from "@/components/job-board/job-card-menu";
import { AuthorizeEstimateDialog } from "@/components/repair-order/authorize-estimate-dialog";
import {
  COLUMN_OF,
  COLUMN_STATUS,
  RO_STATUS,
  type BoardColumn,
  type JobBoard,
  type JobCard as JobCardData,
} from "@/lib/job-board";
import {
  pipelineColumnStyleKind,
} from "@/lib/job-board-pipeline";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { moveRepairOrder, archiveRepairOrder } from "@/server/actions/job-board";
import { customerDisplayName, formatCents } from "@/lib/format";
import {
  apBayPipelineEmptyHint,
} from "@/lib/autopilot3030/bay-pipeline";
import { JOB_BOARD_COLUMN } from "@/lib/job-board-theme";
import { cn } from "@/lib/utils";

type Columns = Record<string, JobCardData[]>;

function toColumns(board: JobBoard): Columns {
  const cols: Columns = {};
  for (const col of board.columns) {
    cols[col.id] = board.cardsByColumnId[col.id] ?? [];
  }
  return cols;
}

function findContainer(cols: Columns, id: string): string | undefined {
  if (id in cols) return id;
  return Object.keys(cols).find((c) => cols[c].some((card) => card.id === id));
}

function columnTotal(cards: JobCardData[]) {
  return cards.reduce((sum, c) => sum + c.totalCents, 0);
}

export type JobBoardDndProps = {
  board: JobBoard;
  compact?: boolean;
  emptyHint?: string;
  showColumnTotals?: boolean;
  selectedRoId?: string | null;
  cardHref?: (cardId: string) => string;
};

export function JobBoardDnd({
  board,
  compact = false,
  emptyHint,
  showColumnTotals = true,
  selectedRoId = null,
  cardHref,
}: JobBoardDndProps) {
  const columnDefs = board.columns;
  const columnOrder = columnDefs.map((c) => c.id);
  const dropHint = emptyHint ?? apBayPipelineEmptyHint();
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(() => toColumns(board));
  const columnsRef = useRef<Columns>(toColumns(board));
  const dragSnapshot = useRef<Columns | null>(null);
  const draggedRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [authorizeTarget, setAuthorizeTarget] = useState<JobCardData | null>(null);
  const [pending, startTransition] = useTransition();

  function setColumnsTracked(next: Columns | ((prev: Columns) => Columns)) {
    setColumns((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      columnsRef.current = resolved;
      return resolved;
    });
  }

  const sig = columnOrder
    .map((col) => (board.cardsByColumnId[col] ?? []).map((c) => `${c.id}:${c.status}`).join(","))
    .join("|");
  const lastSig = useRef(sig);
  useEffect(() => {
    if (lastSig.current !== sig) {
      lastSig.current = sig;
      const synced = toColumns(board);
      columnsRef.current = synced;
      setColumns(synced);
    }
  }, [sig, board]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeCard = activeId
    ? columnOrder.flatMap((c) => columns[c] ?? []).find((c) => c.id === activeId) ?? null
    : null;

  function persist(toColumnId: string, orderedIds: string[], movedId: string) {
    startTransition(async () => {
      const res = await moveRepairOrder({ movedId, toColumnId, orderedIds });
      if (!res.ok && dragSnapshot.current) {
        setColumnsTracked(dragSnapshot.current);
      }
      dragSnapshot.current = null;
      router.refresh();
    });
  }

  function onDragStart(e: DragStartEvent) {
    draggedRef.current = true;
    dragSnapshot.current = columnsRef.current;
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const cols = columnsRef.current;
    const activeC = findContainer(cols, String(active.id));
    const overC = findContainer(cols, String(over.id));
    if (!activeC || !overC || activeC === overC) return;

    setColumnsTracked((prev) => {
      const activeItems = prev[activeC];
      const overItems = prev[overC];
      const moved = activeItems.find((c) => c.id === String(active.id));
      if (!moved) return prev;
      const overIndex = overItems.findIndex((c) => c.id === String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeC]: activeItems.filter((c) => c.id !== moved.id),
        [overC]: [...overItems.slice(0, insertAt), moved, ...overItems.slice(insertAt)],
      };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const id = String(active.id);
    setActiveId(null);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);

    let persistArgs: { toColumnId: string; orderedIds: string[]; movedId: string } | null = null;

    setColumnsTracked((prev) => {
      const sourceC = findContainer(prev, id);
      if (!sourceC) return prev;
      const overC = over ? findContainer(prev, String(over.id)) : sourceC;
      if (!overC) return prev;

      let items = prev[overC];
      let oldIndex = items.findIndex((c) => c.id === id);
      let next = prev;

      if (oldIndex < 0 && sourceC !== overC) {
        const card = prev[sourceC].find((c) => c.id === id);
        if (!card) return prev;
        items = [...prev[overC], card];
        oldIndex = items.length - 1;
        next = {
          ...prev,
          [sourceC]: prev[sourceC].filter((c) => c.id !== id),
          [overC]: items,
        };
      }

      if (oldIndex < 0) return prev;

      let newIndex = over
        ? items.findIndex((c) => c.id === String(over.id))
        : items.length - 1;
      if (newIndex < 0) newIndex = items.length - 1;

      const targetKind = columnDefs.find((c) => c.id === overC)?.kind;
      const reordered = arrayMove(items, oldIndex, newIndex).map((c) => {
        if (c.id !== id || !targetKind || targetKind === "custom") return c;
        if (COLUMN_OF[c.status] === targetKind) return c;
        return { ...c, status: COLUMN_STATUS[targetKind] };
      });
      persistArgs = { toColumnId: overC, orderedIds: reordered.map((c) => c.id), movedId: id };
      return { ...next, [overC]: reordered };
    });

    if (persistArgs) {
      const { toColumnId, orderedIds, movedId } = persistArgs;
      persist(toColumnId, orderedIds, movedId);
    }
  }

  function moveCard(cardId: string, toColumnId: string) {
    dragSnapshot.current = columnsRef.current;

    let persistArgs: { toColumnId: string; orderedIds: string[]; movedId: string } | null = null;

    setColumnsTracked((prev) => {
      const from = findContainer(prev, cardId);
      if (!from || from === toColumnId) return prev;
      const card = prev[from].find((c) => c.id === cardId);
      if (!card) return prev;
      const targetKind = columnDefs.find((c) => c.id === toColumnId)?.kind;
      const moved =
        targetKind && targetKind !== "custom"
          ? { ...card, status: COLUMN_STATUS[targetKind] }
          : card;
      const target = [...(prev[toColumnId] ?? []), moved];
      persistArgs = { toColumnId, orderedIds: target.map((c) => c.id), movedId: cardId };
      return {
        ...prev,
        [from]: prev[from].filter((c) => c.id !== cardId),
        [toColumnId]: target,
      };
    });

    if (persistArgs) {
      const { toColumnId, orderedIds, movedId } = persistArgs;
      persist(toColumnId, orderedIds, movedId);
    }
  }

  function optimisticShopApprove(cardId: string) {
    setColumnsTracked((prev) => {
      const from = findContainer(prev, cardId);
      if (!from) return prev;
      const card = prev[from].find((c) => c.id === cardId);
      if (!card) return prev;
      const approved = {
        ...card,
        status: RO_STATUS.IN_PROGRESS,
        authorizedAt: new Date(),
        approvedVia: "SHOP",
      };
      return {
        ...prev,
        [from]: prev[from].filter((c) => c.id !== cardId),
        workInProgress: [approved, ...(prev.workInProgress ?? [])],
      };
    });
  }

  function archiveCard(cardId: string) {
    const from = findContainer(columnsRef.current, cardId);
    if (!from) return;

    setColumnsTracked((prev) => {
      const col = findContainer(prev, cardId);
      if (!col) return prev;
      return { ...prev, [col]: prev[col].filter((c) => c.id !== cardId) };
    });

    startTransition(async () => {
      const result = await archiveRepairOrder(cardId);
      if (!result.ok) {
        setColumnsTracked(toColumns(board));
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <JobBoardHistoryProvider>
      <JobBoardMessagesProvider>
      <DndContext
        id={compact ? "workflow-board" : "job-board"}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="h-full min-h-0">
        <div
          className={cn(
            "grid h-full min-h-0 gap-3",
            compact ? "h-full flex-1" : "flex-1 gap-4",
          )}
          style={{
            gridTemplateColumns: `repeat(${columnOrder.length}, minmax(260px, 1fr))`,
          }}
        >
          {columnDefs.map((def) => (
            <Column
              key={def.id}
              columnId={def.id}
              styleKind={pipelineColumnStyleKind(def.kind)}
              title={def.title}
              subtitle={def.subtitle}
              cards={columns[def.id] ?? []}
              columnTotal={showColumnTotals ? columnTotal(columns[def.id] ?? []) : null}
              compact={compact}
              emptyHint={dropHint}
              moveTargets={columnDefs.map((c) => ({ id: c.id, title: c.title }))}
              onMove={moveCard}
              onAuthorize={setAuthorizeTarget}
              onArchive={archiveCard}
              draggedRef={draggedRef}
              selectedRoId={selectedRoId}
              cardHref={cardHref}
            />
          ))}
        </div>
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="rotate-1 cursor-grabbing">
              <JobCard
                card={activeCard}
                selected={activeCard.id === selectedRoId}
                column={pipelineColumnStyleKind(
                  columnDefs.find((c) => c.id === findContainer(columns, activeCard.id))?.kind ??
                    "estimates",
                )}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pending ? (
        <div className="pointer-events-none fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-brand-navy px-3 py-1.5 text-xs text-white shadow-lg">
          <Loader2 className="size-3.5 animate-spin" /> Saving…
        </div>
      ) : null}

      {authorizeTarget ? (
        <AuthorizeEstimateDialog
          open
          onOpenChange={(o) => !o && setAuthorizeTarget(null)}
          roId={authorizeTarget.id}
          roNumber={authorizeTarget.number}
          customerName={customerDisplayName(authorizeTarget.customer)}
          phone={authorizeTarget.customer.phone}
          onShopApproved={() => optimisticShopApprove(authorizeTarget.id)}
        />
      ) : null}
      </JobBoardMessagesProvider>
    </JobBoardHistoryProvider>
  );
}

function Column({
  columnId,
  styleKind,
  title,
  subtitle,
  cards,
  columnTotal: totalCents,
  compact,
  emptyHint,
  moveTargets,
  onMove,
  onAuthorize,
  onArchive,
  draggedRef,
  selectedRoId,
  cardHref,
}: {
  columnId: string;
  styleKind: BoardColumn;
  title: string;
  subtitle: string;
  cards: JobCardData[];
  columnTotal: number | null;
  compact: boolean;
  emptyHint: string;
  moveTargets: { id: string; title: string }[];
  onMove: (cardId: string, toColumnId: string) => void;
  onAuthorize: (card: JobCardData) => void;
  onArchive: (cardId: string) => void;
  draggedRef: React.RefObject<boolean>;
  selectedRoId: string | null;
  cardHref?: (cardId: string) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const theme = JOB_BOARD_COLUMN[styleKind];
  return (
    <div className="job-board-col">
      <div className={theme.header}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="job-board-col-title">{title}</h2>
              <span className="job-board-col-badge">{cards.length}</span>
            </div>
            <p className="job-board-col-subtitle">{subtitle}</p>
            {totalCents != null ? (
              <p className="job-board-col-total">{formatCents(totalCents)} pipeline</p>
            ) : null}
          </div>
        </div>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            theme.body,
            "flex-1 space-y-2 overflow-y-auto p-2",
            isOver && theme.dropOver,
            compact && "min-h-[120px]",
          )}
        >
          {cards.length === 0 ? (
            <div className="job-board-col-empty">{emptyHint}</div>
          ) : (
            cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                columnId={columnId}
                styleKind={styleKind}
                moveTargets={moveTargets}
                onMove={onMove}
                onAuthorize={onAuthorize}
                onArchive={onArchive}
                draggedRef={draggedRef}
                selected={card.id === selectedRoId}
                cardHref={cardHref}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  card,
  columnId,
  styleKind,
  moveTargets,
  onMove,
  onAuthorize,
  onArchive,
  draggedRef,
  selected,
  cardHref,
}: {
  card: JobCardData;
  columnId: string;
  styleKind: BoardColumn;
  moveTargets: { id: string; title: string }[];
  onMove: (cardId: string, toColumnId: string) => void;
  onAuthorize: (card: JobCardData) => void;
  onArchive: (cardId: string) => void;
  draggedRef: React.RefObject<boolean>;
  selected: boolean;
  cardHref?: (cardId: string) => string;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const isEstimate = styleKind === "estimates";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (draggedRef.current) return;
        router.push(cardHref ? cardHref(card.id) : defaultRoOpenHref(card.id));
      }}
      className={cn(
        "touch-none cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <JobCard
        card={card}
        column={styleKind}
        selected={selected}
        menu={
          <JobCardMenu
            columnId={columnId}
            moveTargets={moveTargets}
            isEstimate={isEstimate}
            canArchive={card.canArchive}
            onMove={(to) => onMove(card.id, to)}
            onAuthorize={() => onAuthorize(card)}
            onArchive={() => onArchive(card.id)}
          />
        }
      />
    </div>
  );
}
