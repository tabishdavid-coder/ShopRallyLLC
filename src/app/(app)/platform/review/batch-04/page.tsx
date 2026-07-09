import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Batch04PlatformReview } from "@/components/design-review/batch-04-platform-review";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Batch 4 review — Platform" };

export default function PlatformReviewBatch04Page() {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-brand-navy" asChild>
        <Link href="/platform/review">
          <ArrowLeft className="size-4" />
          All release reviews
        </Link>
      </Button>
      <Batch04PlatformReview embeddedInPlatform />
    </div>
  );
}
