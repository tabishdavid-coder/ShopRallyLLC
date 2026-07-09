import Link from "next/link";
import { ExternalLink, LayoutPanelLeft } from "lucide-react";

import { LaborMockupPrototype } from "@/components/dev/labor-mockup/labor-mockup-prototype";

export const metadata = { title: "Labor Book Mock v3–v5 — Dev" };

export default function DevLaborMockupPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mb-1 flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
        <LayoutPanelLeft className="size-3.5 text-brand-navy" />
        <span>Interactive wireframe for user testing — not production Labor Book</span>
        <Link
          href="/dev/labor-paths"
          className="inline-flex items-center gap-1 text-brand-navy hover:underline"
        >
          Step tables <ExternalLink className="size-3" />
        </Link>
      </header>
      <LaborMockupPrototype />
    </div>
  );
}
