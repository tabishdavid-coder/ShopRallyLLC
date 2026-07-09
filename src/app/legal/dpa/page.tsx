import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = { title: "Data Processing Agreement — ShopRally" };

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
