import Link from "next/link";
import { Globe } from "lucide-react";

import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { PlatformSeoTable } from "@/components/platform/platform-seo-table";
import { Button } from "@/components/ui/button";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import { listPlatformSeoProperties } from "@/server/seo-automation";

export const metadata = { title: "Growth Engine SEO — Platform" };

export default async function PlatformSeoAutomationPage() {
  const admin = await listPlatformSeoProperties();
  return (
    <div className="space-y-6" data-planned-change="PLAT-04">
      <PlatformPageIntro
        title="Growth Engine SEO"
        description={
          <>
            Automated SEO tooling across shops — verification, scores, and tenant pause controls.
            For <strong className="font-medium text-foreground">ShopSite builds you operate</strong>,
            use{" "}
            <Link href={`${MASTER_CRM_HOME}/websites`} className="font-medium text-brand-navy hover:underline">
              Customer websites
            </Link>
            .
          </>
        }
      >
        <Button asChild variant="outline" size="sm" className="border-brand-navy/30">
          <Link href={`${MASTER_CRM_HOME}/websites`}>
            <Globe className="mr-1.5 size-3.5" />
            Customer websites
          </Link>
        </Button>
      </PlatformPageIntro>
      <PlatformSeoTable admin={admin} />
    </div>
  );
}
