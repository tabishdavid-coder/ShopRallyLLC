import { buildMarketingHomeJsonLd } from "@/lib/marketing-seo";

/** Server-only JSON-LD for marketing surfaces (Organization, Software, FAQ). */
export function MarketingHomeJsonLd() {
  const graphs = buildMarketingHomeJsonLd();

  return (
    <>
      {graphs.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
