"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { enterShopCrmPath } from "@/lib/platform-routing";
import { switchShop } from "@/server/actions/platform";
import { cn } from "@/lib/utils";

type EnterShopCrmButtonProps = {
  shopId: string;
  shopName?: string;
  children?: ReactNode;
  /** Used when `children` is omitted. */
  label?: string;
  onError?: (message: string) => void;
} & Partial<Pick<ButtonProps, "variant" | "size" | "className">>;

/** Sets active shop cookie via `switchShop`, then navigates to Shop CRM. */
export function EnterShopCrmButton({
  shopId,
  shopName,
  children,
  label,
  onError,
  variant = "default",
  size = "sm",
  className,
}: EnterShopCrmButtonProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function enter() {
    start(async () => {
      const res = await switchShop(shopId);
      if (res.ok) {
        router.push(enterShopCrmPath(shopId));
        router.refresh();
      } else {
        onError?.(res.error);
      }
    });
  }

  const text =
    children ??
    label ??
    (shopName ? `Enter ${shopName}` : "Open shop CRM");

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      disabled={pending}
      onClick={enter}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : text}
    </Button>
  );
}
