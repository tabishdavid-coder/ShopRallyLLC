/**
 * Pre-launch marketing config — flip `preLaunch` to false when GA opens self-serve signup.
 * See docs/MARKETING-GO-LIVE-FLIP.md for Phase B checklist.
 */
import {
  PLANS,
  PHASE_ONE_LAUNCH,
  aiPlusPriceLabel,
  shoprallyAllInMonthly,
  shoprallyIgnitionAiBundlePricePairLabel,
  shoprallyStarterPricePairLabel,
} from "@/lib/plans";

export const MARKETING_LAUNCH = {
  preLaunch: true,
  /** Public launch window — never imply the product is live today while preLaunch. */
  launchWindowLabel: "Launching Q4 2026",
  launchQuarter: "Q4 2026",
  foundingProgramLabel: "Founding Shop Program",
  /**
   * Optional static founding-program size for internal ops / soft copy once
   * (“Launching with 50 founding seats”). Never drive a public countdown,
   * remaining-count, “X left”, or progress meter from this number.
   */
  foundingSpotsTotal: 50,

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
    /** @deprecated Same as primary — seat-count urgency retired. */
    primaryCritical: "Reserve a founding seat",
    /** Form submit — waitlist, not instant access. */
    formSubmit: "Reserve my seat — free, no card",
    /** Under-CTA honesty while waitlist-backed. */
    primaryHintPreLaunch: "Launching Q4 2026 · no card · we'll invite you at launch",
    /** Under-CTA when self-serve is live. */
    primaryHintPostLaunch: "14-day trial · no card · cancel anytime",
    /** Secondary — ungated product moments on /demo (not a video); call optional. */
    secondaryPreLaunch: "See the 3-minute walkthrough",
    secondaryPostLaunch: "See the 3-minute walkthrough",
    /** Post-launch destinations (dormant until preLaunch=false). */
    primaryHrefPostLaunch: "/signup",
    secondaryHrefPostLaunch: "/demo",
    /** Post-launch primary label (used when preLaunch flips false). */
    primaryPostLaunch: "Start now",
  },

  /** @deprecated Use marketingPrimaryCta() */
  primaryCta: "Reserve a founding seat",
  /** @deprecated Use marketingSecondaryCta() */
  secondaryCta: "See the 3-minute walkthrough",
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

export type FoundingSpotUrgency = "open";

/**
 * Public strip copy — soft founding seats only.
 * Never pass live remaining/claimed into UI; no countdown / “X left”.
 */
