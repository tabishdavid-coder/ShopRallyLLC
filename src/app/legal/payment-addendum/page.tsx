import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = marketingPageMetadata({
  path: "/legal/payment-addendum",
  title: "Payment Processing Addendum",
  description:
    "ShopRally Payment Processing Addendum — terms for payment collection and related payment features.",
});

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
