import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/db/client";
import { isClerkConfigured } from "@/lib/clerk-auth";
import { getCurrentUser } from "@/lib/platform";
import {
  ACTIVE_SHOP_COOKIE,
  CORE_QA_SHOP_ID,
  DEMO_SHOP_ID,
} from "@/lib/shop-constants";
import { getClerkSessionContext, shopIdForClerkOrg } from "@/server/clerk-org";

export type Shop = {
  id: string;
  name: string;
  /** Short code shown in the switcher avatar. */
  code: string;
  status?: string;
};

export { ACTIVE_SHOP_COOKIE, CORE_QA_SHOP_ID, DEMO_SHOP_ID } from "@/lib/shop-constants";

export class ShopAccessError extends Error {
  constructor(message = "You don't have access to this shop.") {
    super(message);
    this.name = "ShopAccessError";
  }
}

/**
 * Tenant / shop context. Reads the active shop from a cookie (set by the shop
 * switcher or platform admin). Platform admins may access any shop; shop users
 * only shops they belong to.
 *
 * When Clerk Organizations are wired (M1b), active org maps to `Shop.clerkOrgId`.
 * Cookie `rp_active_shop` remains for platform admin multi-shop switching.
 */
export async function getShopId(): Promise<string> {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const cookieShop = cookieStore.get(ACTIVE_SHOP_COOKIE)?.value;
  const isOperator = user.isPlatformAdmin || user.id === "stub-platform-admin";

  if (isClerkConfigured()) {
    const { orgId } = await getClerkSessionContext();
    if (orgId) {
      const shopFromOrg = await shopIdForClerkOrg(orgId);
      if (!shopFromOrg) {
        if (!isOperator) {
          throw new ShopAccessError("This organization is not linked to a shop yet.");
        }
      } else if (isOperator) {
        return shopFromOrg;
      } else {
        const membership = await prisma.membership.findFirst({
          where: { shopId: shopFromOrg, userId: user.id, active: true },
          select: { shopId: true },
        });
        if (membership) return membership.shopId;
        throw new ShopAccessError();
      }
    } else if (!isOperator) {
      const membership = await prisma.membership.findFirst({
        where: { userId: user.id, active: true },
        orderBy: { shop: { createdAt: "asc" } },
        select: { shopId: true },
      });
      if (membership) return membership.shopId;
      throw new ShopAccessError();
    }
  }

  if (cookieShop) {
    if (isOperator) {
      const shop = await prisma.shop.findUnique({
        where: { id: cookieShop },
        select: { id: true, _count: { select: { customers: true } } },
      });
      // Platform admins land on data-rich shops; empty tenants fall through to demo.
      if (shop && (shop.id === DEMO_SHOP_ID || shop._count.customers > 0)) {
        return shop.id;
      }
    } else {
      const membership = await prisma.membership.findFirst({
        where: { shopId: cookieShop, userId: user.id, active: true },
        select: { shopId: true },
      });
      if (membership) return membership.shopId;
    }
  }

  if (isOperator) {
    const coreQa = await prisma.shop.findUnique({
      where: { id: CORE_QA_SHOP_ID },
      select: { id: true, _count: { select: { customers: true } } },
    });
    if (coreQa && coreQa._count.customers > 0) return coreQa.id;

    const demo = await prisma.shop.findUnique({
      where: { id: DEMO_SHOP_ID },
      select: { id: true },
    });
    if (demo) return demo.id;

    const shop = await prisma.shop.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (shop) return shop.id;
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, active: true },
    orderBy: { shop: { createdAt: "asc" } },
    select: { shopId: true },
  });
  if (membership) return membership.shopId;

  if (!user.isPlatformAdmin && user.id !== "stub-platform-admin") {
    throw new ShopAccessError();
  }

  const coreQa = await prisma.shop.findUnique({
    where: { id: CORE_QA_SHOP_ID },
    select: { id: true },
  });
  if (coreQa) return coreQa.id;

  const demo = await prisma.shop.findUnique({
    where: { id: DEMO_SHOP_ID },
    select: { id: true },
  });
  if (demo) return demo.id;

  if (!user.isPlatformAdmin && user.id !== "stub-platform-admin") {
    throw new ShopAccessError();
  }

  const anyShop = await prisma.shop.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (anyShop) return anyShop.id;

  return DEMO_SHOP_ID;
}

export async function listShops(): Promise<Shop[]> {
  const user = await getCurrentUser();

  if (user.isPlatformAdmin || user.id === "stub-platform-admin") {
    const shops = await prisma.shop.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, status: true },
    });
    // Core QA shop first, then seeded demo — platform admins land on Macuto Core by default.
    const priority = [CORE_QA_SHOP_ID, DEMO_SHOP_ID];
    for (const id of priority) {
      const idx = shops.findIndex((s) => s.id === id);
      if (idx > 0) {
        const [shop] = shops.splice(idx, 1);
        shops.unshift(shop);
      }
    }
    return shops;
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, active: true },
    orderBy: { shop: { name: "asc" } },
    select: {
      shop: { select: { id: true, name: true, code: true, status: true } },
    },
  });

  return memberships.map((m) => m.shop);
}

export async function getCurrentShop(): Promise<Shop> {
  const shopId = await getShopId();
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true, code: true, status: true },
  });
  if (!shop) {
    return { id: shopId, name: "Shop", code: "?" };
  }
  return shop;
}

/** Whether the current user may switch into a given shop. */
export async function canAccessShop(shopId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (user.isPlatformAdmin || user.id === "stub-platform-admin") return true;

  if (isClerkConfigured()) {
    const { orgId } = await getClerkSessionContext();
    if (orgId) {
      const linked = await shopIdForClerkOrg(orgId);
      if (linked && linked !== shopId) return false;
    }
  }

  const membership = await prisma.membership.findFirst({
    where: { shopId, userId: user.id, active: true },
    select: { id: true },
  });
  return Boolean(membership);
}
