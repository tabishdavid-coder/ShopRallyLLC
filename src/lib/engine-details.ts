/** Structured engine fields extracted from VIN decode providers. */
export type EngineDetails = {
  displacementL: number | null;
  cylinders: number | null;
  configuration: string | null;
  fuelType: string | null;
  aspiration: string | null;
  horsepower: number | null;
};

export type EngineSpecRow = { label: string; value: string };

export function formatDisplacementL(l: number | null): string | null {
  if (l == null || !Number.isFinite(l) || l <= 0) return null;
  return `${l.toFixed(1)}L`;
}

const NA = new Set(["", "Not Applicable", "N/A", "Unknown"]);

function clean(s: string | undefined | null): string | null {
  if (!s || NA.has(s.trim())) return null;
  return s.trim();
}

function parseNum(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse common patterns in provider engine summary strings. */
export function parseEngineString(text: string | null | undefined): EngineDetails {
  const empty: EngineDetails = {
    displacementL: null,
    cylinders: null,
    configuration: null,
    fuelType: null,
    aspiration: null,
    horsepower: null,
  };
  if (!text) return empty;

  const t = text;
  const disp =
    parseNum(t.match(/([\d.]+)\s*L\b/i)?.[1]) ??
    parseNum(t.match(/^([\d.]+)\s*,/i)?.[1]) ??
    parseNum(t.match(/\b([\d.]+)\s*,\s*(?:V|I|Straight)/i)?.[1]);

  let configuration: string | null = null;
  const vMatch = t.match(/\bV(\d+)\b/i);
  const iMatch = t.match(/\bI(\d+)\b/i) ?? t.match(/\bInline[- ]?(\d+)\b/i);
  const straightMatch = t.match(/\bStraight[- ]?(\d+)\b/i);
  if (vMatch) configuration = `V${vMatch[1]}`;
  else if (straightMatch) configuration = `I${straightMatch[1]}`;
  else if (iMatch) configuration = `I${iMatch[1]}`;

  const cylFromConfig = vMatch?.[1] ?? straightMatch?.[1] ?? iMatch?.[1];
  const cylinders = cylFromConfig ? Number(cylFromConfig) : null;

  let fuelType: string | null = null;
  if (/diesel/i.test(t)) fuelType = "Diesel";
  else if (/hybrid|electric|phev|bev/i.test(t)) fuelType = "Hybrid/Electric";
  else if (/gasoline|gas\b|petrol/i.test(t)) fuelType = "Gasoline";

  let aspiration: string | null = null;
  if (/turbo/i.test(t)) aspiration = "Turbocharged";
  else if (/supercharg/i.test(t)) aspiration = "Supercharged";
  else if (disp || configuration) aspiration = "Naturally aspirated";

  const hp = parseNum(t.match(/(\d{2,4})\s*hp\b/i)?.[1]);

  return {
    displacementL: disp,
    cylinders: Number.isFinite(cylinders) ? cylinders : null,
    configuration,
    fuelType,
    aspiration,
    horsepower: hp,
  };
}

type NhtsaRaw = {
  DisplacementL?: string;
  DisplacementCC?: string;
  EngineCylinders?: string;
  EngineConfiguration?: string;
  FuelTypePrimary?: string;
  Turbo?: string;
  Supercharger?: string;
  EngineHP?: string;
  EngineKW?: string;
};

type AutoDevRaw = {
  engine?: string;
  style?: string;
};

export function engineDetailsFromNhtsa(raw: NhtsaRaw): EngineDetails {
  let displacementL = parseNum(raw.DisplacementL);
  if (displacementL == null && raw.DisplacementCC) {
    const cc = parseNum(raw.DisplacementCC);
    if (cc) displacementL = cc / 1000;
  }

  const cylinders = parseNum(raw.EngineCylinders);
  const configuration = clean(raw.EngineConfiguration);
  const fuelType = clean(raw.FuelTypePrimary)?.replace(/\s*\(.*\)/, "") ?? null;

  let aspiration: string | null = null;
  const turbo = clean(raw.Turbo);
  const superC = clean(raw.Supercharger);
  if (turbo && /^yes$/i.test(turbo)) aspiration = "Turbocharged";
  else if (superC && /^yes$/i.test(superC)) aspiration = "Supercharged";
  else if (displacementL || cylinders) aspiration = "Naturally aspirated";

  let horsepower = parseNum(raw.EngineHP);
  if (horsepower == null && raw.EngineKW) {
    const kw = parseNum(raw.EngineKW);
    if (kw) horsepower = Math.round(kw * 1.341);
  }

  return {
    displacementL,
    cylinders: cylinders != null ? Math.round(cylinders) : null,
    configuration,
    fuelType,
    aspiration,
    horsepower: horsepower != null ? Math.round(horsepower) : null,
  };
}

export function engineDetailsFromAutoDev(raw: AutoDevRaw): EngineDetails {
  const parsed = parseEngineString(raw.engine ?? raw.style ?? null);
  // Auto.dev strings rarely include HP/fuel — keep parsed displacement/config.
  return parsed;
}

/** Merge structured fields; prefer explicit provider values over string parsing. */
export function mergeEngineDetails(
  primary: EngineDetails,
  fallback: EngineDetails,
): EngineDetails {
  return {
    displacementL: primary.displacementL ?? fallback.displacementL,
    cylinders: primary.cylinders ?? fallback.cylinders,
    configuration: primary.configuration ?? fallback.configuration,
    fuelType: primary.fuelType ?? fallback.fuelType,
    aspiration: primary.aspiration ?? fallback.aspiration,
    horsepower: primary.horsepower ?? fallback.horsepower,
  };
}

/** Build display rows for UI — skips empty values. */
export function engineDetailRows(
  details: EngineDetails,
  summary: string | null,
): EngineSpecRow[] {
  const rows: EngineSpecRow[] = [];
  const disp = formatDisplacementL(details.displacementL);
  if (disp) rows.push({ label: "Displacement", value: disp });
  if (details.cylinders) rows.push({ label: "Cylinders", value: String(details.cylinders) });
  if (details.configuration) rows.push({ label: "Configuration", value: details.configuration });
  if (details.fuelType) rows.push({ label: "Fuel", value: details.fuelType });
  if (details.aspiration) rows.push({ label: "Aspiration", value: details.aspiration });
  if (details.horsepower) rows.push({ label: "Horsepower", value: `${details.horsepower} hp` });
  if (rows.length === 0 && summary) rows.push({ label: "Summary", value: summary });
  return rows;
}

/** Re-hydrate engine details from a stored decode payload or summary string. */
export function extractEngineDetails(input: {
  engine: string | null;
  raw: unknown;
}): EngineDetails {
  const fromString = parseEngineString(input.engine);
  const raw = input.raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if ("DisplacementL" in o || "EngineCylinders" in o) {
      return mergeEngineDetails(
        engineDetailsFromNhtsa(o as NhtsaRaw),
        fromString,
      );
    }
    if ("engine" in o || "style" in o) {
      return mergeEngineDetails(
        engineDetailsFromAutoDev(o as AutoDevRaw),
        fromString,
      );
    }
  }
  return fromString;
}
