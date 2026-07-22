"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

import { usesDocumentScroll } from "@/lib/document-scroll-routes";

/**
 * Root layout body scroll mode is set from middleware `x-pathname` on the
 * first server render. App Router keeps the root layout across client
 * navigations, so CRM → marketing (e.g. /features) can leave
 * `h-svh overflow-hidden` stuck — content renders but cannot scroll
 * ("phantom page"). Re-apply scroll mode whenever the pathname changes.
 */
export function DocumentScrollSync() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    const documentScroll = usesDocumentScroll(pathname);
    const body = document.body;
    const root = document.querySelector<HTMLElement>("[data-document-scroll-root]");

    body.classList.toggle("min-h-svh", documentScroll);
    body.classList.toggle("h-svh", !documentScroll);
    body.classList.toggle("overflow-hidden", !documentScroll);

    if (root) {
      root.classList.toggle("min-h-svh", documentScroll);
      root.classList.toggle("min-h-0", !documentScroll);
      root.classList.toggle("overflow-hidden", !documentScroll);
    }
  }, [pathname]);

  return null;
}
