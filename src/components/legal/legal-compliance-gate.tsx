import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getShopId } from "@/lib/shop";
import { getShopLegalCompliance, isLegalExemptPath } from "@/lib/legal-compliance";
import { ReacceptModal } from "@/components/legal/reaccept-modal";
import {
  AGREEMENT_PUBLIC_PATHS,
  AGREEMENT_TYPE_LABELS,
  getCurrentAgreementDocuments,
} from "@/server/legal";

/** Redirects non-compliant shops to legal onboarding or shows re-acceptance modal. */
export async function LegalComplianceGate() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (isLegalExemptPath(pathname)) return null;

  try {
    const shopId = await getShopId();
    const compliance = await getShopLegalCompliance(shopId);

    if (compliance.compliant) return null;

    if (compliance.pendingReaccept && compliance.outdatedTypes.length > 0) {
      const currentDocs = await getCurrentAgreementDocuments(compliance.outdatedTypes);
      const outdatedDocs = compliance.outdatedTypes
        .map((type) => {
          const doc = currentDocs.get(type);
          if (!doc) return null;
          return {
            type,
            label: AGREEMENT_TYPE_LABELS[type],
            version: doc.version,
            href: AGREEMENT_PUBLIC_PATHS[type],
          };
        })
        .filter((d): d is NonNullable<typeof d> => d != null);

      if (outdatedDocs.length > 0) {
        return <ReacceptModal outdatedDocs={outdatedDocs} />;
      }
    }

    redirect("/onboarding/legal");
  } catch {
    // DB unavailable — don't block the shell.
  }

  return null;
}
