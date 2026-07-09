import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { CreateTireOrderForm } from "@/components/tires/create-tire-order-form";
import { TireModuleHeader } from "@/components/tires/tire-orders-table";
import { Button } from "@/components/ui/button";
import { getShopId } from "@/lib/shop";
import { getAppointmentSettings } from "@/server/appointments";

export default async function NewTireOrderPage() {
  const settings = await getAppointmentSettings(await getShopId());

  return (
    <div className="flex flex-col gap-6 workspace-surface">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tires">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <TireModuleHeader />
      </div>
      <CreateTireOrderForm defaultDurationMins={settings.apptDefaultDurationMins} />
    </div>
  );
}
