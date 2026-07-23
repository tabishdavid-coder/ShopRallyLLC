/** Pricing page catalog data (tiers, checklist, compare matrix). */

export type ChecklistCat = {
  icon: ChecklistIcon;
  name: string;
  sub: string;
  items: [string, string][];
};

export type ChecklistIcon =
  | "team"
  | "crm"
  | "est"
  | "dvi"
  | "sched"
  | "pay"
  | "ops"
  | "cat"
  | "comms"
  | "onb"
  | "ai";

export const CHECKLIST: ChecklistCat[] = [
  {
    icon: "team",
    name: "Capacity & team",
    sub: "No seat taxes. Grow the crew without another line item.",
    items: [
      ["Unlimited users", "Owners, advisors, techs — one subscription"],
      ["Unlimited repair orders", "No monthly RO caps"],
      ["Unlimited estimates & invoices", ""],
      ["Role-based shop access", "Owner / advisor / tech permissions"],
      ["Shop switcher for platform ops", "Platform admin can enter the tenant CRM"],
    ],
  },
  {
    icon: "crm",
    name: "Shop CRM",
    sub: "Customers, vehicles, and the board that runs the day.",
    items: [
      ["Customer profiles", "Search, tags, contact, notes, history"],
      ["Vehicle records", "VIN, YMM, plate, mileage, notes"],
      ["Free-type Year / Make / Model / Trim", "No catalog lock-in on Core"],
      ["Unlimited NHTSA VIN decode", "Free NHTSA vPIC — no monthly cap"],
      ["Carfax service history", "Prior service records on the vehicle / RO when VIN is present"],
      ["Job board", "Estimates · WIP · Completed with drag-and-drop"],
      ["Workflow / board views", "Pipeline visibility for the floor"],
      ["Global customer search", "Find people and ROs fast"],
      ["Activity notes on the RO", "Phone / email / note trail"],
    ],
  },
  {
    icon: "est",
    name: "Estimates & approvals",
    sub: "Build the ticket, authorize work, share digitally by email or SMS.",
    items: [
      ["Full repair-order workspace", "Summary, Estimate, Inspections, WIP, Payment"],
      ["Inline service / estimate grid", "Labor, parts, fees, discounts — edit in place"],
      ["PartsTech catalog & punchout", "Search suppliers and drop parts onto the RO — no retyping"],
      ["Nexpart parts ordering", "Second supplier network — compare price and availability before you order"],
      ["Canned jobs & shop labor library", "Your shop's menus and rates"],
      ["Line amounts, discounts & net", "Per-line $ / % discount with net adjust"],
      ["Job fees & RO adjustments", "Shop fees and discounts on the estimate"],
      ["Gross-profit visibility", "GP $, %, and GP/hr on the job"],
      ["Technician assignment", "RO-level technician picker"],
      ["Service advisor on the order", "Writer assignment on the RO header"],
      ["Authorization states", "Pending / approved / deferred / declined counts"],
      ["Email estimate & approval links", "Customer opens & signs on their phone"],
      ["Two-way SMS estimates & approvals", "Text the link and keep the thread in the CRM"],
      ["Public approval page", "Branded approve flow + signature capture"],
      ["Print estimate / invoice", "Shop and customer print views"],
      ["Create RO from customer / vehicle", "Guided intake path"],
    ],
  },
  {
    icon: "dvi",
    name: "Digital vehicle inspections",
    sub: "Show the work before they approve it.",
    items: [
      ["Multi-point inspection templates", ""],
      ["Red / yellow / green item ratings", ""],
      ["Photo markup on findings", ""],
      ["Inspection progress tracking", ""],
      ["Customer inspection share links", ""],
      ["Concerns → estimate path", "Customer & tech concerns on the RO"],
    ],
  },
  {
    icon: "sched",
    name: "Scheduling",
    sub: "Keep bay time and promise times in one place.",
    items: [
      ["Appointment calendar", ""],
      ["Create appointment from the RO", ""],
      ["Promise / pickup time on the order", ""],
      ["Shop appointment hours settings", ""],
      ["Default appointment duration", ""],
    ],
  },
  {
    icon: "pay",
    name: "Payments & invoicing",
    sub: "Collect in the shop without Stripe Connect on Core.",
    items: [
      ["Payment tracking", "Cash, check, card, other — recorded on the RO"],
      ["Balance due on the RO", "Paid to date vs remaining"],
      ["Email invoice & share link", ""],
      ["Public invoice page", ""],
      ["Transaction history on the order", ""],
      ["Deposit request flow", "Request a deposit against the estimate"],
    ],
  },
  {
    icon: "ops",
    name: "Daily ops & reporting",
    sub: "See the day without digging through spreadsheets.",
    items: [
      ["Operations Daily Snapshot", "Today & upcoming ROs, appointments, activity"],
      ["Basic shop reports", "Included reporting suite"],
      ["RO status pipeline visibility", ""],
      ["Inventory parts records", "On-hand, reorder, bin — shop stock tracking"],
    ],
  },
  {
    icon: "cat",
    name: "Catalog & shop setup",
    sub: "Your menus, rates, and shop defaults — without Ignition Pro matrices.",
    items: [
      ["Canned job catalog", ""],
      ["Shop labor library / rates", ""],
      ["Inspection template library", ""],
      ["Lead / marketing sources list", ""],
      ["Shop profile & labor rate settings", ""],
      ["Estimate transparency settings", "What customers see on estimate vs invoice"],
    ],
  },
  {
    icon: "comms",
    name: "Customer communications",
    sub: "Email, two-way SMS, and Google Reviews inbox on Ignition — Growth Engine campaigns stay Ignition Pro+.",
    items: [
      ["Email estimate / approval / invoice", ""],
      ["Two-way SMS threads", "Advisor ↔ customer texting on the RO"],
      ["Google Reviews inbox", "Connect GBP, sync reviews, and reply from the CRM"],
      ["Copy link sharing", "Share without forcing a channel"],
      ["Consent & marketing opt-in fields", "TCPA-aware customer records"],
    ],
  },
  {
    icon: "onb",
    name: "Onboarding & support",
    sub: "Self-serve with a human when you want one.",
    items: [
      ["Product guides & early demo support", ""],
      ["Cancel anytime", "No annual lock-in on list"],
      ["No CRM setup fees", ""],
    ],
  },
];

