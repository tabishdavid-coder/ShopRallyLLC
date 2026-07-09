import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = { title: "Terms of Service — ShopRally" };

export default async function LegalTermsPage() {
  const doc = await getCurrentAgreementDocument(AgreementType.PLATFORM_TOS);
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
