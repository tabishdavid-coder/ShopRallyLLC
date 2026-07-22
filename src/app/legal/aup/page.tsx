import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = marketingPageMetadata({
  path: "/legal/aup",
  title: "Acceptable Use Policy",
  description:
    "ShopRally Acceptable Use Policy — rules for using our auto repair shop management software and related services.",
});

export default async function LegalAupPage() {
  const doc = await getCurrentAgreementDocument(AgreementType.ACCEPTABLE_USE);
  if (!doc) notFound();

  return (
    <LegalDocumentView
      title={doc.title}
      version={doc.version}
      effectiveAt={doc.effectiveAt}
      contentHtml={doc.contentHtml}
    />
  );
}