export const COMING_LATER: [string, "pro" | "elite"][] = [
  ["Licensed MOTOR labor data", "pro"],
  ["OEM specs & fluid capacities", "pro"],
  ["Stripe Connect / text-to-pay", "pro"],
  ["Growth Engine campaigns & automations", "pro"],
  ["Online booking widget", "pro"],
  ["Review-request campaigns", "pro"],
  ["Markup matrices", "pro"],
  ["Auto.dev plate→VIN", "pro"],
  ["AI review-reply drafts", "elite"],
  ["Maintenance / care programs", "elite"],
  ["AI receptionist suite", "elite"],
];

export const AI_FEATS: [string, string][] = [
  [
    "Freeform RO intake",
    "Describe the car and the work in plain English — AI fills year/make/model, concerns, and a job draft you can edit.",
  ],
  [
    "Labor-hour assist",
    "Suggested hours on the jobs you described — a starting point, not a black box you can't change.",
  ],
  [
    "Advisor mobile app",
    "Capture intake from the bay or parking lot — same shop, same RO, no walking back to a desktop.",
  ],
  [
    "Less double-entry",
    "One note becomes the RO skeleton. Advisors confirm customer + vehicle, then jump into the estimate.",
  ],
  [
    "Stays optional",
    "Ignition runs the bay without AI. Add it when you want speed at the counter.",
  ],
  [
    "Built for shops, not chatbots",
    "Purpose-built for repair-order intake — not a generic assistant bolted on.",
  ],
];

