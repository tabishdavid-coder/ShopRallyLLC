import Link from "next/link";
import { AlertTriangle, ExternalLink, FileText, Scale } from "lucide-react";

import type { AgreementType } from "@/generated/prisma";
import {
  AGREEMENT_PUBLIC_PATHS,
  AGREEMENT_TYPE_LABELS,
  REQUIRED_AGREEMENT_TYPES,
} from "@/server/legal";
import type { ShopCustomAgreementView } from "@/server/custom-msa";
import { ShopDataExportButton } from "@/components/legal/shop-data-export-button";
import { DATA_RETENTION_POLICY } from "@/lib/legal-subprocessors";
import { SettingsHero } from "@/components/settings/settings-hero";

type AcceptanceRow = {
  agreementVersion: string;
  signerName: string;
  signerEmail: string;
  acceptedAt: Date;
};

type LegalSettingsPanelProps = {
  legalEntityName: string | null;
  legalEntityState: string | null;
  acceptances: Map<AgreementType, AcceptanceRow>;
  pendingReaccept?: boolean;
  outdatedTypes?: AgreementType[];
  customMsa?: ShopCustomAgreementView | null;
};

export function LegalSettingsPanel({
  legalEntityName,
  legalEntityState,
  acceptances,
  pendingReaccept = false,
  outdatedTypes = [],
  customMsa = null,
}: LegalSettingsPanelProps) {
  const types = REQUIRED_AGREEMENT_TYPES;

  return (
    <div className="space-y-6">
      <SettingsHero
        icon={Scale}
        title="Legal"
        description="Contracting entity, agreement history, and data-retention policy for your shop."
      />

      {pendingReaccept ? (
        <div className="flex items-start gap-3 rounded-lg border border-brand-red/30 bg-brand-red/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-brand-red" />
          <div>
            <p className="font-medium text-brand-navy">Updated agreements need your acceptance</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform agreements have been updated. Accept the new versions from the modal when you
              next load the app, or review the documents below.
            </p>
            {outdatedTypes.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {outdatedTypes.map((type) => (
                  <li key={type}>
                    <Link
                      href={AGREEMENT_PUBLIC_PATHS[type]}
                      target="_blank"
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {AGREEMENT_TYPE_LABELS[type]}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold text-brand-navy">Contracting entity</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Legal business name</dt>
            <dd className="font-medium">{legalEntityName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">State</dt>
            <dd className="font-medium">{legalEntityState ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {customMsa ? (
        <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 p-4">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 size-5 shrink-0 text-brand-navy" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-brand-navy">Enterprise Custom MSA</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Version {customMsa.version} · effective{" "}
                {customMsa.effectiveDate.toLocaleDateString("en-US")} ·{" "}
                {customMsa.legalEntityName}
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-navy hover:underline">
                  View MSA text
                </summary>
                <div
                  className="prose prose-sm mt-3 max-h-64 max-w-none overflow-y-auto rounded border bg-background p-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: customMsa.contentHtml }}
                />
              </details>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                Content ref: {customMsa.contentHash.slice(0, 16)}…
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Agreement</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Signer</th>
              <th className="px-4 py-3 font-medium">Accepted</th>
              <th className="px-4 py-3 font-medium">Document</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => {
              const row = acceptances.get(type);
              const isOutdated = outdatedTypes.includes(type);
              return (
                <tr key={type} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    {AGREEMENT_TYPE_LABELS[type]}
                    {isOutdated ? (
                      <span className="ml-2 text-xs font-normal text-brand-red">Update required</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row?.agreementVersion ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row ? (
                      <div>
                        <p>{row.signerName}</p>
                        <p className="text-xs text-muted-foreground">{row.signerEmail}</p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row
                      ? row.acceptedAt.toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={AGREEMENT_PUBLIC_PATHS[type]}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-brand-navy hover:underline"
                    >
                      View
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold text-brand-navy">Related documents</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/legal/subprocessors" target="_blank" className="text-brand-navy hover:underline">
              Subprocessors list
            </Link>
          </li>
          <li>
            <Link href="/legal/dpa" target="_blank" className="text-brand-navy hover:underline">
              Data Processing Agreement
            </Link>
          </li>
          <li>
            <Link href="/legal/payment-addendum" target="_blank" className="text-brand-navy hover:underline">
              Payment Processing Addendum
            </Link>
          </li>
          <li>
            <Link href="/legal/sms-addendum" target="_blank" className="text-brand-navy hover:underline">
              SMS &amp; Messaging Addendum
            </Link>
          </li>
        </ul>
      </div>

      <ShopDataExportButton />

      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Data retention on cancellation</p>
        <p className="mt-1">{DATA_RETENTION_POLICY}</p>
      </div>
    </div>
  );
}
