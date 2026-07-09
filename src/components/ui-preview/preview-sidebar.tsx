"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ShopSwitcher } from "@/components/shop-switcher";
import {
  DEFAULT_PREVIEW_NAV_MODEL,
  PREVIEW_NAV_STORAGE_KEY,
  getPreviewNavModel,
  type PreviewNavModel,
  type PreviewNavModelId,
  type PreviewNavSection,
} from "@/lib/preview-nav-models";
import { previewNavHref, previewNavIsActive } from "@/lib/preview-nav";
import type { Shop } from "@/lib/shop";
import { cn } from "@/lib/utils";

function usePreviewNavModelId(): PreviewNavModelId {
  const searchParams = useSearchParams();
  const param = searchParams.get("nav") as PreviewNavModelId | null;
  const [stored, setStored] = useState<PreviewNavModelId | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(PREVIEW_NAV_STORAGE_KEY) as PreviewNavModelId | null;
      if (v) setStored(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!param) return;
    try {
      localStorage.setItem(PREVIEW_NAV_STORAGE_KEY, param);
      setStored(param);
    } catch {
      /* ignore */
    }
  }, [param]);

  if (param && getPreviewNavModel(param).id === param) return param;
  if (stored && getPreviewNavModel(stored).id === stored) return stored;
  return DEFAULT_PREVIEW_NAV_MODEL;
}

function NavMenuItems({
  model,
  unreadSmsCount,
}: {
  model: PreviewNavModel;
  unreadSmsCount: number;
}) {
  const pathname = usePathname();

  return (
    <>
      {model.groups?.map((group, i) => (
        <SidebarGroup key={group.label ?? `group-${i}`}>
          {group.label ? (
            <SidebarGroupLabel className="text-brand-navy/55">{group.label}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = previewNavIsActive(pathname, item);
                const href = previewNavHref(item);
                return (
                  <SidebarMenuItem key={`${group.label}-${item.href}-${item.title}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "text-brand-navy/85 hover:bg-brand-light/20 hover:text-brand-navy",
                        active &&
                          "border-l-2 border-brand-red bg-brand-light/25 font-semibold text-brand-navy shadow-none",
                      )}
                    >
                      <Link href={href}>
                        <item.icon className={cn(active && "text-brand-red")} />
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{item.title}</span>
                          {item.stub ? (
                            <Badge
                              variant="outline"
                              className="ml-auto h-4 shrink-0 border-brand-light px-1 text-[9px] font-normal text-brand-navy/60 group-data-[collapsible=icon]:hidden"
                            >
                              Soon
                            </Badge>
                          ) : null}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/messages" && unreadSmsCount > 0 ? (
                      <SidebarMenuBadge className="bg-brand-red text-white">
                        {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function IconRailSidebar({
  model,
  unreadSmsCount,
}: {
  model: PreviewNavModel;
  unreadSmsCount: number;
}) {
  const pathname = usePathname();
  const sections = model.sections ?? [];
  const activeSection =
    sections.find((s) =>
      s.items.some((item) => previewNavIsActive(pathname, item)),
    ) ?? sections[0];

  const [openSection, setOpenSection] = useState<PreviewNavSection | undefined>(activeSection);

  useEffect(() => {
    if (activeSection) setOpenSection(activeSection);
  }, [activeSection?.id]);

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-brand-light/40 bg-brand-navy py-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSection?.id === section.id;
          const hasActive = section.items.some((item) => previewNavIsActive(pathname, item));
          return (
            <button
              key={section.id}
              type="button"
              title={section.label}
              onClick={() => setOpenSection(section)}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-md transition-colors",
                isOpen || hasActive
                  ? "bg-white/15 text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {section.id === "inbox" && unreadSmsCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand-red" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-card">
        <p className="border-b border-brand-light/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-navy/60">
          {openSection?.label}
        </p>
        <SidebarMenu className="p-2">
          {openSection?.items.map((item) => {
            const active = previewNavIsActive(pathname, item);
            const href = previewNavHref(item);
            return (
              <SidebarMenuItem key={item.href + item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={cn(
                    "text-brand-navy/85 hover:bg-brand-light/20",
                    active && "border-l-2 border-brand-red bg-brand-light/25 font-semibold",
                  )}
                >
                  <Link href={href}>
                    <item.icon className={cn(active && "text-brand-red")} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </div>
    </div>
  );
}

/** Preview sidebar — CRM-inspired nav models, brand light shell or icon rail. */
export function PreviewSidebar({
  shops,
  activeShopId,
  unreadSmsCount = 0,
}: {
  shops: Shop[];
  activeShopId: string;
  unreadSmsCount?: number;
}) {
  const navModelId = usePreviewNavModelId();
  const model = useMemo(() => getPreviewNavModel(navModelId), [navModelId]);
  const isRail = model.id === "stripe-rail" && model.sections;

  return (
    <Sidebar
      collapsible={isRail ? "none" : "icon"}
      className={cn(
        "preview-sidebar border-r border-brand-light/40",
        isRail && "w-[220px] min-w-[220px]",
      )}
    >
      <SidebarHeader className="border-b border-brand-light/30">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand-navy text-sm font-black leading-none">
            <span className="text-white">R</span>
            <span className="text-brand-light">P</span>
          </div>
          <div className="grid flex-1 group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight text-brand-navy">
              Kar<span className="text-brand-light">vio</span>
            </span>
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-navy/60">
              {model.name}
            </span>
          </div>
        </div>
        {!isRail ? (
          <ShopSwitcher shops={shops} activeShopId={activeShopId} />
        ) : (
          <div className="px-2 pb-1">
            <ShopSwitcher shops={shops} activeShopId={activeShopId} />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={cn(isRail && "overflow-hidden p-0")}>
        {isRail ? (
          <IconRailSidebar model={model} unreadSmsCount={unreadSmsCount} />
        ) : (
          <NavMenuItems model={model} unreadSmsCount={unreadSmsCount} />
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-brand-light/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-brand-light/15" asChild>
              <Link href="/preview/nav-concepts">
                <Avatar className="size-8 rounded-md border border-brand-light/50">
                  <AvatarFallback className="rounded-md bg-brand-navy text-xs text-white">
                    DT
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-brand-navy">David Tabish</span>
                  <span className="truncate text-xs text-brand-navy/60">Change menu layout</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {!isRail ? <SidebarRail /> : null}
    </Sidebar>
  );
}

/** Client hook for nav concepts page to apply a model. */
export function useApplyPreviewNavModel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (id: PreviewNavModelId) => {
      try {
        localStorage.setItem(PREVIEW_NAV_STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
      router.push(`/preview?nav=${id}`);
    },
    [router],
  );
}
