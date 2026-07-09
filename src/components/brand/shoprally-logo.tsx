import Link from "next/link";
import Image from "next/image";

import { BRAND, BRAND_ASSETS, BRAND_LOGO_ALT, BRAND_MARK_ALT } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LOGO_HEIGHT = {
  default: "h-9",
  sm: "h-7",
  xs: "h-6",
} as const;

const LOCKUP_DIMENSIONS = {
  default: { width: 180, height: 40 },
  sm: { width: 148, height: 32 },
  xs: { width: 120, height: 26 },
} as const;

const MARK_SIZE = {
  default: 36,
  sm: 32,
  xs: 28,
} as const;

/**
 * ShopRally mark — official brand-kit SVG (color or on-dark).
 */
export function ShopRallyMark({
  className,
  size = 36,
  variant = "default",
  decorative = false,
  label = BRAND_MARK_ALT,
}: {
  className?: string;
  size?: number;
  variant?: "default" | "onDark";
  decorative?: boolean;
  label?: string;
}) {
  const src = variant === "onDark" ? BRAND_ASSETS.markOnDark : BRAND_ASSETS.mark;

  return (
    <Image
      src={src}
      alt={decorative ? "" : label}
      width={size}
      height={size}
      unoptimized
      aria-hidden={decorative ? true : undefined}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function ShopRallyLogo({
  className,
  href = "/",
  size = "default",
  variant = "default",
  markOnly = false,
}: {
  className?: string;
  href?: string;
  size?: "default" | "sm" | "xs";
  /** default = light bg lockup; onDark = navy sidebar lockup */
  variant?: "default" | "onDark";
  /** Collapsed sidebar — mark only */
  markOnly?: boolean;
}) {
  const onDark = variant === "onDark";
  const lockupHeight = LOGO_HEIGHT[size];
  const lockupDims = LOCKUP_DIMENSIONS[size];
  const markPx = MARK_SIZE[size];

  if (markOnly) {
    return (
      <Link href={href} aria-label={BRAND.name} className={cn("inline-flex shrink-0", className)}>
        <ShopRallyMark size={markPx} variant={onDark ? "onDark" : "default"} decorative />
      </Link>
    );
  }

  const lockupSrc = onDark ? BRAND_ASSETS.logoLockupOnDark : BRAND_ASSETS.logoLockup;

  return (
    <Link
      href={href}
      aria-label={BRAND.name}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Image
        src={lockupSrc}
        alt={BRAND_LOGO_ALT}
        width={lockupDims.width}
        height={lockupDims.height}
        priority
        unoptimized
        className={cn("w-auto max-w-[min(100%,12rem)] object-contain object-left", lockupHeight)}
      />
    </Link>
  );
}
