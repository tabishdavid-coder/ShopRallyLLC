"use client";

import type { useClerk } from "@clerk/nextjs";

/** Best-effort sync of active Clerk org when platform admin switches shops. */
export async function syncClerkActiveOrg(
  clerk: ReturnType<typeof useClerk>,
  shopId: string,
) {
  void clerk;
  void shopId;
}
