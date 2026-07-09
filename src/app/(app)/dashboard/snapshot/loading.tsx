import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSnapshotLoading() {
  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-auto pb-1">
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="min-h-[320px] flex-1 rounded-lg" />
    </div>
  );
}
