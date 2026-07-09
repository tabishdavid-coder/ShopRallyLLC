import "server-only";

import type { SeoAuditSummary } from "@/lib/seo-automation";

type CrawlCheck = { id: string; label: string; passed: boolean };

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m?.[1]?.trim() ?? null;
}

/** Lightweight homepage crawl for external / custom-domain properties. */
export async function crawlExternalSite(domain: string): Promise<SeoAuditSummary> {
  const siteUrl = `https://${domain}`;
  const checks: CrawlCheck[] = [];
  const openItems: string[] = [];

  let html = "";
  let status = 0;

  try {
    const res = await fetch(siteUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "ShopRally-SEO-Crawl/1.0" },
    });
    status = res.status;
    html = (await res.text()).slice(0, 250_000);
  } catch {
    try {
      const res = await fetch(`http://${domain}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "ShopRally-SEO-Crawl/1.0" },
      });
      status = res.status;
      html = (await res.text()).slice(0, 250_000);
    } catch {
      return {
        seoScore: 0,
        siteUrl,
        published: true,
        checklist: [],
        openItems: ["Site unreachable — check DNS and HTTPS."],
        skippedReason: undefined,
      };
    }
  }

  const title = firstMatch(html, /<title[^>]*>([^<]*)<\/title>/i);
  const metaDescription = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const canonical = firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const hasSchema = html.includes("application/ld+json");
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

  checks.push(
    { id: "http_ok", label: "Homepage responds (HTTP 200)", passed: status >= 200 && status < 400 },
    { id: "title", label: "Page title present", passed: Boolean(title && title.length > 3) },
    {
      id: "meta_description",
      label: "Meta description present",
      passed: Boolean(metaDescription && metaDescription.length > 20),
    },
    { id: "h1", label: "H1 heading found", passed: Boolean(h1 && stripTags(h1).length > 2) },
    { id: "canonical", label: "Canonical URL set", passed: Boolean(canonical) },
    { id: "schema", label: "Structured data (JSON-LD)", passed: hasSchema },
    { id: "mobile", label: "Mobile viewport meta", passed: hasViewport },
  );

  for (const c of checks) {
    if (!c.passed) openItems.push(c.label);
  }

  const done = checks.filter((c) => c.passed).length;
  const seoScore = checks.length ? Math.round((done / checks.length) * 100) : 0;

  return {
    seoScore,
    siteUrl,
    published: true,
    checklist: checks.map((c) => ({ id: c.id, label: c.label, completed: c.passed })),
    openItems,
  };
}
