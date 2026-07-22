import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = marketingPageMetadata({
  path: "/legal/dpa",
  title: "Data Processing Agreement",
  description:
    "ShopRally Data Processing Agreement — how we process personal data as a processor for shops using our platform.",
});

export default async function LegalDpaPage() {
  const doc = await getCurrentAgreementDocument(AgreementType.DPA);
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
