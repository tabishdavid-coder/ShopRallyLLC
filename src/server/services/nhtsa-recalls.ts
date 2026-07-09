import "server-only";

import type { NhtsaRecallItem } from "@/lib/vehicle-recalls";

const NHTSA_RECALLS = "https://api.nhtsa.gov/recalls/recallsByVehicle";

type NhtsaRecallResponse = {
  Count?: number;
  Message?: string;
  results?: Array<Record<string, unknown>>;
};

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Free NHTSA safety recalls for a year/make/model combination. */
export async function fetchRecallsByVehicle(opts: {
  year: number;
  make: string;
  model: string;
}): Promise<NhtsaRecallItem[]> {
  const params = new URLSearchParams({
    make: opts.make.trim(),
    model: opts.model.trim(),
    modelYear: String(opts.year),
  });

  const res = await fetch(`${NHTSA_RECALLS}?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ShopRally/1.0 (vehicle-recalls)",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`NHTSA recalls unavailable (${res.status}).`);
  }

  const json = (await res.json()) as NhtsaRecallResponse;
  const rows = json.results ?? [];

  return rows
    .map((row): NhtsaRecallItem | null => {
      const campaignNumber = pickString(row, "NHTSACampaignNumber", "CampaignNumber");
      const component = pickString(row, "Component", "Components");
      const summary = pickString(row, "Summary", "DefectSummary");
      if (!campaignNumber && !summary) return null;
      return {
        campaignNumber: campaignNumber || "—",
        component: component || "General",
        summary: summary || "No summary provided.",
        consequence: pickString(row, "Consequence") || undefined,
        remedy: pickString(row, "Remedy") || undefined,
        reportDate: pickString(row, "ReportReceivedDate", "ReportDate") || undefined,
      };
    })
    .filter((r): r is NhtsaRecallItem => r !== null);
}