export function getFoundingSpotMessaging() {
  return {
    primary: MARKETING_LAUNCH.launchWindowLabel,
    secondary: "Founding seats open for the Q4 2026 launch",
    /** Optional one-line static size — not a live inventory meter. */
    staticCapNote: `Launching with ${MARKETING_LAUNCH.foundingSpotsTotal} founding seats`,
    urgency: "open" as FoundingSpotUrgency,
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
  headline: "Auto repair shop management from the first concern to the final invoice",
  subhead:
    "Ignition is all-in-one auto repair shop management software for independents — not a stack of logins. PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital vehicle inspections ship with the plan.",
  steps: [
    {
      step: "01",
      title: "Build the estimate once",
      description:
        "Concerns, canned jobs, shop labor, PartsTech catalog & punchout, and Carfax history live on the same repair order — no retyping parts into a second screen.",
    },
    {
      step: "02",
      title: "Show the work, get the yes",
      description:
        "Digital vehicle inspections with photo checklists customers can see, plus email and two-way SMS estimate/approval links so the counter isn’t stuck on phone tag.",
    },
    {
      step: "03",
      title: "Run the day from one board",
      description:
        "Job board, appointments, payment tracking, Google Reviews inbox, and Live Operations Daily Snapshot keep advisors ahead of the bays — one login for the whole loop.",
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
  /**
   * Feature bullets under the price — short one-capability lines for the Ignition card.
   * Order matches the launch-plan card layout (PartsTech first; no seat counts).
   */
  features: [
    { label: "PartsTech catalog & punchout" },
    { label: "Carfax service history" },
    { label: "Two-way SMS" },
    { label: "Google Reviews inbox — sync & reply" },
    { label: "Job board" },
    { label: "Full repair-order workspace" },
    { label: "Digital estimates" },
    { label: "Email & SMS approvals" },
    { label: "Invoices" },
    { label: "Digital vehicle inspections customers can see" },
    { label: "Live Operations Daily Snapshot every morning" },
    { label: "Appointments" },
    { label: "Payment tracking" },
    { label: "NHTSA VIN decode" },
    { label: "Canned jobs & shop labor library" },
    { label: "Unlimited users & repair orders" },
  ],
  /** Compact AI Plus teaser under the Ignition card (add-on, not a peer plan). */
  addonTeaser: {
    eyebrow: "Optional add-ons",
    title: "AI Plus",
    blurb: "Paste a note → AI drafts the RO. Labor assist + advisor app.",
  },
  ctaHint: `No card today · invite at ${MARKETING_LAUNCH.launchQuarter} launch`,
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
  /** Both cadences — do not pass annual-only Ignition into a single /mo figure. */
  bundleHint: () =>
    `Ignition + AI Plus · ${shoprallyIgnitionAiBundlePricePairLabel()}`,
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

/** Honest product facts for hero / social proof — no unverifiable time-saved claims. */
export const OUTCOME_METRICS = [
  { value: "1", unit: "system", label: "All-in-one shop management — Ignition" },
  { value: "Yes", unit: "", label: "PartsTech catalog & punchout included" },
  { value: "Yes", unit: "", label: "Digital vehicle inspections included" },
  { value: "Q4", unit: "2026", label: "Launch window — not billed today" },
] as const;

/**
 * Founder narrative — “built by a shop owner / built by an owner” only.
 * No named shop, city, or invented founder biography.
 */
export const FOUNDER_SHOP_PROOF = {
  eyebrow: "Built by a shop owner",
  headline: "ShopRally is built by an owner who knows the bay and the counter",
  body:
    "Ignition is shaped by real shop work — estimates, PartsTech, inspections, and the job board — not a pitch deck. No invented customer counts or revenue claims.",
  proofTag: "Built by an owner",
} as const;

/** Homepage FAQ — founding reserve, billing start, migration honesty. */
export const HOME_FAQ = [
  {
    q: "What is ShopRally?",
    a: "ShopRally is all-in-one auto repair shop management software — a cloud shop CRM for independent shops. Ignition covers the job board, repair orders, PartsTech catalog & punchout, Carfax, two-way SMS, Google Reviews inbox (sync & reply), digital vehicle inspections, email estimates & approvals, appointments, payment tracking, and Live Operations Daily Snapshot in one login.",
  },
  {
    q: "What does reserving a founding seat mean?",
    a: `You're on the invite list for the ${MARKETING_LAUNCH.launchQuarter} launch and lock founding Ignition pricing (${shoprallyStarterPricePairLabel()}) when we open. You don't get software access or a charge today.`,
  },
  {
    q: "When does billing start?",
    a: `Ignition launches ${MARKETING_LAUNCH.launchQuarter}. We don't bill founding seats until we invite you at launch and you choose to start. Reserving is free and no card is required.`,
  },
  {
    q: "Is PartsTech included with shop management software pricing?",
    a: `Yes — PartsTech catalog & punchout ships with Ignition (${shoprallyStarterPricePairLabel()}). See Ignition pricing for the full list and the optional AI Plus add-on.`,
  },
  {
    q: "Can I switch from Tekmetric, AutoLeap, or Mitchell?",
    a: "Yes — tell us what you use today on a walkthrough or when we onboard. We'll help you plan the cutover. We won't invent one-click imports that aren't built yet; founding shops get priority hands-on help, and formal white-glove migration packages are on the later roadmap. Compare Tekmetric, AutoLeap, and Shopmonkey alternatives on our compare pages.",
  },
] as const;

/** Extra in-page links under the home FAQ (JSON-LD still uses HOME_FAQ text only). */
export const HOME_FAQ_RELATED_LINKS = [
  { href: "/features", label: "Ignition features" },
  { href: "/pricing", label: "Shop management software pricing" },
  { href: "/demo", label: "Product walkthrough" },
  { href: "/compare", label: "Compare alternatives" },
  { href: "/compare/tekmetric-alternative", label: "Tekmetric alternative" },
] as const;

/** Premium positioning — between legacy desktop CRM and budget add-on stacks. */
export const MARKET_POSITIONING = {
  eyebrow: "Where ShopRally fits",
  headline: "All-in-one shop management — not legacy, not a bolt-on stack",
  subhead: PHASE_ONE_LAUNCH
    ? "Legacy systems split workflow across desktop installs and agency retainers. Budget cloud CRMs look cheap until extras stack on. ShopRally Ignition is all-in-one auto repair shop management software — PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital vehicle inspections included — add AI Plus when you're ready."
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
        ? shoprallyStarterPricePairLabel()
        : `From $${shoprallyAllInMonthly(true)}/mo`,
      subPrice: PHASE_ONE_LAUNCH
        ? `Ignition shop plan · AI Plus optional +${aiPlusPriceLabel()}`
        : "Pro flagship · licensed MOTOR + Growth Engine · Elite full stack",
      points: PHASE_ONE_LAUNCH
        ? [
            "Unlimited users & ROs, job board, digital vehicle inspections, email & SMS estimates & approvals",
            "PartsTech catalog & punchout — parts on the estimate without retyping",
            "Carfax service history on the vehicle / RO",
            "Two-way SMS customer threads — included with Ignition",
            "Google Reviews inbox — sync & reply from the CRM (not a Marketing add-on)",
            "Live Operations Daily Snapshot, appointments & payment tracking",
            "Canned jobs & shop labor library · unlimited NHTSA VIN decode",
            `AI Plus recommended (+${aiPlusPriceLabel()}): freeform RO intake, labor assist & advisor app`,
          ]
        : [
            "Ignition: unlimited users & ROs, job board, digital vehicle inspections, email & SMS estimates & approvals",
            "Ignition: PartsTech, Carfax, two-way SMS, and Google Reviews inbox on every shop plan",
            "Ignition: Live Operations Daily Snapshot, appointments & payment tracking",
            "Licensed MOTOR labor data included on Pro & Elite",
            "Pro (coming later): plate→VIN, OEM specs & fluids, Stripe Connect, booking, Growth Engine campaigns",
            "Google Reviews inbox on Core · review-request campaigns on Pro · AI drafts on Elite",
            "Elite adds AI receptionist & Care Plans · ShopSite/Local SEO also à la carte",
            "One customer record from job board to invoice to campaign",
          ],
    },
  ],
} as const;

export const FOUNDING_BENEFITS = [
  "Founding seat for the Q4 2026 launch",
  `Founding Ignition pricing locked when we open (${shoprallyStarterPricePairLabel()})`,
  "PartsTech catalog & punchout included with Ignition at launch",
  "Google Reviews inbox — sync & reply from the CRM on Ignition",
  "Priority onboarding — we set up with you, not at you",
  "Your feedback shapes what we ship next",
  "We'll invite you at the Q4 2026 launch",
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
    category: "Two-way SMS",
    shoprally: "Included with Ignition — estimate, approval & invoice threads",
    garage360: "Not included on any CRM tier",
    torque360: "One-way SMS on Starter · two-way on Turbo",
  },
  {
    category: "Carfax service history",
    shoprally: "Included with Ignition",
    garage360: "Varies by tier / add-on",
    torque360: "Varies by tier",
  },
  {
    category: "Booking & Growth Engine campaigns",
    shoprally: `Online booking & win-back campaigns on ${PLANS.PROFESSIONAL.name} ($${shoprallyAllInMonthly(true)}/mo annual)`,
    garage360: "Not included on any CRM tier",
    torque360: "Limited marketing on higher tiers",
  },
  {
    category: "Review management",
    shoprally: `Google Reviews inbox on Ignition (${PLANS.STARTER.name}) · AI drafts on ${PLANS.ENTERPRISE.name}`,
    garage360: "Not included on CRM tiers (verify)",
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
    category: "Care Plans",
    shoprally: `Elite premium — member portal on ${PLANS.ENTERPRISE.name} (not Core)`,
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
