import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { TireStockForm } from "@/components/tires/tire-stock-form";
import { TireStockModuleHeader } from "@/components/tires/tire-stock-stats";
import { Button } from "@/components/ui/button";

export default function NewTirePage() {
  return (
    <div className="flex flex-col gap-6 workspace-surface">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href="/tires">
            <ChevronLeft className="size-4" />
            Back to tires
          </Link>
        </Button>
        <TireStockModuleHeader />
      </div>
      <TireStockForm mode="create" />
    </div>
  );
}
