import { notFound } from "next/navigation";
import Link from "next/link";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = marketingPageMetadata({
  path: "/legal/privacy",
  title: "Privacy Policy",
  description:
    "ShopRally Privacy Policy — how we collect, use, and protect personal information for shop owners, staff, and customers using our auto repair shop management software.",
});

export default async function LegalPrivacyPage() {
  const doc = await getCurrentAgreementDocument(AgreementType.PRIVACY_POLICY);
  if (!doc) notFound();

  return (
    <>
      <LegalDocumentView
        title={doc.title}
        version={doc.version}
        effectiveAt={doc.effectiveAt}
        contentHtml={doc.contentHtml}
      />
      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        See also our{" "}
        <Link href="/legal/subprocessors" className="font-medium text-brand-navy hover:underline">
          Subprocessors list
        </Link>{" "}
        for third-party vendors that process data on our behalf.
      </p>
    </>
  );
}