export type TierDef = {
  key: "ignition" | "ai" | "pro" | "elite";
  name: string;
  status: "live" | "roadmap";
  standout?: boolean;
  lead: string;
  bullets: string[];
  more?: string;
  cta: string;
  href?: string;
};

export const TIER_META: TierDef[] = [
  {
    key: "ignition",
    name: "Ignition",
    status: "live",
    lead: "Everything to run the shop",
    bullets: [
      "Full CRM & shop management",
      "Unlimited users & repair orders",
      "Job board — Estimates · WIP · Completed",
      "PartsTech parts ordering",
      "Nexpart parts ordering",
      "Two-way SMS texting",
      "Google Reviews inbox",
      "Digital vehicle inspections (DVI)",
      "Appointments & scheduling",
      "Carfax service history",
      "Digital estimates, approvals & invoices",
      "Live Operations Daily Snapshot",
    ],
    more: "See full checklist below",
    cta: "Reserve a founding seat",
    href: "/launch",
  },
  {
    key: "ai",
    name: "Ignition + AI Plus",
    status: "live",
    standout: true,
    lead: "Everything in Ignition, plus",
    bullets: [
      "Freeform AI repair-order intake",
      "Labor-hour assist",
      "Advisor mobile app",
      "Less double-entry at the counter",
      "Purpose-built for RO intake",
      "Optional — add or drop anytime",
    ],
    cta: "Reserve with AI Plus",
    href: "/launch?ai=1",
  },
  {
    key: "pro",
    name: "Ignition Pro",
    status: "roadmap",
    lead: "Everything in Ignition, plus",
    bullets: [
      "Licensed MOTOR labor data",
      "OEM specs & fluid capacities",
      "Stripe Connect / text-to-pay",
      "Growth Engine campaigns",
      "Online booking widget",
      "Review-request campaigns",
      "Markup matrices",
    ],
    cta: "Not sold yet — coming later",
  },
  {
    key: "elite",
    name: "Ignition Elite",
    status: "roadmap",
    lead: "Everything in Ignition Pro, plus",
    bullets: [
      "AI review-reply drafts",
      "Maintenance / care programs",
      "AI receptionist suite",
      "Dedicated white-glove onboarding",
      "Multi-location tooling",
    ],
    cta: "Not sold yet — coming later",
  },
];

export const BOARD_COLS = [
  {
    name: "Estimates",
    color: "#B45309",
    ros: [
      { id: "#1047", name: "Maria Santos", veh: "2018 Honda CR-V", amt: "$680" },
      { id: "#1048", name: "James Wu", veh: "2015 F-150", amt: "$920" },
    ],
  },
  {
    name: "Work in progress",
    color: "#FF7A1A",
    ros: [{ id: "#1046", name: "Luis Hernandez", veh: "2020 Chevy Silverado", amt: "$1,240" }],
  },
  {
    name: "Completed",
    color: "#0E8A5F",
    ros: [{ id: "#1044", name: "Pat O'Brien", veh: "2019 Camry", amt: "$540" }],
  },
] as const;

export const MATRIX_COLS = ["ignition", "ai", "pro", "elite"] as const;

export type TierKey = (typeof MATRIX_COLS)[number];

/** Per-plan highlights for the compact glance toggle (not the full checklist). */
export const PLAN_GLANCE: Record<
  TierKey,
  { label: string; status: "live" | "roadmap"; lead: string; bullets: string[] }
