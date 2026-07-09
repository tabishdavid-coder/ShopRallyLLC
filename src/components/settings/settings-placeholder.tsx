import { Construction } from "lucide-react";

export function SettingsPlaceholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        <Construction className="size-5 shrink-0" />
        This section is coming soon. Settings here will flow through to the rest of the app.
      </div>
    </div>
  );
}
