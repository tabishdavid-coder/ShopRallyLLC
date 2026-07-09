import { QuickLaborView } from "@/components/quick-labor/quick-labor-view";

export default function QuickLaborPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 workspace-surface">
      <header className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Quick Labor</h1>
        <p className="text-xs text-muted-foreground">
          Labor times by VIN or plate — no customer or repair order required.
        </p>
      </header>
      <QuickLaborView />
    </div>
  );
}
