import Link from "next/link";
import { BookOpen, Mail, Phone, ArrowRight } from "lucide-react";

import { FaqAiAssistant } from "@/components/support/faq-ai-assistant";
import { SupportContactForm } from "@/components/support/support-contact-form";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from "@/lib/support";

export const metadata = { title: "Support — ShopRally" };

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Have questions? We&apos;re here to help.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-navy hover:underline">
            {SUPPORT_EMAIL}
          </a>
          {" · "}
          <a href={SUPPORT_PHONE_HREF} className="font-medium text-brand-navy hover:underline">
            {SUPPORT_PHONE}
          </a>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/support/faq"
          icon={BookOpen}
          title="FAQ library"
          description="Browse categorized answers"
        />
        <QuickLink
          href={`mailto:${SUPPORT_EMAIL}`}
          icon={Mail}
          title="Email support"
          description={SUPPORT_EMAIL}
          external
        />
        <QuickLink
          href={SUPPORT_PHONE_HREF}
          icon={Phone}
          title="Phone support"
          description={SUPPORT_PHONE}
          external
        />
      </div>

      <FaqAiAssistant />
      <SupportContactForm />

      <footer className="flex flex-wrap justify-center gap-4 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/about" className="hover:text-foreground hover:underline">
          About
        </Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
  external,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  external?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-navy/10">
        <Icon className="size-5 text-brand-navy" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </div>
  );

  if (external) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
