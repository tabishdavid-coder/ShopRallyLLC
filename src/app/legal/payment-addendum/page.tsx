import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = { title: "Payment Processing Addendum — ShopRally" };

export default async function LegalPaymentAddendumPage() {
  const doc = await getCurrentAgreementDocument(AgreementType.PAYMENT_ADDENDUM);
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
