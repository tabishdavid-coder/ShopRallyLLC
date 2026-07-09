import Link from "next/link";
import { CheckCircle2, FileText, Rocket } from "lucide-react";

import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { PlatformOperatorAccessFeed } from "@/components/platform/platform-operator-access-feed";
import { PublishAgreementForm } from "@/components/legal/publish-agreement-form";
import { Button } from "@/components/ui/button";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import {
  AGREEMENT_PUBLIC_PATHS,
  AGREEMENT_TYPE_LABELS,
  countLegalAcceptancesByDocumentVersion,
  listAgreementDocuments,
} from "@/server/legal";
import { listShopsWithCustomMsa } from "@/server/custom-msa";
import type { AgreementType } from "@/generated/prisma";

export const metadata = { title: "Platform legal — ShopRally" };

export default async function PlatformLegalPage() {
  const [documents, acceptanceCounts, customMsas] = await Promise.all([
    listAgreementDocuments(),
    countLegalAcceptancesByDocumentVersion(),
    listShopsWithCustomMsa(),
  ]);

  const countKey = (type: string, version: string) => `${type}:${version}`;
  const counts = new Map(
    acceptanceCounts.map((row) => [
      countKey(row.agreementType, row.agreementVersion),
      row._count._all,
    ]),
  );

  return (
    <div className="space-y-6">
      <PlatformPageIntro
        title="Legal & compliance"
        description="Versioned clickwrap agreements for shop onboarding. Replace placeholder content with counsel-reviewed text before production."
      >
        <Button asChild variant="outline" size="sm" className="border-brand-navy/30">
          <Link href={`${MASTER_CRM_HOME}/onboarding`}>
            <Rocket className="mr-1.5 size-3.5" />
            Onboarding pipeline
          </Link>
        </Button>
      </PlatformPageIntro>

      <PlatformOperatorAccessFeed />

      <PublishAgreementForm />

      {customMsas.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h2 className="text-sm font-semibold">Enterprise custom MSAs</h2>
            <p className="text-xs text-muted-foreground">
              Shop-specific agreements attested offline by platform admin.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Shop</th>
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium">Version</th>
                <th className="px-4 py-2 font-medium">Effective</th>
                <th className="px-4 py-2 font-medium">Manage</th>
              </tr>
            </thead>
            <tbody>
              {customMsas.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{row.shop.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.legalEntityName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.version}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.effectiveDate.toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/shops/${row.shopId}/legal`}
                      className="inline-flex items-center gap-1 text-brand-navy hover:underline"
                    >
                      <FileText className="size-4" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Current</th>
              <th className="px-4 py-3 font-medium">Acceptances</th>
              <th className="px-4 py-3 font-medium">View</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">
                  {AGREEMENT_TYPE_LABELS[doc.type as AgreementType]}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{doc.version}</td>
                <td className="px-4 py-3">{doc.title}</td>
                <td className="px-4 py-3">
                  {doc.isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      Current
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Archived</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {counts.get(countKey(doc.type, doc.version)) ?? 0}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={AGREEMENT_PUBLIC_PATHS[doc.type as AgreementType]}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-brand-navy hover:underline"
                  >
                    <FileText className="size-4" />
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
