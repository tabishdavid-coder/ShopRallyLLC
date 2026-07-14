/**
 * Proposed Core (Ignition) plan offering — MOCK / review only.
 * Not wired into PLANS / /pricing until approved.
 *
 * Built from product shipped on Core (STARTER) + gates in
 * docs/CORE-PLAN-FIDELITY.md and settings-plan-gates.
 */

export type CoreOfferingItem = {
  name: string;
  detail?: string;
  /** Highlight as a stronger value prop on the card */
  highlight?: boolean;
};

export type CoreOfferingGroup = {
  id: string;
  title: string;
  blurb: string;
  items: CoreOfferingItem[];
};

export const CORE_OFFERING_MOCK = {
  planName: "Core",
  marketingName: "Ignition",
  priceMonthly: 49.99,
  priceAnnualMonthly: 44.99,
  tagline: "Everything to run the shop floor — without locking you into Pro bolt-ons.",
  bestFor: "Independent shops going cloud-first with a full CRM, estimates, DVIs, and daily ops.",
  priceNote: "Per location · cancel anytime · no CRM setup fee",
  groups: [
    {
      id: "capacity",
      title: "Capacity & team",
      blurb: "No seat taxes. Grow the crew without another line item.",
      items: [
        { name: "Unlimited users", detail: "Owners, advisors, techs — one subscription", highlight: true },
        { name: "Unlimited repair orders", detail: "No monthly RO caps", highlight: true },
        { name: "Unlimited estimates & invoices", highlight: true },
        { name: "Role-based shop access", detail: "Owner / advisor / tech permissions" },
        { name: "Shop switcher for platform ops", detail: "Platform admin can enter the tenant CRM" },
      ],
    },
    {
      id: "crm",
      title: "Shop CRM",
      blurb: "Customers, vehicles, and the board that runs the day.",
      items: [
        { name: "Customer profiles", detail: "Search, tags, contact, notes, history" },
        { name: "Vehicle records", detail: "VIN, YMM, plate, mileage, notes" },
        { name: "Free-type Year / Make / Model / Trim", detail: "No catalog lock-in on Core" },
        { name: "NHTSA VIN decode", detail: "Free VIN decode path (no Auto.dev on Core)" },
        { name: "Manual plate entry", detail: "Plate stored without paid plate→VIN" },
        { name: "Job board", detail: "Estimates · WIP · Completed with drag-and-drop", highlight: true },
        { name: "Workflow / board views", detail: "Pipeline visibility for the floor" },
        { name: "Global customer search", detail: "Find people and ROs fast" },
        { name: "Activity notes on the RO", detail: "Phone / email / note trail" },
      ],
    },
    {
      id: "estimates",
      title: "Estimates & approvals",
      blurb: "Build the ticket, authorize work, share digitally by email.",
      items: [
        { name: "Full repair-order workspace", detail: "Summary, Estimate, Inspections, WIP, Payment", highlight: true },
        { name: "Inline service / estimate grid", detail: "Labor, parts, fees, discounts — edit in place" },
        { name: "Canned jobs & shop labor library", detail: "Your shop’s menus and rates", highlight: true },
        { name: "Line amounts, discounts & net", detail: "Per-line $ / % discount with net adjust" },
        { name: "Job fees & RO adjustments", detail: "Shop fees and discounts on the estimate" },
        { name: "Gross-profit visibility", detail: "GP $, %, and GP/hr on the job" },
        { name: "Technician assignment", detail: "RO-level technician picker" },
        { name: "Service advisor on the order", detail: "Writer assignment on the RO header" },
        { name: "Authorization states", detail: "Pending / approved / deferred / declined counts" },
        { name: "Email estimate & approval links", detail: "Customer opens & signs on their phone", highlight: true },
        { name: "Public approval page", detail: "Branded approve flow + signature capture" },
        { name: "Print estimate / invoice", detail: "Shop and customer print views" },
        { name: "Create RO from customer / vehicle", detail: "Guided intake path" },
      ],
    },
    {
      id: "dvi",
      title: "Digital vehicle inspections",
      blurb: "Show the work before they approve it.",
      items: [
        { name: "Multi-point inspection templates", highlight: true },
        { name: "Red / yellow / green item ratings" },
        { name: "Photo markup on findings" },
        { name: "Inspection progress tracking" },
        { name: "Customer inspection share links", highlight: true },
        { name: "Concerns → estimate path", detail: "Customer & tech concerns on the RO" },
      ],
    },
    {
      id: "schedule",
      title: "Scheduling",
      blurb: "Keep bay time and promise times in one place.",
      items: [
        { name: "Appointment calendar" },
        { name: "Create appointment from the RO" },
        { name: "Promise / pickup time on the order" },
        { name: "Shop appointment hours settings" },
        { name: "Default appointment duration" },
      ],
    },
    {
      id: "payments",
      title: "Payments & invoicing",
      blurb: "Collect in the shop without Stripe Connect on Core.",
      items: [
        { name: "Payment tracking", detail: "Cash, check, card, other — recorded on the RO", highlight: true },
        { name: "Balance due on the RO", detail: "Paid to date vs remaining" },
        { name: "Email invoice & share link", highlight: true },
        { name: "Public invoice page" },
        { name: "Transaction history on the order" },
        { name: "Deposit request flow", detail: "Request a deposit against the estimate" },
      ],
    },
    {
      id: "ops",
      title: "Daily ops & reporting",
      blurb: "See the day without digging through spreadsheets.",
      items: [
        { name: "Operations Daily Snapshot", detail: "Today & upcoming ROs, appointments, activity", highlight: true },
        { name: "Basic shop reports", detail: "Included reporting suite" },
        { name: "RO status pipeline visibility" },
        { name: "Inventory parts records", detail: "On-hand, reorder, bin — shop stock tracking" },
      ],
    },
    {
      id: "catalog",
      title: "Catalog & shop setup",
      blurb: "Your menus, rates, and shop defaults — without Pro matrices.",
      items: [
        { name: "Canned job catalog" },
        { name: "Shop labor library / rates" },
        { name: "Inspection template library" },
        { name: "Lead / marketing sources list" },
        { name: "Shop profile & labor rate settings" },
        { name: "Estimate transparency settings", detail: "What customers see on estimate vs invoice" },
      ],
    },
    {
      id: "comms",
      title: "Customer communications",
      blurb: "Digital by email on Core — SMS lands on Pro.",
      items: [
        { name: "Email estimate / approval / invoice", highlight: true },
        { name: "Copy link sharing", detail: "Share without forcing SMS" },
        { name: "Consent & marketing opt-in fields", detail: "TCPA-aware customer records" },
      ],
    },
    {
      id: "support",
      title: "Onboarding & support",
      blurb: "Self-serve with a human when you want one.",
      items: [
        { name: "Product guides & early demo support" },
        { name: "Cancel anytime — no annual lock-in on list", highlight: true },
        { name: "No CRM setup fees" },
      ],
    },
  ] satisfies CoreOfferingGroup[],
  notIncluded: [
    { name: "Licensed MOTOR labor data", note: "Pro+" },
    { name: "PartsTech vendor punchout", note: "Pro+" },
    { name: "Stripe Connect / text-to-pay", note: "Pro+" },
    { name: "Two-way SMS & campaigns", note: "Pro+" },
    { name: "Growth Engine automations", note: "Pro+" },
    { name: "Online booking widget", note: "Pro+" },
    { name: "Markup matrices", note: "Pro+" },
    { name: "Auto.dev plate→VIN", note: "Pro+" },
    { name: "ShopSite & Local SEO", note: "Add-on or Elite" },
    { name: "AI receptionist suite", note: "Elite / add-on" },
  ],
  addon: {
    name: "AI Plus",
    price: "$20/mo",
    blurb: "Optional on Core only — supercharge intake without buying Pro.",
    items: [
      { name: "Smart / freeform AI repair-order intake" },
      { name: "Labor-hour assist" },
      { name: "ShopRally advisor mobile app" },
    ],
  },
  /** Short card bullets proposed to replace today’s 10-line dump on /pricing */
  proposedCardBullets: [
    "Unlimited users",
    "Unlimited ROs & estimates",
    "Job board + full RO workspace",
    "Canned jobs & shop labor library",
    "Digital estimates, approvals & invoices (email)",
    "Digital vehicle inspections",
    "Operations Daily Snapshot",
    "Appointments",
    "Payment tracking",
    "NHTSA VIN decode",
    "Inventory basics & shop catalog",
  ],
} as const;

export type CoreOfferingMock = typeof CORE_OFFERING_MOCK;
