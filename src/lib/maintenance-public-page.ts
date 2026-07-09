/** Parse optional featured highlight embedded in heroSubtitle. */
export function parseHeroSubtitle(raw: string | null | undefined): {
  highlight: string;
  subtitle: string;
} {
  const text = raw ?? "";
  const match = text.match(/^\[highlight\]([^\n]*)\n\n([\s\S]*)$/);
  if (match) {
    return { highlight: match[1] ?? "", subtitle: match[2] ?? "" };
  }
  return { highlight: "", subtitle: text };
}

export function serializeHeroSubtitle(highlight: string, subtitle: string): string {
  const h = highlight.trim();
  const s = subtitle.trim();
  if (!h) return s;
  return `[highlight]${h}\n\n${s}`;
}

export function publicHeroSubtitle(raw: string | null | undefined): string {
  return parseHeroSubtitle(raw).subtitle;
}

export function publicFeaturedHighlight(raw: string | null | undefined): string | null {
  const h = parseHeroSubtitle(raw).highlight.trim();
  return h || null;
}
