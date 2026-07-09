# Shop CRM integration patch (apply at merge)

Apply after merging `feature/master-crm` into ShopRallyCRM DEV.

---

## `src/app/(app)/layout.tsx`

```tsx
// imports — add:
import { isPlatformAdmin } from "@/lib/platform";
import { PlatformShopContextBar } from "@/components/shop-context-banner";

// in AppLayout, extend Promise.all:
const [shops, activeShopId, platformAdmin] = await Promise.all([
  listShops(),
  getShopId(),
  isPlatformAdmin(),
]);

const showPlatformShopContext =
  platformAdmin && activeShop && !isPlatformRoute;

const showShopBanner =
  !platformAdmin &&
  activeShop &&
  !isPlatformRoute &&
  pathname !== "/dashboard" &&
  pathname !== "/workflow";

// CrmShell props:
<CrmShell
  isPlatformAdmin={platformAdmin}
  banner={
    !dbSeeded ? (
      <EmptyDatabaseBanner />
    ) : showPlatformShopContext && activeShop ? (
      <PlatformShopContextBar shop={activeShop} />
    ) : showShopBanner && activeShop ? (
      <ShopContextBanner shop={activeShop} />
    ) : null
  }
  bannerChrome={showPlatformShopContext ? "platform" : "default"}
/>
```

---

## `src/components/crm/crm-shell.tsx`

- Add `isPlatformAdmin?: boolean` to props
- Pass through to `CrmHeader`

---

## `src/components/crm/crm-header.tsx`

```tsx
import { Building2 } from "lucide-react";

// prop: isPlatformAdmin?: boolean

{isPlatformAdmin ? (
  <Button asChild variant="ghost" size="sm" className="hidden gap-1 text-white hover:bg-white/10 md:inline-flex">
    <Link href="/platform">
      <Building2 className="size-4" />
      Master CRM
    </Link>
  </Button>
) : null}
```

Place before the shop switcher in the header actions row.

---

## Optional: platform admin lands on Master CRM

```tsx
// src/app/(app)/dashboard/page.tsx — top of page component
import { isPlatformAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";

if (await isPlatformAdmin()) {
  redirect(MASTER_CRM_HOME);
}
```

Or wire `defaultAppHome()` in Clerk / middleware instead.
