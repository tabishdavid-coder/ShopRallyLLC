import { z } from "zod";

export const NhtsaRecallItemSchema = z.object({
  campaignNumber: z.string(),
  component: z.string(),
  summary: z.string(),
  consequence: z.string().optional(),
  remedy: z.string().optional(),
  reportDate: z.string().optional(),
});

export type NhtsaRecallItem = z.infer<typeof NhtsaRecallItemSchema>;

export const VehicleRecallsCacheSchema = z.object({
  fetchedAt: z.string(),
  items: z.array(NhtsaRecallItemSchema),
});

export type VehicleRecallsCache = z.infer<typeof VehicleRecallsCacheSchema>;

export const RECALLS_CACHE_TTL_DAYS = 7;
export const RECALLS_CACHE_TTL_MS = RECALLS_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

export function parseRecallsCache(raw: unknown): VehicleRecallsCache | null {
  const parsed = VehicleRecallsCacheSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function isRecallsCacheFresh(cache: VehicleRecallsCache | null): boolean {
  if (!cache?.fetchedAt) return false;
  const t = Date.parse(cache.fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < RECALLS_CACHE_TTL_MS;
}
