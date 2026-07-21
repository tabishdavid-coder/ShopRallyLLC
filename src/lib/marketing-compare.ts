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
  {
    slug: "garage360-alternative",
    path: "/compare/garage360-alternative",
    competitor: "Garage360",
    title: "Garage360 alternative for auto repair shops",
    description:
      "Looking for a Garage360 alternative? ShopRally Ignition is cloud shop management software with PartsTech, digital vehicle inspections, and a job board — launching Q4 2026 at founding pricing.",
    h1: "Garage360 alternative — ShopRally Ignition",
    intro:
      "Garage360 is a growing budget cloud option for independents. Shops evaluating a Garage360 alternative often want PartsTech on the founding plan, clearer Tekmetric-class RO depth, or less “cheap until add-ons stack” economics. ShopRally Ignition launches Q4 2026 as all-in-one auto repair shop management software — job board, PartsTech, digital vehicle inspections, and email estimates in one login.",
    whySwitch: [
      "PartsTech catalog & punchout included with Ignition founding pricing",
      "Digital vehicle inspections + email approvals without hunting a second product",
      `Founding Ignition at ${ignitionPrice} — reserve free for Q4 2026; no charge today`,
      "Built toward Tekmetric-class estimate depth with AutoLeap-style speed on the roadmap",
      "Growth Engine / SMS stay Pro+ and labeled honestly — not sold as Ignition today",
    ],
    rows: [
      {
        label: "Cloud shop CRM",
        them: "Yes — modern budget cloud",
        us: "Yes — Ignition",
      },
      {
        label: "PartsTech on the plan you start with",
        them: "Varies / often integration path",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Available",
        us: "Included with Ignition",
      },
      {
        label: "Email estimates & approvals",
        them: "Available",
        us: "Included with Ignition",
      },
      {
        label: "Typical positioning",
        them: "Value / ease-of-use cloud",
        us: "All-in-one Ignition + optional AI Plus",
      },
      {
        label: "Availability",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    footnote:
      "Garage360 features and pricing change. Use this as a category comparison, then confirm details on their site or a walkthrough.",
  },
  {
    slug: "torque360-alternative",
    path: "/compare/torque360-alternative",
    competitor: "Torque360",
    title: "Torque360 alternative for shop management",
    description:
      "Considering a Torque360 alternative? ShopRally Ignition brings shop CRM, PartsTech, digital vehicle inspections, and email approvals together for Q4 2026 founding shops.",
    h1: "Torque360 alternative — ShopRally for repair shops",
    intro:
      "Torque360 is another growing cloud shop platform aimed at garages and tire shops. Shops looking for a Torque360 alternative often want PartsTech included up front, a clearer founding price, or a path that doesn’t turn into a bolt-on stack. ShopRally Ignition launches Q4 2026 with the job board, PartsTech catalog & punchout, digital vehicle inspections, and email estimates in one product.",
    whySwitch: [
      "PartsTech on Ignition — parts on the estimate without a second workflow",
      "Digital vehicle inspections and email approval links in the same RO",
      "Unlimited users & ROs on the founding Ignition plan",
      `Founding price ${ignitionPrice} — reserve a seat; billing starts when you choose to start at launch`,
      "Pro+ tools (SMS, booking, Growth Engine) stay on the roadmap, not pretended into Ignition",
    ],
    rows: [
      {
        label: "Shop CRM & repair orders",
        them: "Yes",
        us: "Yes — Ignition",
      },
      {
        label: "PartsTech",
        them: "Often listed as integration",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Available on higher tiers / packages",
        us: "Included with Ignition",
      },
      {
        label: "Scheduling & invoices",
        them: "Core focus",
        us: "Appointments + email invoices on Ignition",
      },
      {
        label: "Contract / start",
        them: "Available today — plan tiers vary",
        us: "Founding seats reserve free for Q4 2026",
      },
      {
        label: "Growth / SMS campaigns",
        them: "Often add-on or partner",
        us: "Pro+ Growth Engine roadmap",
      },
    ],
    footnote:
      "Torque360 packaging changes by plan. Verify current tiers before you switch — this page compares categories honestly.",
  },
  {
    slug: "shop-ware-alternative",
    path: "/compare/shop-ware-alternative",
    competitor: "Shop-Ware",
    title: "Shop-Ware alternative for auto repair shops",
    description:
      "Shop-Ware alternative for shops that want cloud CRM with PartsTech and digital vehicle inspections on the founding plan. ShopRally Ignition launches Q4 2026.",
    h1: "Shop-Ware alternative — ShopRally Ignition",
    intro:
      "Shop-Ware is known for customer transparency and digital approvals. Shops evaluating a Shop-Ware alternative often want PartsTech on the starting plan, a simpler founding price, or RO/estimate depth that feels closer to Tekmetric without a separate marketing stack. ShopRally Ignition launches Q4 2026 with inspections, email estimates & approvals, PartsTech, and a kanban job board in one login.",
    whySwitch: [
      "Digital vehicle inspections + email approvals included with Ignition",
      "PartsTech catalog & punchout on the founding plan — not an afterthought",
      "Job board and RO workspace aimed at bay + counter in one system",
      `Founding Ignition ${ignitionPrice} — reserve for Q4 2026 with no card today`,
      "Growth Engine stays Pro+ — we won’t claim SMS/booking as Ignition features",
    ],
    rows: [
      {
        label: "Cloud RO management",
        them: "Yes",
        us: "Yes — Ignition",
      },
      {
        label: "Digital inspections & customer share",
        them: "Strong focus",
        us: "Included with Ignition",
      },
      {
        label: "Email / digital approvals",
        them: "Yes — core strength",
        us: "Included with Ignition",
      },
      {
        label: "PartsTech on starter plan",
        them: "Verify current packages",
        us: "Included with Ignition",
      },
      {
        label: "Multi-shop / reporting",
        them: "Available — confirm depth",
        us: "Platform console on roadmap / Pro+ story",
      },
      {
        label: "Launch status",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    footnote:
      "Shop-Ware features vary by package. Confirm current capabilities before switching; this page is a category comparison.",
  },
  {
    slug: "repairshopr-alternative",
    path: "/compare/repairshopr-alternative",
    competitor: "RepairShopr",
    title: "RepairShopr alternative for auto repair shops",
    description:
      "RepairShopr alternative for auto repair shops that want PartsTech, digital vehicle inspections, and a shop job board on one founding plan. ShopRally Ignition launches Q4 2026.",
    h1: "RepairShopr alternative — ShopRally for auto shops",
    intro:
      "RepairShopr is a popular cloud ticket/CRM platform used by many service businesses — including some auto shops. Shops looking for a RepairShopr alternative built for the bay often want auto-native workflows (PartsTech, DVI, RO job board) instead of a general service-ticket tool. ShopRally Ignition launches Q4 2026 as auto repair shop management software for independents.",
    whySwitch: [
      "Purpose-built for auto repair ROs — not a generic ticket desk adapted to cars",
      "PartsTech catalog & punchout included with Ignition",
      "Digital vehicle inspections with customer-facing checklists",
      "Kanban job board (Estimates / WIP / Completed) for the shop floor",
      `Founding pricing ${ignitionPrice} — reserve a seat for Q4 2026`,
    ],
    rows: [
      {
        label: "Primary product focus",
        them: "Multi-trade service tickets / CRM",
        us: "Auto repair shop CRM (Ignition)",
      },
      {
        label: "PartsTech punchout",
        them: "Not the core auto workflow",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Limited / not auto-native DVI",
        us: "Included with Ignition",
      },
      {
        label: "Shop job board",
        them: "Ticket queues",
        us: "Estimates / WIP / Completed kanban",
      },
      {
        label: "Email estimates & approvals",
        them: "Available in service workflows",
        us: "Included with Ignition",
      },
      {
        label: "Availability",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    footnote:
      "RepairShopr serves many verticals. Auto shops should verify fit vs an auto-native CRM — this page compares categories for shops evaluating a switch.",
  },
];

export function getComparePage(slug: string): ComparePageContent | undefined {
  return COMPARE_PAGES.find((p) => p.slug === slug);
}
