import { cn } from "@/lib/utils";

/** Two-column CRM form layout with optional sticky footer. */
export function CrmFormLayout({
  main,
  sidebar,
  footer,
  className,
}: {
  main: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-5xl", className)}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">{main}</div>
        {sidebar ? (
          <div className="space-y-6 lg:sticky lg:top-36 lg:self-start">{sidebar}</div>
        ) : null}
      </div>
      {footer ? (
        <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-brand-light/40 bg-[oklch(0.985_0.008_247)]/95 px-4 py-4 backdrop-blur-sm md:-mx-6 md:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
