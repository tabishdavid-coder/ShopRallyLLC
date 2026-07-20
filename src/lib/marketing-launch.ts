/**
 * Pre-launch marketing config — flip `preLaunch` to false when GA opens self-serve signup.
 * See docs/MARKETING-GO-LIVE-FLIP.md for Phase B checklist.
 */
import {
  PLANS,
  PHASE_ONE_LAUNCH,
  aiPlusMonthlyDollars,
  aiPlusPriceLabel,
  shoprallyAllInMonthly,
  shoprallyStarterMonthly,
} from "@/lib/plans";

export const MARKETING_LAUNCH = {
  preLaunch: true,
  /** Public launch window — never imply the product is live today while preLaunch. */
  launchWindowLabel: "Launching Q4 2026",
  launchQuarter: "Q4 2026",
  foundingProgramLabel: "Founding Shop Program",
  /** Hard cap — only this many founding seats before public launch. */
  foundingSpotsTotal: 50,
  /** Fallback when live waitlist count is unavailable; prefer marketing-launch-stats. */
  foundingSpotsClaimed: 13,

  /** Pre-launch destinations (waitlist + demo). */
  primaryHref: "/launch",
  secondaryHref: "/demo",

  /**
   * CTA vocabulary — prefer helpers below so pages never invent variants.
   * Pre-launch: reserve a seat (not “get software now”). Post-launch: Start now.
   */
  cta: {
    /** Pre-launch primary — reserve founding access for Q4 2026. */
    primary: "Reserve a founding seat",
    /** Only when ≤5 spots — still invitation, not countdown theater. */
    primaryCritical: "Claim one of the last seats",
    /** Form submit — waitlist, not instant access. */
    formSubmit: "Reserve my seat — free, no card",
    /** Under-CTA honesty while waitlist-backed. */
    primaryHintPreLaunch:
      "Not available yet — launching Q4 2026 · 50 founding spots · we'll invite you then",
    /** Under-CTA when self-serve is live. */
    primaryHintPostLaunch: "14-day trial · no card · cancel anytime",
    /** Secondary — one phrase only. */
    secondaryPreLaunch: "See a preview — book a demo",
    secondaryPostLaunch: "See it first — book a demo",
    /** Post-launch destinations (dormant until preLaunch=false). */
    primaryHrefPostLaunch: "/signup",
    secondaryHrefPostLaunch: "/demo",
    /** Post-launch primary label (used when preLaunch flips false). */
    primaryPostLaunch: "Start now",
  },

  /** @deprecated Use marketingPrimaryCta() */
  primaryCta: "Reserve a founding seat",
  /** @deprecated Use marketingSecondaryCta() */
  secondaryCta: "See a preview — book a demo",
} as const;

export function marketingPrimaryHref(preLaunch: boolean = MARKETING_LAUNCH.preLaunch): string {
  return preLaunch ? MARKETING_LAUNCH.primaryHref : MARKETING_LAUNCH.cta.primaryHrefPostLaunch;
}

export function marketingSecondaryHref(preLaunch: boolean = MARKETING_LAUNCH.preLaunch): string {
  return preLaunch ? MARKETING_LAUNCH.secondaryHref : MARKETING_LAUNCH.cta.secondaryHrefPostLaunch;
}

export function marketingPrimaryCta(opts?: {
  preLaunch?: boolean;
  critical?: boolean;
}): string {
  const preLaunch = opts?.preLaunch ?? MARKETING_LAUNCH.preLaunch;
  if (!preLaunch) return MARKETING_LAUNCH.cta.primaryPostLaunch;
  if (opts?.critical) return MARKETING_LAUNCH.cta.primaryCritical;
  return MARKETING_LAUNCH.cta.primary;
}

export function marketingSecondaryCta(preLaunch: boolean = MARKETING_LAUNCH.preLaunch): string {
  return preLaunch
    ? MARKETING_LAUNCH.cta.secondaryPreLaunch
    : MARKETING_LAUNCH.cta.secondaryPostLaunch;
}

export function marketingFormSubmitCta(): string {
  return MARKETING_LAUNCH.cta.formSubmit;
}

