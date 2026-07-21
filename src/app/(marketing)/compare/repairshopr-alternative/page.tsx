import { notFound } from "next/navigation";

import { CompareCompetitorPage } from "@/components/marketing-site/compare-page";
import { getComparePage } from "@/lib/marketing-compare";
import { marketingPageMetadata } from "@/lib/marketing-seo";

const page = getComparePage("repairshopr-alternative");

export const metadata = page
  ? marketingPageMetadata({
      path: page.path,
      title: page.title,
      description: page.description,
    })
  : {};

export default function RepairShoprAlternativePage() {
  if (!page) notFound();
  return <CompareCompetitorPage page={page} />;
}
