"use client";

import { useCallback, useEffect, useState, useTransition, type ComponentProps } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Tag,
  User,
  Plus,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import {
  JOB_BOARD_APPROVAL,
  JOB_BOARD_APPROVAL_LABELS,
  JOB_BOARD_PAYMENT,
  JOB_BOARD_PAYMENT_LABELS,
  JOB_BOARD_VISIBILITY,
  JOB_BOARD_VISIBILITY_LABELS,
  type JobBoardApprovalFilter,
  type JobBoardPaymentFilter,
  type JobBoardSort,
  type JobBoardView,
  type JobBoardVisibility,
} from "@/lib/job-board-filters";
import { APPOINTMENT_OPTIONS, LEAD_SOURCES } from "@/lib/options";
import { JobBoardAddColumnButton } from "@/components/job-board/job-board-add-column-button";
import { JobBoardViewToggle } from "@/components/job-board/job-board-view-toggle";
import { cn } from "@/lib/utils";

const COMPACT_BTN =
  "h-7 shrink-0 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5";

function FilterButton({
  active,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  active?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        COMPACT_BTN,
        active && "border-brand-navy/40 bg-brand-light/15 text-brand-navy",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function JobBoardToolbar({
  query,
  employeeId,
  appointmentOption,
  visibility,
  payment,
  approval,
  marketingSource,
  view,
  sort,
  employees,
}: {
  query: string;
  employeeId: string;
  appointmentOption: string;
  visibility: JobBoardVisibility;
  payment: JobBoardPaymentFilter | null;
  approval: JobBoardApprovalFilter | null;
  marketingSource: string;
  view: JobBoardView;
  sort: JobBoardSort;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { openIntake, config } = useRoIntakeOptional();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(key, value);
      else sp.delete(key);
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router],
  );

  useEffect(() => {
    // Sync URL-driven query back into the debounced input when navigating/filtering externally.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional URL → local input sync
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (search) sp.set("q", search);
      else sp.delete("q");
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    }, 350);
    return () => clearTimeout(t);
  }, [search, query, params, pathname, router]);

  const employeeLabel =
    employees.find((e) => e.id === employeeId)?.name ?? (isAutopilot3030Shell() ? "Advisor" : "Employee");
  const apptLabel = appointmentOption || "Appt type";
  const visibilityLabel = JOB_BOARD_VISIBILITY_LABELS[visibility];
  const paymentLabel = payment ? JOB_BOARD_PAYMENT_LABELS[payment] : "Payment";
  const approvalLabel = approval ? JOB_BOARD_APPROVAL_LABELS[approval] : "Approval";
  const sourceLabel = marketingSource || "Lead source";
  const ap3030 = isAutopilot3030Shell();
  const newRoLabel = ap3030 ? AP_TERMS.newRepairOrder : "Repair Order";
  const secondaryFilterCount = [appointmentOption, payment, approval, marketingSource].filter(Boolean).length;

  return (
    <div className="job-board-toolbar flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      <div className="relative max-w-[220px] min-w-[120px] shrink">
        <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        {isPending ? (
          <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ap3030 ? "Search ROs…" : "Search pipeline…"}
          className="h-7 border-brand-navy/20 bg-card pl-7 pr-7 text-xs focus-visible:ring-brand-navy"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className={COMPACT_BTN}
        disabled
        title="RO labels — coming soon"
      >
        <Tag className="size-3.5" />
        <span className="hidden 2xl:inline">RO Label</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterButton active={!!employeeId} title={employeeId ? employeeLabel : undefined}>
            <User className="size-3.5" />
            <span className="max-w-[5.5rem] truncate">
              {employeeId ? employeeLabel : ap3030 ? "Advisor" : "Employee"}
            </span>
            <ChevronDown className="size-3 opacity-60" />
          </FilterButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
          <DropdownMenuItem onSelect={() => setFilter("employee", null)}>All employees</DropdownMenuItem>
          {employees.map((e) => (
            <DropdownMenuItem key={e.id} onSelect={() => setFilter("employee", e.id)}>
              {e.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterButton active={secondaryFilterCount > 0}>
            <SlidersHorizontal className="size-3.5" />
            Filters
            {secondaryFilterCount > 0 ? (
              <span className="rounded-full bg-brand-navy px-1.5 py-px text-[10px] font-medium text-white">
                {secondaryFilterCount}
              </span>
            ) : null}
            <ChevronDown className="size-3 opacity-60" />
          </FilterButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{apptLabel}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuItem onSelect={() => setFilter("appt", null)}>All appointment types</DropdownMenuItem>
              {APPOINTMENT_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt} onSelect={() => setFilter("appt", opt)}>
                  {opt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{paymentLabel}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuItem onSelect={() => setFilter("payment", null)}>All payment states</DropdownMenuItem>
              {JOB_BOARD_PAYMENT.map((key) => (
                <DropdownMenuItem key={key} onSelect={() => setFilter("payment", key)}>
                  {JOB_BOARD_PAYMENT_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{approvalLabel}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuItem onSelect={() => setFilter("approval", null)}>All approval states</DropdownMenuItem>
              {JOB_BOARD_APPROVAL.map((key) => (
                <DropdownMenuItem key={key} onSelect={() => setFilter("approval", key)}>
                  {JOB_BOARD_APPROVAL_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="truncate">{sourceLabel}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuItem onSelect={() => setFilter("source", null)}>All lead sources</DropdownMenuItem>
              {LEAD_SOURCES.map((src) => (
                <DropdownMenuItem key={src} onSelect={() => setFilter("source", src)}>
                  {src}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <JobBoardViewToggle view={view} sort={sort} />
        <JobBoardAddColumnButton className={COMPACT_BTN} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton active={visibility !== "active"}>
              {visibilityLabel}
              <ChevronDown className="size-3 opacity-60" />
            </FilterButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {JOB_BOARD_VISIBILITY.map((key) => (
              <DropdownMenuItem
                key={key}
                onSelect={() => setFilter("visibility", key === "active" ? null : key)}
              >
                {JOB_BOARD_VISIBILITY_LABELS[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {config ? (
          <Button
            size="sm"
            className={cn(
              COMPACT_BTN,
              "text-white",
              ap3030 ? "ap-accent-btn" : "bg-brand-navy hover:bg-brand-navy/90",
            )}
            onClick={() => openIntake()}
            title={newRoLabel}
          >
            <Plus className="size-3.5" />
            <span className="hidden lg:inline">{newRoLabel}</span>
            <span className="lg:hidden">New</span>
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className={cn(
              COMPACT_BTN,
              "text-white",
              ap3030 ? "ap-accent-btn" : "bg-brand-navy hover:bg-brand-navy/90",
            )}
            title={newRoLabel}
          >
            <Link href="/repair-orders/new">
              <Plus className="size-3.5" />
              <span className="hidden lg:inline">{newRoLabel}</span>
              <span className="lg:hidden">New</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
