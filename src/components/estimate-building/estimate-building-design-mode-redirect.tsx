"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DESIGN_MODE_QUERY, isDesignModeEnabledClient } from "@/lib/design-mode-tokens";

/** Ensure estimate-building lab runs with design panel open when design mode is enabled. */
export function EstimateBuildingDesignModeRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isDesignModeEnabledClient()) return;
    if (searchParams.get(DESIGN_MODE_QUERY) === "open") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(DESIGN_MODE_QUERY, "open");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
