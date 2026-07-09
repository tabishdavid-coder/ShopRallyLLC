"use server";

import { prisma } from "@/db/client";
import { fallbackGlobalSearchHref, looksLikeVinSearch, normalizeVinToken, parseRoSearchNumber } from "@/lib/global-search";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

/** Resolve header search to the best destination (RO detail, job board, or customers). */
export async function resolveGlobalSearchTarget(q: string): Promise<{ href: string }> {
  const term = q.trim();
  if (!term) return { href: "/customers" };

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return { href: fallbackGlobalSearchHref(term) };

  const roNumber = parseRoSearchNumber(term);
  if (roNumber) {
    const ro = await prisma.repairOrder.findFirst({
      where: { shopId, number: roNumber },
      select: { id: true },
    });
    if (ro) return { href: `/repair-orders/${ro.id}/estimate` };
    return { href: `/job-board?q=${encodeURIComponent(String(roNumber))}` };
  }

  if (looksLikeVinSearch(term)) {
    return { href: `/customers?q=${encodeURIComponent(normalizeVinToken(term))}` };
  }

  return { href: `/customers?q=${encodeURIComponent(term)}` };
}
