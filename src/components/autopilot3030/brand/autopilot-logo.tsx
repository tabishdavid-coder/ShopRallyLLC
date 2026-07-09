import Link from "next/link";

import {
  AP_BRAND,
  AP_BRAND_ASSETS,
  AP_BRAND_COLORS,
  AP_BRAND_LOGO_ALT,
  AP_BRAND_MARK_ALT,
} from "@/lib/autopilot3030/brand";
import { cn } from "@/lib/utils";

const LOGO_HEIGHT = {
  default: "h-9",
  sm: "h-7",
} as const;

/** AP ligature mark — coral P stem on abyss tile */
export function AutopilotMark({
  className,
  size = 36,
  variant = "default",
  decorative = false,
  label = AP_BRAND_MARK_ALT,
}: {
  className?: string;
  size?: number;
  variant?: "default" | "onDark";
  decorative?: boolean;
  label?: string;
}) {
  const onDark = variant === "onDark";
  const tileFill = onDark ? AP_BRAND_COLORS.abyss : AP_BRAND_COLORS.white;
  const tileStroke = onDark ? "rgba(255,255,255,0.12)" : "rgba(15,42,68,0.12)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={cn("shrink-0", className)}
    >
      {!decorative ? <title>{label}</title> : null}
      <rect
        x="0"
        y="0"
        width="32"
        height="32"
        rx="8"
        fill={tileFill}
        stroke={tileStroke}
        strokeWidth={onDark ? 1 : 1}
      />
      <text
        x="13"
        y="21.5"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans, system-ui, sans-serif)"
        fontSize="13"
        fontWeight="700"
        fill={onDark ? AP_BRAND_COLORS.white : AP_BRAND_COLORS.abyss}
      >
        A
      </text>
      <rect x="18.5" y="9" width="2.5" height="13" rx="1.25" fill={AP_BRAND_COLORS.coral} />
      <path
        d="M18.5 9 L22 9 L22 11.5 L21 11.5 L21 20.5 L22 20.5 L22 22 L18.5 22 Z"
        fill={AP_BRAND_COLORS.coral}
      />
    </svg>
  );
}

export function AutopilotLogo({
  href,
  className,
  size = "default",
  variant = "default",
  showTagline = false,
  showBadge = false,
}: {
  href?: string;
  className?: string;
  size?: keyof typeof LOGO_HEIGHT;
  variant?: "default" | "onDark";
  showTagline?: boolean;
  showBadge?: boolean;
}) {
  const onDark = variant === "onDark";
  const markSize = size === "sm" ? 28 : 36;

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AutopilotMark size={markSize} variant={variant} decorative />
      <span className="flex flex-col leading-none">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "font-semibold tracking-[var(--ap-logo-wordmark-tracking,0.04em)]",
              size === "sm" ? "text-base" : "text-lg",
              onDark ? "text-white" : "ap-text-primary",
            )}
          >
            {AP_BRAND.name}
          </span>
          {showBadge ? (
            <span className="ap-text-accent rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: "color-mix(in oklab, var(--ap-accent, #FF6B4A) 15%, transparent)" }}>
              3030
            </span>
          ) : null}
        </span>
        {showTagline ? (
          <span
            className={cn(
              "mt-0.5 text-[10px] font-medium",
              onDark ? "text-white/65" : "text-muted-foreground",
            )}
          >
            {AP_BRAND.productLine}
          </span>
        ) : null}
        <span
          className="mt-1 h-0.5 w-16 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${AP_BRAND_COLORS.coral}, ${AP_BRAND_COLORS.seafoam})`,
          }}
          aria-hidden
        />
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    );
  }

  return content;
}

/** Static lockup image for exports / email */
export function AutopilotLogoImage({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={AP_BRAND_ASSETS.logoLockup} alt={AP_BRAND_LOGO_ALT} className={cn("h-8 w-auto", className)} />
  );
}
