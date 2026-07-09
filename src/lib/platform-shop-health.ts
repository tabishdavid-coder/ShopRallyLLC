import type { PlatformShopRow } from "@/server/platform-shops";

export type PlatformShopHealth = "healthy" | "watch" | "at-risk";

export function getPlatformShopHealth(shop: Pick<PlatformShopRow, "status" | "billingStatus">): PlatformShopHealth {
  if (shop.status === "SUSPENDED" || shop.billingStatus === "CANCELED") return "at-risk";
  if (shop.billingStatus === "PAST_DUE" || shop.billingStatus === "TRIAL") return "watch";
  return "healthy";
}

export function platformShopHealthLabel(health: PlatformShopHealth): string {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "watch":
      return "Watch";
    case "at-risk":
      return "At risk";
  }
}

export function platformShopHealthStyles(health: PlatformShopHealth): string {
  switch (health) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700";
    case "watch":
      return "bg-amber-100 text-amber-700";
    case "at-risk":
      return "bg-brand-red/10 text-brand-red";
  }
}
