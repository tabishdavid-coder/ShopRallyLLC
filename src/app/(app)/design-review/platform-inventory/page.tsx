import { PlatformInventoryTour } from "@/components/design-review/platform-inventory";

export const metadata = {
  title: "Platform inventory — ShopRally",
  description:
    "Tour every Master CRM / platform operator surface in suggested viewing order.",
};

export default function PlatformInventoryPage() {
  return <PlatformInventoryTour />;
}
