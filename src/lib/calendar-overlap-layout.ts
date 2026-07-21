/** Pixel gutters inside a day column — keeps adjacent chips visually separate. */
export const CALENDAR_CHIP_VERTICAL_GAP = 2;
export const CALENDAR_CHIP_HORIZONTAL_INSET = 4;
export const CALENDAR_CHIP_MIN_HEIGHT = 24;

export type CalendarLayoutInput = {
  id: string;
  startAt: string;
  endAt: string;
};

export type CalendarLayoutPosition = {
  id: string;
  top: number;
  height: number;
  column: number;
  colSpan: number;
  totalColumns: number;
};

type TimedEvent = CalendarLayoutInput & {
  startMs: number;
  endMs: number;
};

type PlacedEvent = TimedEvent & {
  column: number;
  colSpan: number;
  totalColumns: number;
};

/** Convert ISO range to pixel top/height on the day grid. */
export function calendarRangeToPixels(
  startAt: string,
  endAt: string,
  dayStartMins: number,
  hourHeight: number,
): { top: number; height: number } {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startOffset = start.getHours() * 60 + start.getMinutes() - dayStartMins;
  const endOffset = end.getHours() * 60 + end.getMinutes() - dayStartMins;
  const rawTop = Math.max(0, (startOffset / 60) * hourHeight);
  const rawHeight = Math.max(
    CALENDAR_CHIP_MIN_HEIGHT,
    ((endOffset - startOffset) / 60) * hourHeight,
  );
  return {
    top: rawTop + CALENDAR_CHIP_VERTICAL_GAP / 2,
    height: Math.max(CALENDAR_CHIP_MIN_HEIGHT, rawHeight - CALENDAR_CHIP_VERTICAL_GAP),
  };
}

/**
 * Standard day-column overlap pack (Outlook / Google Calendar style):
 * 1. Sort by start, then longer events first within the same start.
 * 2. Split into overlap clusters (transitive).
 * 3. Greedy column assignment within each cluster.
 * 4. Optional horizontal expansion when a column to the right is free for the event span.
 */
export function layoutCalendarDayEvents(
  events: CalendarLayoutInput[],
  dayStartMins: number,
  hourHeight: number,
): CalendarLayoutPosition[] {
  if (events.length === 0) return [];

  const timed: TimedEvent[] = events
    .map((event) => ({
      ...event,
      startMs: new Date(event.startAt).getTime(),
      endMs: new Date(event.endAt).getTime(),
    }))
    .sort((a, b) => {
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      return b.endMs - a.endMs;
    });

  const clusters: TimedEvent[][] = [];
  let cluster: TimedEvent[] = [];
  let clusterEnd = -Infinity;

  for (const event of timed) {
    if (cluster.length === 0 || event.startMs < clusterEnd) {
      cluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.endMs);
    } else {
      clusters.push(cluster);
      cluster = [event];
      clusterEnd = event.endMs;
    }
  }
  if (cluster.length > 0) clusters.push(cluster);

  const placed: PlacedEvent[] = [];

  for (const group of clusters) {
    const columns: number[] = [];

    for (const event of group) {
      let column = columns.findIndex((endMs) => endMs <= event.startMs);
      if (column === -1) {
        column = columns.length;
        columns.push(event.endMs);
      } else {
        columns[column] = event.endMs;
      }

      placed.push({
        ...event,
        column,
        colSpan: 1,
        totalColumns: 0,
      });
    }

    const totalColumns = Math.max(1, columns.length);
    const groupIds = new Set(group.map((e) => e.id));
    const groupPlaced = placed.filter((e) => groupIds.has(e.id));

    for (const event of groupPlaced) {
      event.totalColumns = totalColumns;

      let colSpan = 1;
      for (let col = event.column + 1; col < totalColumns; col++) {
        const blocked = groupPlaced.some(
          (other) =>
            other.id !== event.id &&
            other.column === col &&
            other.startMs < event.endMs &&
            other.endMs > event.startMs,
        );
        if (blocked) break;
        colSpan++;
      }
      event.colSpan = colSpan;
    }
  }

  return placed.map(({ id, startAt, endAt, column, colSpan, totalColumns }) => {
    const { top, height } = calendarRangeToPixels(startAt, endAt, dayStartMins, hourHeight);
    return { id, top, height, column, colSpan, totalColumns };
  });
}

/** CSS left/right for fractional column placement inside a day cell. */
export function calendarChipInsetStyle(
  column: number,
  colSpan: number,
  totalColumns: number,
): { left: string; right: string } {
  const n = Math.max(1, totalColumns);
  const leftPct = (column / n) * 100;
  const rightPct = ((n - column - colSpan) / n) * 100;
  const inset = CALENDAR_CHIP_HORIZONTAL_INSET;
  return {
    left: `calc(${leftPct}% + ${inset}px)`,
    right: `calc(${rightPct}% + ${inset}px)`,
  };
}
