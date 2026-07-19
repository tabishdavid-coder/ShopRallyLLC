import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { enterShopCrmPath, MASTER_CRM_HOME } from "@/lib/platform-routing";
import { isPlatformAdmin } from "@/lib/platform";
import { ACTIVE_SHOP_COOKIE, SHOP_COOKIE_OPTIONS } from "@/lib/shop-constants";
import { canAccessShop } from "@/lib/shop";
import { recordShopCrmEntered } from "@/server/platform/shop-crm-access";

/** Deep link from Master CRM — sets tenant cookie then opens Shop CRM (or `next` path). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shop")?.trim();
  const next = url.searchParams.get("next")?.trim();

  if (!(await isPlatformAdmin())) {
    return NextResponse.redirect(new URL(enterShopCrmPath(), url.origin));
  }

  if (!shopId) {
    return NextResponse.redirect(new URL(MASTER_CRM_HOME, url.origin));
  }

  if (!(await canAccessShop(shopId))) {
    return NextResponse.redirect(new URL(`${MASTER_CRM_HOME}/shops?error=access`, url.origin));
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SHOP_COOKIE, shopId, SHOP_COOKIE_OPTIONS);

  // Audit must not block CRM entry (missing shop / FK races still set cookie).
  try {
    await recordShopCrmEntered(shopId, "enterRoute");
  } catch (err) {
    console.error("[platform/enter] recordShopCrmEntered failed", shopId, err);
  }

  const dest = enterShopCrmPath(shopId, next ?? undefined);
  return NextResponse.redirect(new URL(dest, url.origin));
}
