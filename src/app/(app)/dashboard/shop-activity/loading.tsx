import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardShopActivityLoading() {
  return (
    <div className="flex min-h-0 flex-col gap-4 pb-1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-72" />
      </div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="min-h-[360px] flex-1 rounded-lg" />
    </div>
  );
}
