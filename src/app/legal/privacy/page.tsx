import { notFound } from "next/navigation";
import Link from "next/link";

import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { AgreementType } from "@/generated/prisma";
import { getCurrentAgreementDocument } from "@/server/legal";

export const metadata = { title: "Privacy Policy — ShopRally" };

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