export function marketingPrimaryHint(preLaunch: boolean = MARKETING_LAUNCH.preLaunch): string {
  return preLaunch
    ? MARKETING_LAUNCH.cta.primaryHintPreLaunch
    : MARKETING_LAUNCH.cta.primaryHintPostLaunch;
}

export function foundingSpotsRemaining(
  claimed: number = MARKETING_LAUNCH.foundingSpotsClaimed,
) {
  return Math.max(0, MARKETING_LAUNCH.foundingSpotsTotal - claimed);
}

export type FoundingSpotUrgency = "open" | "warm" | "hot" | "critical";

export function getFoundingSpotMessaging(claimed: number) {
  const remaining = foundingSpotsRemaining(claimed);
  const urgency: FoundingSpotUrgency =
    remaining <= 5 ? "critical" : remaining <= 12 ? "hot" : remaining <= 25 ? "warm" : "open";

  return {
    primary:
      remaining <= 5
        ? `${remaining} of ${MARKETING_LAUNCH.foundingSpotsTotal} founding seats left`
        : `${remaining} of ${MARKETING_LAUNCH.foundingSpotsTotal} founding seats open`,
    secondary:
      claimed > 0
        ? `Launching ${MARKETING_LAUNCH.launchQuarter} · ${claimed} shop${claimed === 1 ? "" : "s"} on the list — not live software yet`
        : `Launching ${MARKETING_LAUNCH.launchQuarter} · reserve a seat — software isn't available yet`,
    urgency,
  };
}

/**
 * Easy-start path frictions — endowment before email (IKEA effect).
 * User picks what's painful; we mirror how Ignition helps (reciprocity).
 */
export const EASY_START_FRICTIONS = [
  {
    id: "paper",
    label: "Paper estimates & chasing approvals",
    relief: "Email estimates and approval links — customers review from their phone.",
  },
  {
    id: "double",
    label: "Re-typing the same job three times",
    relief: "One RO from concern → estimate → invoice. No re-entry between systems.",
  },
  {
    id: "parts",
    label: "Parts lookup in a separate catalog",
    relief:
      "PartsTech catalog & punchout on the estimate — included with Ignition at launch.",
  },
  {
    id: "board",
    label: "Whiteboard / sticky-note job board",
    relief: "Live job board with Estimates, WIP, and Completed in one place.",
  },
  {
    id: "dvi",
    label: "Inspections customers can't see",
    relief: "Digital inspections with photo markup and a share link.",
  },
  {
    id: "day",
    label: "No clear view of today's work",
    relief: "Live Operations Daily Snapshot — today's and upcoming activity at a glance.",
  },
  {
    id: "software",
    label: "Paying for tools that don't talk",
    relief: "Ignition is one plan for the bay — not a maze of bolt-ons.",
  },
  {
    id: "typing",
    label: "Typing the same RO from a phone note",
    relief:
      "AI Plus: paste the note → draft vehicle, concerns, and labor hours — confirm and open the RO.",
  },
] as const;

/** Ethical status-quo framing (loss aversion without fake urgency). */
export const STATUS_QUO_COST =
  "Every week on paper and double-entry is time you don't get back at the counter.";

/** Goal-gradient: never show 0% — exploring the site already counts. */
export const EASY_START_PROGRESS = {
  exploring: 25,
  frictions: 50,
  mirror: 70,
  email: 90,
  done: 100,
} as const;

/**
 * Category + outcome framing (AutoLeap-style “all-in-one shop management” — ShopRally voice).
 * Used on home/features heroes; keep Ignition honesty (preLaunch / Q4 2026) on CTAs separately.
 */
export const CATEGORY_POSITIONING = {
  /** SEO / hero category line — not a brand substitute. */
  categoryLine: "All-in-one auto repair shop management software",
  shortCategory: "All-in-one shop management",
  /** Cloud CRM framing under the category. */
  productLine: "Cloud shop CRM that runs the bay and the counter",
} as const;

/**
 * “How it works for your shop” — plain shop-owner outcomes (not feature laundry lists).
 * Website & SEO stays a companion offer — never listed here as Ignition CRM.
 */
