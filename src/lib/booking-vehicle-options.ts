/** Vehicle year options for public booking (newest first). */
export function bookingVehicleYears(count = 45): number[] {
  const current = new Date().getFullYear() + 1;
  return Array.from({ length: count }, (_, i) => current - i);
}
