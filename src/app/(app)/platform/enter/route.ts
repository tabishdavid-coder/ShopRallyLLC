import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { enterShopCrmPath, MASTER_CRM_HOME } from "@/lib/platform-routing";
import { isPlatformAdmin } from "@/lib/platform";
import { ACTIVE_SHOP_COOKIE, canAccessShop } from "@/lib/shop";
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
  cookieStore.set(ACTIVE_SHOP_COOKIE, shopId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  await recordShopCrmEntered(shopId, "enterRoute");

  const dest = enterShopCrmPath(shopId, next ?? undefined);
  return NextResponse.redirect(new URL(dest, url.origin));
}
