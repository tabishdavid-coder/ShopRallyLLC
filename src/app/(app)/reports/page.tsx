import { ReportsCatalog } from "@/components/reports/reports-catalog";

export const metadata = { title: "Reports — ShopRally" };

export default function ReportsPage() {
  return (
    <div className="workspace-surface flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <ReportsCatalog />
    </div>
  );
}
