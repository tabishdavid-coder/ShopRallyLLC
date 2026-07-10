"use client";

import { ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Shop } from "@/lib/shop";
import { syncClerkActiveOrg } from "@/lib/clerk-org-client";
import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { switchShop } from "@/server/actions/platform";
import { cn } from "@/lib/utils";

export function ShopSwitcherCompact({
  shops,
  activeShopId,
  triggerClassName,
  leadingIcon,
}: {
  shops: Shop[];
  activeShopId: string;
  triggerClassName?: string;
  leadingIcon?: ReactNode;
}) {
  if (isClerkConfigured()) {
    return (
      <ShopSwitcherCompactWithClerk
        shops={shops}
        activeShopId={activeShopId}
        triggerClassName={triggerClassName}
        leadingIcon={leadingIcon}
      />
    );
  }

  return (
    <ShopSwitcherCompactInner
      shops={shops}
      activeShopId={activeShopId}
      triggerClassName={triggerClassName}
      leadingIcon={leadingIcon}
    />
  );
}

function ShopSwitcherCompactWithClerk({
  shops,
  activeShopId,
  triggerClassName,
  leadingIcon,
}: {
  shops: Shop[];
  activeShopId: string;
  triggerClassName?: string;
  leadingIcon?: ReactNode;
}) {
  const clerk = useClerk();
  return (
    <ShopSwitcherCompactInner
      shops={shops}
      activeShopId={activeShopId}
      triggerClassName={triggerClassName}
      leadingIcon={leadingIcon}
      clerk={clerk}
    />
  );
}

function ShopSwitcherCompactInner({
  shops,
  activeShopId,
  triggerClassName,
  leadingIcon,
  clerk,
}: {
  shops: Shop[];
  activeShopId: string;
  triggerClassName?: string;
  leadingIcon?: ReactNode;
  clerk?: ReturnType<typeof useClerk>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = shops.find((s) => s.id === activeShopId) ?? shops[0];
  const [error, setError] = useState<string | null>(null);

  function selectShop(shop: Shop) {
    if (shop.id === activeShopId) return;
    setError(null);
    start(async () => {
      const res = await switchShop(shop.id);
      if (res.ok) {
        if (clerk) await syncClerkActiveOrg(clerk, shop.id);
        router.push("/job-board");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("hidden h-9 max-w-[220px] gap-1 truncate sm:flex", triggerClassName)}
        >
          {pending ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : leadingIcon}
          <span className="truncate">{active.name}</span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch shop</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shops.map((shop) => (
          <DropdownMenuItem key={shop.id} onClick={() => selectShop(shop)}>
            <span className="flex-1 truncate">{shop.name}</span>
            {shop.id === activeShopId ? <Check className="size-4 text-brand-navy" /> : null}
          </DropdownMenuItem>
        ))}
        {error ? (
          <p className="px-2 py-1 text-xs text-destructive">{error}</p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
