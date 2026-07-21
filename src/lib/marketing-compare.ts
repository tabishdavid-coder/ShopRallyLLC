import { shoprallyStarterPricePairLabel } from "@/lib/plans";

export type CompareRow = {
  label: string;
  them: string;
  us: string;
};

export type ComparePageContent = {
  slug: string;
  path: string;
  /** Competitor display name (fair-use comparison) */
  competitor: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  whySwitch: string[];
  rows: CompareRow[];
  footnote: string;
};

const ignitionPrice = shoprallyStarterPricePairLabel();

export const COMPARE_PAGES: ComparePageContent[] = [
  {
    slug: "tekmetric-alternative",
    path: "/compare/tekmetric-alternative",
    competitor: "Tekmetric",
    title: "Tekmetric alternative for auto repair shops",
    description:
      "Looking for a Tekmetric alternative? ShopRally Ignition is cloud shop management software with job board, PartsTech, digital vehicle inspections, and email estimates — launching Q4 2026. Compare features and founding pricing.",
    h1: "Tekmetric alternative — ShopRally for auto repair shops",
    intro:
      "Tekmetric is a strong shop CRM. Many shops still look for a Tekmetric alternative when marketing is a second subscription, PartsTech isn’t on the base plan they want, or they want a simpler founding price to run the bay. ShopRally Ignition launches Q4 2026 as all-in-one auto repair shop management software — job board, PartsTech catalog & punchout, digital vehicle inspections, and email estimates & approvals included.",
    whySwitch: [
      "PartsTech catalog & punchout on Ignition — not parked behind a higher tier for founding shops",
      "Digital vehicle inspections and email estimate approvals in the same login as the job board",
      `Founding Ignition pricing at ${ignitionPrice} (annual) — reserve a seat; no charge today`,
      "Month-to-month intent after launch — no separate “marketing product” required to start Ignition",
      "Growth Engine (SMS, booking, win-back) stays on the Pro roadmap — we don’t pretend it’s on Ignition today",
    ],
    rows: [
      {
        label: "Core shop CRM (ROs, job board, customers)",
        them: "Yes — mature platform",
        us: "Yes — Ignition at launch",
      },
      {
        label: "PartsTech on the plan you start with",
        them: "Often tier / add-on dependent",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Available",
        us: "Included with Ignition",
      },
      {
        label: "Email estimates & approvals",
        them: "Yes",
        us: "Included with Ignition",
      },
      {
        label: "SMS / campaigns / booking",
        them: "Often Tekmetric Marketing add-on",
        us: "Pro+ roadmap (not Ignition)",
      },
      {
        label: "Public launch timing",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    footnote:
      "Competitor packaging changes. This page compares categories honestly for shops evaluating a switch — verify Tekmetric’s current tiers before you buy.",
  },
  {
    slug: "autoleap-alternative",
    path: "/compare/autoleap-alternative",
    competitor: "AutoLeap",
    title: "AutoLeap alternative for shop management",
    description:
      "Considering an AutoLeap alternative? ShopRally Ignition brings shop CRM, PartsTech, digital vehicle inspections, and email approvals together for Q4 2026 founding shops — without an annual lock-in pitch.",
    h1: "AutoLeap alternative — ShopRally Ignition",
    intro:
      "AutoLeap is known for a fast Services-tab workflow. Shops looking for an AutoLeap alternative often want matrix-depth estimates without an annual contract, or a clearer founding price that includes PartsTech and digital vehicle inspections. ShopRally Ignition is cloud shop management software launching Q4 2026 — built for the bay and the counter in one login.",
    whySwitch: [
      "Ignition includes PartsTech and digital vehicle inspections at founding pricing",
      "Email estimates & approval links so customers can say yes without phone tag",
      "Job board + RO workspace aimed at Tekmetric-class depth with AutoLeap-style speed on the roadmap",
      "No annual-contract pitch for founding Ignition seats — reserve free for Q4 2026",
      "Licensed MOTOR and Growth Engine stay Pro+ — labeled as coming later, not sold as Ignition",
    ],
    rows: [
      {
        label: "Shop CRM & repair orders",
        them: "Yes",
        us: "Yes — Ignition",
      },
      {
        label: "Estimate / Services workflow",
        them: "Strong inline Services UX",
        us: "RO workspace + canned jobs at launch; inline polish ongoing",
      },
      {
        label: "PartsTech",
        them: "Varies by package",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Available",
        us: "Included with Ignition",
      },
      {
        label: "Contract style (typical)",
        them: "Often annual on upper tiers",
        us: "Founding seats reserve free; launch billing when you start",
      },
      {
        label: "Availability",
        them: "Available today",
        us: "Q4 2026 launch",
      },
    ],
    footnote:
      "AutoLeap features and contracts vary by plan. Use this as a category comparison, then confirm details on a walkthrough.",
  },
  {
    slug: "shopmonkey-alternative",
    path: "/compare/shopmonkey-alternative",
    competitor: "Shopmonkey",
    title: "Shopmonkey alternative for repair shops",
    description:
      "Shopmonkey alternative for shops that want cloud CRM with PartsTech and digital vehicle inspections on the founding plan. ShopRally Ignition launches Q4 2026 — compare what ships now vs later.",
    h1: "Shopmonkey alternative — ShopRally for repair shops",
    intro:
      "Shopmonkey is a popular cloud shop platform. Shops evaluating a Shopmonkey alternative often want PartsTech on the starting plan, clearer founding economics, or a path to native campaigns without a separate CRM Essentials-style upsell. ShopRally Ignition launches Q4 2026 with job board, PartsTech, digital vehicle inspections, and email estimates in one product.",
    whySwitch: [
      "PartsTech catalog & punchout included with Ignition founding pricing",
      "Digital vehicle inspections and email approvals without a second product to start",
      "Unlimited users & ROs on Ignition — no per-seat surprise on the founding plan",
      "Work-request → RO and Growth Engine stay on the honest roadmap (Forms Hub / Pro+)",
      `Founding price ${ignitionPrice} — reserve a seat for Q4 2026 with no card today`,
    ],
    rows: [
      {
        label: "Cloud shop CRM",
        them: "Yes",
        us: "Yes — Ignition",
      },
      {
        label: "PartsTech on starter plan",
        them: "Often package-dependent",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Available",
        us: "Included with Ignition",
      },
      {
        label: "Work request → estimate",
        them: "Strong Work Request Form",
        us: "Roadmap (Forms Hub) — not claimed at Ignition launch",
      },
      {
        label: "Marketing / campaigns",
        them: "Often CRM Essentials / add-on",
        us: "Pro+ Growth Engine roadmap",
      },
      {
        label: "Launch status",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    footnote:
      "Shopmonkey packaging changes. This page is for shops comparing categories — confirm current Shopmonkey tiers before switching.",
  },
];

export function getComparePage(slug: string): ComparePageContent | undefined {
  return COMPARE_PAGES.find((p) => p.slug === slug);
}
