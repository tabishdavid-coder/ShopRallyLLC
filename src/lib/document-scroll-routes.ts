/** Marketing site routes — scroll the document, not a locked CRM viewport. */
const MARKETING_DOCUMENT_PREFIXES = [
  "/pricing",
  "/features",
  "/integrations",
  "/compare",
  "/launch",
  "/demo",
  "/signup",
  "/login",
] as const;

/** Other public pages that should use normal document scroll. */
const PUBLIC_DOCUMENT_PREFIXES = [
  "/legal",
  "/approve",
  "/invoice",
  "/onboard",
  "/sites",
  "/book",
  "/member",
  "/onboarding",
  "/plans",
  "/brand",
  "/sign-in",
  "/sign-up",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function usesDocumentScroll(pathname: string): boolean {
  // Fail-open when middleware did not set x-pathname — avoids clipped marketing.
  if (!pathname || pathname === "/") return true;
  if (MARKETING_DOCUMENT_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
    return true;
  }
  return PUBLIC_DOCUMENT_PREFIXES.some((p) => matchesPrefix(pathname, p));
}
