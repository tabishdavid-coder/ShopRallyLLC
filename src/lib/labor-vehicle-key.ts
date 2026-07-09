/** Vehicle identity for labor guide cache — vin10-first, YMM+engine fallback. */

export type LaborVehicle = {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  drivetrain?: string | null;
};

export type StoredLaborVehicle = {
  vehicleKey: string;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleEngine?: string | null;
  vehicleVin?: string | null;
};

/** Collapse case/whitespace/punctuation so trivially-different inputs collide. */
export function normalizeLaborText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeVin(vin: string): string {
  return vin.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/** First 10 VIN characters (WMI + VDS) — primary labor cache identity when VIN present. */
export function vin10FromVin(rawVin: string): string | null {
  const vin = normalizeVin(rawVin);
  if (vin.length < 10) return null;
  return vin.slice(0, 10);
}

export function vin10VehicleKey(rawVin: string): string {
  const prefix = vin10FromVin(rawVin);
  if (!prefix) throw new Error("VIN too short");
  return `vin10:${prefix}`;
}

/** MOTOR ByVIN search attempts: full VIN first, then 10-char prefix (sandbox partial match). */
export function motorVinLookupAttempts(rawVin: string): string[] {
  const vin = normalizeVin(rawVin);
  const attempts: string[] = [];
  if (vin.length >= 11) attempts.push(vin);
  const prefix = vin.slice(0, 10);
  if (prefix.length >= 10 && !attempts.includes(prefix)) attempts.push(prefix);
  if (!attempts.length && vin.length >= 3) attempts.push(vin);
  return attempts;
}

/** Full VIN from stored column or vin: vehicleKey prefix. */
export function effectiveRowVin(row: StoredLaborVehicle): string | null {
  const fromCol = row.vehicleVin?.trim();
  if (fromCol) return normalizeVin(fromCol);
  if (row.vehicleKey.startsWith("vin:")) {
    const parsed = row.vehicleKey.slice(4).trim();
    return parsed ? normalizeVin(parsed) : null;
  }
  return null;
}

/** vin10 prefix from stored column or vin10:/vin: vehicleKey prefix. */
export function effectiveRowVin10(row: StoredLaborVehicle): string | null {
  if (row.vehicleKey.startsWith("vin10:")) {
    const parsed = row.vehicleKey.slice(6).trim();
    return parsed ? normalizeVin(parsed).slice(0, 10) : null;
  }
  const fromCol = row.vehicleVin?.trim();
  if (fromCol) {
    const vin = normalizeVin(fromCol);
    if (vin.length >= 10) return vin.slice(0, 10);
  }
  if (row.vehicleKey.startsWith("vin:")) {
    const parsed = row.vehicleKey.slice(4).trim();
    if (parsed) {
      const vin = normalizeVin(parsed);
      if (vin.length >= 10) return vin.slice(0, 10);
    }
  }
  return null;
}

/** Strip body-style tokens so "Accord Sedan" matches cached "Accord". */
export function canonicalModelForMatch(model: string): string {
  return normalizeLaborText(model)
    .replace(
      /\b(sedan|coupe|hatchback|wagon|suv|crossover|pickup|truck|van|minivan|4dr|2dr|4wd|awd|fwd|rwd|cab|crew|extended|supercrew|supercab)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** True when two model strings refer to the same name (Accord ≈ Accord Sedan). */
export function modelsCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = a ? canonicalModelForMatch(a) : "";
  const nb = b ? canonicalModelForMatch(b) : "";
  if (!na || !nb) return true;
  if (na === nb) return true;
  return na.startsWith(nb) || nb.startsWith(na);
}

/** Extract comparable engine token (displacement + cyl layout). */
export function normalizeEngineForMatch(engine: string): string {
  const n = normalizeLaborText(engine);
  const parts: string[] = [];
  const disp = n.match(/\d+\s*\d*\s*l/);
  if (disp) parts.push(disp[0].replace(/\s+/g, " "));
  if (/\bv\d\b/.test(n) || /\bv6\b/.test(n) || /\bv8\b/.test(n)) {
    const v = n.match(/\bv\d+\b|\bv6\b|\bv8\b/);
    if (v) parts.push(v[0]);
  }
  if (/\bi\d\b/.test(n) || n.includes("4 cyl") || n.includes("6 cyl") || n.includes("8 cyl")) {
    const c = n.match(/\d+\s*cyl|\bi\d\b/);
    if (c) parts.push(c[0]);
  }
  return parts.length ? parts.join(" ") : n;
}

export function enginesCompatible(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = a ? normalizeEngineForMatch(a) : "";
  const nb = b ? normalizeEngineForMatch(b) : "";
  if (!na || !nb) return true;
  if (na === nb) return true;
  // Same displacement is enough when both specify it (e.g. "3 5l" vs "3 5l v6")
  const da = na.match(/\d+\s*\d*\s*l/)?.[0];
  const db = nb.match(/\d+\s*\d*\s*l/)?.[0];
  if (da && db && da === db) return true;
  return false;
}

/** Prefer canonical model so typed "Accord Sedan" shares keys with catalog "Accord". */
function laborModelToken(model: string | null | undefined): string {
  if (!model?.trim()) return "";
  return canonicalModelForMatch(model) || normalizeLaborText(model);
}

/** @deprecated Legacy key format (no prefix). Kept for existing cache rows. */
export function legacyVehicleKey(v: LaborVehicle): string {
  return [v.year ?? "", v.make ?? "", laborModelToken(v.model), v.engine ?? ""]
    .map((p) => normalizeLaborText(String(p)))
    .join("|");
}

/** Year|make|model without engine — broader lookup for legacy cache rows. */
export function ymmBaseVehicleKey(v: LaborVehicle): string {
  return [v.year ?? "", v.make ?? "", laborModelToken(v.model)]
    .map((p) => normalizeLaborText(String(p)))
    .join("|");
}

/** @deprecated Legacy full-VIN key — read-only during migration; not primary write. */
export function vinVehicleKey(vin: string): string {
  return `vin:${normalizeVin(vin)}`;
}

export function ymmVehicleKey(v: LaborVehicle): string {
  return `ymm:${legacyVehicleKey(v)}`;
}

export function ymmBasePrefixedKey(v: LaborVehicle): string {
  return `ymm:${ymmBaseVehicleKey(v)}`;
}

/** Key used when writing new LaborOperation rows — vin10 when VIN ≥ 10 chars, else YMM. */
export function primaryVehicleKey(v: LaborVehicle): string {
  const vin = v.vin?.trim();
  if (vin && vin10FromVin(vin)) return vin10VehicleKey(vin);
  return ymmVehicleKey(v);
}

function addVinCacheKeys(keys: Set<string>, vin: string): void {
  const normalized = normalizeVin(vin);
  const prefix = vin10FromVin(vin);
  if (prefix) keys.add(vin10VehicleKey(vin));
  // Legacy full-VIN key for dual-read during migration
  if (normalized.length >= 11) keys.add(vinVehicleKey(vin));
}

/** All cache keys to query for this vehicle (vin10 + YMM + legacy vin:17 variants). */
export function vehicleKeysForLookup(v: LaborVehicle): string[] {
  const keys = new Set<string>();
  const vin = v.vin?.trim();
  if (vin) addVinCacheKeys(keys, vin);
  keys.add(ymmVehicleKey(v));
  keys.add(ymmBasePrefixedKey(v));
  keys.add(legacyVehicleKey(v));
  keys.add(ymmBaseVehicleKey(v));

  // Dual-read: raw typed model ("accord sedan") vs canonical ("accord") for older cache rows.
  const rawModel = v.model?.trim() ? normalizeLaborText(v.model) : "";
  const canon = laborModelToken(v.model);
  if (rawModel && canon && rawModel !== canon) {
    const rawYmm = [v.year ?? "", v.make ?? "", rawModel, v.engine ?? ""]
      .map((p) => normalizeLaborText(String(p)))
      .join("|");
    const rawBase = [v.year ?? "", v.make ?? "", rawModel]
      .map((p) => normalizeLaborText(String(p)))
      .join("|");
    keys.add(`ymm:${rawYmm}`);
    keys.add(`ymm:${rawBase}`);
    keys.add(rawYmm);
    keys.add(rawBase);
  }
  return [...keys];
}

/** Keys to persist on write / promote so same-YMM vehicles reuse cached labor. */
export function vehicleKeysForWriteThrough(v: LaborVehicle): string[] {
  return vehicleKeysForLookup(v);
}

/** YMM + legacy keys only — used when promoting a VIN-level hit to siblings. */
export function ymmVehicleKeysForPromote(v: LaborVehicle): string[] {
  return vehicleKeysForWriteThrough(v).filter(
    (k) => !k.startsWith("vin:") && !k.startsWith("vin10:"),
  );
}

/** Higher = better match when deduping the same query across keys. */
export function vehicleKeyMatchRank(key: string): number {
  if (key.startsWith("vin10:")) return 4;
  if (key.startsWith("vin:")) return 3;
  if (key.startsWith("ymm:")) return 2;
  return 1;
}

export function vehicleDisplayLabel(v: LaborVehicle): string {
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const specs = [v.trim, v.engine, v.drivetrain].filter(Boolean).join(" · ");
  const base = specs ? `${ymm} (${specs})` : ymm;
  const vin = v.vin?.trim();
  if (vin && base) return `${base} · VIN …${vin.slice(-6)}`;
  if (vin) return `VIN ${vin}`;
  return base || "Unknown vehicle";
}

function normOptional(s: string | null | undefined): string {
  return s ? normalizeLaborText(s) : "";
}

function vin10Compatible(
  rowVin10: string | null,
  vehVin10: string | null,
): boolean {
  if (!rowVin10 || !vehVin10) return true;
  return rowVin10 === vehVin10;
}

function fullVinCompatible(rowVin: string | null, vehVin: string | null): boolean {
  if (!rowVin || !vehVin) return true;
  if (rowVin === vehVin) return true;
  return vin10Compatible(vin10FromVin(rowVin), vin10FromVin(vehVin));
}

/** Strict check that a cached row belongs to this vehicle (guards stale/wrong keys). */
export function storedRowMatchesVehicle(row: StoredLaborVehicle, v: LaborVehicle): boolean {
  const vehVin = v.vin?.trim() ? normalizeVin(v.vin.trim()) : null;
  const vehVin10 = vehVin ? vin10FromVin(vehVin) : null;
  const rowVin = effectiveRowVin(row);
  const rowVin10 = effectiveRowVin10(row);

  if (row.vehicleKey.startsWith("vin10:")) {
    if (vehVin10 && rowVin10 && !vin10Compatible(rowVin10, vehVin10)) return false;
  } else if (row.vehicleKey.startsWith("vin:")) {
    if (!fullVinCompatible(rowVin, vehVin)) return false;
  } else if (rowVin && vehVin && !fullVinCompatible(rowVin, vehVin)) {
    return false;
  }

  if (v.year != null && row.vehicleYear != null && v.year !== row.vehicleYear) return false;

  const make = normOptional(v.make);
  const rowMake = normOptional(row.vehicleMake);
  if (make && rowMake && make !== rowMake) return false;

  if (!modelsCompatible(v.model, row.vehicleModel)) return false;

  if (!enginesCompatible(v.engine, row.vehicleEngine)) return false;

  return true;
}

/** Human label for how a hit matched the active vehicle. */
export function vehicleMatchLabel(row: StoredLaborVehicle, v: LaborVehicle): string {
  const vehVin10 = v.vin?.trim() ? vin10FromVin(v.vin.trim()) : null;
  const rowVin10 = effectiveRowVin10(row);
  if (rowVin10 && vehVin10 && rowVin10 === vehVin10) return "VIN match";
  const rowVin = effectiveRowVin(row);
  const vehVin = v.vin?.trim() ? normalizeVin(v.vin.trim()) : null;
  if (rowVin && vehVin && rowVin === vehVin) return "VIN match";
  return "YMM match";
}
