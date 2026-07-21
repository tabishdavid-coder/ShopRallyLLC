import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = marketingPageMetadata({
  path: "/legal/terms",
  title: "Terms of Service",
  description:
    "ShopRally Terms of Service — the agreement for using our cloud shop management software, founding waitlist, and related platform services.",
});

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
