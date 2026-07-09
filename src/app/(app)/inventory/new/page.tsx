import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { InventoryPartForm } from "@/components/inventory/inventory-part-form";
import { InventoryModuleHeader } from "@/components/inventory/inventory-stats";
import { Button } from "@/components/ui/button";

export default function NewInventoryPartPage() {
  return (
    <div className="flex flex-col gap-6 workspace-surface">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <InventoryModuleHeader />
      </div>
      <InventoryPartForm />
    </div>
  );
}
