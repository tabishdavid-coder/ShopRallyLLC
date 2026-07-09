import Link from "next/link";

type LegalDocumentViewProps = {
  title: string;
  version: string;
  effectiveAt: Date;
  contentHtml: string;
};

export function LegalDocumentView({
  title,
  version,
  effectiveAt,
  contentHtml,
}: LegalDocumentViewProps) {
  const effectiveLabel = effectiveAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-red">
          ShopRally Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Version {version} · Effective {effectiveLabel}
        </p>
      </header>

      <div
        className="legal-prose space-y-4 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-navy [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_strong]:text-foreground"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}

export function LegalSiteHeader() {
  return (
    <header className="border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-brand-navy text-sm font-black leading-none text-white shadow-sm">
            <span>R</span>
            <span className="text-brand-red">P</span>
          </div>
          <span className="text-lg font-bold tracking-tight">
            Kar<span className="text-brand-light">vio</span>
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-navy hover:underline"
        >
          Back to app
        </Link>
      </div>
    </header>
  );
}

export function LegalSiteFooter() {
  return (
    <footer className="border-t py-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs text-muted-foreground">
        <Link href="/legal/terms" className="hover:text-brand-navy hover:underline">
          Terms of Service
        </Link>
        <Link href="/legal/privacy" className="hover:text-brand-navy hover:underline">
          Privacy Policy
        </Link>
        <Link href="/legal/aup" className="hover:text-brand-navy hover:underline">
          Acceptable Use
        </Link>
        <Link href="/legal/subprocessors" className="hover:text-brand-navy hover:underline">
          Subprocessors
        </Link>
        <span>© {new Date().getFullYear()} ShopRally</span>
      </div>
    </footer>
  );
}
