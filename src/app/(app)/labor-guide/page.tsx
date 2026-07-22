import { getLaborCatalog } from "@/server/labor-catalog";
import { LaborCatalog } from "@/components/labor-guide/labor-catalog";

export const metadata = { title: "Labor Book — ShopRally" };

// Labor Library admin surface — platform-shared reference corpus with per-shop
// overlay (favorites/custom rows), not a full per-tenant dump of the global corpus.
// See `getLaborCatalog` in `src/server/labor-catalog.ts`.
export const dynamic = "force-dynamic";

export default async function LaborGuidePage() {
  const catalog = await getLaborCatalog();
  return <LaborCatalog catalog={catalog} />;
}