> = {
  ignition: {
    label: "Ignition",
    status: "live",
    lead: "Everything to run the shop — live now",
    bullets: [
      "Full CRM & shop management",
      "Unlimited users & repair orders",
      "Job board — Estimates · WIP · Completed",
      "PartsTech + Nexpart parts ordering",
      "Two-way SMS texting",
      "Google Reviews inbox",
      "Digital vehicle inspections (DVI)",
      "Appointments & scheduling",
      "Carfax service history",
      "Digital estimates, approvals & invoices",
      "Live Operations Daily Snapshot",
      "Unlimited NHTSA VIN decode",
    ],
  },
  ai: {
    label: "+ AI Plus",
    status: "live",
    lead: "Everything in Ignition, plus AI at the counter",
    bullets: [
      "Everything in Ignition",
      "Freeform AI repair-order intake",
      "Labor-hour assist on drafted jobs",
      "Advisor mobile app for bay / lot intake",
      "Less double-entry — one note becomes the RO skeleton",
      "Purpose-built for shop RO intake, not a generic chatbot",
      "Optional add-on — add or drop anytime",
      "Stacks on Ignition only (not a separate CRM)",
    ],
  },
  pro: {
    label: "Ignition Pro",
    status: "roadmap",
    lead: "Everything in Ignition, plus growth & data — roadmap",
    bullets: [
      "Everything in Ignition",
      "Licensed MOTOR labor data",
      "OEM specs & fluid capacities",
      "Stripe Connect / text-to-pay",
      "Growth Engine campaigns & automations",
      "Online booking widget",
      "Review-request campaigns",
      "Markup matrices (parts & labor)",
      "Auto.dev plate→VIN lookup",
      "Not sold today — opens after Q4 2026 launch",
    ],
  },
  elite: {
    label: "Ignition Elite",
    status: "roadmap",
    lead: "Everything in Ignition Pro, plus white-glove AI — roadmap",
    bullets: [
      "Everything in Ignition Pro",
      "AI review-reply drafts",
      "Maintenance / care programs",
      "AI receptionist suite",
      "Dedicated white-glove onboarding",
      "Multi-location tooling",
      "Priority founding-shop support path",
      "Not sold today — opens after Q4 2026 launch",
    ],
  },
};

export type DiffMark = "yes" | "no" | "addon" | "pro" | "elite";

/** Short high-signal capability matrix — not the full checklist. */
export const CAPABILITY_DIFFS: {
  feature: string;
  note?: string;
  cells: Record<TierKey, DiffMark>;
}[] = [
  {
    feature: "Unlimited users & repair orders",
    cells: { ignition: "yes", ai: "yes", pro: "yes", elite: "yes" },
  },
  {
    feature: "Job board, DVI, appointments",
    cells: { ignition: "yes", ai: "yes", pro: "yes", elite: "yes" },
  },
  {
    feature: "PartsTech + Nexpart ordering",
    cells: { ignition: "yes", ai: "yes", pro: "yes", elite: "yes" },
  },
  {
    feature: "Two-way SMS",
    cells: { ignition: "yes", ai: "yes", pro: "yes", elite: "yes" },
  },
  {
    feature: "Google Reviews inbox",
    cells: { ignition: "yes", ai: "yes", pro: "yes", elite: "yes" },
  },
  {
    feature: "Carfax service history",
    cells: { ignition: "yes", ai: "yes", pro: "yes", elite: "yes" },
  },
  {
    feature: "AI RO intake + labor assist",
    cells: { ignition: "no", ai: "addon", pro: "addon", elite: "addon" },
  },
  {
    feature: "Advisor mobile app",
    cells: { ignition: "no", ai: "addon", pro: "addon", elite: "addon" },
  },
  {
    feature: "Licensed MOTOR labor data",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "pro", elite: "pro" },
  },
  {
    feature: "Stripe Connect / text-to-pay",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "pro", elite: "pro" },
  },
  {
    feature: "Growth Engine & online booking",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "pro", elite: "pro" },
  },
  {
    feature: "Review-request campaigns",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "pro", elite: "pro" },
  },
  {
    feature: "AI review-reply drafts",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "no", elite: "elite" },
  },
  {
    feature: "AI receptionist suite",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "no", elite: "elite" },
  },
  {
    feature: "Care programs & multi-location",
    note: "Roadmap",
    cells: { ignition: "no", ai: "no", pro: "no", elite: "elite" },
  },
];
