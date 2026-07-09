/** Seed data for the global FAQ library. */
export type FaqSeed = {
  slug: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export const FAQ_SEED: FaqSeed[] = [
  {
    slug: "getting-started-overview",
    category: "Getting Started",
    question: "What is RepairPilot?",
    answer:
      "RepairPilot is a cloud shop-management CRM for auto repair businesses. " +
      "Manage customers, vehicles, repair orders, estimates, inspections, appointments, " +
      "parts, invoicing, and customer messaging — all in one place. Each shop is an isolated tenant.",
    sortOrder: 1,
  },
  {
    slug: "getting-started-first-ro",
    category: "Getting Started",
    question: "How do I create my first repair order?",
    answer:
      "Open Job Board or click + Repair Order. Search for an existing customer or add a new one, " +
      "select or add a vehicle (VIN decode is built in), enter odometer and concerns, then save. " +
      "You'll land on the Estimate tab to build the job.",
    sortOrder: 2,
  },
  {
    slug: "getting-started-users",
    category: "Getting Started",
    question: "How do I add employees to my shop?",
    answer:
      "Go to Admin → Employees. Add team members with roles (Owner, Manager, Service Writer, Technician). " +
      "User limits depend on your subscription plan — see Settings → Billing & Plan.",
    sortOrder: 3,
  },
  {
    slug: "billing-plans",
    category: "Billing & Plans",
    question: "What subscription plans are available?",
    answer:
      "RepairPilot offers Starter, Professional, and Scale (Enterprise) tiers. Starter includes core CRM, " +
      "job board, estimates, and inspections. Professional adds parts catalog, labor guide, SMS, reports, " +
      "and markup matrices. Scale adds multi-location admin and advanced reporting. See /pricing for details.",
    sortOrder: 1,
  },
  {
    slug: "billing-trial",
    category: "Billing & Plans",
    question: "How long is the free trial?",
    answer:
      "New shops start on a 14-day trial with Starter plan features. Your trial end date appears on " +
      "Settings → Billing & Plan. Upgrade anytime — Stripe self-serve checkout is coming soon.",
    sortOrder: 2,
  },
  {
    slug: "billing-upgrade",
    category: "Billing & Plans",
    question: "How do I upgrade my plan?",
    answer:
      "Open Settings → Billing & Plan to view your current tier and included features. " +
      "Click Upgrade to compare plans. Self-serve Stripe Billing checkout and the customer portal " +
      "will be enabled in a future release — contact support if you need an immediate upgrade.",
    sortOrder: 3,
  },
  {
    slug: "stripe-connect-setup",
    category: "Payments",
    question: "How do I connect Stripe to accept card payments?",
    answer:
      "Go to Settings → Integrations → Stripe. Click Connect and complete Stripe Express onboarding. " +
      "Each shop connects its own Express account under the RepairPilot platform — customer payments " +
      "settle directly to your shop. Platform subscription billing (RepairPilot fees) is separate from Connect.",
    sortOrder: 1,
  },
  {
    slug: "stripe-connect-vs-billing",
    category: "Payments",
    question: "What's the difference between Stripe Connect and my RepairPilot subscription?",
    answer:
      "Stripe Connect lets your shop accept customer payments (invoices, repair orders). " +
      "Stripe Billing (coming soon) handles your monthly RepairPilot subscription fee. " +
      "They use separate Stripe objects — Connect account ID vs Billing customer/subscription ID.",
    sortOrder: 2,
  },
  {
    slug: "booking-online",
    category: "Online Booking",
    question: "How do I enable online appointment booking?",
    answer:
      "Open Marketing → Online Booking to configure services, availability, and your public booking slug. " +
      "Enable online booking in settings, then share your link: /book/your-slug. " +
      "Appointments appear on the Appointments calendar and can convert to repair orders.",
    sortOrder: 1,
  },
  {
    slug: "booking-hours",
    category: "Online Booking",
    question: "Where do I set shop hours for appointments?",
    answer:
      "Settings → Appointments controls day start/end times and default appointment duration. " +
      "Online booking availability can be further customized under Marketing → Online Booking.",
    sortOrder: 2,
  },
  {
    slug: "inspections-dvi",
    category: "Inspections",
    question: "How do digital vehicle inspections work?",
    answer:
      "From a repair order, open the Inspections tab. Add checklist items with red/yellow/green status, " +
      "notes, and photos. Share inspection results with customers via a public link. " +
      "Digital inspections are included on Starter plans and above.",
    sortOrder: 1,
  },
  {
    slug: "inspections-share",
    category: "Inspections",
    question: "Can I send inspection results to customers?",
    answer:
      "Yes. Use the share link on the inspection to send customers a branded, read-only view. " +
      "You can also text or email the link from the repair order messaging tools.",
    sortOrder: 2,
  },
  {
    slug: "tires-orders",
    category: "Tires",
    question: "How do tire orders work?",
    answer:
      "Use the Tires module to search tire catalogs, build quotes, and submit orders to suppliers. " +
      "Tire orders link to repair orders when applicable. Supplier integrations may require " +
      "additional credentials — check Settings → Integrations.",
    sortOrder: 1,
  },
  {
    slug: "sms-twilio",
    category: "Messaging",
    question: "How do I enable two-way SMS with customers?",
    answer:
      "Two-way SMS requires a Professional plan or higher and Twilio credentials configured by your " +
      "platform administrator. Once live, open a repair order → Messages to text the customer. " +
      "Inbound replies are logged on the customer thread.",
    sortOrder: 1,
  },
  {
    slug: "support-contact",
    category: "Support",
    question: "How do I contact RepairPilot support?",
    answer:
      "Click the Help (?) button in the bottom-right corner of any page, or visit Support from the sidebar. " +
      "Submit a ticket with your question — we typically respond within one business day. " +
      "You can also email support@repairpilot.com directly.",
    sortOrder: 1,
  },
  {
    slug: "marketing-website-build",
    category: "Marketing",
    question: "Do you build websites for my shop?",
    answer:
      "Yes — RepairPilot offers a managed Website & Local SEO service as a paid add-on, separate from your " +
      "subscription. Our team builds a custom shop site, sets up local SEO, integrates online booking, and " +
      "provides ongoing optimization. Open Marketing → Website & SEO and submit a quote request to get started.",
    sortOrder: 1,
  },
];
