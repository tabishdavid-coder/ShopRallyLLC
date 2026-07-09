import { cn } from "@/lib/utils";

export function CustomerAcknowledgment({
  html,
  version,
  variant = "default",
  heading = "Customer acknowledgment",
  className,
}: {
  html: string;
  version?: string | null;
  variant?: "default" | "print";
  heading?: string;
  className?: string;
}) {
  const isPrint = variant === "print";

  return (
    <section className={cn("space-y-2 text-sm", isPrint && "mt-6 text-[12px]", className)}>
      <div>
        <h2 className="text-base font-semibold">{heading}</h2>
        {version ? (
          <p className="mt-0.5 text-xs text-muted-foreground">Version {version}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "prose prose-sm max-w-none text-muted-foreground prose-p:my-2 prose-ul:my-2 prose-li:my-1",
          isPrint && "text-slate-700",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
