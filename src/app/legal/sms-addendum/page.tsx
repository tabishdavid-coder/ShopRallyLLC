import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = marketingPageMetadata({
  path: "/legal/sms-addendum",
  title: "SMS & Messaging Addendum",
  description:
    "ShopRally SMS & Messaging Addendum — terms for two-way texting and messaging features in our shop CRM.",
});

export default async function LegalSmsAddendumPage() {
  const doc = await getCurrentAgreementDocument(AgreementType.SMS_ADDENDUM);
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
