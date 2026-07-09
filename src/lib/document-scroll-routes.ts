/** Marketing site routes — scroll the document, not a locked CRM viewport. */
const MARKETING_ROUTES = new Set([
  "/",
  "/pricing",
  "/features",
  "/signup",
  "/login",
  "/launch",
  "/demo",
]);

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
];

export function usesDocumentScroll(pathname: string): boolean {
  if (MARKETING_ROUTES.has(pathname)) return true;
  return PUBLIC_DOCUMENT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
