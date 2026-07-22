import { shoprallyStarterPricePairLabel } from "@/lib/plans";

export type CompareRow = {
  label: string;
  them: string;
  us: string;
};

export type CompareGlanceChip = {
  label: string;
  value: string;
};

export type ComparePricingNote = {
  /** Short posture line — never invent precise competitor $ if uncertain */
  summary: string;
  /** Optional second line with ranges / caveats */
  detail?: string;
  /** Shown under pricing callout */
  verifiedNote: string;
};

export type ComparePageContent = {
  slug: string;
  path: string;
  /** Competitor display name (fair-use comparison) */
  competitor: string;
  title: string;
  description: string;
  h1: string;
  /** Honest overview for hero (2–3 sentences max ideal) */
  intro: string;
  /** One-line wedge for VS visual */
  heroWedge: string;
  glanceChips: CompareGlanceChip[];
  chooseShopRally: string[];
  chooseThem: string[];
  whySwitch: string[];
  rows: CompareRow[];
  pricing: ComparePricingNote;
  footnote: string;
};

const ignitionPrice = shoprallyStarterPricePairLabel();
const researchDate = "July 2026";

export const COMPARE_PAGES: ComparePageContent[] = [
  {
    slug: "tekmetric-alternative",
    path: "/compare/tekmetric-alternative",
    competitor: "Tekmetric",
    title: "Tekmetric alternative for auto repair shops",
    description:
      "Looking for a Tekmetric alternative? ShopRally Ignition includes PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital inspections on one founding plan — without Scale-tier SMS or a $345 Marketing add-on for reviews. Launching Q4 2026.",
    h1: "Tekmetric alternative — ShopRally when Marketing & Scale stack up",
    intro:
      "Tekmetric is a mature, Tekmetric-class shop CRM — many shops are happy there. The switch conversation usually starts when you need two-way texting (Scale), campaigns/booking/reviews (Marketing add-on), and a lower all-in bill. ShopRally Ignition launches Q4 2026 with PartsTech, Carfax, two-way SMS, Google Reviews inbox (sync & reply), DVI, and email approvals on one founding plan; Growth Engine review-request campaigns stay Pro+ and labeled honestly.",
    heroWedge: "SMS + Reviews inbox on Ignition — not Scale + Marketing stack",
    glanceChips: [
      {
        label: "Price posture",
        value: `Ignition ${ignitionPrice} vs Tekmetric Start–Scale (~$199–$439/mo)`,
      },
      {
        label: "Who it's for",
        value: "Shops who like Tekmetric depth but hate the SMS/Marketing ladder",
      },
      {
        label: "Key wedge",
        value: "Two-way SMS on Ignition; their two-way sits on Scale",
      },
      {
        label: "Where they lead",
        value: "Mature product, labor guide on Grow, proven bay workflow",
      },
    ],
    chooseShopRally: [
      "You want two-way SMS, Carfax, PartsTech, and a Google Reviews inbox without jumping to Scale (~$439) or stacking Marketing (+$345).",
      "Founding Ignition economics matter more than a decade of Tekmetric polish today.",
      "You’re fine reserving for Q4 2026 and comparing categories before you switch.",
    ],
    chooseThem: [
      "You need a battle-tested CRM in production this month — Tekmetric is available today.",
      "Labor Guide / time clocks on Grow and Scale’s shop dashboard already fit your team.",
      "You’re already deep in Tekmetric workflows and migration risk outweighs bill savings.",
    ],
    whySwitch: [
      "Tekmetric two-way texting is a Scale feature — Ignition includes two-way SMS at founding pricing.",
      "Tekmetric Marketing (+$345/mo/shop) covers booking, reminders, reviews, and campaigns — Ignition includes Google Reviews inbox (sync & reply); review-request campaigns stay Pro+ Growth Engine.",
      "PartsTech catalog & punchout, Carfax, DVI, and email approvals ship on Ignition — one login for bay + counter.",
      `Founding Ignition at ${ignitionPrice} — reserve a seat; no charge today.`,
      "Month-to-month intent after launch — Tekmetric also offers flexible billing; the gap is packaging, not “contracts only.”",
    ],
    rows: [
      {
        label: "Core shop CRM (ROs, job board, customers)",
        them: "Yes — mature Start→Enterprise platform",
        us: "Yes — Ignition at Q4 2026 launch",
      },
      {
        label: "Two-way SMS / texting",
        them: "Scale tier (~$439/mo list) — not Marketing",
        us: "Included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Typically Tekmetric Marketing add-on (~+$345/shop) — verify live matrix",
        us: "Included with Ignition",
      },
      {
        label: "Marketing / booking / review-request campaigns",
        them: "Marketing add-on ~+$345/mo/shop",
        us: "Growth Engine roadmap on Pro+ (not Ignition)",
      },
      {
        label: "Parts ordering (PartsTech-class)",
        them: "Integrated parts ordering on plans (verify vendors)",
        us: "PartsTech catalog & punchout on Ignition",
      },
      {
        label: "Carfax service history",
        them: "CARFAX integration listed on plans",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Included from Start",
        us: "Included with Ignition",
      },
      {
        label: "Labor guide / licensed labor data",
        them: "Tekmetric Labor Guide on Grow+",
        us: "Shop library on Ignition; licensed MOTOR on Pro+",
      },
      {
        label: "Public availability",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "Tekmetric publishes Start ~$199/$179, Grow ~$349/$309, Scale ~$439/$409 (monthly/annual). Marketing +$345/shop.",
      detail: `ShopRally Ignition founding ${ignitionPrice} bundles two-way SMS + Carfax + PartsTech + Google Reviews inbox — often lower TCO than Scale + Marketing, depending on what you use. Verify their live pricing.`,
      verifiedNote: `Competitor figures last checked ${researchDate} on tekmetric.com/pricing.`,
    },
    footnote:
      "Tekmetric packaging changes. Two-way SMS ≠ Marketing add-on; review tools are commonly sold with Marketing — confirm current tiers before you buy. This page compares categories for shops evaluating a switch.",
  },
  {
    slug: "autoleap-alternative",
    path: "/compare/autoleap-alternative",
    competitor: "AutoLeap",
    title: "AutoLeap alternative for shop management",
    description:
      "Considering an AutoLeap alternative? ShopRally Ignition is month-to-month-friendly founding CRM with PartsTech, Carfax, two-way SMS, and Google Reviews inbox — while AutoLeap often leads on Services-tab polish and puts Google Reviews on Elite. Launching Q4 2026.",
    h1: "AutoLeap alternative — matrix depth without the annual pitch",
    intro:
      "AutoLeap is known for a fast Services-tab workflow — many advisors prefer it day-to-day. Shops looking for an AutoLeap alternative often want clearer month-to-month founding economics, Google Reviews without Elite, or Tekmetric-class matrix depth without an annual/setup package. ShopRally Ignition launches Q4 2026 with PartsTech, Carfax, two-way SMS, Google Reviews inbox, and DVI included; we don’t claim we’ve already matched their Services UX.",
    heroWedge: "They lead on Services speed — we lead on founding packaging",
    glanceChips: [
      {
        label: "Price posture",
        value: "Ignition ~$100 vs AutoLeap Essentials–Elite (~$179–$449)",
      },
      {
        label: "Who it's for",
        value: "Shops that want matrix depth + flexible billing",
      },
      {
        label: "Key wedge",
        value: "Two-way SMS + Reviews inbox on Ignition; Google Reviews often Elite there",
      },
      {
        label: "Where they lead",
        value: "Inline Services UX and polished DVI on higher tiers",
      },
    ],
    chooseShopRally: [
      "You care about founding price, PartsTech + two-way SMS + Google Reviews inbox on day one, and avoiding an annual-first sales motion.",
      "You want matrix-style estimate depth and are OK that inline Services polish is still catching up.",
      "You’ll evaluate for Q4 2026 rather than needing a full cutover this quarter.",
    ],
    chooseThem: [
      "Service advisors live in a fast Services tab today and won’t wait on UX parity.",
      "You’re fine with annual billing, setup fees, and a white-glove onboarding package.",
      "You specifically want AutoLeap AIR / advanced DVI features they’ve already shipped.",
    ],
    whySwitch: [
      "Honest split: AutoLeap often wins on Services-tab speed; ShopRally aims at matrix depth + RO workspace with inline polish on the roadmap.",
      "Ignition includes PartsTech, Carfax, two-way SMS, Google Reviews inbox, and DVI at founding pricing — AutoLeap two-way texting is typically Pro+; Google Reviews integration is commonly Elite.",
      "No annual-contract pitch for founding Ignition seats — reserve free for Q4 2026 (confirm AutoLeap terms on your quote).",
      "Licensed MOTOR and Growth Engine review-request campaigns stay Pro+ — we don’t bury them inside Ignition claims.",
      `Founding Ignition ${ignitionPrice}; optional AI Plus for RO intake assist (Ignition-only add-on).`,
    ],
    rows: [
      {
        label: "Shop CRM & repair orders",
        them: "Yes — Essentials→Enterprise",
        us: "Yes — Ignition",
      },
      {
        label: "Estimate / Services workflow",
        them: "Strong inline Services UX (often the reason shops stay)",
        us: "RO workspace + canned jobs at launch; inline polish ongoing",
      },
      {
        label: "PartsTech / integrated parts",
        them: "Listed from Essentials (verify punchout)",
        us: "Included with Ignition",
      },
      {
        label: "Two-way SMS",
        them: "Typically Pro and above",
        us: "Included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Integrated Google Reviews commonly Elite — verify live pricing",
        us: "Included with Ignition",
      },
      {
        label: "Carfax / vehicle history",
        them: "CARFAX on Essentials+",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Standard DVI on Essentials; next-gen on Elite",
        us: "Included with Ignition",
      },
      {
        label: "Contract / billing style",
        them: "Annual billing common; setup fee typical — confirm quote",
        us: "Founding seats reserve free; launch billing when you start",
      },
      {
        label: "Availability",
        them: "Available today",
        us: "Q4 2026 launch",
      },
    ],
    pricing: {
      summary:
        "AutoLeap publishes Essentials ~$179/$199, Pro ~$309/$349, Elite ~$409/$449 (annual/monthly). AIR add-on ~$99/mo.",
      detail: `ShopRally Ignition ${ignitionPrice} is often lower TCO for shops that need two-way SMS + Reviews inbox without Pro/Elite — confirm AutoLeap package on a demo.`,
      verifiedNote: `Competitor figures last checked ${researchDate} on autoleap.com/pricing.`,
    },
    footnote:
      "AutoLeap features and contracts vary by plan and quote. We acknowledge their Services UX lead — use this as a category comparison, then walk both products.",
  },
  {
    slug: "shopmonkey-alternative",
    path: "/compare/shopmonkey-alternative",
    competitor: "Shopmonkey",
    title: "Shopmonkey alternative for repair shops",
    description:
      "Shopmonkey alternative for shops that want unlimited users, PartsTech, two-way SMS, and Google Reviews inbox on Ignition — without CRM Essentials for reviews & campaigns. ShopRally launches Q4 2026; Work Request → RO is still on our Forms Hub roadmap.",
    h1: "Shopmonkey alternative — without the CRM Essentials tax",
    intro:
      "Shopmonkey is a popular cloud shop platform with a strong Work Request Form. Shops evaluating a Shopmonkey alternative often want unlimited users on the starting plan, Google Reviews without CRM Essentials, or clearer founding economics. ShopRally Ignition launches Q4 2026 with PartsTech, Carfax, two-way SMS, Google Reviews inbox, and DVI — and we won’t pretend Work Request parity ships on day one.",
    heroWedge: "Reviews inbox on Ignition vs CRM Essentials upsell",
    glanceChips: [
      {
        label: "Price posture",
        value: "Ignition ~$100 vs Basic–Genius (~$239–$499) + CRM Essentials",
      },
      {
        label: "Who it's for",
        value: "Shops priced out of Clever/Genius or CRM Essentials",
      },
      {
        label: "Key wedge",
        value: "Google Reviews inbox on Ignition; Essentials still gates their reviews stack",
      },
      {
        label: "Where they lead",
        value: "Work Request Form → estimate (Forms Hub is our roadmap)",
      },
    ],
    chooseShopRally: [
      "You want unlimited users & ROs, PartsTech, Carfax, two-way SMS, and Google Reviews inbox without climbing Clever/Genius or buying CRM Essentials.",
      "You’ll wait for Forms Hub for work-request → RO instead of needing that flow tomorrow.",
      "Founding Ignition pricing and an honest Pro+ growth path matter more than a mature marketplace of add-ons.",
    ],
    chooseThem: [
      "Work Request Form is non-negotiable for how you take cars today.",
      "You’re already standardized on Shopmonkey multi-location / Genius workflows.",
      "You need the product live this month, not Q4 2026.",
    ],
    whySwitch: [
      "Shopmonkey’s Work Request Form is a real strength — ShopRally Forms Hub is roadmap, not Ignition launch.",
      "CRM Essentials (~$349/mo / ~$314 annual) gates Reviews Manager, campaigns, and online booking — Ignition includes Google Reviews inbox (sync & reply); review-request campaigns stay Pro+ Growth Engine.",
      "Unlimited users & ROs on Ignition — contrast Basic’s tighter user packaging (verify current Shopmonkey limits).",
      "PartsTech, Carfax, DVI, and email approvals included with founding Ignition.",
      `Founding price ${ignitionPrice} — reserve for Q4 2026 with no card today.`,
    ],
    rows: [
      {
        label: "Cloud shop CRM",
        them: "Yes — Basic / Clever / Genius (+ Multi-Shop)",
        us: "Yes — Ignition",
      },
      {
        label: "Users on starter plan",
        them: "Tiered (Basic often capped — verify)",
        us: "Unlimited on Ignition",
      },
      {
        label: "Work request → estimate",
        them: "Strong Work Request Form",
        us: "Roadmap (Forms Hub) — not claimed at Ignition launch",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "CRM Essentials Reviews Manager (~$314–$349/mo add-on)",
        us: "Included with Ignition",
      },
      {
        label: "Marketing / campaigns / booking",
        them: "CRM Essentials add-on (~$314–$349/mo)",
        us: "Pro+ Growth Engine roadmap",
      },
      {
        label: "PartsTech on starting economics",
        them: "Available — confirm plan packaging",
        us: "Included with Ignition",
      },
      {
        label: "Two-way SMS",
        them: "In core messaging — confirm plan",
        us: "Included with Ignition",
      },
      {
        label: "Launch status",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "Shopmonkey publishes Basic ~$239/$215, Clever ~$399/$359, Genius ~$499/$449; CRM Essentials ~$349/$314.",
      detail: `Ignition ${ignitionPrice} is often lower if you’d otherwise buy Clever+ plus CRM Essentials for reviews — still verify their live page.`,
      verifiedNote: `Competitor figures last checked ${researchDate} on shopmonkey.io/pricing.`,
    },
    footnote:
      "Shopmonkey packaging changes. Work Request is a fair reason to stay — this page is for shops comparing categories, not a smear.",
  },
  {
    slug: "garage360-alternative",
    path: "/compare/garage360-alternative",
    competitor: "Garage360",
    title: "Garage360 alternative for auto repair shops",
    description:
      "Garage360 alternative when you want PartsTech, Carfax, and two-way SMS bundled — not just a lower sticker. Garage360 Basic starts ~$79; ShopRally Ignition is a different packaging bet launching Q4 2026.",
    h1: "Garage360 alternative — bundled ops, not the cheapest sticker",
    intro:
      "Garage360 is a growing budget cloud option — Basic can start around $79/mo, which is lower than Ignition’s list price. Shops evaluating a Garage360 alternative usually want fewer feature gates (DVI starts on Clever), PartsTech-class punchout, two-way SMS + Carfax in one bill, or deeper RO/estimate workflows. ShopRally Ignition launches Q4 2026 as that bundled bet — not a race to the bottom dollar.",
    heroWedge: "They win on entry price — we win on bundled bay tools",
    glanceChips: [
      {
        label: "Price posture",
        value: "Garage360 Basic ~$79 can undercut Ignition — different bundle",
      },
      {
        label: "Who it's for",
        value: "Shops that outgrow Basic gates (DVI on Clever+)",
      },
      {
        label: "Key wedge",
        value: "PartsTech + Carfax + two-way SMS on Ignition",
      },
      {
        label: "Where they lead",
        value: "Lower entry price; live product today",
      },
    ],
    chooseShopRally: [
      "You need DVI, two-way SMS, Carfax, PartsTech, and Google Reviews inbox together without climbing Clever→Genius.",
      "RO/job-board depth and founding Ignition packaging matter more than the lowest monthly sticker.",
      "You’re planning a Q4 2026 evaluation, not an immediate $79 cutover.",
    ],
    chooseThem: [
      "Lowest monthly price wins and Basic’s feature set already covers your bay.",
      "You want something live this week with a free-trial style motion.",
      "You’re happy on Clever/Genius and don’t need ShopRally’s founding story.",
    ],
    whySwitch: [
      "Honest price note: Garage360 Basic (~$79/mo) can be cheaper than Ignition — we compete on bundle, not sticker.",
      "Digital vehicle inspections start on Garage360 Clever (~$119) — Ignition includes DVI on the founding plan.",
      "PartsTech catalog & punchout, Carfax, two-way SMS, and Google Reviews inbox included with Ignition founding pricing.",
      "Built toward Tekmetric-class estimate depth; AutoLeap-style speed stays on the honest roadmap.",
      `Founding Ignition ${ignitionPrice} — reserve free for Q4 2026; Growth Engine campaigns stay Pro+.`,
    ],
    rows: [
      {
        label: "Cloud shop CRM",
        them: "Yes — Basic / Clever / Genius / Multi-Shop",
        us: "Yes — Ignition",
      },
      {
        label: "Entry price (public list)",
        them: "Basic ~$79/mo — often lower than Ignition",
        us: `Ignition founding ${ignitionPrice}`,
      },
      {
        label: "Digital vehicle inspections",
        them: "Clever and above (~$119+)",
        us: "Included with Ignition",
      },
      {
        label: "PartsTech-class punchout",
        them: "Parts lookup listed — punchout packaging unclear",
        us: "PartsTech catalog & punchout on Ignition",
      },
      {
        label: "Two-way SMS + Carfax",
        them: "Confirm per plan / integrations",
        us: "Both included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Not clearly on CRM tiers — often bolt-on / verify",
        us: "Included with Ignition",
      },
      {
        label: "Labor guides",
        them: "Genius tier",
        us: "Shop library on Ignition; MOTOR on Pro+",
      },
      {
        label: "Availability",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "Garage360 publishes Basic ~$79, Clever ~$119, Genius ~$199 (monthly list; annual saves ~20%).",
      detail:
        "Don’t pick ShopRally only to “save money” vs Basic — pick it for bundled SMS/Carfax/PartsTech/Reviews inbox and RO depth. See /pricing for Ignition.",
      verifiedNote: `Competitor figures last checked ${researchDate} on garage360.io/pricing.`,
    },
    footnote:
      "Garage360 features and pricing change. Entry price can beat Ignition — compare the full bundle, then confirm on their site.",
  },
  {
    slug: "torque360-alternative",
    path: "/compare/torque360-alternative",
    competitor: "Torque360",
    title: "Torque360 alternative for shop management",
    description:
      "Torque360 alternative for shops that want unlimited users and two-way SMS without Turbo. Torque360 Starter already includes PartsTech & Carfax — ShopRally’s wedge is users + two-way SMS on Ignition. Q4 2026.",
    h1: "Torque360 alternative — unlimited users & two-way SMS on Ignition",
    intro:
      "Torque360 is a growing cloud platform for garages and tire shops. Starter already lists PartsTech, Carfax, and advanced DVI — so “they don’t have PartsTech” is the wrong pitch. The usual switch triggers are the 5 co-user cap and one-way texting on Starter (two-way on Turbo). ShopRally Ignition launches Q4 2026 with unlimited users and two-way SMS on the founding plan.",
    heroWedge: "Starter caps users & SMS — Ignition doesn’t",
    glanceChips: [
      {
        label: "Price posture",
        value: "Ignition ~$100 vs Starter ~$90 / Turbo ~$180 (annual USD)",
      },
      {
        label: "Who it's for",
        value: "Teams that outgrow 5 co-users or need two-way SMS",
      },
      {
        label: "Key wedge",
        value: "Unlimited users + two-way SMS without Turbo",
      },
      {
        label: "Where they lead",
        value: "Live product; Starter already bundles PartsTech + DVI",
      },
    ],
    chooseShopRally: [
      "You’ve hit Starter’s 5 co-user limit or need two-way texting without paying for Turbo.",
      "You want founding Ignition packaging with Growth Engine clearly labeled Pro+.",
      "You’re timing a Q4 2026 evaluation rather than switching this week.",
    ],
    chooseThem: [
      "Starter’s ~$90 annual plan already covers PartsTech, Carfax, and DVI for a tiny team.",
      "You’re happy on Turbo with Mitchell1 guides and marketing reminders.",
      "You need the software live today.",
    ],
    whySwitch: [
      "Accuracy first: Torque360 Starter lists PartsTech, Carfax, and advanced DVI — we don’t claim they lack those.",
      "Starter is one-way texting + 5 co-users; Turbo unlocks two-way SMS, unlimited users, and auto review management — Ignition includes unlimited users, two-way SMS, and Google Reviews inbox.",
      "Kanban-style job board + RO workspace aimed at bay + counter in one founding plan.",
      "Booking add-ons and Growth Engine campaigns stay honest: Pro+ / separate offers — not buried in Ignition.",
      `Founding price ${ignitionPrice} — reserve a seat; billing starts when you choose to start at launch.`,
    ],
    rows: [
      {
        label: "Shop CRM & repair orders",
        them: "Yes — Starter / Turbo / Supercharged",
        us: "Yes — Ignition",
      },
      {
        label: "Co-users",
        them: "Starter: 5 co-users · Turbo: unlimited",
        us: "Unlimited on Ignition",
      },
      {
        label: "Two-way SMS",
        them: "One-way on Starter · two-way on Turbo",
        us: "Included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Auto review management typically Turbo+",
        us: "Included with Ignition",
      },
      {
        label: "PartsTech & Carfax",
        them: "Listed on Starter",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Advanced DVI on Starter",
        us: "Included with Ignition",
      },
      {
        label: "Labor guides (Mitchell1 / Epicor)",
        them: "Turbo+",
        us: "Shop library on Ignition; MOTOR on Pro+",
      },
      {
        label: "Marketing / reminders",
        them: "Turbo marketing & service reminders",
        us: "Pro+ Growth Engine roadmap",
      },
      {
        label: "Availability",
        them: "Available today — confirm current promo pricing",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "Torque360 lists Starter ~$89.99/mo and Turbo ~$179.99/mo billed annually (USD); Supercharged is quote-only. Promo/CAD variants appear on-page — verify.",
      detail:
        "Ignition is often comparable to Starter on dollars but includes unlimited users + two-way SMS + Google Reviews inbox. See /pricing — don’t invent a sale price from their banner.",
      verifiedNote: `Competitor figures last checked ${researchDate} on torque360.co/pricing.`,
    },
    footnote:
      "Torque360 packaging and promos change. Starter already includes PartsTech/Carfax/DVI — our honest wedge is users + two-way SMS + Reviews inbox vs Turbo.",
  },
  {
    slug: "shop-ware-alternative",
    path: "/compare/shop-ware-alternative",
    competitor: "Shop-Ware",
    title: "Shop-Ware alternative for auto repair shops",
    description:
      "Shop-Ware alternative when you want founding Ignition pricing with PartsTech and two-way SMS — while respecting Shop-Ware’s Digital Vehicle Experience strength. ShopRally launches Q4 2026.",
    h1: "Shop-Ware alternative — founding price, same transparency goal",
    intro:
      "Shop-Ware is known for customer transparency and the Digital Vehicle Experience. Shops evaluating a Shop-Ware alternative often want a lower founding bill (Startup commonly starts near the high-$200s), clearer PartsTech packaging, or growth tools without a separate CRM/scheduler add-on. ShopRally Ignition launches Q4 2026 with inspections, email approvals, PartsTech, and a job board — we aim for the same trust outcome, not a clone of their UX.",
    heroWedge: "They lead on DVE polish — we lead on founding economics",
    glanceChips: [
      {
        label: "Price posture",
        value: "Ignition ~$100 vs Shop-Ware Startup ~$279+ class",
      },
      {
        label: "Who it's for",
        value: "Shops that like transparency but not premium list pricing",
      },
      {
        label: "Key wedge",
        value: "PartsTech + two-way SMS on Ignition founding plan",
      },
      {
        label: "Where they lead",
        value: "Digital Vehicle Experience & customer-facing polish",
      },
    ],
    chooseShopRally: [
      "Founding Ignition price matters and you still need DVI + digital approvals + PartsTech.",
      "You want Growth Engine labeled Pro+ instead of a CRM/scheduler add-on decision on day one.",
      "You’ll trial the category for Q4 2026 rather than rip-and-replace a working Shop-Ware bay.",
    ],
    chooseThem: [
      "Digital Vehicle Experience and customer chat/approval rates are why you bought Shop-Ware.",
      "You’re on Pro/Master analytics or Ultimate+ web packages that already fit.",
      "You need the product in production immediately.",
    ],
    whySwitch: [
      "Respect the lead: Shop-Ware’s customer-facing DVI/transparency is a fair reason to stay.",
      "Ignition includes digital inspections, email approvals, PartsTech, Carfax, two-way SMS, and Google Reviews inbox at founding pricing.",
      "Job board + RO workspace for bay and counter — matrix pricing depth on the ShopRally roadmap story.",
      "CRM/online scheduler style growth tools: Shop-Ware often sells as add-on; our Growth Engine stays Pro+.",
      `Founding Ignition ${ignitionPrice} — reserve for Q4 2026 with no card today.`,
    ],
    rows: [
      {
        label: "Cloud RO management",
        them: "Yes — Startup→Ultimate+",
        us: "Yes — Ignition",
      },
      {
        label: "Digital inspections & customer share",
        them: "Digital Vehicle Experience — core strength",
        us: "Included with Ignition (parity of polish ongoing)",
      },
      {
        label: "Email / digital approvals",
        them: "Yes — core strength",
        us: "Included with Ignition",
      },
      {
        label: "PartsTech / integrated parts",
        them: "Integrated ordering — confirm catalog depth by tier",
        us: "PartsTech catalog & punchout on Ignition",
      },
      {
        label: "Two-way texting",
        them: "Limited on Startup · unlimited on higher tiers (verify)",
        us: "Included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Reputation tooling — confirm package / add-on (soften if unsure)",
        us: "Included with Ignition",
      },
      {
        label: "CRM / online scheduler",
        them: "Often add-on (~$249/mo class — verify)",
        us: "Pro+ Growth Engine / booking roadmap",
      },
      {
        label: "Launch status",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "Shop-Ware packages commonly list Startup ~$279/$251, Pro ~$389/$350, Master ~$499/$449, Ultimate+ ~$999/$899; CRM/scheduler add-on ~$249 (re-verify if packages page changes).",
      detail: `Ignition ${ignitionPrice} is often lower TCO for independents who don’t need Ultimate+ web packages — confirm their current packages page.`,
      verifiedNote: `Competitor figures last checked ${researchDate} via shop-ware.com/packages and industry summaries.`,
    },
    footnote:
      "Shop-Ware features vary by package. Their transparency UX is a real differentiator — compare honestly, then confirm live pricing.",
  },
  {
    slug: "repairshopr-alternative",
    path: "/compare/repairshopr-alternative",
    competitor: "RepairShopr",
    title: "RepairShopr alternative for auto repair shops",
    description:
      "RepairShopr alternative for auto shops that need PartsTech, digital vehicle inspections, and a kanban job board — not a multi-trade ticket desk. ShopRally Ignition launches Q4 2026.",
    h1: "RepairShopr alternative — auto-native CRM for the bay",
    intro:
      "RepairShopr is a capable cloud ticket/CRM platform for many service businesses — including some auto shops. If your pain is “this feels like a helpdesk, not a shop,” you’re in the right comparison. ShopRally Ignition launches Q4 2026 as auto repair shop management software: PartsTech, DVI, RO job board, and estimate approvals built for the bay.",
    heroWedge: "Tickets vs repair orders — pick the vertical",
    glanceChips: [
      {
        label: "Price posture",
        value: "Different category — RepairShopr ~$60–$150 class vs Ignition ~$100",
      },
      {
        label: "Who it's for",
        value: "Auto shops outgrowing multi-trade ticket workflows",
      },
      {
        label: "Key wedge",
        value: "PartsTech + DVI + Estimates/WIP/Done kanban",
      },
      {
        label: "Where they lead",
        value: "Multi-trade POS/ticketing; live today; lower entry SKUs",
      },
    ],
    chooseShopRally: [
      "You run an auto repair bay and need RO-native estimates, inspections, and parts punchout.",
      "Kanban job board (Estimates / WIP / Completed) matches how you run the floor.",
      "You’re planning Q4 2026 and want founding Ignition packaging with Carfax + two-way SMS.",
    ],
    chooseThem: [
      "You repair phones, computers, or mixed trades — RepairShopr’s ticket model fits.",
      "You need POS/ticket volume tools live today at a lower entry SKU.",
      "Auto-specific DVI/PartsTech isn’t your bottleneck.",
    ],
    whySwitch: [
      "Purpose-built for auto repair ROs — not a generic ticket desk adapted to cars.",
      "PartsTech catalog & punchout and digital vehicle inspections included with Ignition.",
      "Kanban job board (Estimates / WIP / Completed) for the shop floor.",
      "Carfax + two-way SMS + Google Reviews inbox on Ignition; Growth Engine campaigns stay Pro+.",
      `Founding pricing ${ignitionPrice} — reserve a seat for Q4 2026.`,
    ],
    rows: [
      {
        label: "Primary product focus",
        them: "Multi-trade service tickets / CRM / POS",
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
        label: "Shop floor board",
        them: "Ticket queues",
        us: "Estimates / WIP / Completed kanban",
      },
      {
        label: "Users / volume packaging",
        them: "Starter caps users & tickets — higher plans unlock",
        us: "Unlimited users & ROs on Ignition",
      },
      {
        label: "Email estimates & approvals",
        them: "Available in service workflows",
        us: "Included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Not an auto-native reputation module — verify if offered",
        us: "Included with Ignition",
      },
      {
        label: "Availability",
        them: "Available today",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "RepairShopr publishes Starter / Repair Shop / Big Chain in roughly the $60–$150/mo class with user and ticket caps — confirm current amounts on their pricing page.",
      detail:
        "Not a like-for-like auto CRM price fight. Choose on vertical fit first, then dollars. Ignition details on /pricing.",
      verifiedNote: `Competitor packaging last checked ${researchDate} on repairshopr.com/pricing — amounts move; verify before sales use.`,
    },
    footnote:
      "RepairShopr serves many verticals. Auto shops should verify fit vs an auto-native CRM — this page compares categories for shops evaluating a switch.",
  },
  {
    slug: "ari-alternative",
    path: "/compare/ari-alternative",
    competitor: "ARI",
    title: "ARI alternative for auto repair shop management",
    description:
      "Looking for an ARI alternative? ARI (Auto Repair Software at ari.app) wins on mobile-first price — ShopRally Ignition is the multi-bay CRM bet with a kanban job board, estimate depth, two-way SMS, and Google Reviews inbox. Launching Q4 2026.",
    h1: "ARI alternative — multi-bay CRM when you’ve outgrown mobile invoicing",
    intro:
      "ARI (Auto Repair Software — ari.app, not ARI Network parts catalogs) is a strong mobile-first option for independents and mobile techs: freemium trial, Pro around $40/mo, PartsTech & Carfax integrations, inspections, and booking. Shops evaluating an ARI alternative usually want Tekmetric-class RO/job-board depth for a multi-bay floor, a Google Reviews inbox as CRM chrome, or founding packaging that scales past invoice-first workflows. ShopRally Ignition launches Q4 2026 — we don’t pretend to undercut ARI’s sticker.",
    heroWedge: "They win on mobile price — we win on multi-bay CRM depth",
    glanceChips: [
      {
        label: "Price posture",
        value: "ARI Pro ~$40 / Pro Plus ~$60 can undercut Ignition — different product bet",
      },
      {
        label: "Who it's for",
        value: "Multi-bay shops outgrowing invoice-first / mobile-first workflows",
      },
      {
        label: "Key wedge",
        value: "Kanban job board + estimate depth + Google Reviews inbox on Ignition",
      },
      {
        label: "Where they lead",
        value: "Entry price, mobile OBD/plate tools, freemium, live today",
      },
    ],
    chooseShopRally: [
      "You run a multi-bay floor and want Estimates / WIP / Completed kanban plus deeper RO/estimate workflows — not just fast mobile invoices.",
      "Google Reviews inbox (sync & reply), two-way SMS, PartsTech, and Carfax on one founding Ignition plan matter more than the lowest monthly sticker.",
      "You’re planning a Q4 2026 evaluation and are fine that ARI already ships today at a lower entry price.",
    ],
    chooseThem: [
      "You’re a mobile mechanic or solo tech and ARI’s phone-first workflow is the product.",
      "Lowest monthly price / freemium trial wins and Pro (~$40) already covers your bay.",
      "You need the software live this week — ARI is available today; Ignition launches Q4 2026.",
    ],
    whySwitch: [
      "Honest price note: ARI Pro (~$39.99/mo) and Pro Plus (~$59.99/mo) undercut Ignition’s list — we compete on multi-bay CRM depth, not sticker.",
      "ARI already lists PartsTech, Carfax, inspections, and online booking — don’t switch expecting “they don’t have parts/Carfax.”",
      "ShopRally wedge: kanban job board + RO workspace aimed at bay + counter, with matrix-style estimate depth on the ShopRally story.",
      "Google Reviews inbox (sync & reply) and two-way SMS on Ignition; review-request campaigns stay Pro+ Growth Engine — labeled honestly.",
      `Founding Ignition ${ignitionPrice} — reserve free for Q4 2026; pick ARI if mobile price is the only filter.`,
    ],
    rows: [
      {
        label: "Primary product posture",
        them: "Mobile-first shop app (iOS/Android/web/Windows) — strong for independents",
        us: "Multi-bay cloud CRM — job board + RO workspace (Ignition)",
      },
      {
        label: "Entry price (public list)",
        them: "Pro ~$39.99/mo · Pro Plus ~$59.99/mo (annual lower) — freemium trial",
        us: `Ignition founding ${ignitionPrice}`,
      },
      {
        label: "Shop floor board",
        them: "Job cards / work orders — confirm live UX",
        us: "Estimates / WIP / Completed kanban",
      },
      {
        label: "PartsTech & Carfax",
        them: "Listed integrations on ari.app — verify in-product depth",
        us: "Included with Ignition",
      },
      {
        label: "Digital vehicle inspections",
        them: "Inspection checklists & damage reports on paid plans",
        us: "Included with Ignition",
      },
      {
        label: "Two-way SMS / messaging",
        them: "SMS & email marketing listed — confirm two-way CRM thread vs blast",
        us: "Two-way SMS included with Ignition",
      },
      {
        label: "Google Reviews inbox (sync & reply)",
        them: "Not a clear GBP inbox module on public pricing — verify marketing tools",
        us: "Included with Ignition",
      },
      {
        label: "Online booking",
        them: "Booking link / directory — listed on Pro",
        us: "Pro+ Growth Engine / booking roadmap",
      },
      {
        label: "Labor guides",
        them: "M1 / AI labor guides — packaging varies (often Pro Plus / credits)",
        us: "Shop library on Ignition; licensed MOTOR on Pro+",
      },
      {
        label: "Availability",
        them: "Available today — freemium + paid",
        us: "Q4 2026 — founding seats open",
      },
    ],
    pricing: {
      summary:
        "ARI publishes Pro ~$39.99/mo (~$33.33 annual) and Pro Plus ~$59.99/mo (~$49.99 annual). Freemium trial (limited invoices). No contract pitch on their pricing page.",
      detail:
        "Don’t pick ShopRally to “save money” vs ARI — pick it for multi-bay CRM depth, Reviews inbox, and founding Ignition packaging. See /pricing.",
      verifiedNote: `Competitor figures last checked ${researchDate} on ari.app/auto-repair-software-price/.`,
    },
    footnote:
      "ARI = Auto Repair Software at ari.app (uMob.ltd) — not ARI Network Services. Features and credit allotments change; confirm live packaging before you buy.",
  },
];

export function getComparePage(slug: string): ComparePageContent | undefined {
  return COMPARE_PAGES.find((p) => p.slug === slug);
}
