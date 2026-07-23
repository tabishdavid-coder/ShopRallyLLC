import { z } from "zod";

import { TIRE_STOCK_CSV_HEADERS } from "@/lib/tire-stock";

const SeasonalitySchema = z
  .enum([
    "SUMMER",
    "WINTER",
    "ALL_SEASON",
    "ALL_WEATHER",
    "summer",
    "winter",
    "all_season",
    "all season",
    "all-season",
    "all seasons",
    "all_seasons",
    "all weather",
    "all-weather",
    "All Season",
    "All Seasons",
    "All Weather",
  ])
  .transform((v) => {
    const n = v.toLowerCase().replace(/[\s-]+/g, "_");
    if (n === "summer") return "SUMMER" as const;
    if (n === "winter") return "WINTER" as const;
    if (n === "all_season" || n === "all_seasons") return "ALL_SEASON" as const;
    if (n === "all_weather") return "ALL_WEATHER" as const;
    return v.toUpperCase() as "SUMMER" | "WINTER" | "ALL_SEASON" | "ALL_WEATHER";
  });

function parseOptionalInt(v: string | undefined): number | undefined {
  if (!v?.trim()) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function dollarsToCents(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const RowSchema = z.object({
  stockNumber: z.string().trim().min(1, "stockNumber is required").max(64),
  brand: z.string().trim().min(1, "brand is required").max(80),
  model: z.string().trim().min(1, "model is required").max(120),
  size: z.string().trim().min(1, "size is required").max(32),
  width: z.coerce.number().int().min(1).max(999).optional(),
  aspectRatio: z.coerce.number().int().min(1).max(99).optional(),
  rimDiameter: z.coerce.number().int().min(1).max(99).optional(),
  loadSpeed: z.string().trim().max(16).optional(),
  seasonality: SeasonalitySchema.optional(),
  condition: z
    .enum(["NEW", "USED", "new", "used", "New", "Used"])
    .transform((v) => v.toUpperCase() as "NEW" | "USED"),
  quantityOnHand: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  reorderQty: z.coerce.number().int().min(0).optional(),
  costCents: z.coerce.number().int().min(0),
  retailCents: z.coerce.number().int().min(0),
  binLocation: z.string().trim().max(40).optional(),
  dotCode: z.string().trim().max(16).optional(),
  treadDepth32nds: z.coerce.number().int().min(0).max(32).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ParsedTireStockCsvRow = z.infer<typeof RowSchema>;

export type TireStockCsvParseResult = {
  rows: ParsedTireStockCsvRow[];
  errors: { row: number; message: string }[];
};

export function parseTireStockCsv(text: string): TireStockCsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV is empty." }] };
  }

  const headerCells = parseCsvLine(lines[0]!).map((h) => h.trim());
  const expected = [...TIRE_STOCK_CSV_HEADERS];
  const headerOk =
    headerCells.length === expected.length &&
    headerCells.every((h, i) => h.toLowerCase() === expected[i]!.toLowerCase());

  if (!headerOk) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `Header must match template: ${expected.join(", ")}`,
        },
      ],
    };
  }

  const rows: ParsedTireStockCsvRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seenStock = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cells = parseCsvLine(lines[i]!);
    if (cells.every((c) => !c.trim())) continue;

    const record: Record<string, string> = {};
    expected.forEach((key, idx) => {
      record[key] = cells[idx]?.trim() ?? "";
    });

    const costCents = dollarsToCents(record.cost ?? "0");
    const retailCents = dollarsToCents(record.retail ?? "0");

    const parsed = RowSchema.safeParse({
      stockNumber: record.stockNumber,
      brand: record.brand,
      model: record.model,
      size: record.size,
      width: parseOptionalInt(record.width),
      aspectRatio: parseOptionalInt(record.aspectRatio),
      rimDiameter: parseOptionalInt(record.rimDiameter),
      loadSpeed: record.loadSpeed || undefined,
      seasonality: record.seasonality || undefined,
      condition: record.condition || "NEW",
      quantityOnHand: record.quantityOnHand || "0",
      reorderPoint: record.reorderPoint || "0",
      reorderQty: record.reorderQty || "0",
      costCents,
      retailCents,
      binLocation: record.binLocation || undefined,
      dotCode: record.dotCode || undefined,
      treadDepth32nds: record.treadDepth32nds || undefined,
      notes: record.notes || undefined,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues.map((iss) => iss.message).join("; ");
      errors.push({ row: rowNum, message: msg });
      continue;
    }

    const sn = parsed.data.stockNumber.toLowerCase();
    if (seenStock.has(sn)) {
      errors.push({ row: rowNum, message: `Duplicate stockNumber "${parsed.data.stockNumber}" in file.` });
      continue;
    }
    seenStock.add(sn);
    rows.push(parsed.data);
  }

  return { rows, errors };
}

export function tireStockTemplateCsv(): string {
  const header = TIRE_STOCK_CSV_HEADERS.join(",");
  const sample = [
    "TR-MIC-2254517",
    "Michelin",
    "Defender T+H",
    "225/45R17",
    "225",
    "45",
    "17",
    "91H",
    "ALL_SEASON",
    "NEW",
    "8",
    "4",
    "8",
    "89.00",
    "149.00",
    "T1-A3",
    "",
    "",
    "Passenger all-season",
  ]
    .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
    .join(",");
  return `${header}\n${sample}\n`;
}
