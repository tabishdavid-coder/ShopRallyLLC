import { NAV_ITEMS, platformNavTitle, type NavItem } from "@/lib/nav";
import {
  previewNavItemsForModel,
  PREVIEW_NAV_MODELS,
} from "@/lib/preview-nav-models";

/** Redesigned job-board landing replaces /job-board in the preview shell. */
export const PREVIEW_LANDING_HREF = "/preview";

/** All preview nav items (union of every CRM layout model). */
export const PREVIEW_NAV_ITEMS: NavItem[] = [
  ...new Map(
    PREVIEW_NAV_MODELS.flatMap((m) => previewNavItemsForModel(m)).map((i) => [
      `${i.href}:${i.title}`,
      i,
    ]),
  ).values(),
];

export function previewNavHref(item: NavItem): string {
  if (item.href === "/job-board") return PREVIEW_LANDING_HREF;
  return item.href;
}

/** Mirrors repairpilot AppSidebar active rules + /preview as Job Board home. */
export function previewNavIsActive(pathname: string, item: NavItem): boolean {
  if (pathname === PREVIEW_LANDING_HREF) {
    return item.href === "/job-board";
  }
  if (item.href === "/platform") return pathname === "/platform";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Mirrors repairpilot TopBar title resolution. */
export function previewNavTitle(pathname: string): string {
  if (pathname === PREVIEW_LANDING_HREF) return "Shop Home";
  if (pathname.startsWith("/preview/nav-concepts")) return "Menu layouts";
  if (pathname.startsWith("/preview/concepts")) return "Dashboard concepts";
  const platformTitle = platformNavTitle(pathname);
  if (platformTitle) return platformTitle;
  const match = PREVIEW_NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  ) ?? NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return match?.title ?? "ShopRally";
}
