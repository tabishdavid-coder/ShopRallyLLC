export type ParsedYmm = {
  year: number;
  make: string;
  model: string;
};

const MIN_MODEL_YEAR = 1900;

const MAKE_ALIASES: Array<[RegExp, string]> = [
  [/^acura\b/i, "Acura"],
  [/^audi\b/i, "Audi"],
  [/^bmw\b/i, "BMW"],
  [/^buick\b/i, "Buick"],
  [/^cadillac\b/i, "Cadillac"],
  [/^chev(?:rolet|y)?\b/i, "Chevrolet"],
  [/^chrysler\b/i, "Chrysler"],
  [/^dodge\b/i, "Dodge"],
  [/^fiat\b/i, "FIAT"],
  [/^ford\b/i, "Ford"],
  [/^genesis\b/i, "Genesis"],
  [/^gmc\b/i, "GMC"],
  [/^honda\b/i, "Honda"],
  [/^hyundai\b/i, "Hyundai"],
  [/^infiniti\b/i, "INFINITI"],
  [/^jaguar\b/i, "Jaguar"],
  [/^jeep\b/i, "Jeep"],
  [/^kia\b/i, "Kia"],
  [/^land\s+rover\b/i, "Land Rover"],
  [/^lexus\b/i, "Lexus"],
  [/^lincoln\b/i, "Lincoln"],
  [/^mazda\b/i, "Mazda"],
  [/^mercedes(?:-|\s+)?benz\b/i, "Mercedes-Benz"],
  [/^mercury\b/i, "Mercury"],
  [/^mini\b/i, "MINI"],
  [/^mitsubishi\b/i, "Mitsubishi"],
  [/^nissan\b/i, "Nissan"],
  [/^porsche\b/i, "Porsche"],
  [/^ram\b/i, "Ram"],
  [/^subaru\b/i, "Subaru"],
  [/^tesla\b/i, "Tesla"],
  [/^toyota\b/i, "Toyota"],
  [/^volkswagen\b/i, "Volkswagen"],
  [/^volvo\b/i, "Volvo"],
];

function currentMaxModelYear() {
  return new Date().getFullYear() + 1;
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/[,\t]+/g, " ").replace(/\s+/g, " ");
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => {
      if (/^[A-Z0-9-]{2,}$/.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function resolveMake(value: string): { make: string; rest: string } | null {
  for (const [pattern, make] of MAKE_ALIASES) {
    const match = value.match(pattern);
    if (match?.[0]) {
      return { make, rest: normalizeWhitespace(value.slice(match[0].length)) };
    }
  }

  const [first, ...rest] = value.split(/\s+/);
  if (!first || rest.length === 0) return null;
  return { make: titleCase(first), rest: rest.join(" ") };
}

/**
 * Parse a human-entered year/make/model search such as "2014 Honda Accord".
 * Returns null for plate/VIN-like values or incomplete YMM phrases.
 */
export function parseYmmSearch(value: string): ParsedYmm | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return null;

  const match = normalized.match(/^(\d{4})\s+(.+)$/);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isInteger(year) || year < MIN_MODEL_YEAR || year > currentMaxModelYear()) {
    return null;
  }

  const makeResult = resolveMake(match[2]);
  if (!makeResult || !makeResult.rest) return null;

  const [model] = makeResult.rest.split(/\s+/);
  if (!model) return null;

  return {
    year,
    make: makeResult.make,
    model: titleCase(model),
  };
}
