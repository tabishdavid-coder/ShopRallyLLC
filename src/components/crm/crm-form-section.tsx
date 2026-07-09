import { cn } from "@/lib/utils";

/** Branded form section — left accent bar, ShopRally card styling. */
export function CrmFormSection({
  title,
  description,
  children,
  className,
  accent = "navy",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  accent?: "navy" | "light" | "red";
}) {
  const border =
    accent === "red"
      ? "border-l-brand-red"
      : accent === "light"
        ? "border-l-brand-light"
        : "border-l-brand-navy";

  return (
    <section
      className={cn(
        "rounded-xl border border-brand-light/40 border-l-[3px] bg-card p-5 shadow-sm",
        border,
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
