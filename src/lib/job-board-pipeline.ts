import { z } from "zod";

import type { BoardColumn, JobCard } from "@/lib/job-board";
import { COLUMN_OF } from "@/lib/job-board";
import {
  JOB_BOARD_COLUMN_META,
  jobBoardCoreThemeHex,
  pickCustomAccentColor,
  type JobBoardColumnTheme,
} from "@/lib/job-board-theme";

/** Core pipeline stage — maps to RO status grouping. */
export type PipelineColumnKind = BoardColumn | "custom";

export type PipelineColumn = {
  id: string;
  kind: PipelineColumnKind;
  title: string;
  subtitle: string;
  /** Optional persisted accent for custom sections (expand-only). */
  accentColor?: string;
};

export type JobBoardPipelineConfig = {
  columns: PipelineColumn[];
};

export const PIPELINE_CORE_KINDS: BoardColumn[] = ["estimates", "workInProgress", "completed"];

const ColumnSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["estimates", "workInProgress", "completed", "custom"]),
  title: z.string().min(1).max(80),
  subtitle: z.string().max(200).default(""),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const JobBoardPipelineConfigSchema = z.object({
  columns: z.array(ColumnSchema).min(3).max(12),
});

/** Industry-standard default labels (shop-management conventions). */
export function defaultJobBoardPipelineConfig(): JobBoardPipelineConfig {
  return {
    columns: [
      {
        id: "estimates",
        kind: "estimates",
        title: "Estimates",
        subtitle: "Build & send",
      },
      {
        id: "workInProgress",
        kind: "workInProgress",
        title: "Work in Progress",
        subtitle: "Work in progress",
      },
      {
        id: "completed",
        kind: "completed",
        title: "Completed",
        subtitle: "Ready for pickup",
      },
    ],
  };
}

/** Merge stored shop config with required core columns. */
export function resolveJobBoardPipelineConfig(raw: unknown): JobBoardPipelineConfig {
  const parsed = JobBoardPipelineConfigSchema.safeParse(raw);
  if (!parsed.success) return defaultJobBoardPipelineConfig();

  const defaults = defaultJobBoardPipelineConfig();
  const byKind = new Map<BoardColumn, PipelineColumn>();
  const customs: PipelineColumn[] = [];

  for (const col of parsed.data.columns) {
    if (col.kind === "custom") {
      customs.push(col);
    } else {
      byKind.set(col.kind, col);
    }
  }

  /** Migrate legacy ALL-CAPS defaults to Title Case without wiping custom labels. */
  const legacyCoreTitles = new Set([
    "ESTIMATES",
    "WORK IN PROGRESS",
    "COMPLETED",
  ]);

  const columns: PipelineColumn[] = PIPELINE_CORE_KINDS.map((kind) => {
    const saved = byKind.get(kind);
    const fallback = defaults.columns.find((c) => c.kind === kind)!;
    if (!saved) return fallback;
    const title = legacyCoreTitles.has(saved.title.trim()) ? fallback.title : saved.title;
    const legacyCoreSubtitles = new Set([
      "Quotes awaiting customer or shop authorization",
      "Quotes awaiting authorization",
      "Authorized jobs actively in the bay",
      "Authorized jobs in the bay",
      "On the lift",
      "Ready to invoice or collect payment",
      "Ready to invoice or collect",
    ]);
    const subtitle =
      !saved.subtitle || legacyCoreSubtitles.has(saved.subtitle)
        ? fallback.subtitle
        : saved.subtitle;
    return { ...fallback, ...saved, title, subtitle, id: kind, kind };
  });

  columns.push(...customs.map((col, index) => withCustomAccent(col, customs.slice(0, index))));
  return { columns };
}

function withCustomAccent(col: PipelineColumn, priorCustoms: PipelineColumn[]): PipelineColumn {
  if (col.kind !== "custom") return col;
  return {
    ...col,
    accentColor: col.accentColor ?? pickCustomAccentColor(priorCustoms),
  };
}

export function pipelineColumnKind(columnId: string, config: JobBoardPipelineConfig): PipelineColumnKind | null {
  return config.columns.find((c) => c.id === columnId)?.kind ?? null;
}

export function isCorePipelineColumnId(columnId: string): columnId is BoardColumn {
  return PIPELINE_CORE_KINDS.includes(columnId as BoardColumn);
}

/** Which column an RO belongs on — custom bucket overrides status grouping. */
export function resolveRoPipelineColumnId(
  ro: { status: JobCard["status"]; jobBoardColumnId: string | null },
  config: JobBoardPipelineConfig,
): string {
  if (ro.jobBoardColumnId) {
    const custom = config.columns.find((c) => c.id === ro.jobBoardColumnId && c.kind === "custom");
    if (custom) return custom.id;
  }
  return COLUMN_OF[ro.status];
}

export function newCustomPipelineColumn(
  title: string,
  existingCustoms: PipelineColumn[] = [],
): PipelineColumn {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const id = `custom-${slug || "section"}-${Date.now().toString(36)}`;
  return {
    id,
    kind: "custom",
    title: title.trim().slice(0, 80),
    subtitle: "",
    accentColor: pickCustomAccentColor(existingCustoms),
  };
}

function pipelineStageLabel(col: PipelineColumn): string {
  if (col.kind !== "custom") {
    return JOB_BOARD_COLUMN_META[col.kind].subtitle;
  }
  return col.subtitle.trim() || col.title.trim();
}

/** Resolve header + card chrome for any pipeline column (core or custom). */
export function resolvePipelineColumnTheme(
  col: PipelineColumn,
  allColumns: PipelineColumn[],
): JobBoardColumnTheme {
  const columnIndex = Math.max(
    0,
    allColumns.findIndex((c) => c.id === col.id),
  );
  const columnCount = allColumns.length;

  if (col.kind !== "custom") {
    return {
      hex: jobBoardCoreThemeHex(col.kind),
      stageLabel: JOB_BOARD_COLUMN_META[col.kind].subtitle,
      columnIndex,
      columnCount,
      coreColumn: col.kind,
    };
  }

  const customsBefore = allColumns
    .slice(0, columnIndex)
    .filter((c) => c.kind === "custom");
  const hex = col.accentColor ?? pickCustomAccentColor(customsBefore);

  return {
    hex,
    stageLabel: pipelineStageLabel(col),
    columnIndex,
    columnCount,
  };
}

/** @deprecated Use resolvePipelineColumnTheme — kept for legacy callers. */
export function pipelineColumnStyleKind(kind: PipelineColumnKind): BoardColumn {
  return kind === "custom" ? "workInProgress" : kind;
}
