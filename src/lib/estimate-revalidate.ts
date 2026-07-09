/** Paths to revalidate after estimate mutations (main tab + isolated lab). */
export function revalidateEstimatePaths(roId: string): string[] {
  return [
    `/repair-orders/${roId}`,
    `/repair-orders/${roId}/estimate`,
    `/repair-orders/${roId}/work-in-progress`,
    `/repair-orders/${roId}/payment`,
    "/job-board",
    "/workflow",
    "/design-review/estimate-building",
  ];
}