export const HOW_SHOPRALLY_WORKS = {
  eyebrow: "How ShopRally works for your shop",
  headline: "One system from the first concern to the final invoice",
  subhead:
    "Ignition is all-in-one auto repair shop management software for independents — not a stack of logins. PartsTech and digital vehicle inspections ship with the plan. Website & SEO stays a separate companion offer.",
  steps: [
    {
      step: "01",
      title: "Build the estimate once",
      description:
        "Concerns, canned jobs, shop labor, and PartsTech catalog & punchout live on the same repair order — no retyping parts into a second screen.",
    },
    {
      step: "02",
      title: "Show the work, get the yes",
      description:
        "Digital vehicle inspections with photo checklists customers can see, plus email estimates and approval links so the counter isn’t stuck on phone tag.",
    },
    {
      step: "03",
      title: "Run the day from one board",
      description:
        "Job board, appointments, payment tracking, and Live Operations Daily Snapshot keep advisors ahead of the bays — one login for the whole loop.",
    },
  ],
} as const;

/**
 * Ignition shop-plan packaging — competitor-style plan card (name / price / bullets / CTA).
 * Full area breakdown lives in CorePlanWhatsIncluded (below the fold).
 */
export const IGNITION_PLAN_MARKETING = {
  eyebrow: "Shop plan",
  /** Short audience line under the plan name (Garage360 / AutoLeap pattern). */
  bestFor:
    "All-in-one auto repair shop management for independents — bay and counter in one login.",
  /** Feature bullets under the price — short one-capability lines (Shopmonkey/AutoLeap style). */
  features: [
    { label: "PartsTech catalog & punchout" },
    { label: "Job board" },
    { label: "Full repair-order workspace" },
    { label: "Digital estimates" },
    { label: "Email approvals" },
    { label: "Invoices" },
    { label: "Digital vehicle inspections (photo checklists customers can see)" },
    { label: "Live Operations Daily Snapshot every morning" },
    { label: "Appointments" },
    { label: "Payment tracking" },
    { label: "NHTSA VIN decode" },
    { label: "Canned jobs & shop labor library" },
    { label: "Unlimited users & repair orders" },
  ],
  /** Compact AI Plus teaser under the Ignition card (add-on, not a peer plan). */
  addonTeaser: {
    eyebrow: "Optional add-on",
    title: "AI Plus",
    blurb: "Paste a note → AI drafts the RO. Labor assist + advisor app.",
  },
  ctaHint: `No card today · not live yet · invite at ${MARKETING_LAUNCH.launchQuarter} launch`,
} as const;

/**
 * AI Plus add-on packaging — sell alongside Ignition (default-on at signup).
 * Benefits mirror live product: freeform RO intake, labor assist, advisor app.
 */
export const AI_PLUS_MARKETING = {
  eyebrow: "Recommended with Ignition",
  headline: "AI Plus — write it once, open a ready RO",
  subhead:
    "Paste a phone note or counter scribble. ShopRally drafts the vehicle, concerns, and labor hours so advisors spend time with the customer — not the keyboard.",
  priceNote: `+${aiPlusPriceLabel()} · stacks on Ignition only`,
  bundleHint: (ignitionMonthly: number) =>
    `Ignition + AI Plus from $${(ignitionMonthly + aiPlusMonthlyDollars()).toFixed(2)}/mo`,
  ctaWithAi: "Reserve Ignition + AI Plus",
  ctaIgnitionOnly: "Reserve Ignition only",
  easeLine: "As easy as texting yourself a note — then Parse with AI.",
  benefits: [
    {
      title: "Freeform RO intake",
      detail:
        "Describe the car and the work in plain English. AI fills year/make/model, concerns, and a job draft you can edit before commit.",
    },
    {
      title: "Labor-hour assist",
      detail:
        "Suggested hours on the jobs you described — a fast starting point for the estimate, not a black box you can't change.",
    },
    {
      title: "Advisor mobile app",
      detail:
        "Capture intake from the bay or parking lot. Same shop, same RO — without walking back to a desktop.",
    },
    {
      title: "Less double-entry",
      detail:
        "One note becomes the RO skeleton. Advisors confirm customer + vehicle, then jump into the estimate.",
    },
    {
      title: "Stays optional",
      detail:
        "Ignition runs the bay without AI. AI Plus is the accelerator — add it when you want speed at the counter.",
    },
    {
      title: "Built for shops, not chatbots",
      detail:
        "Purpose-built for repair-order intake — not a generic assistant bolted onto a CRM.",
    },
  ],
  /** Teaser sample — mirrors live freeform placeholder style without exposing full model output. */
  teaserPrompt:
    "2014 Honda Accord — customer says brakes squeal in front, also wants oil change. About 82k miles.",
  teaserPreviewLabels: ["Vehicle identified", "2 jobs drafted", "Labor hours suggested"],
} as const;

