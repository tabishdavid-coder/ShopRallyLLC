/** Shared shop tenant constants (safe for middleware + server). */

/** Active shop cookie — writes use sr_*; reads accept legacy rp_* too. */
export const ACTIVE_SHOP_COOKIE = "sr_active_shop";
export const LEGACY_ACTIVE_SHOP_COOKIE = "rp_active_shop";

/** Legal onboarding pending flag — writes use sr_*; reads accept legacy rp_* too. */
export const LEGAL_ONBOARDING_PENDING_COOKIE = "sr_legal_pending";
export const LEGACY_LEGAL_ONBOARDING_PENDING_COOKIE = "rp_legal_pending";

export const SHOP_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

/** Read active shop from sr_* or legacy rp_* cookie. */
export function readActiveShopCookie(store: CookieReader): string | undefined {
  return (
    store.get(ACTIVE_SHOP_COOKIE)?.value ?? store.get(LEGACY_ACTIVE_SHOP_COOKIE)?.value
  );
}

/** Read legal onboarding pending from sr_* or legacy rp_* cookie. */
export function readLegalPendingCookie(store: CookieReader): string | undefined {
  return (
    store.get(LEGAL_ONBOARDING_PENDING_COOKIE)?.value ??
    store.get(LEGACY_LEGAL_ONBOARDING_PENDING_COOKIE)?.value
  );
}

/** Seeded demo shop — full Tekmetric-style dataset (Pro plan). */
export const DEMO_SHOP_ID = "shop_demo";

/** Core plan QA tenant — Macuto Auto Repair (STARTER). Platform admins land here by default. */
export const CORE_QA_SHOP_ID = "shop_macuto";

/** Empty demo tenant — platform admins should not land here by default. */
export const EMPTY_DEMO_SHOP_ID = "shop_eastside";

/** Core fidelity QA shop — Macuto Auto Repair (plan STARTER). */
export const MACUTO_SHOP_ID = "shop_macuto";

/**
 * Ignition live-demo tenant — Planet Auto (STARTER).
 * Dedicated CRM for Twilio demo number + sales walkthroughs.
 * Seed: `npm run db:seed-planet-auto`
 */
export const PLANET_AUTO_SHOP_ID = "shop_planet";

/**
 * Macuto Core walkthrough RO (#1001).
 * Live Neon id (cuid) — the fixed seed id `ro_macuto_1001` is not present in this DB.
 * Prefer opening from Job Board if this drifts after a re-seed.
 */
export const MACUTO_ESTIMATE_RO_ID = "cmrnmr3f4000bhh3453pzj2mp";
/** Display number for the Macuto walkthrough RO. */
export const MACUTO_ESTIMATE_RO_NUMBER = 1001;
