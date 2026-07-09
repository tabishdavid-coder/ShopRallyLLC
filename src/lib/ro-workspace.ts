/** Default destination when opening a repair order from the job board, search, etc. */
export function defaultRoOpenHref(roId: string): string {
  return `/repair-orders/${roId}/estimate`;
}

/** True when the URL is the merged estimate builder (not overview / WIP / payment). */
export function isRoEstimateWorkspacePath(pathname: string): boolean {
  return /\/repair-orders\/[^/]+\/estimate(?:\/|$)/.test(pathname);
}

/** Inspections URL highlights Estimate phase but uses the same builder chrome. */
export function isRoEstimateLikeWorkspacePath(pathname: string): boolean {
  return (
    isRoEstimateWorkspacePath(pathname) ||
    /\/repair-orders\/[^/]+\/inspections(?:\/|$)/.test(pathname)
  );
}