/** Outcome claims for hero / social proof (marketing copy — shop-owner language). */
export const OUTCOME_METRICS = [
  { value: "10+", unit: "hrs/wk", label: "Less admin & double-entry" },
  { value: "1", unit: "system", label: "All-in-one shop management — Ignition" },
  { value: "3×", unit: "", label: "Faster estimates with canned jobs" },
  { value: "1", unit: "login", label: "Bay, counter, PartsTech & digital inspections" },
] as const;

/** Premium positioning — between legacy desktop CRM and budget add-on stacks. */
export const MARKET_POSITIONING = {
  eyebrow: "Where ShopRally fits",
  headline: "All-in-one shop management — not legacy, not a bolt-on stack",
  subhead: PHASE_ONE_LAUNCH
    ? "Legacy systems split workflow across desktop installs and agency retainers. Budget cloud CRMs look cheap until extras stack on. ShopRally Ignition is all-in-one auto repair shop management software — PartsTech and digital vehicle inspections included — add AI Plus when you're ready. Pro and Elite come later. Website & SEO is a separate companion offer."
    : "Legacy systems split workflow across desktop installs and agency retainers. Budget cloud CRMs look cheap until SMS, booking, reviews, and website work stack on. ShopRally is the modern all-in-one — Ignition through Elite full stack.",
  tiers: [
    {
      id: "legacy" as const,
      label: "Legacy CRM",
      summary: "Mitchell, Protractor, desktop-first stacks",
      priceLabel: "$600–900+/mo",
      subPrice: "Labor guides, digital vehicle inspections, marketing & website often separate",
      points: [
        "Desktop installs, slow updates, IT overhead",
        "Marketing, website, and reviews live elsewhere",
        "Integrations require vendor tickets and custom projects",
        "Training is an extra line item — if offered at all",
      ],
    },
    {
      id: "budget" as const,
      label: "Budget cloud + bolt-ons",
      summary: "Garage360, Torque360, entry CRM plus extras",
      priceLabel: "~$279–524/mo",
      subPrice: "CRM + SMS + booking + reviews + agency SEO",
      points: [
        "Sticker prices from $79/mo — until you need growth tools",
        "Marketing and website often sold separately",
        "Five logins, five invoices, five support contacts",
        "Feature maze across tiers and add-ons",
      ],
    },
    {
      id: "premium" as const,
      label: "ShopRally Ignition",
      summary: PHASE_ONE_LAUNCH
        ? "One plan to run the bay — launching Q4 2026"
        : "Cloud CRM, Growth Engine, training & optional full stack",
      priceLabel: PHASE_ONE_LAUNCH
        ? `From $${shoprallyStarterMonthly(true)}/mo`
        : `From $${shoprallyAllInMonthly(true)}/mo`,
      subPrice: PHASE_ONE_LAUNCH
        ? "Ignition shop plan · AI Plus optional +$49.99/mo"
        : "Pro flagship · licensed MOTOR + Growth Engine · Elite full stack",
      points: PHASE_ONE_LAUNCH
        ? [
            "Unlimited users & ROs, job board, digital vehicle inspections, email estimates & approvals",
            "PartsTech catalog & punchout — parts on the estimate without retyping",
            "Live Operations Daily Snapshot, appointments & payment tracking",
            "Canned jobs & shop labor library · unlimited NHTSA VIN decode",
            "AI Plus recommended (+$49.99/mo): freeform RO intake, labor assist & advisor app",
            "Pro & Elite coming later — not sold on pricing today",
          ]
        : [
            "Ignition: unlimited users & ROs, job board, digital vehicle inspections, email estimates & approvals",
            "Ignition: PartsTech catalog & punchout on every shop plan",
            "Ignition: Live Operations Daily Snapshot, appointments & payment tracking",
            "Licensed MOTOR labor data included on Pro & Elite",
            "Pro (coming later): plate→VIN, OEM specs & fluids, SMS, Stripe Connect, booking, Growth Engine",
            "Google review management on Pro · AI review replies on Elite",
            "Elite adds AI receptionist & maintenance programs · ShopSite/Local SEO also à la carte",
            "One customer record from job board to invoice to campaign",
          ],
    },
  ],
} as const;

