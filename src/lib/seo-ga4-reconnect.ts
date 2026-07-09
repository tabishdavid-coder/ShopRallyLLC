/** When shop owner should reconnect Google OAuth for GA4 read scope. */
export function needsGa4GoogleReconnect(input: {
  gscConnected: boolean;
  ga4Configured: boolean;
  ga4Available: boolean;
}): boolean {
  return input.gscConnected && input.ga4Configured && !input.ga4Available;
}
