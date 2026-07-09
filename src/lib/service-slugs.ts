/** URL-safe slug for programmatic service pages. */
export function serviceSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findServiceBySlug(
  services: { title: string; description: string }[],
  slug: string,
): { title: string; description: string } | null {
  return services.find((s) => serviceSlug(s.title) === slug) ?? null;
}