export const FOUNDING_BENEFITS = [
  "One of 50 founding seats for the Q4 2026 launch",
  "Founding Ignition pricing locked when we open (annual)",
  "PartsTech catalog & punchout included with Ignition at launch",
  "Priority onboarding — we set up with you, not at you",
  "Your feedback shapes what we ship next",
  "Not live software yet — we invite you at Q4 2026 launch",
] as const;

export const VS_BUDGET_COMPETITORS = [
  {
    category: "Shop CRM & job board",
    shoprally: `${PLANS.PROFESSIONAL.name} — unlimited ROs & users`,
    garage360: "Clever $119/mo · Basic $79 (no digital vehicle inspections)",
    torque360: "Starter ~$90/mo · 5 co-user cap",
  },
  {
    category: "PartsTech catalog & punchout",
    shoprally: "Included with Ignition at launch — parts on the estimate",
    garage360: "Often separate / not in base CRM",
    torque360: "On Starter+ · co-user caps apply",
  },
  {
    category: "Digital vehicle inspections",
    shoprally: "Multi-point templates, photo markup & customer share on every plan",
    garage360: "Clever+ only · Basic has no digital vehicle inspections",
    torque360: "Included on Starter+",
  },
  {
    category: "Operations Daily Snapshot",
    shoprally: "Included on every plan",
    garage360: "Basic reporting on Clever+ · no shop-day snapshot",
    torque360: "Limited dashboards on higher tiers",
  },
  {
    category: "Labor guide & flat-rate data",
    shoprally: `${PLANS.PROFESSIONAL.name}+: licensed MOTOR included`,
    garage360: "Genius $199/mo for labor guides · no Growth Engine",
    torque360: "Labor on higher tiers · no native marketing stack",
  },
  {
    category: "SMS, booking & campaigns",
    shoprally: `Growth Engine automations & win-back on ${PLANS.PROFESSIONAL.name} ($${shoprallyAllInMonthly(true)}/mo annual)`,
    garage360: "Not included on any CRM tier",
    torque360: "One-way SMS on Starter · two-way on Turbo",
  },
  {
    category: "Review management",
    shoprally: `Google review management on ${PLANS.PROFESSIONAL.name}`,
    garage360: "Not included",
    torque360: "Auto review mgmt on Turbo (~$180/mo)",
  },
  {
    category: "AI receptionist (SMS + voice)",
    shoprally: `${PLANS.ENTERPRISE.name} — no per-seat AIR fee`,
    garage360: "Not available",
    torque360: "Not available",
  },
  {
    category: "Website + local SEO",
    shoprally: "One-time add-on or included on Elite",
    garage360: "Separate agency / digital marketing",
    torque360: "$999 scheduler add-on · agency SEO separate",
  },
  {
    category: "Maintenance programs",
    shoprally: `Member portal on ${PLANS.ENTERPRISE.name}`,
    garage360: "Not included",
    torque360: "Not included",
  },
] as const;

/** @deprecated Use VS_BUDGET_COMPETITORS — kept for drip templates. */
export const VS_INTEGRATED_STACK = VS_BUDGET_COMPETITORS.map((row) => ({
  category: row.category,
  shoprally: row.shoprally,
  autoleap: `${row.garage360} · ${row.torque360}`,
}));
