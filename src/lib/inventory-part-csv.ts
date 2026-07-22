import { z } from "zod";

/** CSV template + import column headers (order matters). */
export const INVENTORY_PART_CSV_HEADERS = [
  "partNumber",
  "description",
  "brand",
  "category",
  "vendorName",
  "vendorPartNumber",
  "quantityOnHand",
  "reorderPoint",
  "reorderQty",
  "cost",
  "retail",
  "binLocation",
  "notes",
] as const;

export type InventoryPartCsvHeader = (typeof INVENTORY_PART_CSV_HEADERS)[number];

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
  partNumber: z.string().trim().min(1, "partNumber is required").max(64),
  description: z.string().trim().min(1, "description is required").max(200),
  brand: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  vendorName: z.string().trim().max(120).optional(),
  vendorPartNumber: z.string().trim().max(64).optional(),
  quantityOnHand: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  reorderQty: z.coerce.number().int().min(0).optional(),
  costCents: z.coerce.number().int().min(0),
  retailCents: z.coerce.number().int().min(0),
  binLocation: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ParsedInventoryPartCsvRow = z.infer<typeof RowSchema>;

export type InventoryPartCsvParseResult = {
  rows: ParsedInventoryPartCsvRow[];
  errors: { row: number; message: string }[];
};

export function parseInventoryPartCsv(text: string): InventoryPartCsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV is empty." }] };
  }

  const headerCells = parseCsvLine(lines[0]!).map((h) => h.trim());
  const expected = [...INVENTORY_PART_CSV_HEADERS];
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

  const rows: ParsedInventoryPartCsvRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seenPartNumbers = new Set<string>();

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
      partNumber: record.partNumber,
      description: record.description,
      brand: record.brand || undefined,
      category: record.category || undefined,
      vendorName: record.vendorName || undefined,
      vendorPartNumber: record.vendorPartNumber || undefined,
      quantityOnHand: record.quantityOnHand || "0",
      reorderPoint: record.reorderPoint || "0",
      reorderQty: record.reorderQty || "0",
      costCents,
      retailCents,
      binLocation: record.binLocation || undefined,
      notes: record.notes || undefined,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues.map((iss) => iss.message).join("; ");
      errors.push({ row: rowNum, message: msg });
      continue;
    }

    const pn = parsed.data.partNumber.toLowerCase();
    if (seenPartNumbers.has(pn)) {
      errors.push({
        row: rowNum,
        message: `Duplicate partNumber "${parsed.data.partNumber}" in file.`,
      });
      continue;
    }
    seenPartNumbers.add(pn);
    rows.push(parsed.data);
  }

  return { rows, errors };
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function inventoryPartTemplateCsv(): string {
  const header = INVENTORY_PART_CSV_HEADERS.join(",");
  const sample = [
    "FL-1A-WIX",
    "Oil filter",
    "WIX",
    "Filters",
    "WorldPac",
    "51056",
    "12",
    "4",
    "8",
    "4.25",
    "8.99",
    "A2-B1",
    "Fits most 4-cyl imports",
  ]
    .map((v) => csvEscape(v))
    .join(",");
  return `${header}\n${sample}\n`;
}
