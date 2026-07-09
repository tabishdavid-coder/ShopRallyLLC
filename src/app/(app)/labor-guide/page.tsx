import { getLaborCatalog } from "@/server/labor-catalog";
import { LaborCatalog } from "@/components/labor-guide/labor-catalog";

export const metadata = { title: "Labor Book — ShopRally" };

// The catalog reflects live DB state and has no per-request inputs (the table is
// global, not shop-scoped), so opt out of static rendering — mirrors /print.
export const dynamic = "force-dynamic";

export default async function LaborGuidePage() {
  const catalog = await getLaborCatalog();
  return <LaborCatalog catalog={catalog} />;
}
