import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CrmAccessBanner } from "@/components/crm/crm-access-banner";
import { loadAppShell } from "@/lib/autopilot3030/load-shell";
import {
  EmptyDatabaseBanner,
  PlatformShopContextBar,
  ShopContextBanner,
} from "@/components/shop-context-banner";
import { LegalComplianceGate } from "@/components/legal/legal-compliance-gate";
import { KeyedChildren } from "@/lib/keyed-children";
import { prisma } from "@/db/client";
import { isPlatformAdmin } from "@/lib/platform";
import { getCurrentShop, getShopId, listShops, ShopAccessError, DEMO_SHOP_ID } from "@/lib/shop";
import { canUseFeature, canUseReleasedFeature } from "@/lib/subscription";
import { checkCrmRouteAccess, getCrmAccessContext } from "@/server/crm-access";
import { getNotifications } from "@/server/notifications";
import { countUnreadMessages } from "@/server/messages-inbox";
import { loadRoIntakeConfig } from "@/server/ro-intake-config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPlatformRoute = pathname.startsWith("/platform");

  let activeShopId = DEMO_SHOP_ID;
  let shopAccessDenied = false;

  try {
    activeShopId = await getShopId();
  } catch (err) {
    if (err instanceof ShopAccessError) {
      if (pathname === "/shop-access") {
        shopAccessDenied = true;
      } else if (!isPlatformRoute) {
        redirect("/shop-access");
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  if (shopAccessDenied) {
    return (
      <>
        <LegalComplianceGate />
        <div className="crm-shell flex min-h-svh flex-col">
          <main className="flex-1 p-4 md:p-6">
            <KeyedChildren>{children}</KeyedChildren>
          </main>
        </div>
      </>
    );
  }

  const [shops, platformAdmin] = await Promise.all([listShops(), isPlatformAdmin()]);

  const dbSeeded = shops.length > 0;
  const crmAccess = dbSeeded ? await getCrmAccessContext(activeShopId) : null;

  if (dbSeeded && crmAccess && !isPlatformRoute && pathname !== "/shop-access") {
    const routeAccess = await checkCrmRouteAccess(pathname, activeShopId);
    if (!routeAccess.allowed) {
      redirect("/dashboard/snapshot?access=denied");
    }
  }

  const [activeShop, customerCount, notificationData, unreadSmsCount, intakeConfig, smsOnPlan, stripeOnPlan, motorLaborOnPlan, partsTechOnPlan] =
    dbSeeded
      ? await Promise.all([
          getCurrentShop(),
          prisma.customer.count({ where: { shopId: activeShopId } }),
          getNotifications(activeShopId),
          countUnreadMessages(activeShopId),
          loadRoIntakeConfig(activeShopId),
          canUseFeature(activeShopId, "sms"),
          canUseFeature(activeShopId, "stripePayments"),
          canUseReleasedFeature(activeShopId, "motorLabor"),
          canUseReleasedFeature(activeShopId, "parts"),
        ])
      : [null, 0, { notifications: [], unreadCount: 0 }, 0, null, false, false, false, false];

  const showPlatformShopContext = platformAdmin && activeShop && !isPlatformRoute;

  const showShopBanner =
    !platformAdmin &&
    activeShop &&
    !isPlatformRoute &&
    !pathname.startsWith("/dashboard") &&
    pathname !== "/workflow";

  if (isPlatformRoute) {
    return (
      <>
        <LegalComplianceGate />
        <KeyedChildren>{children}</KeyedChildren>
      </>
    );
  }

  const Shell = await loadAppShell();

  return (
    <>
      <LegalComplianceGate />
      <Suspense fallback={null}>
        <CrmAccessBanner />
      </Suspense>
      <Shell
        shops={shops}
        activeShopId={activeShopId}
        notifications={notificationData.notifications}
        unreadCount={notificationData.unreadCount}
        unreadSmsCount={smsOnPlan ? unreadSmsCount : 0}
        pathname={pathname}
        isPlatformAdmin={platformAdmin}
        allowedNavHrefs={crmAccess?.allowedNavHrefs}
        allowedSectionIds={crmAccess?.allowedSectionIds}
        intakeConfig={intakeConfig}
        capabilities={{
          sms: smsOnPlan,
          stripePayments: stripeOnPlan,
          motorLabor: motorLaborOnPlan,
          partsTech: partsTechOnPlan,
        }}
        banner={
          !dbSeeded ? (
            <EmptyDatabaseBanner />
          ) : showPlatformShopContext && activeShop ? (
            <PlatformShopContextBar shop={activeShop} />
          ) : showShopBanner && activeShop ? (
            <ShopContextBanner shop={activeShop} customerCount={customerCount} />
          ) : null
        }
        bannerChrome={showPlatformShopContext ? "platform" : "default"}
      >
        {children}
      </Shell>
    </>
  );
}
